<?php
include 'conexion.php';
header('Content-Type: application/json');

$stmt = $conexion->prepare("SELECT iduser, nombre FROM users ORDER BY nombre ASC");
$stmt->execute();

$resultado = $stmt->get_result();
$usuarios = [];

while ($row = $resultado->fetch_assoc()) {
    $usuarios[] = $row;
}

echo json_encode($usuarios);
