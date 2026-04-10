<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

date_default_timezone_set('America/Mexico_City');

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

$idpago = intval($data['idpago'] ?? 0);

if ($idpago <= 0) {
    echo json_encode([
        'ok' => false,
        'message' => 'ID de pago inválido'
    ]);
    exit;
}

$sql = "
    SELECT 
        p.idpago,
        p.cliente,
        p.pago,
        p.fecha,
        p.fechapago,
        p.user,
        p.tipo,
        p.descuento,
        p.order_id,
        c.nombre,
        c.direccion,
        c.localidad,
        c.paquete
    FROM pagos p
    INNER JOIN clientes c ON c.idcliente = p.cliente
    WHERE p.idpago = $idpago
    LIMIT 1
";

$res = mysqli_query($conexion, $sql);

if (!$res) {
    echo json_encode([
        'ok' => false,
        'message' => 'Error al consultar el pago: ' . mysqli_error($conexion)
    ]);
    exit;
}

if (mysqli_num_rows($res) === 0) {
    echo json_encode([
        'ok' => false,
        'message' => 'Pago no encontrado'
    ]);
    exit;
}

$pago = mysqli_fetch_assoc($res);

$fechaPagadaTicket = !empty($pago['fecha'])
    ? date('d/m/Y', strtotime($pago['fecha']))
    : '';

echo json_encode([
    'ok' => true,
    'ticket' => [
        'referencia' => $pago['cliente'] ?? '',
        'cliente' => $pago['cliente'],
        'nombre' => $pago['nombre'],
        'direccion' => $pago['direccion'],
        'localidad' => $pago['localidad'],
        'paquete' => $pago['paquete'],
        'pago' => $pago['pago'],
        'descuento' => $pago['descuento'],
        'fecha' => $fechaPagadaTicket,
        'user' => $pago['user']
    ]
]);