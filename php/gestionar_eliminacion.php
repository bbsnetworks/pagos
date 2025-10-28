<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

$tipoUsuario = $_SESSION['tipo'] ?? '';
$idUsuario   = $_SESSION['iduser'] ?? null; // si guardas el id en sesión (ajústalo a tu nombre real)

$input       = json_decode(file_get_contents('php://input'), true) ?: [];
$accion      = $input['accion'] ?? '';
$idsolicitud = (int)($input['idsolicitud'] ?? 0);

if (!$idsolicitud || !in_array($accion, ['aprobar','rechazar'], true)) {
  echo json_encode(['ok' => false, 'message' => 'Parámetros incompletos o inválidos']);
  exit;
}

/* ========= Permisos =========
   - Solo admin/root pueden aprobar o rechazar.
   - Los usuarios tipo "pagos" no deben poder aprobar/rechazar.
*/
if (!in_array($tipoUsuario, ['admin','root'], true)) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'message' => 'No tienes permisos para esta acción.']);
  exit;
}

// 1) Carga la solicitud (y su pago) desde la BD
$sql = "
  SELECT ep.idsolicitud, ep.idpago, ep.estado
  FROM eliminacion_pagos ep
  WHERE ep.idsolicitud = $idsolicitud
  LIMIT 1
";
$res = mysqli_query($conexion, $sql);
if (!$res || mysqli_num_rows($res) === 0) {
  echo json_encode(['ok' => false, 'message' => 'Solicitud no encontrada']);
  exit;
}
$row = mysqli_fetch_assoc($res);

// Debe estar pendiente para poder aprobar/rechazar
if (strtolower($row['estado']) !== 'pendiente') {
  echo json_encode(['ok' => false, 'message' => 'La solicitud ya no está pendiente']);
  exit;
}

$idpago = (int)$row['idpago'];

// Inicia transacción
mysqli_begin_transaction($conexion);

try {
  if ($accion === 'aprobar') {
    // 2) Eliminar el pago (si existe). Si no existe, vuelve error claro.
    $del = mysqli_query($conexion, "DELETE FROM pagos WHERE idpago = $idpago");
    if ($del === false) {
      throw new Exception('Error al eliminar el pago: '.mysqli_error($conexion));
    }
    if (mysqli_affected_rows($conexion) === 0) {
      // no encontró el pago… puedes decidir si esto es error o seguir aprobando
      throw new Exception('El pago ya no existe o no pudo eliminarse.');
    }

    // 3) Marcar la solicitud como aprobada
    $upd = mysqli_query(
      $conexion,
      "UPDATE eliminacion_pagos 
       SET estado = 'aprobada'
       WHERE idsolicitud = $idsolicitud"
    );
    if ($upd === false) {
      throw new Exception('Error al actualizar la solicitud: '.mysqli_error($conexion));
    }

    mysqli_commit($conexion);
    echo json_encode(['ok' => true, 'message' => 'Pago eliminado y solicitud aprobada']);
    exit;
  }

  if ($accion === 'rechazar') {
    // Solo cambia estado a rechazada
    $upd = mysqli_query(
      $conexion,
      "UPDATE eliminacion_pagos 
       SET estado = 'rechazada'
       WHERE idsolicitud = $idsolicitud"
    );
    if ($upd === false) {
      throw new Exception('Error al rechazar la solicitud: '.mysqli_error($conexion));
    }

    mysqli_commit($conexion);
    echo json_encode(['ok' => true, 'message' => 'Solicitud rechazada correctamente']);
    exit;
  }

} catch (Exception $e) {
  mysqli_rollback($conexion);
  echo json_encode(['ok' => false, 'message' => $e->getMessage()]);
  exit;
}
