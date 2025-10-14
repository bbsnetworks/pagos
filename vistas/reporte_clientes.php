<?php
session_start();
if (!isset($_SESSION['username'])) {
  header("Location: login/index.php");
  exit();
}
$tipo = $_SESSION['tipo'];
$userId = $_SESSION['iduser'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte por Cliente</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="//cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css" rel="stylesheet" />
</head>
<body class="bg-gray-900 text-white">
  <?php include "../includes/sidebar.php"; ?>

  <main class="p-6 mt-16">
<!-- Dentro del <main class="ml-64 p-6"> -->

<h1 class="text-2xl font-bold mb-4">Reporte de Pagos por Cliente</h1>

<?php if ($tipo === 'root'): ?>
  <div class="mb-4">
    <label class="block text-sm mb-1">Seleccionar Usuario</label>
    <select id="filtro-usuario" class="bg-gray-800 border border-gray-700 p-2 rounded w-full max-w-sm">
      <option value="todos">Todos</option>
    </select>
  </div>
<?php endif; ?>

<div class="flex flex-wrap gap-4 mb-4">
  <div>
    <label class="block text-sm mb-1">Mes</label>
    <select id="filtro-mes" class="bg-gray-800 border border-gray-700 p-2 rounded w-40">
      <!-- Se llena con JS -->
    </select>
  </div>
  <div>
    <label class="block text-sm mb-1">Año</label>
    <select id="filtro-anio" class="bg-gray-800 border border-gray-700 p-2 rounded w-40">
      <!-- Se llena con JS -->
    </select>
    <button onclick="generarPDF()" class="mb-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
  Exportar PDF
</button>
  </div>
  <div>
    

  </div>
</div>

<div class="mb-4">
  <label class="block text-sm mb-1">Buscar Cliente</label>
  <input id="filtro-cliente" type="text" placeholder="Nombre, teléfono, IP..." class="bg-gray-800 border border-gray-700 p-2 rounded w-full max-w-md">
</div>

<div id="tabla-reportes" class="space-y-2">
  <!-- Aquí van los resultados -->
</div>

  </main>

  <script>
    const tipoUsuario = "<?php echo $tipo; ?>";
    const idUsuario = "<?php echo $userId; ?>";
  </script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"></script>
  <script src="../js/reporte_clientes.js"></script>
  <script src="../js/sidebar.js"></script>
</body>
</html>
