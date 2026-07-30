<?php
$host = 'localhost';
$user = 'root';
$pass = '';

$conn = new mysqli($host, $user, $pass);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "CREATE DATABASE IF NOT EXISTS ipeneman_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci";
if ($conn->query($sql) === TRUE) {
    echo "SUCCESS: Pangkalan data 'ipeneman_db' berjaya dicipta!\n";
} else {
    echo "ERROR: " . $conn->error . "\n";
}

$conn->close();
