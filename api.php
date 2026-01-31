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
            $pdo->beginTransaction();
            $stmt = $pdo->query("SELECT * FROM player_intents ORDER BY created_at ASC");
            $intents = $stmt->fetchAll();
            if ($intents) {
                $pdo->exec("DELETE FROM player_intents"); 
            }
            $pdo->commit();
            foreach ($intents as &$intent) {
                $intent['payload'] = json_decode($intent['payload'], true);
            }
            echo json_encode($intents);
        }
        elseif ($action === 'getPublicSettings') {
            // Only return the Join URL for public clients (Spectators/Players)
            $stmt = $pdo->query("SELECT join_url FROM settings WHERE id = 1");
            $row = $stmt->fetch();
            echo json_encode(['joinUrl' => $row['join_url'] ?? '']);
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
        elseif ($action === 'login') {
            $password = $input['password'];
            $stmt = $pdo->query("SELECT * FROM settings WHERE id = 1");
            $row = $stmt->fetch();
            
            $loginSuccess = false;

            if ($row) {
                // 1. Check secure hash
                if (password_verify($password, $row['admin_password'])) {
                    $loginSuccess = true;
                }
                // 2. Check plaintext fallback (First Run / Recovery)
                elseif ($row['admin_password'] === $password) {
                    $loginSuccess = true;
                    // Auto-upgrade to secure hash
                    $newHash = password_hash($password, PASSWORD_DEFAULT);
                    $upd = $pdo->prepare("UPDATE settings SET admin_password = ? WHERE id = 1");
                    $upd->execute([$newHash]);
                }
            }
            
            if ($loginSuccess) {
                echo json_encode([
                    'success' => true, 
                    'apiKey' => $row['api_key'], 
                    'joinUrl' => $row['join_url']
                ]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Invalid password']);
            }
        }
        elseif ($action === 'updateSettings') {
            $sql = "UPDATE settings SET api_key = ?, join_url = ? WHERE id = 1";
            $params = [$input['apiKey'], $input['joinUrl']];
            
            if (!empty($input['newPassword'])) {
                $sql = "UPDATE settings SET api_key = ?, join_url = ?, admin_password = ? WHERE id = 1";
                $hash = password_hash($input['newPassword'], PASSWORD_DEFAULT);
                $params[] = $hash;
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>