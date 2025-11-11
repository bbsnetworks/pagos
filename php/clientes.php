<?php
session_start();
header('Content-Type: application/json');
require_once 'conexion.php';

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$offset = (int)($input['offset'] ?? 0);
$limit  = (int)($input['limit']  ?? 20);
$search = mysqli_real_escape_string($conexion, $input['search'] ?? '');

$tipo   = strtolower($_SESSION['tipo'] ?? '');
$iduser = (int)($_SESSION['iduser'] ?? 0);

$filtro_localidades = '';

// --- Obtener permisos del usuario (si aplica) ---
$localidades = [];
if ($iduser > 0) {
  $res = mysqli_query($conexion, "SELECT permiso FROM permisos WHERE idusuario = {$iduser}");
  while ($row = mysqli_fetch_assoc($res)) {
    // cada permiso es una 'localidad'
    $localidades[] = "'" . mysqli_real_escape_string($conexion, $row['permiso']) . "'";
  }
}

// --- Política por rol ---
if ($tipo === 'pagos') {
  // pagos: Debe tener permisos; si no, no ve nada
  if (count($localidades) > 0) {
    $filtro_localidades = " AND localidad IN (" . implode(",", $localidades) . ")";
  } else {
    $filtro_localidades = " AND 1=0";
  }
} elseif ($tipo === 'admin') {
  // admin: si tiene permisos, se filtra; si no, sin filtro (ve todo)
  if (count($localidades) > 0) {
    $filtro_localidades = " AND localidad IN (" . implode(",", $localidades) . ")";
  }
} elseif ($tipo === 'root') {
  // root: sin filtro (ve todo)
  // $filtro_localidades = ''; // explícito
} else {
  // rol desconocido: por seguridad, nada
  $filtro_localidades = " AND 1=0";
}

// --- Filtro de búsqueda ---
$filtro_busqueda = '';
if ($search !== '') {
  $filtro_busqueda = "
    (
      idcliente LIKE '%{$search}%' OR
      nombre    LIKE '%{$search}%' OR
      direccion LIKE '%{$search}%' OR
      localidad LIKE '%{$search}%' OR
      nodo      LIKE '%{$search}%' OR
      ip        LIKE '%{$search}%' OR
      telefono  LIKE '%{$search}%' OR
      email     LIKE '%{$search}%' OR
      paquete   LIKE '%{$search}%'
    )
  ";
}

// --- WHERE final ---
$whereParts = [];
if ($filtro_busqueda)     $whereParts[] = $filtro_busqueda;
if ($filtro_localidades)  $whereParts[] = ltrim($filtro_localidades, ' AND');

$where = '';
if (!empty($whereParts)) {
  // Une con AND y evita doble AND al inicio
  $where = 'WHERE ' . implode(' AND ', $whereParts);
}

// --- Query ---
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
  {$where}
  ORDER BY nombre ASC
  LIMIT {$limit} OFFSET {$offset}
";

$result = mysqli_query($conexion, $query);
$clientes = [];
if ($result) {
  while ($row = mysqli_fetch_assoc($result)) {
    $clientes[] = $row;
  }
}

echo json_encode($clientes);
