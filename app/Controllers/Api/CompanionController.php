<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\ApplicationModel;
use App\Models\RequestModel;
use App\Models\DutyLogModel;
use App\Models\UserModel;

class CompanionController extends ResourceController
{
    protected $format = 'json';

    /**
     * Apply for an open companion job — FCFS Auto-Assign
     * First qualified (same gender, verified, active) companion auto-assigned immediately.
     * Records applied_at for 60-second withdraw window.
     */
    public function apply()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $requestModel = new RequestModel();
        $userModel    = new UserModel();

        $job  = $requestModel->find($requestId);
        $user = $userModel->find($companionId);

        if (!$job || !$user) {
            return $this->failNotFound('Request or Companion not found.');
        }

        // Hard Rule: Must be same gender as patient
        if ($job['patient_gender'] !== $user['gender']) {
            return $this->failForbidden('Safety Error: Companion must be of the SAME GENDER as the patient.');
        }

        // Must be verified & active
        if (intval($user['is_verified']) !== 1) {
            return $this->failForbidden('Your account is not yet verified by Admin.');
        }
        if (isset($user['status']) && $user['status'] === 'inactive') {
            return $this->failForbidden('Your account is inactive. Please contact Admin.');
        }

        // Request must still be open (not expired or already assigned)
        if ($job['status'] !== 'open') {
            return $this->failForbidden('This request is no longer open for applications.');
        }

        // Check shift has not yet expired (shift_date + end_time must be in future)
        $shiftEndTs = strtotime($job['shift_date'] . ' ' . $job['end_time']);
        if (time() >= $shiftEndTs) {
            return $this->failForbidden('This shift has already expired (shift end time has passed).');
        }

        // Schedule Overlap Conflict Protection
        $myDuties = $requestModel->where('assigned_companion_id', $companionId)
                                 ->whereIn('status', ['assigned', 'in_progress'])
                                 ->where('shift_date', $job['shift_date'])
                                 ->findAll();

        foreach ($myDuties as $duty) {
            $newStart  = strtotime($job['shift_date'] . ' ' . $job['start_time']);
            $newEnd    = strtotime($job['shift_date'] . ' ' . $job['end_time']);
            $dutyStart = strtotime($duty['shift_date'] . ' ' . $duty['start_time']);
            $dutyEnd   = strtotime($duty['shift_date'] . ' ' . $duty['end_time']);

            if ($newEnd < $newStart) $newEnd += 86400;
            if ($dutyEnd < $dutyStart) $dutyEnd += 86400;

            if ($newStart < $dutyEnd && $dutyStart < $newEnd) {
                return $this->failForbidden('Schedule Conflict: You are already assigned to another ward duty during these hours (' . $duty['start_time'] . ' - ' . $duty['end_time'] . ').');
            }
        }

        $appModel = new ApplicationModel();

        // Prevent duplicate application
        $existing = $appModel->where('request_id', $requestId)
                             ->where('companion_id', $companionId)
                             ->whereNotIn('status', ['withdrawn'])
                             ->first();

        if ($existing) {
            return $this->fail('You have already applied for this duty request.');
        }

        // Ensure applied_at column exists
        $db = \Config\Database::connect();
        try {
            $db->query("ALTER TABLE applications ADD COLUMN applied_at DATETIME NULL AFTER status");
        } catch (\Throwable $e) { /* Column already exists */ }
        try {
            $db->query("ALTER TABLE applications ADD COLUMN withdrawn_at DATETIME NULL AFTER applied_at");
        } catch (\Throwable $e) { /* Column already exists */ }

        $appliedAt = date('Y-m-d H:i:s');

        // FCFS Auto-Assign: Insert application + immediately assign if first applicant
        $appId = $appModel->insert([
            'request_id'   => $requestId,
            'companion_id' => $companionId,
            'status'       => 'accepted',
            'applied_at'   => $appliedAt
        ]);

        // Auto-assign to request immediately
        $requestModel->update($requestId, [
            'status'                => 'assigned',
            'assigned_companion_id' => $companionId
        ]);

        // Auto-reject any other pending applications by this companion for overlapping shifts
        $otherApps = $appModel->where('companion_id', $companionId)
                              ->where('status', 'pending')
                              ->where('request_id !=', $requestId)
                              ->findAll();

        foreach ($otherApps as $otherApp) {
            $otherJob = $requestModel->find($otherApp['request_id']);
            if ($otherJob && $otherJob['shift_date'] === $job['shift_date']) {
                $cStart = strtotime($job['shift_date'] . ' ' . $job['start_time']);
                $cEnd   = strtotime($job['shift_date'] . ' ' . $job['end_time']);
                $oStart = strtotime($otherJob['shift_date'] . ' ' . $otherJob['start_time']);
                $oEnd   = strtotime($otherJob['shift_date'] . ' ' . $otherJob['end_time']);

                if ($cEnd < $cStart) $cEnd += 86400;
                if ($oEnd < $oStart) $oEnd += 86400;

                if ($cStart < $oEnd && $oStart < $cEnd) {
                    $appModel->update($otherApp['id'], ['status' => 'rejected']);
                }
            }
        }

        $withdrawDeadline = date('Y-m-d H:i:s', strtotime($appliedAt) + 60);

        return $this->respondCreated([
            'status'             => 201,
            'assigned'           => true,
            'application_id'     => $appId,
            'withdraw_deadline'  => $withdrawDeadline,
            'message'            => 'You have been auto-assigned for this duty! You have 60 seconds to withdraw if applied by mistake.'
        ]);
    }

    /**
     * Withdraw application within 60-second window (FCFS system)
     */
    public function withdrawApplication()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $appModel     = new ApplicationModel();
        $requestModel = new RequestModel();

        $app = $appModel->where('request_id', $requestId)
                        ->where('companion_id', $companionId)
                        ->where('status', 'accepted')
                        ->first();

        if (!$app) {
            return $this->failNotFound('No active application found to withdraw.');
        }

        // Check 60-second withdraw window
        $appliedAt  = strtotime($app['applied_at'] ?? date('Y-m-d H:i:s'));
        $secondsAgo = time() - $appliedAt;

        if ($secondsAgo > 60) {
            return $this->failForbidden('Withdraw window has expired (60 seconds limit). Please contact Admin if you need to cancel.');
        }

        // Mark as withdrawn
        $appModel->update($app['id'], [
            'status'       => 'withdrawn',
            'withdrawn_at' => date('Y-m-d H:i:s')
        ]);

        // Unassign from request & revert to open
        $requestModel->update($requestId, [
            'status'                => 'open',
            'assigned_companion_id' => null
        ]);

        return $this->respond([
            'status'  => 200,
            'message' => 'Application withdrawn. Shift is now open for other companions to apply.'
        ]);
    }

    /**
     * Get companion's active duty / assigned jobs
     */
    public function myDuties($companionId = null)
    {
        $requestModel = new RequestModel();
        $dutyLogModel = new DutyLogModel();

        $duties = $requestModel->where('assigned_companion_id', $companionId)
                               ->orderBy('shift_date', 'DESC')
                               ->findAll();

        foreach ($duties as &$d) {
            $log = $dutyLogModel->where('request_id', $d['id'])
                                ->where('companion_id', $companionId)
                                ->orderBy('id', 'DESC')
                                ->first();

            if ($log) {
                $parsedNotes = [];
                if (!empty($log['care_notes'])) {
                    $parsed = json_decode($log['care_notes'], true);
                    if (is_array($parsed)) {
                        $parsedNotes = $parsed;
                    }
                }
                $log['care_notes_list'] = $parsedNotes;
                $d['duty_log'] = $log;
            } else {
                $d['duty_log'] = null;
            }

            // Calculate actual worked hours, billable hours (capped at shift duration), & allowance
            $scheduledStart = strtotime($d['shift_date'] . ' ' . $d['start_time']);
            $scheduledEnd   = strtotime($d['shift_date'] . ' ' . $d['end_time']);
            if ($scheduledEnd < $scheduledStart) {
                // Overnight shift ending next day (e.g. 22:00 to 06:00)
                $scheduledEnd += 86400;
            }
            $scheduledSecs  = max(3600, $scheduledEnd - $scheduledStart);
            $scheduledHours = max(1, round($scheduledSecs / 3600, 2));

            $allowanceBase = floatval($d['allowance_amount'] ?? 0);
            $tipAmount     = floatval($d['tip_amount'] ?? 0);
            $hourlyRate    = $allowanceBase / $scheduledHours;

            $actualWorkedHours = $scheduledHours;
            $billableHours     = $scheduledHours;
            $actualAllowance   = $allowanceBase;

            if ($log && !empty($log['check_in']) && !empty($log['check_out'])) {
                $checkInTs  = strtotime($log['check_in']);
                $checkOutTs = strtotime($log['check_out']);
                $workedSecs = max(60, $checkOutTs - $checkInTs);
                $actualWorkedHours = round($workedSecs / 3600, 2);

                // Auto-cap billable hours at scheduled shift duration (no extra charge for late/forgotten clock-outs)
                $billableHours   = min($actualWorkedHours, $scheduledHours);
                $actualAllowance = round($billableHours * $hourlyRate, 2);
            }

            $d['scheduled_hours']         = $scheduledHours;
            $d['actual_worked_hours']     = $actualWorkedHours;
            $d['billable_hours']          = $billableHours;
            $d['actual_allowance_amount'] = number_format($actualAllowance, 2, '.', '');
            $d['actual_total_payout']     = number_format($actualAllowance + $tipAmount, 2, '.', '');
            $d['hourly_rate']             = number_format($hourlyRate, 2, '.', '');
        }

        return $this->respond($duties);
    }

    /**
     * Check-in at HoSZA Ward (Starts shift)
     */
    public function checkIn()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $dutyLogModel = new DutyLogModel();
        $requestModel = new RequestModel();

        $qrToken = 'PAS-HOSZA-' . strtoupper(substr(md5(uniqid()), 0, 10));
        $nowTime = date('Y-m-d H:i:s');

        $logId = $dutyLogModel->insert([
            'request_id'   => $requestId,
            'companion_id' => $companionId,
            'check_in'     => $nowTime,
            'care_notes'   => json_encode([['date' => date('Y-m-d'), 'time' => date('h:i A'), 'note' => 'Companion checked in at HoSZA Ward (' . date('d/m/Y h:i A') . ')']]),
            'qr_token'     => $qrToken
        ]);

        $requestModel->update($requestId, ['status' => 'in_progress']);

        return $this->respond([
            'status'   => 200,
            'message'  => 'Checked in successfully at HoSZA Ward. Duty session STARTED.',
            'qr_token' => $qrToken,
            'log_id'   => $logId
        ]);
    }

    /**
     * Check-out from HoSZA Ward (Ends shift)
     */
    public function checkOut()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $dutyLogModel = new DutyLogModel();
        $requestModel = new RequestModel();

        $requestData = $requestModel->find($requestId);

        $log = $dutyLogModel->where('request_id', $requestId)
                            ->where('companion_id', $companionId)
                            ->orderBy('id', 'DESC')
                            ->first();

        $nowTimestamp = time();
        $nowTimeStr   = date('Y-m-d H:i:s');
        $isEarlyCheckout = false;
        $workedHours = 0;

        if ($log && !empty($log['check_in'])) {
            $checkInTimestamp = strtotime($log['check_in']);
            $workedSeconds    = $nowTimestamp - $checkInTimestamp;
            $workedHours      = round($workedSeconds / 3600, 2);

            // Check if checkout is earlier than scheduled end_time
            if ($requestData && !empty($requestData['shift_date']) && !empty($requestData['end_time'])) {
                $scheduledEndTimestamp = strtotime($requestData['shift_date'] . ' ' . $requestData['end_time']);
                // If checked out more than 15 mins before scheduled end time
                if ($nowTimestamp < ($scheduledEndTimestamp - 900)) {
                    $isEarlyCheckout = true;
                }
            }

            $existingNotes = json_decode($log['care_notes'], true) ?? [];
            $schedEndFormatted = !empty($requestData['end_time']) ? date('g:i A', strtotime($requestData['end_time'])) : '';
            $noteText = $isEarlyCheckout 
                ? '⚠️ Early Check-out: Checked out at ' . date('h:i A') . ' (Scheduled end: ' . $schedEndFormatted . '). Worked duration: ' . $workedHours . ' hrs'
                : 'Companion checked out & completed duty shift at HoSZA Ward (' . date('d/m/Y h:i A') . '). Total duration: ' . $workedHours . ' hrs';

            $existingNotes[] = [
                'date' => date('Y-m-d'),
                'time' => date('h:i A'),
                'note' => $noteText
            ];

            $dutyLogModel->update($log['id'], [
                'check_out'  => $nowTimeStr,
                'care_notes' => json_encode($existingNotes)
            ]);
        }

        $requestModel->update($requestId, ['status' => 'completed']);

        return $this->respond([
            'status'             => 200,
            'is_early_checkout'  => $isEarlyCheckout,
            'worked_hours'       => $workedHours,
            'message'            => $isEarlyCheckout 
                ? 'Checked out early from HoSZA Ward. Duration logged: ' . $workedHours . ' hours.' 
                : 'Checked out successfully. Full duty session at HoSZA completed.'
        ]);
    }

    /**
     * Add log note during duty
     */
    public function addCareNote()
    {
        $requestId = $this->request->getVar('request_id');
        $note      = $this->request->getVar('note');

        $dutyLogModel = new DutyLogModel();
        $log = $dutyLogModel->where('request_id', $requestId)->orderBy('id', 'DESC')->first();

        if (!$log) {
            return $this->failNotFound('Duty session not found.');
        }

        $existingNotes = json_decode($log['care_notes'], true) ?? [];
        $existingNotes[] = [
            'date' => date('Y-m-d'),
            'time' => date('h:i A'),
            'note' => $note
        ];

        $dutyLogModel->update($log['id'], [
            'care_notes' => json_encode($existingNotes)
        ]);

        return $this->respond([
            'status'  => 200,
            'message' => 'Care note added successfully.',
            'notes'   => $existingNotes
        ]);
    }

    /**
     * Get ratings and reviews received by a companion
     */
    public function getRatings($companionId = null)
    {
        $ratingModel  = new \App\Models\RatingModel();
        $requestModel = new RequestModel();
        $userModel    = new UserModel();
        $compModel    = new \App\Models\CompanionProfileModel();

        $ratings = $ratingModel->where('companion_id', $companionId)
                               ->orderBy('id', 'DESC')
                               ->findAll();

        foreach ($ratings as &$r) {
            $req = $requestModel->find($r['request_id']);
            $r['request_code'] = $req ? $req['request_code'] : 'N/A';
            $r['patient_name'] = $req ? $req['patient_name'] : 'N/A';
            $r['ward_name']    = $req ? $req['ward_name'] : 'N/A';

            $user = $userModel->find($r['rated_by_user_id']);
            $r['rater_name'] = $user ? $user['name'] : 'Patient Family';
        }

        $profile = $compModel->where('user_id', $companionId)->first();
        $avgRating = $profile ? floatval($profile['rating_avg']) : 5.00;

        return $this->respond([
            'status'        => 200,
            'rating_avg'    => $avgRating,
            'total_reviews' => count($ratings),
            'data'          => $ratings
        ]);
    }
}
