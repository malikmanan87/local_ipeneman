<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\RequestModel;
use App\Models\UserModel;
use App\Models\ApplicationModel;
use App\Models\SettingModel;
use App\Models\RatingModel;

class RequestController extends ResourceController
{
    protected $format = 'json';

    /**
     * Create a new request (Family or Admin On-Behalf)
     */
    public function create()
    {
        $rules = [
            'created_by_user_id' => 'required',
            'created_by_role'    => 'required|in_list[user,admin]',
            'patient_name'       => 'required',
            'patient_gender'     => 'required|in_list[L,P]',
            'ward_name'          => 'required',
            'bed_number'         => 'required',
            'shift_date'         => 'required|valid_date',
            'start_time'         => 'required',
            'end_time'           => 'required',
            'task_details'       => 'required',
        ];

        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }

        $requestCode = 'IPENEMAN-' . date('Ymd') . '-' . rand(1000, 9999);

        // Calculate base allowance from Admin rate if needed or use passed allowance
        $settingModel = new SettingModel();
        $defaultHourlyRate = floatval($settingModel->getVal('default_hourly_rate', '10.00'));

        $startTime = $this->request->getVar('start_time');
        $endTime   = $this->request->getVar('end_time');

        // Calculate hours
        $start = strtotime($startTime);
        $end   = strtotime($endTime);
        $hours = ($end > $start) ? ($end - $start) / 3600 : 4; // default 4 hrs if calculation issue

        $baseAllowance = $this->request->getVar('allowance_amount') 
            ? floatval($this->request->getVar('allowance_amount'))
            : round($hours * $defaultHourlyRate, 2);

        $tipAmount = $this->request->getVar('tip_amount') ? floatval($this->request->getVar('tip_amount')) : 0.00;

        $requestModel = new RequestModel();
        $data = [
            'request_code'       => $requestCode,
            'created_by_role'    => $this->request->getVar('created_by_role'),
            'created_by_user_id' => $this->request->getVar('created_by_user_id'),
            'patient_name'       => $this->request->getVar('patient_name'),
            'patient_rn'         => $this->request->getVar('patient_rn') ?? 'RN-' . rand(100000, 999999),
            'patient_gender'     => $this->request->getVar('patient_gender'),
            'patient_age'        => $this->request->getVar('patient_age') ?? 60,
            'ward_name'          => $this->request->getVar('ward_name'),
            'bed_number'         => $this->request->getVar('bed_number'),
            'shift_date'         => $this->request->getVar('shift_date'),
            'start_time'         => $startTime,
            'end_time'           => $endTime,
            'task_details'       => $this->request->getVar('task_details'),
            'allowance_type'     => $this->request->getVar('allowance_type') ?? 'paid',
            'allowance_amount'   => $baseAllowance,
            'tip_amount'         => $tipAmount,
            'status'             => 'open'
        ];

        $id = $requestModel->insert($data);

        return $this->respondCreated([
            'status'  => 201,
            'message' => 'Patient companion request created successfully.',
            'id'      => $id,
            'code'    => $requestCode
        ]);
    }

    /**
     * Update an open request before companion application / assignment
     */
    public function update($id = null)
    {
        $requestModel = new RequestModel();
        $requestData  = $requestModel->find($id);

        if (!$requestData) {
            return $this->failNotFound('Request not found.');
        }

        // Check if request is still open and unassigned
        if ($requestData['status'] !== 'open' || !empty($requestData['assigned_companion_id'])) {
            return $this->failForbidden('Cannot update request once it is assigned or in progress.');
        }

        // Also check if any companions have already applied
        $appModel = new ApplicationModel();
        $existingApps = $appModel->where('request_id', $id)->countAllResults();
        if ($existingApps > 0) {
            return $this->failForbidden('Cannot update request because companions have already applied.');
        }

        $rules = [
            'patient_name'   => 'required',
            'patient_gender' => 'required|in_list[L,P]',
            'ward_name'      => 'required',
            'bed_number'     => 'required',
            'shift_date'     => 'required|valid_date',
            'start_time'     => 'required',
            'end_time'       => 'required',
            'task_details'   => 'required',
        ];

        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }

        $tipAmount = $this->request->getVar('tip_amount') !== null 
            ? floatval($this->request->getVar('tip_amount')) 
            : floatval($requestData['tip_amount']);

        $updateData = [
            'patient_name'     => $this->request->getVar('patient_name'),
            'patient_rn'       => $this->request->getVar('patient_rn') ?? $requestData['patient_rn'],
            'patient_gender'   => $this->request->getVar('patient_gender'),
            'patient_age'      => $this->request->getVar('patient_age') ?? $requestData['patient_age'],
            'ward_name'        => $this->request->getVar('ward_name'),
            'bed_number'       => $this->request->getVar('bed_number'),
            'shift_date'       => $this->request->getVar('shift_date'),
            'start_time'       => $this->request->getVar('start_time'),
            'end_time'         => $this->request->getVar('end_time'),
            'task_details'     => $this->request->getVar('task_details'),
            'allowance_amount' => $this->request->getVar('allowance_amount') ?? $requestData['allowance_amount'],
            'tip_amount'       => $tipAmount,
        ];

        $requestModel->update($id, $updateData);

        return $this->respond([
            'status'  => 200,
            'message' => 'Request updated successfully.'
        ]);
    }

    /**
     * Get available jobs for companions
     * CRITICAL SAFETY RULE: Filter strictly by Companion's Gender!
     */
    public function availableJobs()
    {
        $gender      = $this->request->getGet('gender');
        $companionId = $this->request->getGet('companion_id');

        if (!$gender || !in_array($gender, ['L', 'P'])) {
            return $this->failValidationError('Companion gender is required for safety matching.');
        }

        $requestModel = new RequestModel();
        $appModel     = new ApplicationModel();

        // Strictly filter: Only show patient requests with the EXACT SAME GENDER
        $jobs = $requestModel->where('patient_gender', $gender)
                            ->where('status', 'open')
                            ->orderBy('shift_date', 'ASC')
                            ->findAll();

        if ($companionId) {
            foreach ($jobs as &$job) {
                $app = $appModel->where('request_id', $job['id'])
                                ->where('companion_id', $companionId)
                                ->first();
                $job['has_applied'] = $app ? true : false;
                $job['application_status'] = $app ? $app['status'] : null;
            }
        }

        return $this->respond([
            'status' => 200,
            'gender_filter' => $gender === 'L' ? 'Male Companion only' : 'Female Companion only',
            'total'  => count($jobs),
            'data'   => $jobs
        ]);
    }

    /**
     * Get list of all requests created by user/admin
     */
    public function myRequests($userId = null)
    {
        $requestModel = new RequestModel();
        $dutyLogModel = new \App\Models\DutyLogModel();
        $userModel    = new UserModel();
        $appModel     = new ApplicationModel();
        $ratingModel  = new RatingModel();

        $requests = $requestModel->where('created_by_user_id', $userId)
                                 ->orderBy('id', 'DESC')
                                 ->findAll();

        // Include application count, duty_log (care notes), companion & rating for each request
        foreach ($requests as &$req) {
            $req['application_count'] = $appModel->where('request_id', $req['id'])->countAllResults();
            $existingRating = $ratingModel->where('request_id', $req['id'])->first();
            $req['user_rating'] = $existingRating;

            // Include companion info if assigned
            if (!empty($req['assigned_companion_id'])) {
                $comp = $userModel->find($req['assigned_companion_id']);
                $req['companion'] = $comp ?: null;
            } else {
                $req['companion'] = null;
            }

            // Include duty log & care notes
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
        }

        return $this->respond($requests);
    }

    /**
     * Submit rating for a companion by patient/family
     */
    public function rateCompanion()
    {
        $requestId     = $this->request->getVar('request_id');
        $ratedByUserId = $this->request->getVar('rated_by_user_id');
        $ratingVal     = intval($this->request->getVar('rating'));
        $review        = $this->request->getVar('review') ?? '';

        if ($ratingVal < 1 || $ratingVal > 5) {
            return $this->failValidationError('Rating must be between 1 and 5 stars.');
        }

        $requestModel = new RequestModel();
        $requestData  = $requestModel->find($requestId);

        if (!$requestData) {
            return $this->failNotFound('Request not found.');
        }

        if ($requestData['status'] !== 'completed') {
            return $this->failForbidden('Can only rate companion after duty shift is completed.');
        }

        $companionId = $requestData['assigned_companion_id'];
        if (!$companionId) {
            return $this->failValidationError('No assigned companion found for this request.');
        }

        $ratingModel = new RatingModel();
        $existing = $ratingModel->where('request_id', $requestId)
                                ->where('rated_by_user_id', $ratedByUserId)
                                ->first();

        if ($existing) {
            return $this->fail('You have already submitted a rating for this completed duty.');
        }

        $ratingModel->insert([
            'request_id'       => $requestId,
            'companion_id'     => $companionId,
            'rated_by_user_id' => $ratedByUserId,
            'rating'           => $ratingVal,
            'review'           => $review
        ]);

        // Recalculate companion rating_avg
        $allRatings = $ratingModel->where('companion_id', $companionId)->findAll();
        if (count($allRatings) > 0) {
            $sum = 0;
            foreach ($allRatings as $r) {
                $sum += intval($r['rating']);
            }
            $avg = round($sum / count($allRatings), 2);

            $compModel = new \App\Models\CompanionProfileModel();
            $compProfile = $compModel->where('user_id', $companionId)->first();
            if ($compProfile) {
                $compModel->update($compProfile['id'], ['rating_avg' => $avg]);
            }
        }

        return $this->respond([
            'status'  => 200,
            'message' => 'Thank you! Rating submitted successfully.'
        ]);
    }

    /**
     * Get list of companion applicants for a specific request
     */
    public function acceptCompanion()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $requestModel = new RequestModel();
        $appModel     = new ApplicationModel();

        // Update request status
        $requestModel->update($requestId, [
            'status'                => 'assigned',
            'assigned_companion_id' => $companionId
        ]);

        // Accept application
        $appModel->where('request_id', $requestId)
                 ->where('companion_id', $companionId)
                 ->set(['status' => 'accepted'])
                 ->update();

        // Reject other pending applications for this request
        $appModel->where('request_id', $requestId)
                 ->where('companion_id !=', $companionId)
                 ->set(['status' => 'rejected'])
                 ->update();

        // Auto-reject any other pending applications by this companion for overlapping shifts on the same date
        $currentJob = $requestModel->find($requestId);
        if ($currentJob) {
            $otherApps = $appModel->where('companion_id', $companionId)
                                  ->where('status', 'pending')
                                  ->where('request_id !=', $requestId)
                                  ->findAll();

            foreach ($otherApps as $otherApp) {
                $otherJob = $requestModel->find($otherApp['request_id']);
                if ($otherJob && $otherJob['shift_date'] === $currentJob['shift_date']) {
                    $cStart = strtotime($currentJob['shift_date'] . ' ' . $currentJob['start_time']);
                    $cEnd   = strtotime($currentJob['shift_date'] . ' ' . $currentJob['end_time']);
                    $oStart = strtotime($otherJob['shift_date'] . ' ' . $otherJob['start_time']);
                    $oEnd   = strtotime($otherJob['shift_date'] . ' ' . $otherJob['end_time']);

                    if ($cEnd < $cStart) $cEnd += 86400;
                    if ($oEnd < $oStart) $oEnd += 86400;

                    if ($cStart < $oEnd && $oStart < $cEnd) {
                        $appModel->update($otherApp['id'], ['status' => 'rejected']);
                    }
                }
            }
        }

        return $this->respond([
            'status'  => 200,
            'message' => 'Companion successfully assigned for this ward request.'
        ]);
    }

    /**
     * Get list of companion applicants for a specific request
     */
    public function getApplicants($requestId = null)
    {
        $appModel  = new ApplicationModel();
        $userModel = new UserModel();
        $compModel = new \App\Models\CompanionProfileModel();

        $applications = $appModel->where('request_id', $requestId)->findAll();
        $result = [];

        foreach ($applications as $app) {
            $user = $userModel->find($app['companion_id']);
            if ($user) {
                unset($user['password']);
                $profile = $compModel->where('user_id', $user['id'])->first();
                $user['companion_profile'] = $profile;
                $user['application_id']    = $app['id'];
                $user['application_status'] = $app['status'];
                $result[] = $user;
            }
        }

        return $this->respond([
            'status' => 200,
            'total'  => count($result),
            'data'   => $result
        ]);
    }
}
