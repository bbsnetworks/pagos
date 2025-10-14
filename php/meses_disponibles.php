<?php
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);
$idcliente = $json['idcliente'] ?? 0;
$anio = date('Y');

$todos = [
  1 => 'ENERO', 2 => 'FEBRERO', 3 => 'MARZO', 4 => 'ABRIL',
  5 => 'MAYO', 6 => 'JUNIO', 7 => 'JULIO', 8 => 'AGOSTO',
  9 => 'SEPTIEMBRE', 10 => 'OCTUBRE', 11 => 'NOVIEMBRE', 12 => 'DICIEMBRE'
];

$query = "SELECT MONTH(fecha) AS mes FROM pagos 
          WHERE cliente = $idcliente AND YEAR(fecha) = $anio";

$result = mysqli_query($conexion, $query);
$pagados = [];

while ($row = mysqli_fetch_assoc($result)) {
  $pagados[] = (int)$row['mes'];
}

$pendientes = [];
foreach ($todos as $num => $nombre) {
  if (!in_array($num, $pagados)) {
    $pendientes[] = ['mes' => $num, 'nombre' => $nombre];
  }
}

echo json_encode($pendientes);
