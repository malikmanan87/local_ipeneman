<?php

namespace App\Models;

use CodeIgniter\Model;

class SettingModel extends Model
{
    protected $table            = 'settings';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'setting_key',
        'setting_value',
        'description',
        'updated_at'
    ];

    protected $useTimestamps = false;

    /**
     * Get all settings as key-value pairs
     */
    public function getAllSettings(): array
    {
        $rows = $this->findAll();
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        return $settings;
    }

    /**
     * Get single setting value by key
     */
    public function getVal(string $key, string $default = '')
    {
        $row = $this->where('setting_key', $key)->first();
        return $row ? $row['setting_value'] : $default;
    }

    /**
     * Set setting value by key
     */
    public function setVal(string $key, string $value, string $description = '')
    {
        $row = $this->where('setting_key', $key)->first();
        if ($row) {
            return $this->update($row['id'], [
                'setting_value' => $value,
                'updated_at'    => date('Y-m-d H:i:s')
            ]);
        } else {
            return $this->insert([
                'setting_key'   => $key,
                'setting_value' => $value,
                'description'   => $description,
                'updated_at'    => date('Y-m-d H:i:s')
            ]);
        }
    }
}
