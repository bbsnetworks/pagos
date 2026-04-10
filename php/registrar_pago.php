<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

date_default_timezone_set('America/Mexico_City');

$json = json_decode(file_get_contents("php://input"), true);

$idcliente = intval($json['idcliente'] ?? 0);
$fecha = $json['fecha'] ?? ''; // formato: YYYY-MM-01
$tipo_original = intval($json['tipo'] ?? 0); // 0 = transferencia, 1 = efectivo
$descuento = floatval($json['descuento'] ?? 0);
$user = $_SESSION['username'] ?? 'sistema';

// Validación de fecha
if (!preg_match('/^\d{4}-\d{2}-01$/', $fecha)) {
    echo json_encode(['ok' => false, 'message' => 'Fecha no válida']);
    exit;
}

// Verificar si ya existe ese mes pagado
$check = mysqli_query($conexion, "SELECT idpago FROM pagos WHERE cliente = $idcliente AND fecha = '$fecha' LIMIT 1");
if (!$check) {
    echo json_encode(['ok' => false, 'message' => 'Error al validar pagos existentes']);
    exit;
}
if (mysqli_num_rows($check) > 0) {
    echo json_encode(['ok' => false, 'message' => 'Este mes ya está pagado.']);
    exit;
}

// Obtener datos del cliente
$cli_result = mysqli_query($conexion, "SELECT nombre, direccion, localidad, paquete, mensualidad, ip, nodo FROM clientes WHERE idcliente = $idcliente LIMIT 1");
if (!$cli_result || mysqli_num_rows($cli_result) == 0) {
    echo json_encode(['ok' => false, 'message' => 'Cliente no encontrado']);
    exit;
}
$cliente = mysqli_fetch_assoc($cli_result);
$mensualidad = $cliente['mensualidad'];
$paquete = $cliente['paquete'];
$ipCliente = $cliente['ip'];
$nodoNombre = $cliente['nodo'];

// Obtener siguiente consecutivo numérico desde order_id
$sqlFolio = "
    SELECT MAX(
        CASE
            WHEN order_id REGEXP '^[0-9]+$' THEN CAST(order_id AS UNSIGNED)
            WHEN order_id REGEXP '^[A-Za-z][0-9]+$' THEN CAST(SUBSTRING(order_id, 2) AS UNSIGNED)
            ELSE 0
        END
    ) AS max_order
    FROM pagos
";
$folio_result = mysqli_query($conexion, $sqlFolio);

if (!$folio_result) {
    echo json_encode(['ok' => false, 'message' => 'Error al generar folio']);
    exit;
}

$folio_data = mysqli_fetch_assoc($folio_result);
$folio_num = intval($folio_data['max_order'] ?? 0) + 1;

// Construir order_id según tipo
// 0 = transferencia => T + número
// 1 = efectivo      => solo número
if ($tipo_original === 0) {
    $folio = 'T' . $folio_num;
} else {
    $folio = (string)$folio_num;
}

// Insertar el pago
$query = "
    INSERT INTO pagos (cliente, pago, fecha, fechapago, user, tipo, descuento, order_id)
    VALUES ($idcliente, '$mensualidad', '$fecha', NOW(), '$user', $tipo_original, '$descuento', '$folio')
";

if (mysqli_query($conexion, $query)) {

    // Activación automática
    $nodo_result = mysqli_query($conexion, "SELECT gateway, user, password, tipo FROM nodos WHERE nombre = '$nodoNombre' LIMIT 1");
    if ($nodo_result && mysqli_num_rows($nodo_result) > 0) {
        $nodo = mysqli_fetch_assoc($nodo_result);
        $nodoTipo = $nodo['tipo'];

        $ipCliente    = urlencode($cliente['ip']);
        $paquete      = urlencode($cliente['paquete']);
        $ipNodo       = urlencode($nodo['gateway']);
        $nodoUser     = urlencode($nodo['user']);
        $nodoPassword = urlencode($nodo['password']);
        $folioUrl     = urlencode($folio);

        if ($nodoTipo === 'hotspot') {
            $url = "http://b88e0bd2df17.sn.mynetname.net/mikrotik/mikrotik.php?ip_cliente=$ipCliente&ip_nodo=$ipNodo&nodo_user=$nodoUser&nodo_password=$nodoPassword&folio=$folioUrl";
        } elseif ($nodoTipo === 'pppoe') {
            $url = "http://b88e0bd2df17.sn.mynetname.net/mikrotik/mikrotik2.php?ip_cliente=$ipCliente&ip_nodo=$ipNodo&nodo_user=$nodoUser&nodo_password=$nodoPassword&paquete=$paquete&folio=$folioUrl";
        } else {
            $url = null;
        }

        if ($url) {
            $response = @file_get_contents($url);
            file_put_contents('log_activacion.txt', "URL: $url\nRespuesta: $response\n\n", FILE_APPEND);
        }
    }

    $fechaPagadaTicket = date('d/m/Y', strtotime($fecha));
    $fechaEmisionTicket = date('d/m/Y H:i');

    echo json_encode([
        'ok' => true,
        'message' => "Pago registrado para " . $cliente['nombre'],
        'ticket' => [
            'referencia' => $folio,
            'cliente' => $idcliente,
            'nombre' => $cliente['nombre'],
            'direccion' => $cliente['direccion'],
            'localidad' => $cliente['localidad'],
            'paquete' => $cliente['paquete'],
            'pago' => $mensualidad,
            'descuento' => $descuento,
            'fecha' => $fechaPagadaTicket,
            'fecha_emision' => $fechaEmisionTicket,
            'user' => $user
        ]
    ]);
} else {
    echo json_encode([
        'ok' => false,
        'message' => 'Error al guardar el pago: ' . mysqli_error($conexion)
    ]);
}