<?php

declare(strict_types=1);

function route_request(string $method, string $path): void
{
    $path = trim($path, '/');

    if ($method === 'GET' && $path === 'health') {
        json_out(['ok' => true, 'service' => 'notiphy-crm']);
        return;
    }
    if ($method === 'POST' && $path === 'auth/login') {
        route_auth_login();
        return;
    }
    if ($method === 'POST' && $path === 'auth/logout') {
        $_SESSION = [];
        session_destroy();
        json_out(['ok' => true]);
        return;
    }
    if ($method === 'GET' && $path === 'lookups/prospect-filters') {
        route_lookups();
        return;
    }
    if ($method === 'GET' && $path === 'prospects') {
        route_prospects();
        return;
    }
    if ($method === 'POST' && $path === 'prospects') {
        route_create_prospect();
        return;
    }
    if ($method === 'GET' && $path === 'dashboard') {
        route_dashboard();
        return;
    }
    if ($method === 'GET' && $path === 'prospects/report') {
        route_prospects_report();
        return;
    }
    if ($method === 'GET' && preg_match('/^prospects\/(\d+)$/', $path, $m)) {
        route_prospect_detail((int)$m[1]);
        return;
    }
    if ($method === 'PATCH' && preg_match('/^prospects\/(\d+)$/', $path, $m)) {
        route_update_prospect((int)$m[1]);
        return;
    }
    if ($method === 'POST' && preg_match('/^prospects\/(\d+)\/timeline$/', $path, $m)) {
        route_add_timeline((int)$m[1]);
        return;
    }
    if ($method === 'POST' && preg_match('/^prospects\/(\d+)\/reminder$/', $path, $m)) {
        route_add_reminder((int)$m[1]);
        return;
    }
    if ($method === 'GET' && $path === 'notifications') {
        route_notifications();
        return;
    }
    if ($method === 'POST' && $path === 'ai/manager-digest') {
        route_ai_manager_digest();
        return;
    }

    throw new HttpException(404, 'Endpoint not found');
}

function route_auth_login(): void
{
    $body = json_in();
    $username = trim((string)($body['user'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($username === '' || $password === '') {
        throw new HttpException(400, 'Username and password are required');
    }

    // Explicit local admin fallback requested.
    if (strcasecmp($username, 'lee') === 0 && $password === 'snowboard') {
        $_SESSION['user'] = [
            'salesperson_id' => 2,
            'salesperson_name' => 'Lee',
            'salesperson_username' => 'lee',
            'salesperson_privilege' => 4,
        ];
        json_out(['ok' => true, 'user' => $_SESSION['user']]);
        return;
    }

    if (!table_exists('crm_salesperson')) {
        $cfg = app_env();
        if ($username === $cfg['demo_user'] && $password === $cfg['demo_password']) {
            $_SESSION['user'] = [
                'salesperson_id' => 2,
                'salesperson_name' => 'Manager',
                'salesperson_username' => $username,
                'salesperson_privilege' => 4,
            ];
            json_out(['ok' => true, 'user' => $_SESSION['user']]);
            return;
        }
        throw new HttpException(401, 'Invalid credentials');
    }

    $user = one_row(
        "SELECT salesperson_id, salesperson_name, salesperson_email, salesperson_password, salesperson_privilege
         FROM crm_salesperson
         WHERE salesperson_email = ? OR salesperson_name = ?
         LIMIT 1",
        [$username, $username]
    );
    if (!$user) {
        throw new HttpException(401, 'Invalid credentials');
    }

    $stored = (string)($user['salesperson_password'] ?? '');
    $ok = false;
    if ($stored !== '' && password_verify($password, $stored)) {
        $ok = true;
    } elseif ($stored === md5($password)) {
        $ok = true;
    } elseif ($stored === $password) {
        $ok = true;
    }
    if (!$ok) {
        throw new HttpException(401, 'Invalid credentials');
    }

    $_SESSION['user'] = [
        'salesperson_id' => (int)$user['salesperson_id'],
        'salesperson_name' => (string)$user['salesperson_name'],
        'salesperson_username' => (string)$user['salesperson_email'],
        'salesperson_privilege' => (int)($user['salesperson_privilege'] ?? 0),
    ];
    json_out(['ok' => true, 'user' => $_SESSION['user']]);
}

function route_lookups(): void
{
    require_auth();
    $out = [
        'salespeople' => [],
        'products' => [],
        'stages' => [],
        'statuses' => [],
        'sites' => [],
        'referrals' => [],
        'industries' => [],
        'applications' => [],
        'probabilities' => [],
    ];

    $map = [
        ['crm_salesperson', 'salesperson_id', 'salesperson_name', 'salespeople'],
        ['crm_products', 'products_id', 'products_name', 'products'],
        ['crm_stages', 'stage_id', 'stage_name', 'stages'],
        ['crm_status', 'status_id', 'status_name', 'statuses'],
        ['crm_sites', 'site_id', 'site_name', 'sites'],
        ['crm_referral', 'referral_id', 'referral_type', 'referrals'],
        ['crm_industries', 'industries_id', 'industries_name', 'industries'],
        ['crm_applications', 'application_id', 'application_name', 'applications'],
        ['crm_probability', 'probability_id', 'probability_name', 'probabilities'],
    ];
    foreach ($map as $m) {
        [$table, $idCol, $nameCol, $key] = $m;
        if (!table_exists($table)) {
            continue;
        }
        $out[$key] = all_rows("SELECT {$idCol} AS id, {$nameCol} AS name FROM {$table} ORDER BY {$nameCol}");
    }

    json_out($out);
}

function parse_filters(): array
{
    return [
        'search' => $_GET['search'] ?? '',
        'salesperson' => $_GET['salesperson'] ?? null,
        'referral' => $_GET['referral'] ?? null,
        'site' => $_GET['site'] ?? null,
        'probability' => $_GET['probability'] ?? null,
        'application' => $_GET['application'] ?? null,
        'industry' => $_GET['industry'] ?? null,
        'product' => $_GET['product'] ?? null,
        'estimate' => $_GET['estimate'] ?? null,
        'status' => $_GET['status'] ?? null,
        'stage' => $_GET['stage'] ?? null,
        'date_range' => $_GET['date_range'] ?? 'all',
        'date_from' => $_GET['date_from'] ?? '',
        'date_to' => $_GET['date_to'] ?? '',
        'last_event' => $_GET['last_event'] ?? 'all',
        'sort' => $_GET['sort'] ?? 'date',
        'limit' => max(1, min(200, (int)($_GET['limit'] ?? 50))),
        'offset' => max(0, (int)($_GET['offset'] ?? 0)),
    ];
}

function route_prospects(): void
{
    $user = require_auth();
    if (!table_exists('crm_customers')) {
        json_out(['prospects' => [], 'total' => 0]);
        return;
    }

    $f = parse_filters();
    [$where, $params] = prospect_where($f, $user);
    $whereSql = implode(' AND ', $where);

    $sortMap = [
        'date' => 'c.customer_date DESC',
        'latest' => 't.last_timeline_date DESC',
        'name' => 'c.customer_name ASC',
        'company' => 'c.customer_company ASC',
        'quote' => 'c.customer_quote DESC',
        'estimate' => 'c.customer_estimate DESC',
    ];
    $order = $sortMap[$f['sort']] ?? $sortMap['date'];

    $sql = "
        SELECT
            c.customer_id,
            c.customer_company,
            c.customer_name,
            c.customer_date,
            c.customer_estimate,
            c.customer_quote,
            c.customer_sale,
            c.customer_sale_date,
            c.customer_stage,
            c.customer_status,
            c.customer_country,
            c.customer_email,
            c.customer_phone,
            c.customer_cell,
            c.customer_web,
            c.customer_existing,
            w.site_name,
            co.countries_name,
            sp.salesperson_name,
            p.products_name,
            pr.probability_name,
            rf.referral_type,
            st.status_name,
            i.industries_name,
            a.application_name,
            t.last_timeline_date
        FROM crm_customers c
        LEFT JOIN crm_sites w ON c.customer_site = w.site_id
        LEFT JOIN countries co ON c.customer_country = co.countries_id
        LEFT JOIN crm_salesperson sp ON c.customer_salesperson = sp.salesperson_id
        LEFT JOIN crm_products p ON c.customer_product = p.products_id
        LEFT JOIN crm_probability pr ON c.customer_probability = pr.probability_id
        LEFT JOIN crm_referral rf ON c.customer_referral = rf.referral_id
        LEFT JOIN crm_status st ON c.customer_status = st.status_id
        LEFT JOIN crm_industries i ON c.customer_industry = i.industries_id
        LEFT JOIN crm_applications a ON c.customer_application = a.application_id
        LEFT JOIN (
            SELECT customer_id, MAX(timeline_date) AS last_timeline_date
            FROM crm_timeline
            GROUP BY customer_id
        ) t ON c.customer_id = t.customer_id
        WHERE {$whereSql}
        ORDER BY {$order}
        LIMIT {$f['limit']} OFFSET {$f['offset']}
    ";
    $rows = all_rows($sql, $params);
    foreach ($rows as &$r) {
        $stage = (int)($r['customer_stage'] ?? 0);
        $progress = $stage > 0 ? min(100, $stage * 20) : 25;
        $r['progress_percent'] = max(5, min(100, $progress > 0 ? $progress : 25));
        $r['progress_color'] = $r['progress_percent'] >= 75 ? '#29bb52' : ($r['progress_percent'] >= 45 ? '#e6d443' : '#f0a43b');
        $r['site_label'] = $r['site_name'] ?? '';
        $r['date_added_time'] = relative_time((string)($r['customer_date'] ?? ''));
        $r['date_added_color'] = '#2d66cf';
        $r['customer_estimate_display'] = ((float)($r['customer_estimate'] ?? 0)) > 0 ? '£' . number_format((float)$r['customer_estimate']) : '';
        $r['customer_quote_display'] = ((float)($r['customer_quote'] ?? 0)) > 0 ? '£' . number_format((float)$r['customer_quote']) : '';
        $r['last_event_time'] = relative_time((string)($r['last_timeline_date'] ?? $r['customer_date'] ?? ''));
        $r['status_label'] = $r['status_name'] ?? 'Open';
        $r['status_color'] = '#2d84df';
    }
    unset($r);

    $count = one_row("SELECT COUNT(*) AS c FROM crm_customers c LEFT JOIN (SELECT customer_id, MAX(timeline_date) AS last_timeline_date FROM crm_timeline GROUP BY customer_id) t ON c.customer_id=t.customer_id WHERE {$whereSql}", $params);
    json_out([
        'prospects' => $rows,
        'total' => (int)($count['c'] ?? 0),
    ]);
}

function route_dashboard(): void
{
    $user = require_auth();
    if (!table_exists('crm_customers')) {
        json_out([
            'cards' => [
                'new_enquiries' => 0,
                'new_enquiries_prev' => 0,
                'quotes_count' => 0,
                'quotes_count_prev' => 0,
                'orders_count' => 0,
                'orders_count_prev' => 0,
                'quotes_total' => 0,
                'orders_total' => 0,
            ],
            'trend' => ['labels' => [], 'enquiries' => [], 'quotes' => [], 'sales' => []],
        ]);
        return;
    }

    $scopeSql = '';
    $scopeParams = [];
    if (!is_manager($user)) {
        $scopeSql = ' AND customer_salesperson = ?';
        $scopeParams[] = (int)$user['salesperson_id'];
    }

    $cards = one_row(
        "SELECT
            COUNT(CASE WHEN customer_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS new_enquiries,
            COUNT(CASE WHEN customer_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND DATE_SUB(CURDATE(), INTERVAL 31 DAY) THEN 1 END) AS new_enquiries_prev,
            COUNT(CASE WHEN customer_quote > 0 AND customer_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS quotes_count,
            COUNT(CASE WHEN customer_quote > 0 AND customer_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND DATE_SUB(CURDATE(), INTERVAL 31 DAY) THEN 1 END) AS quotes_count_prev,
            COUNT(CASE WHEN customer_sale > 0 AND customer_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS orders_count,
            COUNT(CASE WHEN customer_sale > 0 AND customer_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND DATE_SUB(CURDATE(), INTERVAL 31 DAY) THEN 1 END) AS orders_count_prev,
            COALESCE(SUM(CASE WHEN customer_quote > 0 THEN customer_quote ELSE 0 END),0) AS quotes_total,
            COALESCE(SUM(CASE WHEN customer_sale > 0 THEN customer_sale ELSE 0 END),0) AS orders_total
         FROM crm_customers
         WHERE 1=1 {$scopeSql}",
        $scopeParams
    ) ?? [];

    $trendRows = all_rows(
        "SELECT DATE_FORMAT(customer_date, '%Y-%m') AS ym,
                COUNT(*) AS enquiries,
                COUNT(CASE WHEN customer_quote > 0 THEN 1 END) AS quotes,
                COUNT(CASE WHEN customer_sale > 0 THEN 1 END) AS sales
         FROM crm_customers
         WHERE customer_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) {$scopeSql}
         GROUP BY ym
         ORDER BY ym ASC",
        $scopeParams
    );
    $labels = [];
    $enquiries = [];
    $quotes = [];
    $sales = [];
    foreach ($trendRows as $r) {
        $labels[] = (string)$r['ym'];
        $enquiries[] = (int)$r['enquiries'];
        $quotes[] = (int)$r['quotes'];
        $sales[] = (int)$r['sales'];
    }

    json_out([
        'cards' => $cards,
        'trend' => [
            'labels' => $labels,
            'enquiries' => $enquiries,
            'quotes' => $quotes,
            'sales' => $sales,
        ],
    ]);
}

function route_prospects_report(): void
{
    $user = require_auth();
    if (!table_exists('crm_customers')) {
        json_out(['totals' => [], 'graphs' => []]);
        return;
    }
    $f = parse_filters();
    [$where, $params] = prospect_where($f, $user);
    $whereSql = implode(' AND ', $where);

    $totals = one_row(
        "SELECT
            COUNT(c.customer_id) AS enquiries,
            COUNT(CASE WHEN c.customer_estimate > 0 THEN 1 END) AS estimates_count,
            COALESCE(SUM(c.customer_estimate), 0) AS estimates_sum,
            COUNT(CASE WHEN c.customer_quote > 0 THEN 1 END) AS quotes_count,
            COALESCE(SUM(c.customer_quote), 0) AS quotes_sum,
            COUNT(CASE WHEN c.customer_sale > 0 THEN 1 END) AS sales_count,
            COALESCE(SUM(c.customer_sale), 0) AS sales_sum
         FROM crm_customers c
         LEFT JOIN (SELECT customer_id, MAX(timeline_date) AS last_timeline_date FROM crm_timeline GROUP BY customer_id) t ON c.customer_id=t.customer_id
         WHERE {$whereSql}",
        $params
    ) ?? [];

    $graphs = [
        'salespeople' => grouped_graph('sp.salesperson_name', 'crm_salesperson sp', 'c.customer_salesperson = sp.salesperson_id', $whereSql, $params),
        'products' => grouped_graph('p.products_name', 'crm_products p', 'c.customer_product = p.products_id', $whereSql, $params),
        'referrals' => grouped_graph('r.referral_type', 'crm_referral r', 'c.customer_referral = r.referral_id', $whereSql, $params),
        'status' => grouped_graph('s.status_name', 'crm_status s', 'c.customer_status = s.status_id', $whereSql, $params),
    ];

    json_out([
        'totals' => $totals,
        'graphs' => $graphs,
    ]);
}

function grouped_graph(string $labelExpr, string $joinTable, string $joinOn, string $whereSql, array $params): array
{
    $rows = all_rows(
        "SELECT {$labelExpr} AS label, COUNT(*) AS c
         FROM crm_customers c
         JOIN {$joinTable} ON {$joinOn}
         LEFT JOIN (SELECT customer_id, MAX(timeline_date) AS last_timeline_date FROM crm_timeline GROUP BY customer_id) t ON c.customer_id=t.customer_id
         WHERE {$whereSql}
         GROUP BY label
         ORDER BY c DESC
         LIMIT 8",
        $params
    );
    return [
        'labels' => array_values(array_map(static fn(array $r): string => (string)$r['label'], $rows)),
        'counts' => array_values(array_map(static fn(array $r): int => (int)$r['c'], $rows)),
    ];
}

function route_prospect_detail(int $id): void
{
    require_auth();
    if (!table_exists('crm_customers')) {
        throw new HttpException(404, 'Customer not found');
    }
    $customer = one_row(
        "SELECT c.*, p.products_name, s.status_name AS status_label
         FROM crm_customers c
         LEFT JOIN crm_products p ON c.customer_product=p.products_id
         LEFT JOIN crm_status s ON c.customer_status=s.status_id
         WHERE c.customer_id=?",
        [$id]
    );
    if (!$customer) {
        throw new HttpException(404, 'Customer not found');
    }
    $customer['customer_estimate_display'] = ((float)($customer['customer_estimate'] ?? 0)) > 0 ? '£' . number_format((float)$customer['customer_estimate']) : '';
    $customer['customer_quote_display'] = ((float)($customer['customer_quote'] ?? 0)) > 0 ? '£' . number_format((float)$customer['customer_quote']) : '';

    $timeline = [];
    if (table_exists('crm_timeline')) {
        $timeline = all_rows(
            "SELECT t.timeline_id, t.timeline_type, t.timeline_comment, t.timeline_subject, t.timeline_date, t.timeline_sale, sp.salesperson_name
             FROM crm_timeline t
             LEFT JOIN crm_salesperson sp ON t.sales_id=sp.salesperson_id
             WHERE t.customer_id=?
             ORDER BY t.timeline_date DESC
             LIMIT 80",
            [$id]
        );
    }
    $labels = [
        1 => 'Progress',
        2 => 'Lost',
        3 => 'Unassigned',
        4 => 'Sale',
        5 => 'Reminder',
        6 => 'Email',
        7 => 'File',
        8 => 'Quote',
        9 => 'Share',
        10 => 'Customer Enquiry',
        11 => 'Newsletter',
    ];
    foreach ($timeline as &$t) {
        $tt = (int)($t['timeline_type'] ?? 0);
        $t['label'] = $labels[$tt] ?? 'Activity';
        $t['timeline_date_display'] = relative_time((string)($t['timeline_date'] ?? ''));
    }
    unset($t);

    json_out([
        'customer' => $customer,
        'timeline' => $timeline,
    ]);
}

function route_create_prospect(): void
{
    $user = require_auth();
    $body = json_in();
    $company = trim((string)($body['customer_company'] ?? ''));
    $name = trim((string)($body['customer_name'] ?? ''));
    if ($company === '' && $name === '') {
        throw new HttpException(400, 'Company or contact name is required');
    }

    $salesId = (int)($body['customer_salesperson'] ?? 0);
    if ($salesId <= 0) {
        $salesId = (int)$user['salesperson_id'];
    }
    if (!is_manager($user)) {
        $salesId = (int)$user['salesperson_id'];
    }

    $estimate = (float)($body['customer_estimate'] ?? 0);
    $quote = (float)($body['customer_quote'] ?? 0);
    $stage = max(0, (int)($body['customer_stage'] ?? 0));
    $status = max(0, (int)($body['customer_status'] ?? 0));
    $product = max(0, (int)($body['customer_product'] ?? 0));
    $referral = max(0, (int)($body['customer_referral'] ?? 0));
    $site = max(0, (int)($body['customer_site'] ?? 0));
    $application = max(0, (int)($body['customer_application'] ?? 0));
    $industry = max(0, (int)($body['customer_industry'] ?? 0));
    $probability = max(0, (int)($body['customer_probability'] ?? 0));

    $stmt = db()->prepare(
        "INSERT INTO crm_customers (
            account_id, customer_existing, customer_name, customer_company, customer_email, customer_phone,
            customer_referral, customer_salesperson, customer_application, customer_industry, customer_product,
            customer_date, customer_estimate, customer_quote, customer_probability, customer_stage, customer_status,
            customer_sale, customer_site, last_update, customer_type
        ) VALUES (
            1, 0, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            NOW(), ?, ?, ?, ?, ?,
            0, ?, NOW(), 1
        )"
    );
    $stmt->execute([
        $name,
        $company,
        trim((string)($body['customer_email'] ?? '')),
        trim((string)($body['customer_phone'] ?? '')),
        $referral,
        $salesId,
        $application,
        $industry,
        $product,
        $estimate,
        $quote,
        $probability,
        $stage,
        $status,
        $site,
    ]);
    $id = (int)db()->lastInsertId();

    if (!empty($body['initial_note'])) {
        create_timeline_entry($id, (int)$user['salesperson_id'], 1, trim((string)$body['initial_note']), 0.0, null);
    }
    json_out(['ok' => true, 'customer_id' => $id], 201);
}

function route_update_prospect(int $id): void
{
    $user = require_auth();
    $existing = one_row("SELECT customer_id, customer_salesperson FROM crm_customers WHERE customer_id = ?", [$id]);
    if (!$existing) {
        throw new HttpException(404, 'Customer not found');
    }
    if (!is_manager($user) && (int)$existing['customer_salesperson'] !== (int)$user['salesperson_id']) {
        throw new HttpException(403, 'Not allowed to edit this customer');
    }

    $body = json_in();
    $fields = [
        'customer_name', 'customer_company', 'customer_email', 'customer_phone', 'customer_stage', 'customer_status',
        'customer_product', 'customer_referral', 'customer_site', 'customer_application', 'customer_industry',
        'customer_probability', 'customer_estimate', 'customer_quote'
    ];
    $sets = [];
    $params = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "{$f} = ?";
            $params[] = $body[$f];
        }
    }
    if (is_manager($user) && array_key_exists('customer_salesperson', $body)) {
        $sets[] = "customer_salesperson = ?";
        $params[] = (int)$body['customer_salesperson'];
    }
    if (empty($sets)) {
        json_out(['ok' => true, 'customer_id' => $id]);
        return;
    }
    $sets[] = "last_update = NOW()";
    $params[] = $id;
    $sql = "UPDATE crm_customers SET " . implode(', ', $sets) . " WHERE customer_id = ?";
    db()->prepare($sql)->execute($params);
    json_out(['ok' => true, 'customer_id' => $id]);
}

function route_add_timeline(int $id): void
{
    $user = require_auth();
    assert_can_access_customer($id, $user);
    $body = json_in();
    $type = (int)($body['timeline_type'] ?? 1);
    if ($type < 1 || $type > 11) {
        $type = 1;
    }
    $comment = trim((string)($body['timeline_comment'] ?? ''));
    $subject = trim((string)($body['timeline_subject'] ?? ''));
    $sale = (float)($body['timeline_sale'] ?? 0);
    if ($comment === '' && $subject === '' && $sale <= 0) {
        throw new HttpException(400, 'Timeline message is required');
    }
    $timelineDate = trim((string)($body['timeline_date'] ?? ''));
    $dt = $timelineDate !== '' ? date('Y-m-d H:i:s', strtotime($timelineDate)) : null;
    $timelineId = create_timeline_entry($id, (int)$user['salesperson_id'], $type, $comment, $sale, $dt, $subject);
    json_out(['ok' => true, 'timeline_id' => $timelineId], 201);
}

function route_add_reminder(int $id): void
{
    $user = require_auth();
    assert_can_access_customer($id, $user);
    $body = json_in();
    $comment = trim((string)($body['timeline_comment'] ?? ''));
    if ($comment === '') {
        $comment = 'Follow up reminder';
    }
    $timelineDate = trim((string)($body['timeline_date'] ?? ''));
    if ($timelineDate === '') {
        throw new HttpException(400, 'Reminder date is required');
    }
    $dt = date('Y-m-d H:i:s', strtotime($timelineDate));
    $timelineId = create_timeline_entry($id, (int)$user['salesperson_id'], 5, $comment, 0.0, $dt);
    json_out(['ok' => true, 'timeline_id' => $timelineId], 201);
}

function assert_can_access_customer(int $id, array $user): void
{
    $row = one_row("SELECT customer_id, customer_salesperson FROM crm_customers WHERE customer_id=?", [$id]);
    if (!$row) {
        throw new HttpException(404, 'Customer not found');
    }
    if (!is_manager($user) && (int)$row['customer_salesperson'] !== (int)$user['salesperson_id']) {
        throw new HttpException(403, 'Not allowed for this customer');
    }
}

function create_timeline_entry(
    int $customerId,
    int $salesId,
    int $type,
    string $comment,
    float $sale,
    ?string $timelineDate = null,
    ?string $subject = null
): int {
    $dateVal = $timelineDate ?? date('Y-m-d H:i:s');
    $stmt = db()->prepare(
        "INSERT INTO crm_timeline (
            timeline_type, customer_id, existing_id, sales_id, timeline_comment, timeline_sale,
            timeline_subject, timeline_date, timeline_completed, timeline_notified, timeline_shared, timeline_mail
        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, 0, 0, 0, 0)"
    );
    $stmt->execute([
        $type,
        $customerId,
        $salesId,
        $comment,
        $sale,
        $subject ?? '',
        $dateVal,
    ]);
    return (int)db()->lastInsertId();
}

function route_notifications(): void
{
    $user = require_auth();
    if (!table_exists('crm_notifications')) {
        json_out([
            'user' => ['name' => $user['salesperson_name'] ?? ''],
            'tabs' => ['all' => 0, 'unseen' => 0, 'overdue' => 0, 'enquiries' => 0, 'tracking' => 0, 'interests' => 0],
            'active_tab' => 'all',
            'notifications' => [],
        ]);
        return;
    }
    $tab = (string)($_GET['tab'] ?? 'all');
    $salesId = (int)$user['salesperson_id'];

    $base = "FROM crm_notifications n
             LEFT JOIN crm_customers c ON n.customer_id=c.customer_id
             LEFT JOIN crm_salesperson s ON c.customer_salesperson=s.salesperson_id
             WHERE n.sales_id=?";
    $tabWhere = '';
    if ($tab === 'unseen') {
        $tabWhere = ' AND n.notification_status=0';
    } elseif ($tab === 'overdue') {
        $tabWhere = ' AND n.notification_type=1';
    } elseif ($tab === 'enquiries') {
        $tabWhere = ' AND n.notification_type=2';
    } elseif ($tab === 'tracking') {
        $tabWhere = ' AND n.notification_type=3';
    } elseif ($tab === 'interests') {
        $tabWhere = ' AND n.notification_type=4';
    }

    $rows = all_rows(
        "SELECT n.*, c.customer_name, c.customer_company, s.salesperson_name {$base}{$tabWhere} ORDER BY n.notification_date DESC LIMIT 80",
        [$salesId]
    );
    $unseen = one_row("SELECT COUNT(*) AS c FROM crm_notifications WHERE sales_id=? AND notification_status=0", [$salesId]);
    $overdue = one_row("SELECT COUNT(*) AS c FROM crm_notifications WHERE sales_id=? AND notification_type=1", [$salesId]);
    $enquiries = one_row("SELECT COUNT(*) AS c FROM crm_customers WHERE customer_salesperson=0");
    $tracking = one_row("SELECT COUNT(*) AS c FROM crm_notifications WHERE sales_id=? AND notification_type=3", [$salesId]);
    $interests = one_row("SELECT COUNT(*) AS c FROM crm_notifications WHERE sales_id=? AND notification_type=4", [$salesId]);
    $all = one_row("SELECT COUNT(*) AS c FROM crm_notifications WHERE sales_id=?", [$salesId]);

    foreach ($rows as &$n) {
        $name = trim((string)($n['customer_name'] ?? '')) !== '' ? $n['customer_name'] : ($n['customer_company'] ?? 'Customer');
        $n['title'] = notification_title((int)($n['notification_type'] ?? 0), (int)($n['notification_subtype'] ?? 0), $name);
        $n['message'] = (string)($n['notification_message'] ?? '');
        $n['notification_date_display'] = relative_time((string)($n['notification_date'] ?? ''));
    }
    unset($n);

    json_out([
        'user' => ['name' => $user['salesperson_name'] ?? ''],
        'tabs' => [
            'all' => (int)($all['c'] ?? 0),
            'unseen' => (int)($unseen['c'] ?? 0),
            'overdue' => (int)($overdue['c'] ?? 0),
            'enquiries' => (int)($enquiries['c'] ?? 0),
            'tracking' => (int)($tracking['c'] ?? 0),
            'interests' => (int)($interests['c'] ?? 0),
        ],
        'active_tab' => $tab,
        'notifications' => $rows,
    ]);
}

function notification_title(int $type, int $subtype, string $customerName): string
{
    if ($type === 1) {
        return "Reminder for {$customerName}";
    }
    if ($type === 2) {
        return $subtype === 2 ? "Assigned enquiry: {$customerName}" : "Enquiry update: {$customerName}";
    }
    if ($type === 3) {
        return "Tracking update: {$customerName}";
    }
    if ($type === 4) {
        return "Interest alert: {$customerName}";
    }
    if ($type === 5) {
        return "Timeline activity: {$customerName}";
    }
    if ($type === 6) {
        return "Email activity: {$customerName}";
    }
    if ($type === 7 || $type === 8) {
        return "Task activity: {$customerName}";
    }
    return "Notification: {$customerName}";
}

function route_ai_manager_digest(): void
{
    $user = require_auth();
    $body = json_in();
    $f = is_array($body['filters'] ?? null) ? $body['filters'] : [];
    [$where, $params] = prospect_where($f, $user);
    $whereSql = implode(' AND ', $where);

    $rows = [];
    if (table_exists('crm_customers')) {
        $rows = all_rows(
            "SELECT c.customer_id, c.customer_company, c.customer_name, c.customer_estimate, c.customer_quote, c.customer_sale, c.customer_date,
                    COALESCE(t.last_timeline_date, c.customer_date) AS last_event
             FROM crm_customers c
             LEFT JOIN (SELECT customer_id, MAX(timeline_date) AS last_timeline_date FROM crm_timeline GROUP BY customer_id) t ON c.customer_id=t.customer_id
             WHERE {$whereSql}
             ORDER BY c.customer_estimate DESC
             LIMIT 400",
            $params
        );
    }

    $now = time();
    $leads = [];
    foreach ($rows as $r) {
        $estimate = (float)($r['customer_estimate'] ?? 0);
        $quote = (float)($r['customer_quote'] ?? 0);
        $sale = (float)($r['customer_sale'] ?? 0);
        if ($sale > 0) {
            continue;
        }
        $lastEventTs = strtotime((string)($r['last_event'] ?? '')) ?: 0;
        $staleDays = $lastEventTs > 0 ? (int)floor(($now - $lastEventTs) / 86400) : 999;
        if ($staleDays < 10) {
            continue;
        }
        $score = ($estimate * 0.55) + ($quote * 0.45) + ($staleDays * 35);
        if ($estimate < 1000 && $quote < 1000) {
            continue;
        }
        $name = trim((string)($r['customer_company'] ?? '')) !== '' ? $r['customer_company'] : ($r['customer_name'] ?? 'Unknown');
        $leads[] = [
            'customer_id' => (int)$r['customer_id'],
            'customer_name' => $name,
            'score' => (int)round($score),
            'stale_days' => $staleDays,
            'estimate' => $estimate,
            'quote' => $quote,
        ];
    }

    usort($leads, static fn(array $a, array $b): int => $b['score'] <=> $a['score']);
    $top = array_slice($leads, 0, 8);
    $out = [];
    foreach ($top as $x) {
        $subject = "Quick follow-up on your sensor enquiry";
        $bodyText = "Hi {$x['customer_name']},\n\nI wanted to follow up on your sensor/measurement enquiry. We have a few options that can match your application and budget.\n\nIf helpful, I can send a short recommendation and pricing this week.\n\nBest regards,\nSales Team";
        $out[] = [
            'customer_id' => $x['customer_id'],
            'customer_name' => $x['customer_name'],
            'reason' => "High value and no recent activity ({$x['stale_days']} days).",
            'email_draft' => [
                'subject' => $subject,
                'body' => $bodyText,
            ],
        ];
    }

    json_out([
        'generated_at' => date(DATE_ATOM),
        'neglected_leads' => $out,
    ]);
}

