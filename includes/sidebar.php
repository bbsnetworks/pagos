<!-- sidebar.php -->
<?php
//session_start();
$base = '/pagos'; // <-- CAMBIA esto si tu carpeta tiene otro nombre
$tipoUsuario = $_SESSION['tipo'] ?? ''; // Si no hay sesión activa, queda como cadena vacía
?>
<!-- Botón abrir menú -->
<button id="btn-sidebar" onclick="toggleSidebar()" class="fixed top-4 left-4 z-50 text-white bg-gray-800 p-2 rounded hover:bg-gray-700">
  <i class="fas fa-bars"></i>
</button>

<div id="sidebar-backdrop" class="fixed inset-0 bg-black bg-opacity-50 z-30 hidden" onclick="closeSidebar()"></div>

<div id="sidebar" class="fixed top-0 left-0 w-64 h-full bg-gray-900 p-4 z-40 transform -translate-x-full transition-transform duration-300">
  <div class="flex flex-col justify-between h-full">
    <div>
      <div class="text-white text-xl font-bold flex items-center gap-2 mb-8">
        <img src="<?= $base ?>/img/logo.png" class="w-full" alt="">
      </div>
      <nav class="space-y-4">
        <a href="<?= $base ?>/index.php" onclick="closeSidebar()" class="flex items-center gap-2 text-white hover:text-blue-400">
          <i class="fas fa-home"></i> <span>Dashboard</span>
        </a>

        <?php if ($tipoUsuario == 'root' || $tipoUsuario == 'admin'): ?>
        <a href="<?= $base ?>/vistas/solicitudes.php" class="flex items-center gap-2 text-white hover:text-blue-400">
          <i class="fa-solid fa-list"></i> <span>Solicitudes</span>
        </a>
        <?php endif; ?>

        <a href="<?= $base ?>/vistas/reporte_clientes.php" class="flex items-center gap-2 text-white hover:text-blue-400">
          <i class="fa-solid fa-file-pdf"></i> <span>Reportes</span>
        </a>

        <?php if ($tipoUsuario === 'pagos'): ?>
        <a href="<?= $base ?>/vistas/ver_mis_solicitudes.php" class="flex items-center gap-2 text-white hover:text-blue-400">
          <i class="fa-solid fa-box-archive"></i> <span>Mis Solicitudes</span>
        </a>
        <?php endif; ?>

        <a href="<?= $base ?>/../menu/index.php" class="flex items-center gap-2 text-red-400 hover:text-red-600">
          <i class="fas fa-sign-out-alt"></i> <span>Salir a Menu</span>
        </a>
      </nav>
    </div>
  </div>
</div>





