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
}
