<?php

declare(strict_types=1);

final class HttpException extends RuntimeException
{
    public int $status;

    public function __construct(int $status, string $message)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

function env(string $key, ?string $default = null): ?string
{
    $v = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    if ($v === false || $v === null || $v === '') {
        return $default;
    }
    return (string)$v;
}

function load_env_file(string $file): void
{
    if (!is_file($file)) {
        return;
    }
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }
        $k = trim(substr($line, 0, $pos));
        $v = trim(substr($line, $pos + 1));
        $v = trim($v, "\"'");
        if ($k !== '' && getenv($k) === false) {
            $_ENV[$k] = $v;
            $_SERVER[$k] = $v;
            putenv("$k=$v");
        }
    }
}

function app_env(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    load_env_file(dirname(__DIR__) . '/.env');
    $cfg = [
        'db_host' => env('DB_HOST', '127.0.0.1'),
        'db_port' => (int)env('DB_PORT', '3306'),
        'db_name' => env('DB_NAME', ''),
        'db_user' => env('DB_USER', ''),
        'db_pass' => env('DB_PASS', ''),
        'demo_user' => env('DEMO_USER', 'manager'),
        'demo_password' => env('DEMO_PASSWORD', 'manager123'),
        'manager_ids' => env('MANAGER_IDS', '2,8,9'),
        'ai_enabled' => env('AI_ENABLED', '0') === '1',
        'openai_api_key' => env('OPENAI_API_KEY', ''),
        'openai_model' => env('OPENAI_MODEL', 'gpt-4.1-mini'),
    ];
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $cfg = app_env();
    if ($cfg['db_name'] === '' || $cfg['db_user'] === '') {
        throw new HttpException(500, 'Database is not configured. Set DB_NAME, DB_USER, DB_PASS in .env');
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $cfg['db_host'],
        $cfg['db_port'],
        $cfg['db_name']
    );
    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function json_in(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function json_out(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
}

function require_auth(): array
{
    if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
        throw new HttpException(401, 'Please log in');
    }
    return $_SESSION['user'];
}

function is_manager(array $user): bool
{
    $cfg = app_env();
    $raw = array_filter(array_map('trim', explode(',', (string)$cfg['manager_ids'])));
    $ids = array_map('intval', $raw);
    return in_array((int)($user['salesperson_id'] ?? 0), $ids, true);
}

function table_exists(string $table): bool
{
    $stmt = db()->prepare("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?");
    $stmt->execute([$table]);
    $row = $stmt->fetch();
    return ((int)($row['c'] ?? 0)) > 0;
}

function all_rows(string $sql, array $params = []): array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function one_row(string $sql, array $params = []): ?array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ?: null;
}

function esc_like(string $value): string
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $value);
}

function relative_time(?string $datetime): string
{
    if (!$datetime) {
        return '';
    }
    $ts = strtotime($datetime);
    if (!$ts) {
        return '';
    }
    $diff = time() - $ts;
    $past = $diff >= 0;
    $diff = abs($diff);
    if ($diff >= 86400) {
        $n = (int)floor($diff / 86400);
        return $past ? "$n days ago" : "$n days remaining";
    }
    $h = max(1, (int)floor($diff / 3600));
    return $past ? "$h hrs ago" : "$h hrs remaining";
}

function prospect_where(array $f, array $user): array
{
    $where = ['1=1'];
    $params = [];

    if (!is_manager($user)) {
        $where[] = 'c.customer_salesperson = ?';
        $params[] = (int)$user['salesperson_id'];
    } elseif (!empty($f['salesperson'])) {
        $where[] = 'c.customer_salesperson = ?';
        $params[] = (int)$f['salesperson'];
    }

    if (!empty($f['search'])) {
        $q = '%' . esc_like(trim((string)$f['search'])) . '%';
        $where[] = '(c.customer_company LIKE ? OR c.customer_name LIKE ?)';
        $params[] = $q;
        $params[] = $q;
    }
    if (!empty($f['product'])) {
        $where[] = 'c.customer_product = ?';
        $params[] = (int)$f['product'];
    }
    if (!empty($f['stage'])) {
        $where[] = 'c.customer_stage = ?';
        $params[] = (int)$f['stage'];
    }
    if (!empty($f['status'])) {
        $where[] = 'c.customer_status = ?';
        $params[] = (int)$f['status'];
    }
    if (!empty($f['industry'])) {
        $where[] = 'c.customer_industry = ?';
        $params[] = (int)$f['industry'];
    }
    if (!empty($f['application'])) {
        $where[] = 'c.customer_application = ?';
        $params[] = (int)$f['application'];
    }
    if (!empty($f['referral'])) {
        $where[] = 'c.customer_referral = ?';
        $params[] = (int)$f['referral'];
    }
    if (!empty($f['site'])) {
        $where[] = 'c.customer_website = ?';
        $params[] = (int)$f['site'];
    }
    if (!empty($f['probability'])) {
        $where[] = 'c.customer_probability = ?';
        $params[] = (int)$f['probability'];
    }
    if (!empty($f['estimate'])) {
        $bucket = (int)$f['estimate'];
        if ($bucket === 1) {
            $where[] = 'c.customer_estimate < 1000';
        } elseif ($bucket === 2) {
            $where[] = 'c.customer_estimate BETWEEN 1000 AND 9999';
        } elseif ($bucket === 3) {
            $where[] = 'c.customer_estimate BETWEEN 10000 AND 24999';
        } elseif ($bucket === 4) {
            $where[] = 'c.customer_estimate BETWEEN 25000 AND 49999';
        } elseif ($bucket === 5) {
            $where[] = 'c.customer_estimate >= 50000';
        }
    }

    if (!empty($f['date_from'])) {
        $where[] = 'DATE(c.customer_date) >= ?';
        $params[] = (string)$f['date_from'];
    }
    if (!empty($f['date_to'])) {
        $where[] = 'DATE(c.customer_date) <= ?';
        $params[] = (string)$f['date_to'];
    }

    $range = (string)($f['date_range'] ?? 'all');
    if ($range !== 'all') {
        if ($range === 'this_month') {
            $where[] = 'YEAR(c.customer_date)=YEAR(CURDATE()) AND MONTH(c.customer_date)=MONTH(CURDATE())';
        } elseif ($range === 'last_month') {
            $where[] = 'YEAR(c.customer_date)=YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(c.customer_date)=MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
        } elseif ($range === 'ytd') {
            $where[] = 'YEAR(c.customer_date)=YEAR(CURDATE())';
        } elseif ($range === 'last_year') {
            $where[] = 'YEAR(c.customer_date)=YEAR(CURDATE())-1';
        }
    }

    if (!empty($f['last_event']) && $f['last_event'] !== 'all') {
        $days = 0;
        if ($f['last_event'] === 'week') {
            $days = 7;
        } elseif ($f['last_event'] === 'month') {
            $days = 30;
        } elseif ($f['last_event'] === '3months') {
            $days = 90;
        } elseif ($f['last_event'] === '6months') {
            $days = 180;
        } elseif ($f['last_event'] === 'year') {
            $days = 365;
        }
        if ($days > 0) {
            $where[] = 'COALESCE(t.last_timeline_date, c.customer_date) <= DATE_SUB(NOW(), INTERVAL ' . $days . ' DAY)';
        }
    }

    return [$where, $params];
}

