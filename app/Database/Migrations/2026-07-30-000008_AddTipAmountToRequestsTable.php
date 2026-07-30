<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTipAmountToRequestsTable extends Migration
{
    public function up()
    {
        $fields = [
            'tip_amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '8,2',
                'default'    => 0.00,
                'after'      => 'allowance_amount',
                'comment'    => 'Optional tip/saguhati added by patient or family',
            ],
        ];

        $this->forge->addColumn('requests', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('requests', 'tip_amount');
    }
}
