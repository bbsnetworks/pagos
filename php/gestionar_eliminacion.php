<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);

$accion = $json['accion'] ?? '';
$idsolicitud = intval($json['idsolicitud'] ?? 0);
$idpago = intval($json['idpago'] ?? 0);

if (!$idsolicitud || !$accion) {
  echo json_encode(['ok' => false, 'message' => 'Parámetros incompletos']);
  exit;
}

if ($accion === 'aprobar') {
  // Primero eliminamos el pago
  $delete = mysqli_query($conexion, "DELETE FROM pagos WHERE idpago = $idpago");

  if ($delete) {
    // Luego actualizamos el estado de la solicitud
    $update = mysqli_query($conexion, "UPDATE eliminacion_pagos SET estado = 'aprobada' WHERE idsolicitud = $idsolicitud");

    if ($update) {
      echo json_encode(['ok' => true, 'message' => 'Pago eliminado y solicitud aprobada']);
    } else {
      echo json_encode(['ok' => false, 'message' => 'Pago eliminado, pero error al actualizar solicitud']);
    }
  } else {
    echo json_encode(['ok' => false, 'message' => 'Error al eliminar el pago']);
  }

} elseif ($accion === 'rechazar') {
  // Solo cambiamos el estado de la solicitud
  $update = mysqli_query($conexion, "UPDATE eliminacion_pagos SET estado = 'rechazada' WHERE idsolicitud = $idsolicitud");

  if ($update) {
    echo json_encode(['ok' => true, 'message' => 'Solicitud rechazada correctamente']);
  } else {
    echo json_encode(['ok' => false, 'message' => 'Error al rechazar la solicitud']);
  }

} else {
  echo json_encode(['ok' => false, 'message' => 'Acción inválida']);
}
