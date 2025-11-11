<?php
session_start();
header('Content-Type: application/json');
require_once 'conexion.php';

// --- Utilidades ---
function normTipo($v) {
  // Admite 1/0, strings varias, devuelve 'efectivo' o 'transferencia' o null
  if ($v === null || $v === '') return null;
  $s = strtolower(trim((string)$v));
  if ($s === '1' || $s === 'efectivo' || $s === 'cash') return 'efectivo';
  if ($s === '0' || $s === 'transferencia' || $s === 'transf' || $s === 'bank') return 'transferencia';
  return null;
}

function json_fail($msg, $extra = []) {
  echo json_encode(array_merge(['ok' => false, 'message' => $msg], $extra));
  exit;
}
function json_ok($msg, $extra = []) {
  echo json_encode(array_merge(['ok' => true, 'message' => $msg], $extra));
  exit;
}

// --- Payload ---
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$idpago         = (int)($input['idpago'] ?? 0);
$cliente        = (int)($input['cliente'] ?? 0);
$motivo         = trim((string)($input['motivo'] ?? ''));
$tipoSolicitud  = trim((string)($input['tipo_solicitud'] ?? 'eliminacion')); // default compat
$montoActual    = $input['monto_actual'] ?? null;
$montoNuevo     = $input['monto_nuevo'] ?? null;
$tipoActual     = normTipo($input['tipo_actual'] ?? null);
$tipoNuevo      = normTipo($input['tipo_nuevo'] ?? null);

// De sesión
$usuario = isset($_SESSION['iduser']) ? (int)$_SESSION['iduser'] : 0;

// --- Validaciones básicas ---
if (!$idpago || !$cliente || !$usuario) {
  json_fail('Datos incompletos (idpago/cliente/usuario).', [
    'idpago' => $idpago, 'cliente' => $cliente, 'usuario' => $usuario
  ]);
}
if ($motivo === '') json_fail('El motivo es obligatorio.');

$tipoSolicitud = in_array($tipoSolicitud, ['eliminacion','cambio_monto','cambio_tipo'], true)
  ? $tipoSolicitud : 'eliminacion';

// Validaciones por tipo de solicitud
if ($tipoSolicitud === 'cambio_monto') {
  if ($montoNuevo === null || !is_numeric($montoNuevo) || $montoNuevo < 0) {
    json_fail('Para "cambio_monto" debes enviar un monto_nuevo válido (>= 0).');
  }
  // Normaliza decimales
  $montoNuevo  = number_format((float)$montoNuevo, 2, '.', '');
  $montoActual = ($montoActual !== null && $montoActual !== '') ? number_format((float)$montoActual, 2, '.', '') : null;
}
if ($tipoSolicitud === 'cambio_tipo') {
  if ($tipoNuevo === null) json_fail('Para "cambio_tipo" debes enviar tipo_nuevo (efectivo/transferencia).');
  // tipoActual opcional
}

// --- Evitar duplicados pendientes para el mismo pago ---
$sqlDup = "SELECT 1 FROM eliminacion_pagos WHERE idpago = ? AND estado = 'pendiente' LIMIT 1";
if ($stmt = mysqli_prepare($conexion, $sqlDup)) {
  mysqli_stmt_bind_param($stmt, 'i', $idpago);
  mysqli_stmt_execute($stmt);
  mysqli_stmt_store_result($stmt);
  if (mysqli_stmt_num_rows($stmt) > 0) {
    mysqli_stmt_close($stmt);
    json_fail('Ya existe una solicitud PENDIENTE para este pago.');
  }
  mysqli_stmt_close($stmt);
} else {
  json_fail('Error interno (prep dup).');
}

// --- Insert ---
$sql = "INSERT INTO eliminacion_pagos
  (idpago, cliente, solicitado_por, fecha_solicitud, motivo, estado,
   tipo_solicitud, monto_actual, monto_nuevo, tipo_actual, tipo_nuevo)
  VALUES (?, ?, ?, NOW(), ?, 'pendiente', ?, ?, ?, ?, ?)";

if ($stmt = mysqli_prepare($conexion, $sql)) {
  // Tipos:
  // i = int, d = double, s = string, para NULL usa mysqli_stmt_bind_param con variables PHP y setéalas a null + usa mysqli_stmt_send_long_data? NO:
  // En mysqli, para NULL debes usar variables PHP = null y el tipo 's' está bien; pero mejor convertimos a string/float y usamos null explícito con bind_param no soporta null directo.
  // Alternativa: usar set a null con condicional y 's' con null funciona en mysqlnd (si no, usa$stmt->bind_param y luego $stmt->send_long_data). Simplificamos con cast y manejo ternario.
  // Solución robusta: usamos tipos y pasamos null como NULL real con mysqli_stmt_bind_param? PHP convierte null a '' si es 's'. Usaremos mysqli_stmt_bind_param y luego mysqli_stmt_execute con mysqli_stmt_bind_param; para NULL real, usamos set a NULL vía SQL IFNULL? Simpler: preparamos valores y si null, usamos NULL in query dinamicamente. Para evitar complicar, generamos SQL dinámico con placeholders y valores; cuando null, usamos NULL en SQL.
  mysqli_stmt_close($stmt);

  // Rehacer con SQL dinámico para manejar NULL correctamente:
  $cols = "idpago, cliente, solicitado_por, fecha_solicitud, motivo, estado, tipo_solicitud";
  $vals = "?, ?, ?, NOW(), ?, 'pendiente', ?";
  $params = [$idpago, $cliente, $usuario, $motivo, $tipoSolicitud];
  $types  = "iiiss";

  // monto_actual
  if ($montoActual !== null && $montoActual !== '') {
    $cols .= ", monto_actual"; $vals .= ", ?";
    $params[] = (float)$montoActual; $types .= "d";
  } else { $cols .= ", monto_actual"; $vals .= ", NULL"; }

  // monto_nuevo
  if ($montoNuevo !== null && $montoNuevo !== '') {
    $cols .= ", monto_nuevo"; $vals .= ", ?";
    $params[] = (float)$montoNuevo; $types .= "d";
  } else { $cols .= ", monto_nuevo"; $vals .= ", NULL"; }

  // tipo_actual
  if ($tipoActual !== null) {
    $cols .= ", tipo_actual"; $vals .= ", ?";
    $params[] = $tipoActual; $types .= "s";
  } else { $cols .= ", tipo_actual"; $vals .= ", NULL"; }

  // tipo_nuevo
  if ($tipoNuevo !== null) {
    $cols .= ", tipo_nuevo"; $vals .= ", ?";
    $params[] = $tipoNuevo; $types .= "s";
  } else { $cols .= ", tipo_nuevo"; $vals .= ", NULL"; }

  $sql2 = "INSERT INTO eliminacion_pagos ($cols) VALUES ($vals)";
  $stmt2 = mysqli_prepare($conexion, $sql2);
  if (!$stmt2) json_fail('Error interno (prep insert).');

  mysqli_stmt_bind_param($stmt2, $types, ...$params);
  $ok = mysqli_stmt_execute($stmt2);
  $err = mysqli_error($conexion);
  mysqli_stmt_close($stmt2);

  if ($ok) {
    json_ok('Solicitud enviada correctamente.');
  } else {
    json_fail('Error al registrar la solicitud.', ['db_error' => $err]);
  }
} else {
  json_fail('Error interno (prep base).');
}
