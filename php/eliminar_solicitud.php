<?php
session_start();
include 'conexion.php';
header('Content-Type: application/json');

$iduser = $_SESSION['iduser'] ?? 0;
$json = json_decode(file_get_contents("php://input"), true);
$idsolicitud = intval($json['idsolicitud'] ?? 0);

$res = mysqli_query($conexion, "DELETE FROM eliminacion_pagos WHERE idsolicitud = $idsolicitud AND solicitado_por = $iduser AND estado = 'pendiente'");
echo json_encode([
  'ok' => $res,
  'message' => $res ? 'Solicitud eliminada.' : 'No se pudo eliminar. Verifica que esté pendiente.'
]);
