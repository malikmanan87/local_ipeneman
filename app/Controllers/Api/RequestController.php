<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\RequestModel;
use App\Models\UserModel;
use App\Models\ApplicationModel;

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
            'start_time'         => $this->request->getVar('start_time'),
            'end_time'           => $this->request->getVar('end_time'),
            'task_details'       => $this->request->getVar('task_details'),
            'allowance_type'     => $this->request->getVar('allowance_type') ?? 'paid',
            'allowance_amount'   => $this->request->getVar('allowance_amount') ?? 50.00,
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
        $gender = $this->request->getGet('gender');

        if (!$gender || !in_array($gender, ['L', 'P'])) {
            return $this->failValidationError('Companion gender is required for safety matching.');
        }

        $requestModel = new RequestModel();
        // Strictly filter: Only show patient requests with the EXACT SAME GENDER
        $jobs = $requestModel->where('patient_gender', $gender)
                            ->where('status', 'open')
                            ->orderBy('shift_date', 'ASC')
                            ->findAll();

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
        $requests = $requestModel->where('created_by_user_id', $userId)
                                 ->orderBy('id', 'DESC')
                                 ->findAll();

        // Include application count for each request to inform frontend if editable
        $appModel = new ApplicationModel();
        foreach ($requests as &$req) {
            $req['application_count'] = $appModel->where('request_id', $req['id'])->countAllResults();
        }

        return $this->respond($requests);
    }

    /**
     * Accept a companion applicant for a request
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

        return $this->respond([
            'status'  => 200,
            'message' => 'Companion successfully assigned for this ward request.'
        ]);
    }
}
