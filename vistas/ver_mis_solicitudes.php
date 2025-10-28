<?php
session_start();
if (($_SESSION['tipo'] ?? '') !== 'pagos') {
  header("Location: ../index.php");
  exit;
}
?>
<!DOCTYPE html>
<html lang="es" class="dark">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mis Solicitudes</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css" rel="stylesheet" />
</head>

<body class="bg-gray-900 text-white p-6">
  <?php include('../includes/sidebar.php'); ?>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-xl font-bold mb-4">Mis Solicitudes de Eliminación</h1>
    <div class="flex gap-4 mb-4">
      <select id="select-mes" class="bg-gray-800 border border-gray-600 rounded p-2">
        <!-- Opciones de mes generadas por JS -->
      </select>
      <select id="select-anio" class="bg-gray-800 border border-gray-600 rounded p-2">
        <!-- Opciones de año generadas por JS -->
      </select>
      <select id="select-estado" class="bg-gray-800 border border-gray-600 rounded p-2">
        <option value="pendiente" selected>Pendientes</option>
        <option value="aprobada">Aprobadas</option>
        <option value="rechazada">Rechazadas</option>
        <option value="todas">Todas</option>
      </select>
    </div>
    <div class="mt-4 lg:mt-0 mb-4">
      <input type="text" id="filtro-busqueda" placeholder="Buscar por cliente, motivo, pago..."
        class="bg-gray-800 text-white p-2 text-sm sm:text-base rounded border border-gray-600 w-full sm:w-72">
    </div>

    <div id="contenedor-solicitudes" class="space-y-4"></div>
  </div>
  <script src="../js/mis_solicitudes_v2.js"></script>
  <script src="../js/sidebar.js"></script>
</body>

</html>