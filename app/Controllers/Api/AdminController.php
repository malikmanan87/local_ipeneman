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
        $dutyLogModel = new DutyLogModel();

        $totalCompanions = $userModel->where('role', 'companion')->countAllResults();
        $totalRequests   = $requestModel->countAllResults();
        $activeDuties    = $requestModel->where('status', 'in_progress')->countAllResults();
        $onBehalfCount   = $requestModel->where('created_by_role', 'admin')->countAllResults();

        return $this->respond([
            'status' => 200,
            'stats'  => [
                'total_companions' => $totalCompanions,
                'total_requests'   => $totalRequests,
                'active_duties'    => $activeDuties,
                'on_behalf_count'  => $onBehalfCount,
            ]
        ]);
    }

    /**
     * List all ward requests for HoSZA Admin oversight
     */
    public function allRequests()
    {
        $requestModel = new RequestModel();
        $requests     = $requestModel->orderBy('id', 'DESC')->findAll();

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
        $passCode = trim($this->request->getVar('pass_code'));
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

        return $this->respond([
            'status'      => 200,
            'is_valid'    => true,
            'request'     => $requestData,
            'companion'   => $companion,
            'duty_log'    => $dutyLog,
            'verified_at' => date('d/m/Y H:i:s'),
            'message'     => 'VALID WARD ENTRY PASS: Companion authorization confirmed for HoSZA Ward.'
        ]);
    }
}
