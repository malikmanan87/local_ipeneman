<?php

namespace App\Controllers;

class Home extends BaseController
{
    public function index()
    {
        $distIndex = FCPATH . 'dist/index.html';
        if (file_exists($distIndex)) {
            $html = file_get_contents($distIndex);
            // Fix asset paths if needed for XAMPP base URL
            $baseUrl = base_url();
            $html = str_replace('href="/assets/', 'href="' . $baseUrl . 'dist/assets/', $html);
            $html = str_replace('src="/assets/', 'src="' . $baseUrl . 'dist/assets/', $html);
            return $this->response->setBody($html);
        }

        return view('welcome_message');
    }
}
