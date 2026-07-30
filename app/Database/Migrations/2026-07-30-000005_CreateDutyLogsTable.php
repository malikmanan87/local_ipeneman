<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDutyLogsTable extends Migration
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
            'request_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'companion_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'check_in' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'check_out' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'care_notes' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'Log catatan aktiviti pesakit semasa syif',
            ],
            'qr_token' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
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
        $this->forge->addForeignKey('request_id', 'requests', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('companion_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('duty_logs');
    }

    public function down()
    {
        $this->forge->dropTable('duty_logs');
    }
}
