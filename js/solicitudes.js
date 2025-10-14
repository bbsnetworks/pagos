let offset = 0;
const limit = 20;
let cargando = false;

function formatearMes(fechaStr) {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
}

async function cargarSolicitudes(reset = false) {
  if (cargando) return;
  cargando = true;

  const estado = document.getElementById("filtro-estado").value;
  const search = document.getElementById("filtro-busqueda").value.trim();
  const contenedor = document.getElementById("lista-solicitudes");

  if (reset) {
    contenedor.innerHTML = '';
    offset = 0;
  }

  try {
    const res = await fetch('../php/solicitudes_eliminacion.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, search, offset, limit })
    });

    const solicitudes = await res.json();

    if (reset && solicitudes.length === 0) {
      contenedor.innerHTML = '<p class="text-center text-gray-400">No se encontraron solicitudes.</p>';
      cargando = false;
      return;
    }

    solicitudes.forEach(sol => {
      const div = document.createElement("div");
      div.className = "bg-gray-800 p-4 sm:p-5 rounded mb-4 border border-gray-700 text-sm sm:text-base break-all";
      div.innerHTML = `
        <p><strong>Cliente:</strong> ${sol.nombre_cliente || 'Desconocido'} (ID ${sol.cliente})</p>
        <p><strong>Pago ID:</strong> ${sol.idpago}</p>
        <p><strong>Motivo:</strong> ${sol.motivo}</p>
        <p><strong>Solicitado por:</strong> ${sol.solicitado_por}</p>
        <p><strong>Fecha:</strong> ${sol.fecha}</p>
        <p><strong>Mes eliminado:</strong> ${formatearMes(sol.fecha_pago)}</p>
        <p><strong>Estado:</strong> ${sol.estado}</p>
        ${sol.estado === 'pendiente' ? `
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="bg-green-600 px-4 py-2 text-sm sm:text-base rounded hover:bg-green-700 transition" onclick="aprobarSolicitud(${sol.id}, ${sol.idpago})">✅ Aprobar</button>
            <button class="bg-red-600 px-4 py-2 text-sm sm:text-base rounded hover:bg-red-700 transition" onclick="rechazarSolicitud(${sol.id})">❌ Rechazar</button>
          </div>
        ` : ''}
      `;
      contenedor.appendChild(div);
    });

    if (solicitudes.length === limit) {
      document.getElementById("cargar-mas").classList.remove("hidden");
    } else {
      document.getElementById("cargar-mas").classList.add("hidden");
    }

    offset += limit;
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="text-red-400 text-center">Error al cargar solicitudes.</p>';
  } finally {
    cargando = false;
  }
}



async function aprobarSolicitud(idsolicitud, idpago) {
  const confirm = await Swal.fire({
    title: '¿Aprobar eliminación?',
    text: 'Esto eliminará permanentemente el pago.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, aprobar'
  });

  if (confirm.isConfirmed) {
    const res = await fetch('../php/gestionar_eliminacion.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accion: 'aprobar', idsolicitud, idpago })
});

    const data = await res.json();
    Swal.fire(data.ok ? 'Éxito' : 'Error', data.message, data.ok ? 'success' : 'error');
    if (data.ok) cargarSolicitudes();
  }
}

async function rechazarSolicitud(idsolicitud) {
  const confirm = await Swal.fire({
    title: '¿Rechazar solicitud?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, rechazar'
  });

  if (confirm.isConfirmed) {
    const res = await fetch('../php/gestionar_eliminacion.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accion: 'rechazar', idsolicitud })
});

    const data = await res.json();
    Swal.fire(data.ok ? 'Rechazada' : 'Error', data.message, data.ok ? 'success' : 'error');
    if (data.ok) cargarSolicitudes();
  }
}
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const btn = document.getElementById("btn-sidebar");

  const isVisible = !sidebar.classList.contains("-translate-x-full");

  if (isVisible) {
    sidebar.classList.add("-translate-x-full");
    backdrop.classList.add("hidden");
    btn.classList.remove("hidden");
  } else {
    sidebar.classList.remove("-translate-x-full");
    backdrop.classList.remove("hidden");
    btn.classList.add("hidden");
  }
}

function closeSidebar() {
  document.getElementById("sidebar").classList.add("-translate-x-full");
  document.getElementById("sidebar-backdrop").classList.add("hidden");
  document.getElementById("btn-sidebar").classList.remove("hidden");
}
document.getElementById("filtro-estado").addEventListener("change", () => {
  cargarSolicitudes(true); // ✅ Reinicia lista
});

let debounceTimer;
document.getElementById("filtro-busqueda").addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cargarSolicitudes(true); // ✅ Reinicia lista
  }, 400);
});

window.onload = () => cargarSolicitudes(true);
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
