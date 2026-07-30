<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPassScanFieldsToDutyLogsTable extends Migration
{
    public function up()
    {
        $fields = [
            'is_pass_scanned' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'after'      => 'qr_token',
                'comment'    => '1 if pass has already been scanned by nurse/guard',
            ],
            'scanned_at' => [
                'type'    => 'DATETIME',
                'null'    => true,
                'after'   => 'is_pass_scanned',
            ],
            'scanned_by_user_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'scanned_at',
            ],
        ];

        $this->forge->addColumn('duty_logs', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('duty_logs', ['is_pass_scanned', 'scanned_at', 'scanned_by_user_id']);
    }
}
