<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name',
        'ic_number',
        'gender',
        'email',
        'phone',
        'password',
        'role',
        'is_verified',
        'status',
        'avatar'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Helper to auto-detect gender from IC number
     * Last digit: Odd = Male (L), Even = Female (P)
     */
    public static function deriveGenderFromIC(string $icNumber): string
    {
        $cleanIc = preg_replace('/[^0-9]/', '', $icNumber);
        if (empty($cleanIc)) {
            return 'L';
        }
        $lastDigit = (int) substr($cleanIc, -1);
        return ($lastDigit % 2 !== 0) ? 'L' : 'P';
    }
}
