<?php
session_start();
include 'conexion.php';
header('Content-Type: application/json');

$iduser = $_SESSION['iduser'] ?? 0;
$json = json_decode(file_get_contents("php://input"), true);

$mes    = intval($json['mes'] ?? date('m'));
$anio   = intval($json['anio'] ?? date('Y'));
$search = mysqli_real_escape_string($conexion, $json['search'] ?? '');

$where = "
WHERE ep.solicitado_por = $iduser
  AND MONTH(ep.fecha_solicitud) = $mes
  AND YEAR(ep.fecha_solicitud)  = $anio
";

if ($search !== '') {
  $like = "%$search%";
  $where .= " AND (
    c.nombre LIKE '$like' OR
    ep.motivo LIKE '$like' OR
    ep.idpago LIKE '$like'
  )";
}

$query = "
  SELECT
    ep.idsolicitud,
    ep.idpago,
    ep.cliente,
    DATE_FORMAT(ep.fecha_solicitud, '%Y-%m-%d %H:%i:%s') AS fecha_solicitud,
    ep.motivo,
    ep.estado,
    c.nombre AS nombre_cliente,

    -- Campo original por si lo necesitas
    p.fechapago,

    -- Mes a eliminar (el de la columna p.fecha) en dos formatos útiles:
    p.fecha AS fecha_pago,                                 -- YYYY-MM-DD
    DATE_FORMAT(p.fecha, '%Y-%m') AS mes_a_eliminar_ym     -- YYYY-MM
  FROM eliminacion_pagos ep
  LEFT JOIN clientes c ON c.idcliente = ep.cliente
  LEFT JOIN pagos    p ON p.idpago    = ep.idpago
  $where
  ORDER BY ep.fecha_solicitud DESC
";

$res = mysqli_query($conexion, $query);
$data = [];
while ($row = mysqli_fetch_assoc($res)) {
  $data[] = $row;
}
echo json_encode($data);
