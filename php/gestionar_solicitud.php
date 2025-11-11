<?php
session_start();
header('Content-Type: application/json');
require_once 'conexion.php';

$tipoUsuario = strtolower($_SESSION['tipo'] ?? '');
$idUsuario   = (int)($_SESSION['iduser'] ?? 0);

$input       = json_decode(file_get_contents('php://input'), true) ?: [];
$accion      = $input['accion'] ?? '';
$idsolicitud = (int)($input['idsolicitud'] ?? 0);

if (!$idsolicitud || !in_array($accion, ['aprobar','rechazar'], true)) {
  echo json_encode(['ok' => false, 'message' => 'Parámetros incompletos o inválidos']); exit;
}

if (!in_array($tipoUsuario, ['admin','root'], true)) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'message' => 'No tienes permisos para esta acción.']); exit;
}

// Cargar solicitud completa
$sql = "SELECT idsolicitud, idpago, estado, tipo_solicitud, monto_actual, monto_nuevo, tipo_actual, tipo_nuevo
        FROM eliminacion_pagos WHERE idsolicitud = ? LIMIT 1";
$stmt = mysqli_prepare($conexion, $sql);
mysqli_stmt_bind_param($stmt, 'i', $idsolicitud);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$sol = $res ? mysqli_fetch_assoc($res) : null;
mysqli_stmt_close($stmt);

if (!$sol) { echo json_encode(['ok'=>false,'message'=>'Solicitud no encontrada']); exit; }
if (strtolower($sol['estado']) !== 'pendiente') {
  echo json_encode(['ok'=>false,'message'=>'La solicitud ya no está pendiente']); exit;
}

$idpago = (int)$sol['idpago'];
$tipoSolicitud = strtolower($sol['tipo_solicitud'] ?? 'eliminacion');

// util: normalizar tipo pago a 1/0 si tu tabla pagos.tipo es numérica
function tipo_to_flag($v) {
  $s = strtolower((string)$v);
  if ($s === 'efectivo' || $s === '1' || $s === 'cash') return 1;
  if ($s === 'transferencia' || $s === '0' || $s === 'bank' || $s === 'transf') return 0;
  return null;
}

mysqli_begin_transaction($conexion);

try {
  if ($accion === 'rechazar') {
    $upd = mysqli_query($conexion, "UPDATE eliminacion_pagos SET estado='rechazada' WHERE idsolicitud=$idsolicitud");
    if ($upd === false) throw new Exception('Error al rechazar: '.mysqli_error($conexion));
    mysqli_commit($conexion);
    echo json_encode(['ok'=>true, 'message'=>'Solicitud rechazada correctamente']); exit;
  }

  // aprobar
  if ($tipoSolicitud === 'eliminacion') {
    $del = mysqli_query($conexion, "DELETE FROM pagos WHERE idpago=$idpago");
    if ($del === false) throw new Exception('Error al eliminar el pago: '.mysqli_error($conexion));
    if (mysqli_affected_rows($conexion) === 0) throw new Exception('El pago no existe o ya fue eliminado.');

    $upd = mysqli_query($conexion, "UPDATE eliminacion_pagos SET estado='aprobada' WHERE idsolicitud=$idsolicitud");
    if ($upd === false) throw new Exception('Error al actualizar la solicitud: '.mysqli_error($conexion));

    mysqli_commit($conexion);
    echo json_encode(['ok'=>true, 'message'=>'Pago eliminado y solicitud aprobada']); exit;
  }

  if ($tipoSolicitud === 'cambio_monto') {
    $montoNuevo = $sol['monto_nuevo'];
    if ($montoNuevo === null || $montoNuevo === '') throw new Exception('Monto nuevo no válido.');
    $montoNuevo = number_format((float)$montoNuevo, 2, '.', '');

    $u1 = mysqli_query($conexion, "UPDATE pagos SET pago = {$montoNuevo} WHERE idpago = {$idpago}");
    if ($u1 === false) throw new Exception('Error al actualizar monto: '.mysqli_error($conexion));
    if (mysqli_affected_rows($conexion) === 0) throw new Exception('No se pudo actualizar el pago (no existe o sin cambios).');

    $u2 = mysqli_query($conexion, "UPDATE eliminacion_pagos SET estado='aprobada' WHERE idsolicitud={$idsolicitud}");
    if ($u2 === false) throw new Exception('Error al actualizar solicitud: '.mysqli_error($conexion));

    mysqli_commit($conexion);
    echo json_encode(['ok'=>true, 'message'=>'Monto actualizado y solicitud aprobada']); exit;
  }

  if ($tipoSolicitud === 'cambio_tipo') {
    $nuevo = tipo_to_flag($sol['tipo_nuevo']);
    if ($nuevo === null) throw new Exception('Tipo nuevo inválido.');

    $u1 = mysqli_query($conexion, "UPDATE pagos SET tipo = {$nuevo} WHERE idpago = {$idpago}");
    if ($u1 === false) throw new Exception('Error al actualizar tipo: '.mysqli_error($conexion));
    if (mysqli_affected_rows($conexion) === 0) throw new Exception('No se pudo actualizar el pago (no existe o sin cambios).');

    $u2 = mysqli_query($conexion, "UPDATE eliminacion_pagos SET estado='aprobada' WHERE idsolicitud={$idsolicitud}");
    if ($u2 === false) throw new Exception('Error al actualizar solicitud: '.mysqli_error($conexion));

    mysqli_commit($conexion);
    echo json_encode(['ok'=>true, 'message'=>'Tipo actualizado y solicitud aprobada']); exit;
  }

  throw new Exception('Tipo de solicitud no soportado.');

} catch (Exception $e) {
  mysqli_rollback($conexion);
  echo json_encode(['ok'=>false,'message'=>$e->getMessage()]);
}
