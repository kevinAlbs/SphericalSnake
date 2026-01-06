<?php

require_once ("secrets.php");

echo json_encode(array('ok' => 0, 'msg' => 'Leaderboard disabled'));

// Create/open the database
$db = new SQLite3('spherical_snake.db');

function errexit($msg)
{
    global $db;
    echo json_encode([
        "ok" => 0,
        "msg" => $msg
    ]);
    $db->close();
    exit();
}

if (!isset($_POST["token"])) {
    errexit("Expected 'token' but got none");
}

// Verify token using legacy secret key.
// XXX: I attempted to use the enterprise key, but was getting HTTP 403 errors. Rather than continue investigating, I chose to use the legacy secret key.
$url = 'https://www.google.com/recaptcha/api/siteverify';
$data = array('secret' => $LEGACY_SECRET_KEY, 'response' => $_POST["token"], 'remoteip' => $_SERVER["REMOTE_ADDR"]);

// use key 'http' even if you send the request to https://...
$options = array(
    'http' => array(
        'header' => "Content-type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data)
    )
);
$context = stream_context_create($options);
$result_str = file_get_contents($url, false, $context);
if ($result_str === false) {
    errexit("Failed to send request to verify token");
}

$result = json_decode($result_str, $associative = true);
if (!$result) {
    errexit("reCaptcha response failed to JSON decode: " . $result_str);
}

$result = json_decode($result_str, $associative = true);
if (!$result) {
    errexit("reCaptcha response failed to JSON decode: " . $result_str);
}

if (!isset($result["success"])) {
    errexit("reCaptcha token did not have 'success' field.");
}

if (!$result["success"]) {
    errexit(sprintf("reCaptcha token did not succeed. Try refreshing the page and submitting again. Error codes: %s", implode($result["error-codes"])));
}

// From https://developers.google.com/recaptcha/docs/v3#interpreting_the_score:
// "By default, you can use a threshold of 0.5."
if ($result["score"] < .5) {
    errexit("reCaptcha token did not have high enough score. Try refreshing the page and submitting again.");
}

if (!isset($_POST["name"])) {
    errexit("Expected 'name' but got none");
}
$name = $_POST["name"];
if (strlen($name) > 127) {
    errexit("Expected 'name' to be <= 127 characters, got: " . strlen($name));
}

if (!isset($_POST["scoreid"])) {
    errexit("Expected 'scoreid' but got none");
}
$scoreid = $_POST["scoreid"];
if (strlen($scoreid) > 127) {
    errexit("Expected 'scoreid' to be <= 127 characters, got: " . strlen($scoreid));
}

function get_int_field($key)
{
    if (!isset($_POST[$key])) {
        errexit("Expected '" . $key . "' but got none");
    }
    if (!is_numeric($_POST[$key])) {
        errexit("Expected int '" . $key . "' but got:" . $_POST[$key]);
    }
    return intval($_POST[$key]);
}

$score = get_int_field("score");
$date = get_int_field("date");

// Create a table
$query = "CREATE TABLE IF NOT EXISTS scores (
    name TEXT,
    score INTEGER,
    scoreid TEXT,
    date INTEGER
)";
$db->exec($query);

// Check if database already has entry. 
$stmt = $db->prepare("SELECT * FROM scores WHERE scoreid=:scoreid");
$stmt->bindValue(":scoreid", $scoreid, SQLITE3_TEXT);
$res = $stmt->execute();
if ($row = $res->fetchArray()) {
    errexit("Score already saved");
}

// Insert data into the table
$stmt = $db->prepare("INSERT INTO scores (name, score, scoreid, date) VALUES (:name, :score, :scoreid, :date)");
$stmt->bindValue(":name", $name, SQLITE3_TEXT);
$stmt->bindValue(":score", $score, SQLITE3_INTEGER);
$stmt->bindValue(":scoreid", $scoreid, SQLITE3_TEXT);
$stmt->bindValue(":date", $date, SQLITE3_INTEGER);
$res = $stmt->execute();

if (!$res) {
    errexit("Failed to insert into database");
}

echo json_encode(["ok" => 1]);

// Close the database connection
$db->close();
?>