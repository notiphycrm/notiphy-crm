<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/core.php';
crm_session_bootstrap();
session_start();
date_default_timezone_set("Europe/London");

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

require_once __DIR__ . '/../../src/bootstrap.php';

try {
    $path = trim((string)($_GET['path'] ?? ''), '/');
    $method = $_SERVER['REQUEST_METHOD'];

    route_request($method, $path);
} catch (Throwable $e) {
    $status = $e instanceof HttpException ? $e->status : 500;
    http_response_code($status);
    echo json_encode([
        'error' => $e->getMessage(),
    ]);
}

