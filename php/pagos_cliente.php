<?php
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);
$idcliente = intval($json['idcliente'] ?? 0);
$anio = intval($json['anio'] ?? date('Y'));

// Incluir también el campo `descuento`
$query = "SELECT idpago, fecha, pago, descuento FROM pagos 
          WHERE cliente = $idcliente AND YEAR(fecha) = $anio";

$result = mysqli_query($conexion, $query);
$pagos = [];

while ($row = mysqli_fetch_assoc($result)) {
  $pagos[] = $row;
}

echo json_encode($pagos);

