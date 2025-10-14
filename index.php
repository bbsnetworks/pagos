<?php
session_start();

if (!isset($_SESSION['username'])) {
    header("Location: ../menu/login/index.php");
    exit();
}


//echo "Bienvenido, " . $_SESSION['username'];
?>
<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard de Pagos</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free/css/all.min.css" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen relative overflow-x-hidden">
<?php include('includes/sidebar.php'); ?>
  <!-- Fondo decorativo opcional -->
  <div class="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80"></div>

  


  <!-- Contenido principal -->
  <main class="relative z-10 p-6 pt-20 transition-all duration-300 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-4 text-white">Buscar Clientes</h1>

    <input
      id="buscador"
      type="text"
      placeholder="Buscar cliente..."
      class="w-full p-3 mb-4 bg-gray-800 border border-gray-700 text-white rounded focus:outline-none focus:ring focus:ring-blue-500"
      oninput="buscarClientes()"
    />

    <div id="lista-clientes" class="space-y-4"></div>

    <div class="text-center mt-6">
      <button onclick="cargarMasClientes()" class="px-5 py-2 bg-blue-600 rounded hover:bg-blue-700 transition">
        Cargar más
      </button>
    </div>
  </main>
  <!-- Modal Ver Pagos -->
<div id="modal-ver-pagos" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50">
  <div class="bg-gray-800 p-6 rounded w-full max-w-xl relative">
    <button onclick="cerrarModal('modal-ver-pagos')" class="absolute top-2 right-2 text-white text-xl">✕</button>
    <h2 class="text-2xl font-bold mb-4">Pagos del Cliente <span id="vp-id"></span></h2>
    <div class="mb-4">
      <label>Año:</label>
      <select id="vp-anio" onchange="cargarPagosAnuales()" class="bg-gray-700 border border-gray-600 rounded p-2 text-white">
        <!-- opciones JS -->
      </select>
    </div>
    <div id="vp-lista" class="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
      <!-- botones de meses -->
    </div>
  </div>
</div>

<!-- MODAL GENERAR PAGO -->
<div id="modal-generar-pago" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50">
  <div class="bg-gray-800 p-6 rounded w-full max-w-md relative">
    <button onclick="cerrarModal('modal-generar-pago')" class="absolute top-2 right-2 text-white text-xl">✕</button>
    <h2 class="text-2xl font-bold mb-4">OPCIONES DE PAGO</h2>
    <p>ID Cliente: <span id="gp-id"></span></p>

    <div class="mt-4">
      <button id="btn-pago-del-mes" onclick="confirmarPagoDelMes()" class="w-full p-3 rounded bg-green-600 hover:bg-green-700 font-bold text-white hidden">
        💵 PAGO DEL MES
      </button>
      <div id="info-pagado" class="text-center bg-gray-600 p-3 rounded font-bold text-white hidden">
        💰 MES ACTUAL YA PAGADO
      </div>

      <div id="adelantado" class="mt-4 hidden">
        <label class="block text-sm mb-1">Seleccionar mes a pagar por adelantado:</label>
        <input type="month" id="adelantado-fecha" class="bg-gray-700 text-white p-2 rounded w-full" min="">
        <button onclick="confirmarPagoAdelantado()" class="mt-2 w-full p-2 bg-blue-600 rounded hover:bg-blue-700">💳 PAGO POR ADELANTADO</button>
      </div>
    </div>

    <div class="mt-6 space-y-2 text-sm">
      <label class="flex items-center gap-2"><input type="checkbox" id="recargo"> Recargo</label>
      <label class="flex items-center gap-2"><input type="checkbox" id="descuento"> Descuento
        <input type="number" id="descuento-monto" class="ml-2 w-24 bg-gray-700 p-1 rounded text-white" disabled>
      </label>
      <label class="flex items-center gap-2"><input type="checkbox" id="descuento-especial"> Descuento Especial
        <input type="number" id="descuento-especial-monto" class="ml-2 w-24 bg-gray-700 p-1 rounded text-white" disabled>
      </label>

      <div class="mt-4">
        <label class="block mb-1">Tipo:</label>
        <label><input type="radio" name="tipo" value="1" checked> Efectivo</label>
        <label class="ml-4"><input type="radio" name="tipo" value="0"> Transferencia</label>
      </div>
    </div>
  </div>
</div>

<!-- MODAL SOLICITAR ELIMINACIÓN -->
<div id="modal-solicitud" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center hidden z-50">
  <div class="bg-gray-800 p-6 rounded w-full max-w-md relative">
    <button onclick="cerrarModal('modal-solicitud')" class="absolute top-2 right-2 text-white text-xl">✕</button>
    <h2 class="text-2xl font-bold mb-4">Solicitar eliminación de pago</h2>
    <p><strong>Mes:</strong> <span id="se-mes"></span></p>
    <p><strong>Monto:</strong> $<span id="se-monto"></span></p>

    <div class="mt-4">
      <label class="block mb-1">Motivo de eliminación:</label>
      <textarea id="se-motivo" class="w-full bg-gray-700 p-2 rounded text-white" rows="4"></textarea>
    </div>

    <div class="mt-4 text-right">
      <button onclick="enviarSolicitudEliminacion()" class="bg-red-600 px-4 py-2 rounded hover:bg-red-700">Enviar solicitud</button>
    </div>
  </div>
</div>


<script>
  const tipoUsuario = "<?= $_SESSION['tipo'] ?? '' ?>";
</script>  
<script type="module" src="js/dashboard.js"></script>

</body>

</html>


