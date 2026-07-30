<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\RequestModel;
use App\Models\UserModel;
use App\Models\DutyLogModel;

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
}
