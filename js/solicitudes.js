let offset = 0;
const limit = 20;
let cargando = false;

// === helpers de formato ===
const fmtMoney = (n) =>
  n == null || isNaN(n) ? "—" : `$${Number(n).toFixed(2)}`;
const tipoChip = (t) => {
  const map = {
    eliminacion: "bg-red-900/60 text-red-200 border border-red-700",
    cambio_monto: "bg-amber-900/50 text-amber-200 border border-amber-700",
    cambio_tipo: "bg-blue-900/50 text-blue-200 border border-blue-700",
  };
  const cls =
    map[String(t || "").toLowerCase()] ||
    "bg-slate-800 text-slate-200 border border-slate-700";
  const label =
    t === "cambio_monto"
      ? "Cambio de monto"
      : t === "cambio_tipo"
      ? "Cambio de tipo"
      : "Eliminación";
  return `<span class="px-2 py-0.5 rounded text-xs font-semibold ${cls}">${label}</span>`;
};

const tipoBadge = (txt, extraCls = "") =>
  `<span class="px-2 py-0.5 rounded text-xs font-medium ${extraCls}">${txt}</span>`;

const tipoPagoChip = (txt) => {
  const t = String(txt || "").toLowerCase();
  if (t === "efectivo" || t === "1")
    return tipoBadge(
      "Efectivo",
      "bg-emerald-800/50 text-emerald-200 border border-emerald-700"
    );
  if (t === "transferencia" || t === "0")
    return tipoBadge(
      "Transferencia",
      "bg-indigo-800/50 text-indigo-200 border border-indigo-700"
    );
  return tipoBadge("—", "bg-slate-700 text-slate-200");
};

// Bloques específicos por tipo de solicitud
function bloquePorTipo(sol) {
  const ts = String(sol.tipo_solicitud || 'eliminacion').toLowerCase();

  // --- CAMBIO DE MONTO ---
  if (ts === 'cambio_monto') {
    const actual = (sol.monto_actual != null) ? sol.monto_actual : sol.pago_actual;
    const nuevo  = (sol.monto_nuevo  != null) ? sol.monto_nuevo  : null;

    return `
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-lg bg-gray-900/50 border border-gray-700 p-3">
          <div class="text-xs uppercase text-gray-400 mb-1">Monto actual</div>
          <div class="text-lg font-semibold line-through decoration-red-400">${fmtMoney(actual)}</div>
        </div>
        <div class="rounded-lg bg-amber-900/20 border border-amber-700 p-3">
          <div class="text-xs uppercase text-amber-300 mb-1">Monto propuesto</div>
          <div class="text-lg font-bold text-amber-200">${fmtMoney(nuevo)}</div>
        </div>
      </div>
    `;
  }

  // --- CAMBIO DE TIPO ---
  if (ts === 'cambio_tipo') {
    // usa lo que venga: explícito de la solicitud o lo que trae el pago
    const tActual = sol.tipo_actual ?? sol.pago_tipo ?? sol.pago_tipo_texto ?? '—';
    const tNuevo  = sol.tipo_nuevo  ?? '—';

    return `
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="rounded-lg bg-gray-900/50 border border-gray-700 p-3">
          <div class="text-xs uppercase text-gray-400 mb-1">Tipo actual</div>
          <div class="text-lg font-semibold">${tipoPagoChip(tActual)}</div>
        </div>
        <div class="rounded-lg bg-blue-900/20 border border-blue-700 p-3">
          <div class="text-xs uppercase text-blue-200 mb-1">Tipo propuesto</div>
          <div class="text-lg font-semibold">${tipoPagoChip(tNuevo)}</div>
        </div>
      </div>
    `;
  }

  // --- ELIMINACIÓN (resumen del pago) ---
  return `
    <div class="mt-3 grid grid-cols-2 gap-3">
      <div class="rounded-lg bg-gray-900/50 border border-gray-700 p-3">
        <div class="text-xs uppercase text-gray-400 mb-1">Monto</div>
        <div class="text-lg font-semibold">${fmtMoney(sol.pago_actual)}</div>
      </div>
      <div class="rounded-lg bg-gray-900/50 border border-gray-700 p-3">
        <div class="text-xs uppercase text-gray-400 mb-1">Tipo</div>
        <div class="text-lg font-semibold">${tipoPagoChip(sol.pago_tipo || sol.pago_tipo_texto)}</div>
      </div>
    </div>
  `;
}


function formatearMes(fechaStr) {
  if (!fechaStr) return "—";
  // Acepta "YYYY-MM-DD" o "YYYY-MM"
  const [y, m = 1, d = 1] = fechaStr.split(/[-T]/).map(Number);
  const fecha = new Date(y, m - 1, d); // ← local, sin desfase
  return fecha.toLocaleString("es-MX", { month: "long", year: "numeric" });
}

// Card (reemplaza el innerHTML que hoy construyes)
function renderSolicitudCard(sol) {
  const mesTxt = formatearMes(sol.fecha_pago || sol.mes_a_eliminar_ym);
  const fechaTxt = sol.fecha_solicitud ?? sol.fecha ?? sol.fecha_pago ?? "—";
  const chipTipo = tipoChip(sol.tipo_solicitud);

  // acciones (mantén tu lógica)
  const acciones =
    sol.estado === "pendiente"
      ? `
    <div class="mt-4 flex flex-wrap gap-2">
      <button class="bg-green-600 px-4 py-2 text-sm sm:text-base rounded hover:bg-green-700 transition"
              onclick="aprobarSolicitud(${sol.idsolicitud}, ${sol.idpago})">✅ Aprobar</button>
      <button class="bg-red-600 px-4 py-2 text-sm sm:text-base rounded hover:bg-red-700 transition"
              onclick="rechazarSolicitud(${sol.idsolicitud})">❌ Rechazar</button>
    </div>`
      : "";

  return `
  <div class="relative overflow-hidden rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-850 p-4 sm:p-5 shadow-sm">
    <div class="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-sm text-gray-300">${chipTipo}</span>
          <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">${
            sol.estado
          }</span>
        </div>
        <div class="text-base sm:text-lg font-semibold">${
          sol.nombre_cliente || "Desconocido"
        } <span class="text-gray-400 text-sm">(ID ${sol.cliente})</span></div>
        <div class="text-gray-400 text-sm">Pago ID: <span class="font-mono">${
          sol.idpago ?? "—"
        }</span></div>
      </div>
    </div>

    <div class="mt-2 text-sm sm:text-base text-gray-200">
      <p><span class="font-semibold">Motivo:</span> ${sol.motivo ?? "—"}</p>
      <p><span class="font-semibold">Solicitado por:</span> ${
        sol.solicitado_por_nombre ?? sol.solicitado_por ?? "—"
      }</p>
      <p><span class="font-semibold">Fecha:</span> ${fechaTxt}</p>
      <p><span class="font-semibold">Mes afectado:</span> ${mesTxt}</p>
    </div>

    ${bloquePorTipo(sol)}
    ${acciones}
  </div>
  `;
}

async function cargarSolicitudes(reset = false) {
  if (cargando) return;
  cargando = true;

  const estado = document.getElementById("filtro-estado").value;
  const search = document.getElementById("filtro-busqueda").value.trim();
  const contenedor = document.getElementById("lista-solicitudes");

  if (reset) {
    contenedor.innerHTML = "";
    offset = 0;
  }

  try {
    const res = await fetch("../php/solicitudes_eliminacion.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, search, offset, limit })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const solicitudes = await res.json();

    if (reset && (!Array.isArray(solicitudes) || solicitudes.length === 0)) {
      contenedor.innerHTML = '<p class="text-center text-gray-400">No se encontraron solicitudes.</p>';
      cargando = false;
      document.getElementById("cargar-mas").classList.add("hidden");
      return;
    }

    // 👇 AQUI el loop — OJO: "sol" solo existe dentro de esta función de callback
    solicitudes.forEach((sol) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = renderSolicitudCard(sol);   // <-- sol definido aquí
      contenedor.appendChild(wrapper.firstElementChild);
    });

    // paginación
    if (Array.isArray(solicitudes) && solicitudes.length === limit) {
      document.getElementById("cargar-mas").classList.remove("hidden");
      offset += limit;
    } else {
      document.getElementById("cargar-mas").classList.add("hidden");
    }
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = '<p class="text-red-400 text-center">Error al cargar solicitudes.</p>';
  } finally {
    cargando = false;
  }
}


async function aprobarSolicitud(idsolicitud, idpago) {
  const confirm = await Swal.fire({
    title: "¿Aprobar eliminación?",
    text: "Esto eliminará permanentemente el pago.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, aprobar",
  });

  if (confirm.isConfirmed) {
    const res = await fetch("../php/gestionar_solicitud.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar", idsolicitud, idpago }),
    });

    const data = await res.json();
    Swal.fire(
      data.ok ? "Éxito" : "Error",
      data.message,
      data.ok ? "success" : "error"
    );
    if (data.ok) location.reload();
  }
}

async function rechazarSolicitud(idsolicitud) {
  const confirm = await Swal.fire({
    title: "¿Rechazar solicitud?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, rechazar",
  });

  if (confirm.isConfirmed) {
    const res = await fetch("../php/gestionar_solicitud.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", idsolicitud }),
    });

    const data = await res.json();
    Swal.fire(
      data.ok ? "Rechazada" : "Error",
      data.message,
      data.ok ? "success" : "error"
    );
    if (data.ok) location.reload();
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
