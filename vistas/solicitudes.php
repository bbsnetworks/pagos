<?php
session_start();
if (!in_array($_SESSION['tipo'] ?? '', ['root'])) {
  header("Location: ../index.php");
  exit;
}
?>
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solicitudes de Eliminación</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css" rel="stylesheet" />

</head>
<body class="bg-gray-900 text-white p-6">
  <?php include('../includes/sidebar.php'); ?>
  <div class="p-4 max-w-4xl mx-auto mt-12">
  <h1 class="text-xl lg:text-2xl font-bold text-white mb-4">Solicitudes de Eliminación</h1>

  <!-- Filtros -->
  <div class="grid grid-cols-1 lg:grid-cols-2 sm:flex-row sm:items-center gap-2 mb-4">
    <div class="flex items-center gap-2">
      <label class="text-xl mr-2 lg:mr-0 lg:text-sm text-white">Filtrar por estado:</label>
      <select id="filtro-estado" class="bg-gray-800 text-white p-2 text-sm sm:text-base rounded border border-gray-600 w-full sm:w-auto">
        <option value="pendiente">Pendientes</option>
        <option value="aprobada">Aprobadas</option>
        <option value="rechazada">Rechazadas</option>
        <option value="todas">Todas</option>
      </select>
    </div>
    <div>
      <input id="filtro-busqueda" type="text" placeholder="Buscar..." class="bg-gray-800 text-white p-2 text-sm sm:text-base rounded border border-gray-600 w-full sm:w-72">
    </div>
  </div>

  <!-- Lista -->
  <div id="lista-solicitudes" class="space-y-4">
    <!-- Aquí se insertan las solicitudes con JS -->
  </div>
  <div class="text-center mt-4">
  <button id="cargar-mas" class="hidden bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onclick="cargarSolicitudes()">Cargar más</button>
</div>
</div>


  <script src="../js/solicitudes.js"></script>
</body>
</html>
