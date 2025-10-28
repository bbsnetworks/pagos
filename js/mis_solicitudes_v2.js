"use strict";

// ===== Diagnóstico de carga =====
console.log("[mis_solicitudes.v2] Cargando...", new Date().toISOString());

// Evita que el navegador re-use versiones viejas si por algún motivo cambian rutas intermedias
if (window.__MIS_SOLICITUDES_V2_LOADED__) {
  console.warn(
    "[mis_solicitudes.v2] Ya estaba cargado, posible doble inclusión."
  );
}
window.__MIS_SOLICITUDES_V2_LOADED__ = true;

let debounceTimer;
let fetchCtrl = null;
const $ = (id) => document.getElementById(id);

// ===== Enlazar filtros =====
function bindFiltros() {
  const inputBusqueda = $("filtro-busqueda");
  const selMes = $("select-mes");
  const selAnio = $("select-anio");
  const selEstado = $("select-estado"); // opcional (no está en tu HTML)

  console.log("[mis_solicitudes.v2] IDs encontrados:", {
    "filtro-busqueda": !!inputBusqueda,
    "select-mes": !!selMes,
    "select-anio": !!selAnio,
    "select-estado (opcional)": !!selEstado,
    "contenedor-solicitudes": !!$("contenedor-solicitudes"),
  });

  // Bind solo si existen
  inputBusqueda?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => cargarSolicitudes(), 400);
  });
  selMes?.addEventListener("change", cargarSolicitudes);
  selAnio?.addEventListener("change", cargarSolicitudes);
  selEstado?.addEventListener("change", cargarSolicitudes);
}

function generarOpcionesFecha() {
  const selectMes = $("select-mes");
  const selectAnio = $("select-anio");
  if (!selectMes || !selectAnio) return;

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const hoy = new Date();

  selectMes.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    const valor = i + 1;
    selectMes.innerHTML += `<option value="${valor}" ${
      valor === hoy.getMonth() + 1 ? "selected" : ""
    }>${meses[i]}</option>`;
  }

  const anioActual = hoy.getFullYear();
  selectAnio.innerHTML = "";
  for (let y = anioActual; y >= anioActual - 5; y--) {
    selectAnio.innerHTML += `<option value="${y}" ${
      y === anioActual ? "selected" : ""
    }>${y}</option>`;
  }
}

// ===== Listado =====
async function cargarSolicitudes() {
  const contenedor = $("contenedor-solicitudes");
  if (!contenedor) {
    console.warn("[mis_solicitudes.v2] Falta #contenedor-solicitudes");
    return;
  }

  const mes = $("select-mes")?.value ?? "";
  const anio = $("select-anio")?.value ?? "";
  const estado = $("select-estado")?.value ?? "pendiente";
  const search = $("filtro-busqueda")?.value?.trim() ?? "";

  contenedor.innerHTML = '<p class="text-gray-400 text-center">Cargando…</p>';

  if (fetchCtrl) {
    fetchCtrl.abort();
    fetchCtrl = null;
  }
  fetchCtrl = new AbortController();

  try {
    const body = { mes, anio, estado, search };
    console.log(
      "[mis_solicitudes.v2] POST -> solicitudes_eliminacion.php",
      body
    );

    const res = await fetch("../php/solicitudes_eliminacion.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: fetchCtrl.signal,
      cache: "no-store",
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const solicitudes = await res.json();

    const prio = { pendiente: 0, aprobada: 1, rechazada: 2 };
    solicitudes.sort((a, b) => {
      const pa = prio[(a?.estado || "").toLowerCase()] ?? 9;
      const pb = prio[(b?.estado || "").toLowerCase()] ?? 9;
      if (pa !== pb) return pa - pb;
      const fa = a?.fecha_solicitud
        ? new Date(a.fecha_solicitud.replace(" ", "T")).getTime()
        : 0;
      const fb = b?.fecha_solicitud
        ? new Date(b.fecha_solicitud.replace(" ", "T")).getTime()
        : 0;
      return fb - fa;
    });

    console.log("[mis_solicitudes.v2] Respuesta", solicitudes);

    contenedor.innerHTML = "";
    if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
      contenedor.innerHTML =
        '<p class="text-gray-400 text-center">No hay solicitudes en este periodo.</p>';
      return;
    }

    for (const sol of solicitudes) {
      const div = document.createElement("div");
      div.id = `sol-${sol.idsolicitud}`;
      div.className = "bg-gray-800 border border-gray-700 p-4 rounded";

      const estadoBadge = estadoTag(sol.estado);

      const idCliente = sol.idcliente ?? sol.cliente ?? "—";
      const nomCliente = sol.nombre_cliente ?? sol.nombre ?? "—";
      const fechaTxt = sol.fecha_solicitud
        ? fmtFechaHora(sol.fecha_solicitud)
        : "—";
      const mesElimTxt = sol.mes_a_eliminar_ym
        ? formatMesAnioYM(sol.mes_a_eliminar_ym)
        : "—";

      div.innerHTML = `
  <div class="flex flex-col gap-1">
    <p><strong>Cliente:</strong> ${nomCliente} (ID ${idCliente})</p>
    <p><strong>Pago ID:</strong> ${sol.idpago ?? "—"}</p>
    <p><strong>Motivo:</strong> ${sol.motivo ?? "—"}</p>
    <p><strong>Solicitado por:</strong> ${
      sol.solicitado_por_nombre ?? sol.solicitado_por ?? "-"
    }</p>
    <p><strong>Fecha:</strong> ${fechaTxt}</p>
    <p><strong>Mes eliminado:</strong> ${mesElimTxt}</p>
    <p><strong>Estado:</strong> ${estadoBadge}</p>
  </div>
${sol.estado === 'pendiente' ? `
  <div class="mt-3 flex flex-wrap gap-2">
    <button class="bg-green-600 px-4 py-2 text-sm sm:text-base rounded hover:bg-green-700 transition"
            onclick="aprobarSolicitud(${sol.idsolicitud ?? sol.id}, ${sol.idpago})">
      ✅ Aprobar
    </button>
    <button class="bg-red-600 px-4 py-2 text-sm sm:text-base rounded hover:bg-red-700 transition"
            onclick="rechazarSolicitud(${sol.idsolicitud ?? sol.id})">
      ❌ Rechazar
    </button>
  </div>
` : '' }


`;

      contenedor.appendChild(div);
    }
  } catch (err) {
    if (err?.name !== "AbortError") {
      console.error(err);
      contenedor.innerHTML =
        '<p class="text-red-400 text-center">Error al cargar solicitudes.</p>';
    }
  } finally {
    fetchCtrl = null;
  }
}

function estadoTag(estado) {
  const st = String(estado || "").toLowerCase();
  const map = {
    pendiente: "bg-slate-700 text-slate-200",
    aprobada: "bg-green-700 text-white",
    rechazada: "bg-red-700 text-white",
  };
  const cls = map[st] || "bg-slate-700 text-slate-200";
  return `<span class="px-2 py-0.5 rounded ${cls}">${estado}</span>`;
}

function formatMesAnioYM(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) return "—";
  const d = new Date(Date.UTC(y, m - 1, 15));
  return d.toLocaleString("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
function fmtFechaHora(s) {
  const d = new Date(String(s).replace(' ', 'T'));
  return isNaN(d) ? String(s) : d.toLocaleString('es-MX');
}


// ===== Acciones =====
function quitarCard(idsolicitud) {
  document.getElementById(`sol-${idsolicitud}`)?.remove();
}

async function aprobarSolicitud(idsolicitud) {
  const ok = await confirmar(
    "¿Aprobar solicitud?",
    "Se eliminará el pago correspondiente."
  );
  if (!ok) return;

  const res = await fetch("../php/gestionar_eliminacion.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ idsolicitud, accion: "aprobar" }),
  });
  const data = await res.json();
  Swal.fire(
    data.ok ? "Aprobada" : "Error",
    data.message,
    data.ok ? "success" : "error"
  );

  if (data.ok) {
    quitarCard(idsolicitud);
    await cargarSolicitudes();
  }
}

async function rechazarSolicitud(idsolicitud) {
  const ok = await confirmar(
    "¿Rechazar solicitud?",
    "Se mantendrá el pago sin cambios."
  );
  if (!ok) return;

  const res = await fetch("../php/gestionar_eliminacion.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ idsolicitud, accion: "rechazar" }),
  });
  const data = await res.json();
  Swal.fire(
    data.ok ? "Rechazada" : "Error",
    data.message,
    data.ok ? "success" : "error"
  );

  if (data.ok) {
    quitarCard(idsolicitud);
    await cargarSolicitudes();
  }
}

async function eliminarSolicitud(idsolicitud) {
  const ok = await confirmar(
    "¿Eliminar solicitud?",
    "Esta acción no se puede deshacer."
  );
  if (!ok) return;

  const res = await fetch("../php/eliminar_solicitud.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ idsolicitud }),
  });
  const data = await res.json();
  Swal.fire(
    data.ok ? "Eliminada" : "Error",
    data.message,
    data.ok ? "success" : "error"
  );

  if (data.ok) {
    quitarCard(idsolicitud);
    await cargarSolicitudes();
  }
}

// ===== Confirmación =====
async function confirmar(title, text) {
  const r = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
  });
  return r.isConfirmed;
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("[mis_solicitudes.v2] DOMContentLoaded");
  bindFiltros();
  generarOpcionesFecha();

  // 👉 default pendiente
  const selEstado = document.getElementById("select-estado");
  if (selEstado) selEstado.value = "pendiente";

  cargarSolicitudes();
});

// Exponer si usas onclick
window.aprobarSolicitud = aprobarSolicitud;
window.rechazarSolicitud = rechazarSolicitud;
window.eliminarSolicitud = eliminarSolicitud;
