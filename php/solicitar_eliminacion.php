<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);

$idpago = intval($json['idpago'] ?? 0);
$cliente = intval($json['cliente'] ?? 0);
$motivo = trim($json['motivo'] ?? '');
$usuario = $_SESSION['iduser'] ?? 0;

// Validaciones básicas
if (!$idpago || !$cliente || !$usuario || $motivo === '') {
  echo json_encode(['ok' => false, 'message' => 'Datos incompletos']);
  file_put_contents("debug_eliminacion.txt", print_r([
  'idpago' => $idpago,
  'cliente' => $cliente,
  'motivo' => $motivo,
  'usuario' => $usuario
], true));

  exit;
}
// Validar si ya existe una solicitud para ese pago
$existe = mysqli_query($conexion, "SELECT 1 FROM eliminacion_pagos WHERE idpago = $idpago");

if (mysqli_num_rows($existe) > 0) {
  echo json_encode(['ok' => false, 'message' => 'Ya existe una solicitud de eliminación para este mes.']);
  exit;
}

// Insertar solicitud
$query = "INSERT INTO eliminacion_pagos (idpago, cliente, solicitado_por, motivo)
          VALUES ($idpago, $cliente, $usuario, '" . mysqli_real_escape_string($conexion, $motivo) . "')";

if (mysqli_query($conexion, $query)) {
  echo json_encode(['ok' => true, 'message' => 'Solicitud enviada correctamente']);
} else {
  echo json_encode(['ok' => false, 'message' => 'Error al registrar la solicitud']);
}
