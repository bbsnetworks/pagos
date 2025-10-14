<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once 'conexion.php';

// --- Sesión / permisos ---
$tipo   = $_SESSION['tipo']   ?? '';
$iduser = intval($_SESSION['iduser'] ?? 0);

// Filtro por localidades (para usuarios pagos y admin con id válido)
$filtro_localidades = '';
if (($tipo === 'pagos') || ($tipo === 'admin' && $iduser > 0)) {
  $localidades = [];
  $res = mysqli_query($conexion, "SELECT permiso FROM permisos WHERE idusuario = $iduser");
  while ($row = mysqli_fetch_assoc($res)) {
    $localidades[] = "'" . mysqli_real_escape_string($conexion, $row['permiso']) . "'";
  }

  if (count($localidades) > 0) {
    $filtro_localidades = " AND localidad IN (" . implode(",", $localidades) . ")";
  } else {
    // Sin permisos asignados => no ver nada
    $filtro_localidades = " AND 1=0";
  }
}

// --- Consulta: SOLO campos necesarios para que pese poco ---
$sql = "
  SELECT
    idcliente AS id,
    nombre,
    direccion,
    localidad,
    ip,
    telefono,
    mensualidad
  FROM clientes
  WHERE 1=1
  $filtro_localidades
  ORDER BY nombre ASC
";

$result = mysqli_query($conexion, $sql);
$clientes = [];

if ($result) {
  while ($row = mysqli_fetch_assoc($result)) {
    // Casts útiles
    $row['id'] = intval($row['id']);
    $row['mensualidad'] = isset($row['mensualidad']) ? floatval($row['mensualidad']) : null;
    $clientes[] = $row;
  }
}

echo json_encode($clientes, JSON_UNESCAPED_UNICODE);
