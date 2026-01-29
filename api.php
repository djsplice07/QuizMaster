<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// --- CONFIGURATION ---
$host = 'localhost';
$db   = 'quiz_db'; // CHANGE THIS
$user = 'root';    // CHANGE THIS
$pass = '';        // CHANGE THIS
$charset = 'utf8mb4';

// --- DB CONNECTION ---
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Fallback for when DB isn't configured yet so app doesn't crash completely
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'getState') {
            $stmt = $pdo->query("SELECT game_data FROM game_state WHERE id = 1");
            $row = $stmt->fetch();
            echo $row['game_data'] ?: '{}';
        } 
        elseif ($action === 'getIntents') {
            // Transaction to read and delete to ensure processed once
            $pdo->beginTransaction();
            $stmt = $pdo->query("SELECT * FROM player_intents ORDER BY created_at ASC");
            $intents = $stmt->fetchAll();
            if ($intents) {
                $pdo->exec("DELETE FROM player_intents"); // Clear queue after reading
            }
            $pdo->commit();
            
            // Parse payloads
            foreach ($intents as &$intent) {
                $intent['payload'] = json_decode($intent['payload'], true);
            }
            echo json_encode($intents);
        }
    } 
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action === 'pushState') {
            $data = json_encode($input);
            $stmt = $pdo->prepare("UPDATE game_state SET game_data = ? WHERE id = 1");
            $stmt->execute([$data]);
            echo json_encode(['success' => true]);
        } 
        elseif ($action === 'pushIntent') {
            $type = $input['type'];
            $payload = json_encode($input['payload']);
            $stmt = $pdo->prepare("INSERT INTO player_intents (type, payload) VALUES (?, ?)");
            $stmt->execute([$type, $payload]);
            echo json_encode(['success' => true]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>