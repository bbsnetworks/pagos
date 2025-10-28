<?php
header('Content-Type: application/json');
include 'conexion.php';

$json   = json_decode(file_get_contents("php://input"), true);
$estado = mysqli_real_escape_string($conexion, $json['estado'] ?? 'pendiente');
$search = mysqli_real_escape_string($conexion, $json['search'] ?? '');
$mes    = (int)($json['mes']  ?? 0);  // 1..12 (0 = sin filtro)
$anio   = (int)($json['anio'] ?? 0);  // 4 dígitos (0 = sin filtro)

$where = [];

// Estado (opcional)
if ($estado !== 'todas' && in_array($estado, ['pendiente','aprobada','rechazada'], true)) {
  $where[] = "ep.estado = '$estado'";
}

// Fecha base para filtrar/ordenar (si no hay fecha_solicitud, cae a p.fecha)
$fechaBase = "COALESCE(ep.fecha_solicitud, p.fecha)";

// Filtros por mes/año usando la fecha base (solo si vienen)
if ($anio > 0) $where[] = "YEAR($fechaBase) = $anio";
if ($mes  > 0) $where[] = "MONTH($fechaBase) = $mes";

// Búsqueda libre
if ($search !== '') {
  $searchNum = ctype_digit($search) ? (int)$search : -1;
  $where[] = "
    (
      c.nombre LIKE '%$search%' OR
      ep.motivo LIKE '%$search%' OR
      u.nombre  LIKE '%$search%' OR
      ep.idpago = $searchNum OR
      DATE($fechaBase) LIKE '%$search%'
    )
  ";
}

$whereSQL = count($where) ? "WHERE " . implode(" AND ", $where) : '';

$offset = (int)($json['offset'] ?? 0);
$limit  = (int)($json['limit']  ?? 20);
if ($limit <= 0 || $limit > 200) $limit = 20;

$query = "
  SELECT 
    ep.idsolicitud,
    ep.idpago,
    ep.cliente,
    ep.solicitado_por,
    ep.fecha_solicitud,
    ep.motivo,
    ep.estado,
    c.nombre AS nombre_cliente,
    u.nombre AS solicitado_por_nombre,
    p.fecha  AS fecha_pago,
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

$solicitudes = [];
if ($res) {
  while ($row = mysqli_fetch_assoc($res)) {
    $solicitudes[] = [
      'idsolicitud'           => (int)$row['idsolicitud'],
      'idpago'                => isset($row['idpago']) ? (int)$row['idpago'] : null,
      'idcliente'             => isset($row['cliente']) ? (int)$row['cliente'] : null,
      'cliente'               => isset($row['cliente']) ? (int)$row['cliente'] : null,
      'nombre_cliente'        => $row['nombre_cliente'] ?? null,
      'solicitado_por'        => $row['solicitado_por'] ?? null,
      'solicitado_por_nombre' => $row['solicitado_por_nombre'] ?? null,
      // Enviamos ambas por si quieres ver la cruda y la base:
      'fecha_solicitud'       => $row['fecha_base'] ?? $row['fecha_solicitud'] ?? $row['fecha_pago'] ?? null,
      'fecha_pago'            => $row['fecha_pago'] ?? null,
      'mes_a_eliminar_ym'     => $row['mes_a_eliminar_ym'] ?? null,
      'motivo'                => $row['motivo'] ?? null,
      'estado'                => $row['estado'] ?? null,
    ];
  }
} else {
  // Si hubo error de SQL, devuélvelo (útil para debug)
  echo json_encode(['ok' => false, 'error' => mysqli_error($conexion), 'query' => $query]);
  exit;
}

echo json_encode($solicitudes);
