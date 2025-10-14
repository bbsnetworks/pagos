<?php
session_start();
header('Content-Type: application/json');
include 'conexion.php';

$json = json_decode(file_get_contents("php://input"), true);
$offset = $json["offset"] ?? 0;
$limit = $json["limit"] ?? 20;
$search = mysqli_real_escape_string($conexion, $json["search"] ?? '');

$usuario = $_SESSION['user'] ?? '';
$tipo = $_SESSION['tipo'] ?? '';
$iduser = $_SESSION['iduser'] ?? 0;

$filtro_localidades = '';

// Solo aplicar el filtro si es usuario tipo "pagos"
if ($tipo === 'pagos' || $tipo === 'admin' && $iduser > 0) {
  $localidades = [];
  $res = mysqli_query($conexion, "SELECT permiso FROM permisos WHERE idusuario = $iduser");
  while ($row = mysqli_fetch_assoc($res)) {
    $localidades[] = "'" . mysqli_real_escape_string($conexion, $row['permiso']) . "'";
  }

  if (count($localidades) > 0) {
    $filtro_localidades = " AND localidad IN (" . implode(",", $localidades) . ")";
  } else {
    // No tiene permisos asignados
    $filtro_localidades = " AND 1=0";
  }
}

// Búsqueda
$filtro_busqueda = '';
if ($search) {
  $filtro_busqueda = "
    (
      idcliente LIKE '%$search%' OR
      nombre LIKE '%$search%' OR
      direccion LIKE '%$search%' OR
      localidad LIKE '%$search%' OR
      nodo LIKE '%$search%' OR
      ip LIKE '%$search%' OR
      telefono LIKE '%$search%' OR
      email LIKE '%$search%' OR
      paquete LIKE '%$search%'
    )
  ";
}

// Componer cláusula WHERE
$where = '';
if ($filtro_busqueda && $filtro_localidades) {
  $where = "WHERE $filtro_busqueda $filtro_localidades";
} elseif ($filtro_busqueda) {
  $where = "WHERE $filtro_busqueda";
} elseif ($filtro_localidades) {
  $where = "WHERE 1=1 $filtro_localidades";
}

// Consulta principal
$query = "
  SELECT 
    idcliente AS id,
    nombre,
    direccion,
    localidad,
    nodo,
    ip,
    mensualidad,
    telefono,
    email,
    paquete
  FROM clientes
  $where
  ORDER BY nombre ASC
  LIMIT $limit OFFSET $offset
";

$result = mysqli_query($conexion, $query);
$clientes = [];

while ($row = mysqli_fetch_assoc($result)) {
  $clientes[] = $row;
}

echo json_encode($clientes);
