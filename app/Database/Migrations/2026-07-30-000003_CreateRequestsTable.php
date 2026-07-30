<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateRequestsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'request_code' => [
                'type'       => 'VARCHAR',
                'constraint' => '30',
                'unique'     => true,
            ],
            'created_by_role' => [
                'type'       => 'ENUM',
                'constraint' => ['user', 'admin'],
                'default'    => 'user',
                'comment'    => 'user = Waris, admin = Admin HoSZA bagi pihak pesakit',
            ],
            'created_by_user_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'patient_name' => [
                'type'       => 'VARCHAR',
                'constraint' => '150',
            ],
            'patient_rn' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
                'comment'    => 'No. Registration/Pendaftaran Pesakit HoSZA',
            ],
            'patient_gender' => [
                'type'       => 'ENUM',
                'constraint' => ['L', 'P'],
                'comment'    => 'Penapis Utama: L = Hanya peneman Lelaki, P = Hanya peneman Perempuan',
            ],
            'patient_age' => [
                'type'       => 'INT',
                'constraint' => 3,
                'null'       => true,
            ],
            'ward_name' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
                'comment'    => 'Contoh: Wad 3A (Lelaki), Wad 4B (Perempuan)',
            ],
            'bed_number' => [
                'type'       => 'VARCHAR',
                'constraint' => '20',
            ],
            'shift_date' => [
                'type' => 'DATE',
            ],
            'start_time' => [
                'type' => 'TIME',
            ],
            'end_time' => [
                'type' => 'TIME',
            ],
            'task_details' => [
                'type' => 'TEXT',
            ],
            'allowance_type' => [
                'type'       => 'ENUM',
                'constraint' => ['paid', 'volunteer'],
                'default'    => 'paid',
            ],
            'allowance_amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,2',
                'default'    => 0.00,
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
                'default'    => 'open',
            ],
            'assigned_companion_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('created_by_user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('requests');
    }

    public function down()
    {
        $this->forge->dropTable('requests');
    }
}
