let debounceTimer;
document.getElementById("filtro-busqueda").addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cargarSolicitudes(true); // con reset
  }, 400);
});

function generarOpcionesFecha() {
  const selectMes = document.getElementById("select-mes");
  const selectAnio = document.getElementById("select-anio");
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const hoy = new Date();
  for (let i = 0; i < 12; i++) {
    const valor = i + 1;
    selectMes.innerHTML += `<option value="${valor}" ${valor === hoy.getMonth()+1 ? 'selected' : ''}>${meses[i]}</option>`;
  }

  const anioActual = hoy.getFullYear();
  for (let y = anioActual; y >= anioActual - 5; y--) {
    selectAnio.innerHTML += `<option value="${y}" ${y === anioActual ? 'selected' : ''}>${y}</option>`;
  }
}

async function cargarSolicitudes() {
  const mes = document.getElementById("select-mes").value;
  const anio = document.getElementById("select-anio").value;
  const contenedor = document.getElementById("contenedor-solicitudes");
  contenedor.innerHTML = '';
  const search = document.getElementById("filtro-busqueda").value.trim();


  const res = await fetch('../php/mis_solicitudes.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mes, anio,search })
  });

  const solicitudes = await res.json();

  if (solicitudes.length === 0) {
    contenedor.innerHTML = '<p class="text-gray-400 text-center">No hay solicitudes en este periodo.</p>';
    return;
  }

  solicitudes.forEach(sol => {
    const div = document.createElement("div");
    div.className = "bg-gray-800 border border-gray-700 p-4 rounded";
    div.innerHTML = `
  <p><strong>Cliente:</strong> ${sol.nombre_cliente}</p>
  <p><strong>Pago ID:</strong> ${sol.idpago}</p>
  <p><strong>Fecha:</strong> ${sol.fecha_solicitud}</p>
  <p><strong>Mes eliminado:</strong> ${formatMesAnioYM(sol.mes_a_eliminar_ym)}</p>
  <p><strong>Motivo:</strong> ${sol.motivo}</p>
  <p><strong>Estado:</strong> ${sol.estado}</p>
  ${sol.estado === 'pendiente' ? `
    <button onclick="eliminarSolicitud(${sol.idsolicitud})" class="mt-2 px-4 py-1 bg-red-600 rounded hover:bg-red-700">🗑 Eliminar Solicitud</button>
  ` : ''}
`;
    contenedor.appendChild(div);
  });
}
function formatMesAnioYM(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(n => parseInt(n, 10));
  if (!y || !m) return '—';
  const d = new Date(Date.UTC(y, m - 1, 15)); // UTC para evitar desfases
  return d.toLocaleString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
async function eliminarSolicitud(idsolicitud) {
  const confirm = await Swal.fire({
    title: '¿Eliminar solicitud?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar'
  });

  if (!confirm.isConfirmed) return;

  const res = await fetch('../php/eliminar_solicitud.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idsolicitud })
  });

  const data = await res.json();
  Swal.fire(data.ok ? 'Eliminada' : 'Error', data.message, data.ok ? 'success' : 'error');
  if (data.ok) cargarSolicitudes();
}

document.getElementById("select-mes").addEventListener("change", cargarSolicitudes);
document.getElementById("select-anio").addEventListener("change", cargarSolicitudes);

window.onload = () => {
  generarOpcionesFecha();
  cargarSolicitudes();
};

