<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);

$idpago = intval($json['idpago'] ?? 0);
$usuario = $_SESSION['tipo'] ?? '';

if (!$idpago || !in_array($usuario, ['root'])) {
  echo json_encode(['ok' => false, 'message' => 'Acceso denegado o datos incompletos']);
  exit;
}

// Buscar datos del pago antes de eliminar (opcional para respaldo o log)
$pago = mysqli_fetch_assoc(mysqli_query($conexion, "SELECT * FROM pagos WHERE idpago = $idpago LIMIT 1"));
if (!$pago) {
  echo json_encode(['ok' => false, 'message' => 'Pago no encontrado']);
  exit;
}

// Eliminar el pago
$delete = mysqli_query($conexion, "DELETE FROM pagos WHERE idpago = $idpago");

if ($delete) {
  echo json_encode(['ok' => true, 'message' => 'Pago eliminado correctamente']);
} else {
  echo json_encode(['ok' => false, 'message' => 'Error al eliminar el pago']);
}
