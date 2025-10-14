<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

$tipoUsuario = $_SESSION['tipo'];
$idUsuario = $_SESSION['iduser'];

$input = json_decode(file_get_contents("php://input"), true);

$mes = $input['mes'] ?? date('m');
$anio = $input['anio'] ?? date('Y');
$search = $input['search'] ?? '';
$usuarioFiltro = $input['usuario'] ?? '';
$offset = $input['offset'] ?? 0;
$limit = $input['limit'] ?? 20;

// --- Filtros
$condiciones = [];
$params = [];

if ($tipoUsuario === 'root') {
    if ($usuarioFiltro !== '' && $usuarioFiltro !== 'todos') {
        $condiciones[] = 'pagos.user = ?';
        $params[] = $usuarioFiltro;
    }
} else {
    $condiciones[] = 'pagos.user = ?';
    $params[] = $_SESSION['username'];
}

$condiciones[] = 'MONTH(pagos.fechapago) = ?';
$params[] = $mes;
$condiciones[] = 'YEAR(pagos.fechapago) = ?';
$params[] = $anio;

if (!empty($search)) {
    $condiciones[] = "(clientes.nombre LIKE ? OR clientes.ip LIKE ? OR clientes.telefono LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

$where = count($condiciones) > 0 ? 'WHERE ' . implode(' AND ', $condiciones) : '';

// ------------------------
// CONSULTA PAGOS CON LIMIT
// ------------------------

$queryDatos = "
    SELECT pagos.*, clientes.nombre, clientes.direccion, clientes.ip, clientes.localidad, clientes.telefono, clientes.paquete
    FROM pagos
    INNER JOIN clientes ON clientes.idcliente = pagos.cliente
    $where
    ORDER BY pagos.fechapago DESC
    LIMIT ?, ?
";

$stmt = $conexion->prepare($queryDatos);

// agregar offset y limit al final del array de parámetros
$paramsDatos = $params;
$paramsDatos[] = $offset;
$paramsDatos[] = $limit;

// generar tipos para bind_param (todos string excepto offset y limit que son int)
$tipos = str_repeat('s', count($params)) . 'ii';

$stmt->bind_param($tipos, ...$paramsDatos);
$stmt->execute();
$res = $stmt->get_result();

$pagos = [];
while ($row = $res->fetch_assoc()) {
    $pagos[] = $row;
}

// ------------------------
// CONSULTA TOTAL SUMADO
// ------------------------

$queryTotal = "
    SELECT SUM(CAST(pago AS DECIMAL(10,2))) as total
    FROM pagos
    INNER JOIN clientes ON clientes.idcliente = pagos.cliente
    $where
";

$stmt = $conexion->prepare($queryTotal);
$tiposTotal = str_repeat('s', count($params));
$stmt->bind_param($tiposTotal, ...$params);
$stmt->execute();
$resTotal = $stmt->get_result();
$total = $resTotal->fetch_assoc()['total'] ?? 0;

// ------------------------
// RESPUESTA JSON
// ------------------------

echo json_encode([
    "pagos" => $pagos,
    "total" => $total
]);
