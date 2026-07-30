<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

/*
 * --------------------------------------------------------------------
 * HoSZA Peneman Pesakit API Routes
 * --------------------------------------------------------------------
 */
$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    // Auth Routes
    $routes->post('auth/register', 'AuthController::register');
    $routes->post('auth/login', 'AuthController::login');
    $routes->get('auth/profile/(:num)', 'AuthController::profile/$1');

    // Request Routes (Waris & Admin On-Behalf)
    $routes->post('requests/create', 'RequestController::create');
    $routes->post('requests/update/(:num)', 'RequestController::update/$1');
    $routes->get('requests/available', 'RequestController::availableJobs');
    $routes->get('requests/my/(:num)', 'RequestController::myRequests/$1');
    $routes->get('requests/applicants/(:num)', 'RequestController::getApplicants/$1');
    $routes->post('requests/accept-companion', 'RequestController::acceptCompanion');
    $routes->post('requests/rate-companion', 'RequestController::rateCompanion');

    // Companion Routes
    $routes->post('companion/apply', 'CompanionController::apply');
    $routes->get('companion/duties/(:num)', 'CompanionController::myDuties/$1');
    $routes->post('companion/check-in', 'CompanionController::checkIn');
    $routes->post('companion/check-out', 'CompanionController::checkOut');
    $routes->post('companion/add-note', 'CompanionController::addCareNote');

    // Admin HoSZA Routes
    $routes->get('admin/stats', 'AdminController::stats');
    $routes->get('admin/requests', 'AdminController::allRequests');
    $routes->get('admin/settings', 'AdminController::getSettings');
    $routes->post('admin/settings/update', 'AdminController::updateSettings');
});

