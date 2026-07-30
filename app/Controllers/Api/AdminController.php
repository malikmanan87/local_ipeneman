<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\RequestModel;
use App\Models\UserModel;
use App\Models\DutyLogModel;
use App\Models\SettingModel;

class AdminController extends ResourceController
{
    protected $format = 'json';

    /**
     * Dashboard statistics for HoSZA Admin
     */
    public function stats()
    {
        $userModel    = new UserModel();
        $requestModel = new RequestModel();

        $totalUsers       = $userModel->countAllResults(false);
        $totalCompanions  = $userModel->where('role', 'companion')->countAllResults(false);
        $totalFamilies    = $userModel->where('role', 'user')->countAllResults(false);
        $totalStaff       = $userModel->whereIn('role', ['staff', 'admin'])->countAllResults(false);
        $pendingApprovals = $userModel->where('is_verified', 0)->countAllResults(false);

        $totalRequests = $requestModel->countAllResults(false);
        $activeDuties  = $requestModel->where('status', 'in_progress')->countAllResults(false);

        return $this->respond([
            'status' => 200,
            'stats'  => [
                'total_users'       => $totalUsers,
                'total_companions'  => $totalCompanions,
                'total_families'    => $totalFamilies,
                'total_staff'       => $totalStaff,
                'pending_approvals' => $pendingApprovals,
                'total_requests'    => $totalRequests,
                'active_duties'     => $activeDuties,
            ]
        ]);
    }

    /**
     * List all ward requests for HoSZA Admin oversight
     */
    public function allRequests()
    {
        $requestModel = new RequestModel();
        $userModel    = new UserModel();
        $dutyLogModel = new DutyLogModel();
        $ratingModel  = new \App\Models\RatingModel();

        $requests     = $requestModel->orderBy('id', 'DESC')->findAll();

        foreach ($requests as &$req) {
            // Companion details if assigned
            if (!empty($req['assigned_companion_id'])) {
                $comp = $userModel->find($req['assigned_companion_id']);
                if ($comp) {
                    unset($comp['password']);
                    $req['companion'] = $comp;
                }
            }

            // Duty log (check-in, check-out, care_notes)
            $dutyLog = $dutyLogModel->where('request_id', $req['id'])->orderBy('id', 'DESC')->first();
            if ($dutyLog) {
                $parsedNotes = [];
                if (!empty($dutyLog['care_notes'])) {
                    $parsed = json_decode($dutyLog['care_notes'], true);
                    if (is_array($parsed)) {
                        $parsedNotes = $parsed;
                    }
                }
                $dutyLog['care_notes_list'] = $parsedNotes;
                $req['duty_log'] = $dutyLog;
            } else {
                $req['duty_log'] = null;
            }

            // Rating & Review
            $rating = $ratingModel->where('request_id', $req['id'])->first();
            $req['rating'] = $rating ?: null;
        }

        return $this->respond($requests);
    }

    /**
     * Get system payment rate settings
     */
    public function getSettings()
    {
        $settingModel = new SettingModel();
        $settings     = $settingModel->getAllSettings();

        return $this->respond([
            'status'   => 200,
            'settings' => $settings
        ]);
    }

    /**
     * Update payment rate settings
     */
    public function updateSettings()
    {
        $settingModel = new SettingModel();

        $defaultRate = $this->request->getVar('default_hourly_rate');
        $minRate     = $this->request->getVar('min_hourly_rate');
        $maxRate     = $this->request->getVar('max_hourly_rate');

        if ($defaultRate !== null) {
            $settingModel->setVal('default_hourly_rate', (string) floatval($defaultRate), 'Standard hourly allowance rate (RM/hour)');
        }
        if ($minRate !== null) {
            $settingModel->setVal('min_hourly_rate', (string) floatval($minRate), 'Minimum allowed hourly rate (RM/hour)');
        }
        if ($maxRate !== null) {
            $settingModel->setVal('max_hourly_rate', (string) floatval($maxRate), 'Maximum allowed hourly rate (RM/hour)');
        }

        return $this->respond([
            'status'   => 200,
            'message'  => 'Payment rate settings updated successfully.',
            'settings' => $settingModel->getAllSettings()
        ]);
    }

    /**
     * Verify Digital Ward Entry Pass (For HoSZA Nurse / Guard / Staff Verification)
     */
    public function verifyPass()
    {
        $passCode    = trim($this->request->getVar('pass_code'));
        $staffUserId = $this->request->getVar('staff_user_id');

        if (empty($passCode)) {
            return $this->failValidationError('Pass code or QR token is required.');
        }

        $requestModel = new RequestModel();
        $userModel    = new UserModel();
        $compModel    = new \App\Models\CompanionProfileModel();
        $dutyLogModel = new DutyLogModel();

        // Find by request_code or qr_token
        $requestData = $requestModel->where('request_code', $passCode)->first();
        if (!$requestData) {
            // Check if pass_code is log qr_token
            $log = $dutyLogModel->where('qr_token', $passCode)->first();
            if ($log) {
                $requestData = $requestModel->find($log['request_id']);
            }
        }

        if (!$requestData) {
            return $this->failNotFound('INVALID PASS CODE: No ward request found for code "' . $passCode . '".');
        }

        if (empty($requestData['assigned_companion_id'])) {
            return $this->failForbidden('UNAUTHORIZED PASS: No companion has been assigned for this request yet.');
        }

        $companion = $userModel->find($requestData['assigned_companion_id']);
        if ($companion) {
            unset($companion['password']);
            $profile = $compModel->where('user_id', $companion['id'])->first();
            $companion['profile'] = $profile;
        }

        $dutyLog = $dutyLogModel->where('request_id', $requestData['id'])->orderBy('id', 'DESC')->first();
        $alreadyScanned = false;
        $previousScanInfo = null;

        if ($dutyLog && !empty($dutyLog['is_pass_scanned']) && intval($dutyLog['is_pass_scanned']) === 1) {
            $alreadyScanned = true;
            $scannedByStaff = null;
            if (!empty($dutyLog['scanned_by_user_id'])) {
                $scannedByStaff = $userModel->find($dutyLog['scanned_by_user_id']);
            }
            $previousScanInfo = [
                'scanned_at'      => date('d/m/Y h:i A', strtotime($dutyLog['scanned_at'])),
                'scanned_by_name' => $scannedByStaff ? $scannedByStaff['name'] : 'HoSZA Ward Nurse/Staff'
            ];
        } else {
            // Record first-time pass scan
            $nowTime = date('Y-m-d H:i:s');
            if ($dutyLog) {
                $dutyLogModel->update($dutyLog['id'], [
                    'is_pass_scanned'    => 1,
                    'scanned_at'         => $nowTime,
                    'scanned_by_user_id' => $staffUserId
                ]);
            } else {
                $dutyLogModel->insert([
                    'request_id'         => $requestData['id'],
                    'companion_id'       => $requestData['assigned_companion_id'],
                    'is_pass_scanned'    => 1,
                    'scanned_at'         => $nowTime,
                    'scanned_by_user_id' => $staffUserId,
                    'qr_token'           => 'PAS-HOSZA-' . strtoupper(substr(md5(uniqid()), 0, 10))
                ]);
            }
        }

        return $this->respond([
            'status'             => 200,
            'is_valid'           => true,
            'already_scanned'    => $alreadyScanned,
            'previous_scan_info' => $previousScanInfo,
            'request'            => $requestData,
            'companion'          => $companion,
            'duty_log'           => $dutyLog,
            'verified_at'        => date('d/m/Y H:i:s'),
            'message'            => $alreadyScanned
                ? '⚠️ ATTENTION: PASS HAS ALREADY BEEN SCANNED BY SYSTEM!'
                : '✅ VALID PASS & APPROVED: Companion entry verified for HoSZA Ward.'
        ]);
    }

    /**
     * Get list of all pending unverified user accounts
     */
    public function getUnverifiedUsers()
    {
        $userModel = new UserModel();
        $compModel = new \App\Models\CompanionProfileModel();

        $unverifiedUsers = $userModel->where('is_verified', 0)->orderBy('id', 'DESC')->findAll();

        foreach ($unverifiedUsers as &$user) {
            unset($user['password']);
            if ($user['role'] === 'companion') {
                $user['companion_profile'] = $compModel->where('user_id', $user['id'])->first();
            }
        }

        return $this->respond([
            'status' => 200,
            'total'  => count($unverifiedUsers),
            'data'   => $unverifiedUsers
        ]);
    }

    /**
     * Get list of all registered users across all roles (Admin, Staff, Companion, User/Family)
     */
    public function allUsers()
    {
        $userModel = new UserModel();
        $compModel = new \App\Models\CompanionProfileModel();

        $users = $userModel->orderBy('id', 'DESC')->findAll();

        foreach ($users as &$u) {
            unset($u['password']);
            if ($u['role'] === 'companion') {
                $u['companion_profile'] = $compModel->where('user_id', $u['id'])->first();
            }
        }

        return $this->respond([
            'status' => 200,
            'total'  => count($users),
            'data'   => $users
        ]);
    }

    /**
     * Approve & verify a user account
     */
    public function verifyUser()
    {
        $targetUserId = $this->request->getVar('user_id');

        $userModel = new UserModel();
        $user      = $userModel->find($targetUserId);

        if (!$user) {
            return $this->failNotFound('User account not found.');
        }

        $userModel->update($targetUserId, ['is_verified' => 1]);

        return $this->respond([
            'status'  => 200,
            'message' => 'User account "' . $user['name'] . '" approved and activated successfully.'
        ]);
    }

    /**
     * Reject/Delete an unverified user account
     */
    public function rejectUser()
    {
        $targetUserId = $this->request->getVar('user_id');

        $userModel = new UserModel();
        $user      = $userModel->find($targetUserId);

        if (!$user) {
            return $this->failNotFound('User account not found.');
        }

        $userModel->delete($targetUserId);

        return $this->respond([
            'status'  => 200,
            'message' => 'User account "' . $user['name'] . '" rejected and removed.'
        ]);
    }
}
