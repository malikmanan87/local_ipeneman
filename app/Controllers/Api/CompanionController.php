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
     * Apply for an open companion job
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

        // Strict gender match verification
        if ($job['patient_gender'] !== $user['gender']) {
            return $this->failForbidden('Safety Error: Companion must be of the SAME GENDER as the patient.');
        }

        // Schedule Overlap Conflict Protection:
        // Check if companion already has an assigned or in_progress shift on the SAME DATE with overlapping hours
        $requestModel = new RequestModel();
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

            // Overlap condition: newStart < dutyEnd AND dutyStart < newEnd
            if ($newStart < $dutyEnd && $dutyStart < $newEnd) {
                return $this->failForbidden('Schedule Conflict: You are already assigned to another ward duty during these hours (' . $duty['start_time'] . ' - ' . $duty['end_time'] . ').');
            }
        }

        $appModel = new ApplicationModel();
        $existing = $appModel->where('request_id', $requestId)
                             ->where('companion_id', $companionId)
                             ->first();

        if ($existing) {
            return $this->fail('You have already applied for this duty request.');
        }

        $appModel->insert([
            'request_id'   => $requestId,
            'companion_id' => $companionId,
            'status'       => 'pending'
        ]);

        return $this->respondCreated([
            'status'  => 201,
            'message' => 'Duty application submitted successfully. Awaiting family/admin approval.'
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
            'care_notes'   => json_encode([['date' => date('Y-m-d'), 'time' => date('H:i'), 'note' => 'Companion checked in at HoSZA Ward (' . date('d/m/Y H:i') . ')']]),
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
            $noteText = $isEarlyCheckout 
                ? '⚠️ Early Check-out: Checked out at ' . date('H:i') . ' (Scheduled end: ' . $requestData['end_time'] . '). Worked duration: ' . $workedHours . ' hrs'
                : 'Companion checked out & completed duty shift at HoSZA Ward (' . date('d/m/Y H:i') . '). Total duration: ' . $workedHours . ' hrs';

            $existingNotes[] = [
                'date' => date('Y-m-d'),
                'time' => date('H:i'),
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
            'time' => date('H:i'),
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
