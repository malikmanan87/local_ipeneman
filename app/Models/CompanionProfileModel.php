<?php

namespace App\Models;

use CodeIgniter\Model;

class CompanionProfileModel extends Model
{
    protected $table            = 'companion_profiles';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'user_id',
        'student_staff_id',
        'health_decl_date',
        'health_status',
        'total_hours',
        'rating_avg',
        'bio'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
