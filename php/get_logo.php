<?php
$logoPath = '../includes/logo.txt';

if (file_exists($logoPath)) {
    $base64 = trim(file_get_contents($logoPath));
    echo json_encode(["logo" => $base64]);
} else {
    echo json_encode(["logo" => null]);
}
