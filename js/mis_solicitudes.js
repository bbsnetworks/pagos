'use strict';

let debounceTimer;
let fetchCtrl = null; // AbortController para cargarSolicitudes()

const $ = (id) => document.getElementById(id);

// ===== Filtros =====
$("filtro-busqueda").addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => cargarSolicitudes(), 400);
});
$("select-mes").addEventListener("change", cargarSolicitudes);
$("select-anio").addEventListener("change", cargarSolicitudes);
$("select-estado").addEventListener("change", cargarSolicitudes); // << NUEVO

function generarOpcionesFecha() {
  const selectMes = $("select-mes");
  const selectAnio = $("select-anio");
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const hoy = new Date();
  selectMes.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const valor = i + 1;
    selectMes.innerHTML += `<option value="${valor}" ${valor === hoy.getMonth()+1 ? 'selected' : ''}>${meses[i]}</option>`;
  }

  const anioActual = hoy.getFullYear();
  selectAnio.innerHTML = '';
  for (let y = anioActual; y >= anioActual - 5; y--) {
    selectAnio.innerHTML += `<option value="${y}" ${y === anioActual ? 'selected' : ''}>${y}</option>`;
  }
}

// ===== Listado =====
async function cargarSolicitudes() {
  const mes    = $("select-mes").value;
  const anio   = $("select-anio").value;
  const estado = $("select-estado").value; // 'pendiente' | 'aprobada' | 'rechazada' | 'todas'
  const search = $("filtro-busqueda").value.trim();

  const contenedor = $("contenedor-solicitudes");
  contenedor.innerHTML = '<p class="text-gray-400 text-center">Cargando…</p>';

  // Cancela carga anterior
  if (fetchCtrl) { fetchCtrl.abort(); fetchCtrl = null; }
  fetchCtrl = new AbortController();

  try {
    const res = await fetch('../php/solicitudes_eliminacion.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: fetchCtrl.signal,
      cache: 'no-store',
      body: JSON.stringify({ mes, anio, estado, search }) // << PASAMOS ESTADO
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const solicitudes = await res.json();

    contenedor.innerHTML = '';
    if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
      contenedor.innerHTML = '<p class="text-gray-400 text-center">No hay solicitudes en este periodo.</p>';
      return;
    }

    solicitudes.forEach(sol => {
      const div = document.createElement("div");
      div.id = `sol-${sol.idsolicitud}`;
      div.className = "bg-gray-800 border border-gray-700 p-4 rounded";

      const estadoBadge = estadoTag(sol.estado);

      div.innerHTML = `
        <div class="flex flex-col gap-1">
          <p><strong>Cliente:</strong> ${sol.nombre_cliente} (ID ${sol.idcliente})</p>
          <p><strong>Pago ID:</strong> ${sol.idpago}</p>
          <p><strong>Motivo:</strong> ${sol.motivo}</p>
          <p><strong>Solicitado por:</strong> ${sol.solicitado_por ?? '-'}</p>
          <p><strong>Fecha:</strong> ${sol.fecha_solicitud}</p>
          <p><strong>Mes eliminado:</strong> ${formatMesAnioYM(sol.mes_a_eliminar_ym)}</p>
          <p><strong>Estado:</strong> ${estadoBadge}</p>
        </div>
        ${String(sol.estado).toLowerCase() === 'pendiente' ? `
          <div class="flex flex-wrap gap-2 mt-3">
            <button onclick="aprobarSolicitud(${sol.idsolicitud})" class="px-3 py-1 rounded bg-green-600 hover:bg-green-700">✅ Aprobar</button>
            <button onclick="rechazarSolicitud(${sol.idsolicitud})" class="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700">🚫 Rechazar</button>
            <button onclick="eliminarSolicitud(${sol.idsolicitud})" class="px-3 py-1 rounded bg-red-600 hover:bg-red-700">🗑 Eliminar solicitud</button>
          </div>
        ` : ''}
      `;
      contenedor.appendChild(div);
    });

  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error(err);
      contenedor.innerHTML = '<p class="text-red-400 text-center">Error al cargar solicitudes.</p>';
    }
  } finally {
    fetchCtrl = null;
  }
}

function estadoTag(estado) {
  const st = String(estado || '').toLowerCase();
  const map = {
    'pendiente': 'bg-slate-700 text-slate-200',
    'aprobada' : 'bg-green-700 text-white',
    'rechazada': 'bg-red-700 text-white'
  };
  const cls = map[st] || 'bg-slate-700 text-slate-200';
  return `<span class="px-2 py-0.5 rounded ${cls}">${estado}</span>`;
}

function formatMesAnioYM(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(n => parseInt(n, 10));
  if (!y || !m) return '—';
  const d = new Date(Date.UTC(y, m - 1, 15));
  return d.toLocaleString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// ===== Acciones =====
function quitarCard(idsolicitud) {
  const el = document.getElementById(`sol-${idsolicitud}`);
  if (el) el.remove();
}

async function aprobarSolicitud(idsolicitud) {
  const ok = await confirmar('¿Aprobar solicitud?', 'Se eliminará el pago correspondiente.');
  if (!ok) return;

  const res = await fetch('../php/gestionar_eliminacion.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ idsolicitud, accion: 'aprobar' }) // << endpoint real
  });
  const data = await res.json();
  Swal.fire(data.ok ? 'Aprobada' : 'Error', data.message, data.ok ? 'success' : 'error');

  if (data.ok) {
    quitarCard(idsolicitud);   // optimista
    await cargarSolicitudes(); // y sincroniza con backend (filtrando por estado)
  }
}

async function rechazarSolicitud(idsolicitud) {
  const ok = await confirmar('¿Rechazar solicitud?', 'Se mantendrá el pago sin cambios.');
  if (!ok) return;

  const res = await fetch('../php/gestionar_eliminacion.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ idsolicitud, accion: 'rechazar' })
  });
  const data = await res.json();
  Swal.fire(data.ok ? 'Rechazada' : 'Error', data.message, data.ok ? 'success' : 'error');

  if (data.ok) {
    quitarCard(idsolicitud);
    await cargarSolicitudes();
  }
}

async function eliminarSolicitud(idsolicitud) {
  const ok = await confirmar('¿Eliminar solicitud?', 'Esta acción no se puede deshacer.');
  if (!ok) return;

  const res = await fetch('../php/eliminar_solicitud.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ idsolicitud })
  });
  const data = await res.json();
  Swal.fire(data.ok ? 'Eliminada' : 'Error', data.message, data.ok ? 'success' : 'error');

  if (data.ok) {
    quitarCard(idsolicitud);
    await cargarSolicitudes();
  }
}

// ===== Helpers =====
async function confirmar(title, text) {
  const r = await Swal.fire({
    title, text, icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar'
  });
  return r.isConfirmed;
}

// ===== Arranque =====
window.onload = () => {
  generarOpcionesFecha();
  cargarSolicitudes();
};

// Exponer si usas onclick en HTML
window.aprobarSolicitud = aprobarSolicitud;
window.rechazarSolicitud = rechazarSolicitud;
window.eliminarSolicitud = eliminarSolicitud;
