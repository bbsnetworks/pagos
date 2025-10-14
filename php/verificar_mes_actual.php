<?php
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);
$idcliente = $json["idcliente"] ?? 0;
$hoy = date('Y-m-01');

$check = mysqli_query($conexion, "SELECT idpago FROM pagos WHERE cliente = $idcliente AND fecha = '$hoy'");
$pagado = mysqli_num_rows($check) > 0;

echo json_encode(['pagado' => $pagado]);
