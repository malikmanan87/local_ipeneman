<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\ApplicationModel;
use App\Models\RequestModel;
use App\Models\DutyLogModel;
use App\Models\UserModel;

class CompanionController extends ResourceController
{
    protected $format = 'json';

    /**
     * Apply for an open companion job
     */
    public function apply()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $requestModel = new RequestModel();
        $userModel    = new UserModel();

        $job  = $requestModel->find($requestId);
        $user = $userModel->find($companionId);

        if (!$job || !$user) {
            return $this->failNotFound('Permohonan atau Peneman tidak dijumpai.');
        }

        // Strict gender match verification
        if ($job['patient_gender'] !== $user['gender']) {
            return $this->failForbidden('Ralat Keselamatan: Peneman mesti daripada JANTINA YANG SAMA dengan pesakit.');
        }

        $appModel = new ApplicationModel();
        $existing = $appModel->where('request_id', $requestId)
                             ->where('companion_id', $companionId)
                             ->first();

        if ($existing) {
            return $this->fail('Anda telah memohon tugasan ini sebelum ini.');
        }

        $appModel->insert([
            'request_id'   => $requestId,
            'companion_id' => $companionId,
            'status'       => 'pending'
        ]);

        return $this->respondCreated([
            'status'  => 201,
            'message' => 'Permohonan tugasan berjaya dihantar. Menunggu kelulusan waris/admin HoSZA.'
        ]);
    }

    /**
     * Get companion's active duty / assigned jobs
     */
    public function myDuties($companionId = null)
    {
        $requestModel = new RequestModel();
        $duties = $requestModel->where('assigned_companion_id', $companionId)
                              ->orderBy('shift_date', 'DESC')
                              ->findAll();

        return $this->respond($duties);
    }

    /**
     * Check-in at HoSZA Ward (Starts shift)
     */
    public function checkIn()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $dutyLogModel = new DutyLogModel();
        $requestModel = new RequestModel();

        $qrToken = 'PAS-HOSZA-' . strtoupper(substr(md5(uniqid()), 0, 10));

        $logId = $dutyLogModel->insert([
            'request_id'   => $requestId,
            'companion_id' => $companionId,
            'check_in'     => date('Y-m-d H:i:s'),
            'care_notes'   => json_encode([['time' => date('H:i'), 'note' => 'Peneman tiba & daftar masuk di Wad HoSZA']]),
            'qr_token'     => $qrToken
        ]);

        $requestModel->update($requestId, ['status' => 'in_progress']);

        return $this->respond([
            'status'   => 200,
            'message'  => 'Check-in berjaya di Wad HoSZA. Sesi bertugas MULA.',
            'qr_token' => $qrToken,
            'log_id'   => $logId
        ]);
    }

    /**
     * Check-out from HoSZA Ward (Ends shift)
     */
    public function checkOut()
    {
        $requestId   = $this->request->getVar('request_id');
        $companionId = $this->request->getVar('companion_id');

        $dutyLogModel = new DutyLogModel();
        $requestModel = new RequestModel();

        $log = $dutyLogModel->where('request_id', $requestId)
                            ->where('companion_id', $companionId)
                            ->orderBy('id', 'DESC')
                            ->first();

        if ($log) {
            $dutyLogModel->update($log['id'], [
                'check_out' => date('Y-m-d H:i:s')
            ]);
        }

        $requestModel->update($requestId, ['status' => 'completed']);

        return $this->respond([
            'status'  => 200,
            'message' => 'Check-out berjaya. Sesi bertugas PENUH di HoSZA telah SELESAI.'
        ]);
    }

    /**
     * Add log note during duty
     */
    public function addCareNote()
    {
        $requestId = $this->request->getVar('request_id');
        $note      = $this->request->getVar('note');

        $dutyLogModel = new DutyLogModel();
        $log = $dutyLogModel->where('request_id', $requestId)->orderBy('id', 'DESC')->first();

        if (!$log) {
            return $this->failNotFound('Sesi tugas tidak dijumpai.');
        }

        $existingNotes = json_decode($log['care_notes'], true) ?? [];
        $existingNotes[] = [
            'time' => date('H:i'),
            'note' => $note
        ];

        $dutyLogModel->update($log['id'], [
            'care_notes' => json_encode($existingNotes)
        ]);

        return $this->respond([
            'status'  => 200,
            'message' => 'Catatan jagaan berjaya ditambah.',
            'notes'   => $existingNotes
        ]);
    }
}
