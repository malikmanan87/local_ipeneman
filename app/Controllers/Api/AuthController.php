<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\UserModel;
use App\Models\CompanionProfileModel;

class AuthController extends ResourceController
{
    protected $format = 'json';

    public function register()
    {
        $rules = [
            'name'      => 'required|min_length[3]',
            'ic_number' => 'required|min_length[12]|is_unique[users.ic_number]',
            'email'     => 'required|valid_email|is_unique[users.email]',
            'phone'     => 'required',
            'password'  => 'required|min_length[6]',
            'role'      => 'required|in_list[user,companion,admin,staff]'
        ];

        if (!$this->validate($rules)) {
            return $this->fail($this->validator->getErrors());
        }

        $icNumber = $this->request->getVar('ic_number');
        // Derive gender automatically from MyKad number
        $derivedGender = UserModel::deriveGenderFromIC($icNumber);

        $userModel = new UserModel();
        $userData = [
            'name'        => $this->request->getVar('name'),
            'ic_number'   => $icNumber,
            'gender'      => $derivedGender,
            'email'       => $this->request->getVar('email'),
            'phone'       => $this->request->getVar('phone'),
            'password'    => password_hash($this->request->getVar('password'), PASSWORD_BCRYPT),
            'role'        => $this->request->getVar('role'),
            'is_verified' => 0
        ];

        $userId = $userModel->insert($userData);

        if ($userData['role'] === 'companion') {
            $companionModel = new CompanionProfileModel();
            $companionModel->insert([
                'user_id'          => $userId,
                'student_staff_id' => $this->request->getVar('student_staff_id') ?? null,
                'health_status'    => 'healthy',
                'health_decl_date' => date('Y-m-d H:i:s'),
                'total_hours'      => 0,
                'rating_avg'       => 5.00
            ]);
        }

        $user = $userModel->find($userId);
        unset($user['password']);

        return $this->respondCreated([
            'status'  => 201,
            'message' => 'Registration submitted successfully! Your account is pending verification and approval by HoSZA Admin before login.',
            'user'    => $user
        ]);
    }

    public function login()
    {
        $email    = $this->request->getVar('email');
        $password = $this->request->getVar('password');

        $userModel = new UserModel();
        $user      = $userModel->where('email', $email)->first();

        if (!$user || !password_verify($password, $user['password'])) {
            return $this->failUnauthorized('Invalid email or password.');
        }

        if (isset($user['status']) && $user['status'] === 'inactive') {
            return $this->failForbidden('ACCOUNT INACTIVE: Your account has been deactivated by HoSZA Admin. Please contact system support for assistance.');
        }

        if (empty($user['is_verified']) || intval($user['is_verified']) === 0) {
            return $this->failForbidden('ACCOUNT PENDING VERIFICATION: Your account is pending verification and approval by HoSZA Admin. Please wait for Admin activation.');
        }

        unset($user['password']);

        return $this->respond([
            'status'  => 200,
            'message' => 'Login successful.',
            'user'    => $user,
            'token'   => base64_encode(json_encode(['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'gender' => $user['gender']]))
        ]);
    }

    public function profile($id = null)
    {
        $userModel = new UserModel();
        $user      = $userModel->find($id);

        if (!$user) {
            return $this->failNotFound('User not found.');
        }

        unset($user['password']);

        if ($user['role'] === 'companion') {
            $compModel = new CompanionProfileModel();
            $user['companion_profile'] = $compModel->where('user_id', $user['id'])->first();
        }

        return $this->respond($user);
    }
}
