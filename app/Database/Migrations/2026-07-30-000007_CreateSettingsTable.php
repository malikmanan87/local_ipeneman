<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSettingsTable extends Migration
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
            'setting_key' => [
                'type'       => 'VARCHAR',
                'constraint' => '100',
                'unique'     => true,
            ],
            'setting_value' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'description' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('settings');

        // Insert initial default payment rate settings
        $db = \Config\Database::connect();
        $db->table('settings')->insertBatch([
            [
                'setting_key'   => 'default_hourly_rate',
                'setting_value' => '10.00',
                'description'   => 'Standard hourly allowance rate (RM/hour)',
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
            [
                'setting_key'   => 'min_hourly_rate',
                'setting_value' => '8.00',
                'description'   => 'Minimum allowed hourly rate (RM/hour)',
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
            [
                'setting_key'   => 'max_hourly_rate',
                'setting_value' => '30.00',
                'description'   => 'Maximum allowed hourly rate (RM/hour)',
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropTable('settings');
    }
}
