<?php

namespace App\Models;

use CodeIgniter\Model;

class RequestModel extends Model
{
    protected $table            = 'requests';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'request_code',
        'created_by_role',
        'created_by_user_id',
        'patient_name',
        'patient_rn',
        'patient_gender',
        'patient_age',
        'ward_name',
        'bed_number',
        'shift_date',
        'start_time',
        'end_time',
        'task_details',
        'allowance_type',
        'allowance_amount',
        'tip_amount',
        'status',
        'assigned_companion_id'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Get available jobs strictly matching gender of the logged-in companion
     */
    public function getAvailableJobsForGender(string $companionGender)
    {
        return $this->where('patient_gender', $companionGender)
                    ->where('status', 'open')
                    ->orderBy('shift_date', 'ASC')
                    ->findAll();
    }
}
