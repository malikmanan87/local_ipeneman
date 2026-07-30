<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCompanionProfilesTable extends Migration
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
            'user_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'student_staff_id' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
                'null'       => true,
                'comment'    => 'ID Matrik Pelajar atau No. Staf UniSZA jika ada',
            ],
            'health_decl_date' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'health_status' => [
                'type'       => 'ENUM',
                'constraint' => ['healthy', 'unwell'],
                'default'    => 'healthy',
            ],
            'total_hours' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
            ],
            'rating_avg' => [
                'type'       => 'DECIMAL',
                'constraint' => '3,2',
                'default'    => 5.00,
            ],
            'bio' => [
                'type' => 'TEXT',
                'null' => true,
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
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('companion_profiles');
    }

    public function down()
    {
        $this->forge->dropTable('companion_profiles');
    }
}
