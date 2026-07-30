<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();

        // 1. Seed Users
        $users = [
            [
                'name'        => 'Admin HoSZA',
                'ic_number'   => '800101115555',
                'gender'      => 'L',
                'email'       => 'admin@hosza.my',
                'phone'       => '0191234567',
                'password'    => password_hash('password123', PASSWORD_BCRYPT),
                'role'        => 'admin',
                'is_verified' => 1,
                'created_at'  => date('Y-m-d H:i:s'),
                'updated_at'  => date('Y-m-d H:i:s'),
            ],
            [
                'name'        => 'Ahmad Peneman',
                'ic_number'   => '980512115431',
                'gender'      => 'L',
                'email'       => 'ahmad@gmail.com',
                'phone'       => '0129876543',
                'password'    => password_hash('password123', PASSWORD_BCRYPT),
                'role'        => 'companion',
                'is_verified' => 1,
                'created_at'  => date('Y-m-d H:i:s'),
                'updated_at'  => date('Y-m-d H:i:s'),
            ],
            [
                'name'        => 'Siti Peneman',
                'ic_number'   => '990315115242',
                'gender'      => 'P',
                'email'       => 'siti@gmail.com',
                'phone'       => '0134567890',
                'password'    => password_hash('password123', PASSWORD_BCRYPT),
                'role'        => 'companion',
                'is_verified' => 1,
                'created_at'  => date('Y-m-d H:i:s'),
                'updated_at'  => date('Y-m-d H:i:s'),
            ],
            [
                'name'        => 'Fatimah Waris',
                'ic_number'   => '950820115678',
                'gender'      => 'P',
                'email'       => 'waris@gmail.com',
                'phone'       => '0171122334',
                'password'    => password_hash('password123', PASSWORD_BCRYPT),
                'role'        => 'user',
                'is_verified' => 1,
                'created_at'  => date('Y-m-d H:i:s'),
                'updated_at'  => date('Y-m-d H:i:s'),
            ],
        ];

        foreach ($users as $userData) {
            // Check if email already exists
            $existing = $db->table('users')->where('email', $userData['email'])->get()->getRowArray();
            if (!$existing) {
                $db->table('users')->insert($userData);
                $userId = $db->insertID();

                // If companion, insert companion profile
                if ($userData['role'] === 'companion') {
                    $db->table('companion_profiles')->insert([
                        'user_id'          => $userId,
                        'student_staff_id' => 'PENEMAN-' . rand(1000, 9999),
                        'health_status'    => 'healthy',
                        'health_decl_date' => date('Y-m-d H:i:s'),
                        'total_hours'      => rand(5, 40),
                        'rating_avg'       => 5.00,
                        'created_at'       => date('Y-m-d H:i:s'),
                        'updated_at'       => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        }
    }
}
