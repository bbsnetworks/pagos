<?php
header('Content-Type: application/json');
include 'conexion.php';

$input  = json_decode(file_get_contents("php://input"), true) ?? [];

$estado = mysqli_real_escape_string($conexion, $input['estado'] ?? 'todas'); // ahora por defecto 'todas'
$search = mysqli_real_escape_string($conexion, $input['search'] ?? '');
$mes    = (int)($input['mes']  ?? 0);   // 1..12 (0 = sin filtro)
$anio   = (int)($input['anio'] ?? 0);   // 4 dígitos (0 = sin filtro)

$offset = (int)($input['offset'] ?? 0);
$limit  = (int)($input['limit']  ?? 20);
if ($limit <= 0 || $limit > 200) $limit = 20;

$where = [];

/** Estado (opcional) */
if ($estado !== 'todas' && in_array($estado, ['pendiente','aprobada','rechazada'], true)) {
  $where[] = "ep.estado = '$estado'";
}

/** Fecha base (para filtros y orden) */
$fechaBase = "COALESCE(ep.fecha_solicitud, p.fecha)";

/** Filtros por mes/año */
if ($anio > 0) $where[] = "YEAR($fechaBase) = $anio";
if ($mes  > 0) $where[] = "MONTH($fechaBase) = $mes";

/** Búsqueda libre ampliada:
 * - nombre del cliente, motivo, solicitante
 * - tipo_solicitud, tipo_actual, tipo_nuevo
 * - montos (actual/nuevo)
 * - idpago y fecha_base
 */
if ($search !== '') {
  $searchNum = ctype_digit($search) ? (int)$search : -1;
  $where[] = "
    (
      c.nombre LIKE '%$search%' OR
      ep.motivo LIKE '%$search%' OR
      u.nombre  LIKE '%$search%' OR
      ep.tipo_solicitud LIKE '%$search%' OR
      ep.tipo_actual LIKE '%$search%' OR
      ep.tipo_nuevo  LIKE '%$search%' OR
      CAST(ep.monto_actual AS CHAR) LIKE '%$search%' OR
      CAST(ep.monto_nuevo  AS CHAR) LIKE '%$search%' OR
      ep.idpago = $searchNum OR
      DATE($fechaBase) LIKE '%$search%'
    )
  ";
}

$whereSQL = count($where) ? "WHERE " . implode(" AND ", $where) : '';

/** Consulta:
 *  - Trae campos nuevos de eliminacion_pagos
 *  - Trae info útil del pago actual (monto y tipo)
 *  - Mantiene tu ordenación
 */
$query = "
  SELECT 
    ep.idsolicitud,
    ep.idpago,
    ep.cliente,
    ep.solicitado_por,
    ep.fecha_solicitud,
    ep.motivo,
    ep.estado,
    ep.tipo_solicitud,
    ep.monto_actual,
    ep.monto_nuevo,
    ep.tipo_actual,
    ep.tipo_nuevo,

    c.nombre AS nombre_cliente,
    u.nombre AS solicitado_por_nombre,

    p.fecha       AS fecha_pago,
    p.pago        AS pago_actual,
    p.tipo        AS pago_tipo,         -- 1/0 si tu tabla maneja eso
    CASE 
      WHEN p.tipo = 1 THEN 'efectivo'
      WHEN p.tipo = 0 THEN 'transferencia'
      ELSE NULL
    END AS pago_tipo_texto,

    $fechaBase AS fecha_base,
    DATE_FORMAT($fechaBase, '%Y-%m') AS mes_a_eliminar_ym
  FROM eliminacion_pagos ep
  LEFT JOIN clientes c ON c.idcliente = ep.cliente
  LEFT JOIN users    u ON u.iduser    = ep.solicitado_por
  LEFT JOIN pagos    p ON p.idpago    = ep.idpago
  $whereSQL
  ORDER BY FIELD(ep.estado,'pendiente','aprobada','rechazada'), $fechaBase DESC
  LIMIT $offset, $limit
";

$res = mysqli_query($conexion, $query);
if (!$res) {
  echo json_encode(['ok' => false, 'error' => mysqli_error($conexion), 'query' => $query]);
  exit;
}

$solicitudes = [];
while ($row = mysqli_fetch_assoc($res)) {
  // Normaliza floats y tipos en salida
  $monto_actual = isset($row['monto_actual']) ? (float)$row['monto_actual'] : null;
  $monto_nuevo  = isset($row['monto_nuevo'])  ? (float)$row['monto_nuevo']  : null;

  // tipo_actual/nuevo ya llegan como texto (efectivo/transferencia) por nuestro esquema
  $tipo_actual = $row['tipo_actual'] ?? null;
  $tipo_nuevo  = $row['tipo_nuevo']  ?? null;

  // pago actual/tipo desde pagos
  $pago_actual = isset($row['pago_actual']) ? (float)$row['pago_actual'] : null;
  $pago_tipo   = $row['pago_tipo_texto'] ?? null;

  $solicitudes[] = [
    'idsolicitud'           => (int)$row['idsolicitud'],
    'idpago'                => isset($row['idpago']) ? (int)$row['idpago'] : null,
    'idcliente'             => isset($row['cliente']) ? (int)$row['cliente'] : null,
    'cliente'               => isset($row['cliente']) ? (int)$row['cliente'] : null,
    'nombre_cliente'        => $row['nombre_cliente'] ?? null,
    'solicitado_por'        => isset($row['solicitado_por']) ? (int)$row['solicitado_por'] : null,
    'solicitado_por_nombre' => $row['solicitado_por_nombre'] ?? null,

    'fecha_solicitud'       => $row['fecha_base'] ?? $row['fecha_solicitud'] ?? $row['fecha_pago'] ?? null,
    'fecha_pago'            => $row['fecha_pago'] ?? null,
    'mes_a_eliminar_ym'     => $row['mes_a_eliminar_ym'] ?? null,

    'motivo'                => $row['motivo'] ?? null,
    'estado'                => $row['estado'] ?? null,

    // NUEVOS CAMPOS:
    'tipo_solicitud'        => $row['tipo_solicitud'] ?? 'eliminacion',
    'monto_actual'          => $monto_actual,
    'monto_nuevo'           => $monto_nuevo,
    'tipo_actual'           => $tipo_actual,
    'tipo_nuevo'            => $tipo_nuevo,

    // Info útil del pago actual (para tu UI):
    'pago_actual'           => $pago_actual,
    'pago_tipo'             => $pago_tipo,
  ];
}

echo json_encode($solicitudes);
