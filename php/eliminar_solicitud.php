<?php
session_start();
require_once 'conexion.php';
header('Content-Type: application/json');

$userId  = (int)($_SESSION['iduser'] ?? 0);
$userRol = strtolower($_SESSION['tipo'] ?? '');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$ids   = (int)($input['idsolicitud'] ?? 0);

if ($userId <= 0 || $ids <= 0) {
  echo json_encode(['ok' => false, 'message' => 'Datos incompletos']); exit;
}

// 1) Traer la solicitud
$sqlSel = "SELECT idsolicitud, solicitado_por, estado FROM eliminacion_pagos WHERE idsolicitud = ?";
$stmt   = mysqli_prepare($conexion, $sqlSel);
if (!$stmt) { echo json_encode(['ok'=>false,'message'=>'Error interno (prep sel)']); exit; }
mysqli_stmt_bind_param($stmt, 'i', $ids);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$row = $res ? mysqli_fetch_assoc($res) : null;
mysqli_stmt_close($stmt);

if (!$row) {
  echo json_encode(['ok' => false, 'message' => 'Solicitud no encontrada']); exit;
}
if (strtolower($row['estado']) !== 'pendiente') {
  echo json_encode(['ok' => false, 'message' => 'Solo se pueden eliminar solicitudes pendientes']); exit;
}

// 2) Autorización: dueño o admin/root
$esDueno = ((int)$row['solicitado_por'] === $userId);
$esAdmin = in_array($userRol, ['admin','root'], true);
if (!$esDueno && !$esAdmin) {
  echo json_encode(['ok' => false, 'message' => 'No autorizado']); exit;
}

// 3) Borrar
$sqlDel = "DELETE FROM eliminacion_pagos WHERE idsolicitud = ? LIMIT 1";
$stmtD  = mysqli_prepare($conexion, $sqlDel);
if (!$stmtD) { echo json_encode(['ok'=>false,'message'=>'Error interno (prep del)']); exit; }
mysqli_stmt_bind_param($stmtD, 'i', $ids);
mysqli_stmt_execute($stmtD);

$ok  = (mysqli_stmt_affected_rows($stmtD) === 1);
$err = mysqli_error($conexion);
mysqli_stmt_close($stmtD);

echo json_encode([
  'ok' => $ok,
  'message' => $ok ? 'Solicitud eliminada.' : ('No se pudo eliminar.' . ($err ? " ($err)" : ''))
]);
