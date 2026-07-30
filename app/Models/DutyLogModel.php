<?php

namespace App\Models;

use CodeIgniter\Model;

class DutyLogModel extends Model
{
    protected $table            = 'duty_logs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'request_id',
        'companion_id',
        'check_in',
        'check_out',
        'care_notes',
        'qr_token',
        'is_pass_scanned',
        'scanned_at',
        'scanned_by_user_id'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
