<?php
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);
$estado = mysqli_real_escape_string($conexion, $json['estado'] ?? 'pendiente');
$search = mysqli_real_escape_string($conexion, $json['search'] ?? '');

$where = [];

if ($estado !== 'todas' && in_array($estado, ['pendiente', 'aprobada', 'rechazada'])) {
  $where[] = "ep.estado = '$estado'";
}

if ($search !== '') {
  $where[] = "
    (
      ep.motivo LIKE '%$search%' OR
      ep.cliente LIKE '%$search%' OR
      ep.idpago LIKE '%$search%' OR
      u.nombre LIKE '%$search%' OR
      DATE(ep.fecha_solicitud) LIKE '%$search%' OR
      c.nombre LIKE '%$search%'
    )
  ";
}

$whereSQL = count($where) ? "WHERE " . implode(" AND ", $where) : '';

$offset = intval($json['offset'] ?? 0);
$limit = intval($json['limit'] ?? 20); // por default, 20 registros

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
    u.nombre AS nombre_usuario,
    p.fecha AS fecha_pago
  FROM eliminacion_pagos ep
  LEFT JOIN clientes c ON c.idcliente = ep.cliente
  LEFT JOIN users u ON u.iduser = ep.solicitado_por
  LEFT JOIN pagos p ON p.idpago = ep.idpago
  $whereSQL
  ORDER BY ep.fecha_solicitud DESC
";



$result = mysqli_query($conexion, $query);
$solicitudes = [];

while ($row = mysqli_fetch_assoc($result)) {
  $solicitudes[] = [
    'id' => $row['idsolicitud'],
    'idpago' => $row['idpago'],
    'cliente' => $row['cliente'],
    'fecha_pago' => $row['fecha_pago'],
    'nombre_cliente' => $row['nombre_cliente'],
    'solicitado_por' => $row['nombre_usuario'],
    'fecha' => $row['fecha_solicitud'],
    'motivo' => $row['motivo'],
    'estado' => $row['estado'],
  ];
}

echo json_encode($solicitudes);
