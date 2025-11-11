"use strict";

/* =========================================================
 *  Estado global y utilidades
 * =======================================================*/
let offset = 0;
const limit = 20;

let inFlightController = null; // para abortar peticiones de clientes
const $ = (id) => document.getElementById(id);

function debounce(fn, delay = 450) {
  let t;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
  d.cancel = () => clearTimeout(t);
  return d;
}

// Rol del usuario (para eliminar directo o solicitar)
const tipoUsuario =
  (window.TIPO_USUARIO && String(window.TIPO_USUARIO)) ||
  (document.body?.dataset?.tipo ? String(document.body.dataset.tipo) : "pagos");

/* =========================================================
 *  Lista de clientes (server-side, con debounce + abort)
 * =======================================================*/
async function cargarClientes(reset = false) {
  if (reset) {
    offset = 0;
    $("lista-clientes").innerHTML = "";
  }

  // Abortar la anterior si existía
  if (inFlightController) {
    inFlightController.abort();
    inFlightController = null;
  }
  inFlightController = new AbortController();

  try {
    const res = await fetch("php/clientes.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: inFlightController.signal,
      body: JSON.stringify({
        offset,
        limit,
        search: $("buscador")?.value ?? "",
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    data.forEach((cliente) => {
      const div = document.createElement("div");
      div.className =
        "p-4 bg-gray-800 border border-gray-700 rounded flex justify-between items-center";
      div.innerHTML = `
        <div class="flex-1">
          <p class="text-lg font-semibold">${cliente.nombre}</p>
          <p class="text-sm text-gray-400">ID: ${cliente.id}</p>
          <p class="text-sm text-gray-400">Dirección: ${
            cliente.direccion || "-"
          }</p>
          <p class="text-sm text-gray-400">Localidad: ${
            cliente.localidad || "-"
          }</p>
          <p class="text-sm text-gray-400">IP: ${cliente.ip || "-"}</p>
          <p class="text-sm text-gray-400">Teléfono: ${
            cliente.telefono || "-"
          }</p>
          <p class="text-sm text-green-400 font-bold">Mensualidad: ${
            cliente.mensualidad || "-"
          }</p>
        </div>
        <div class="flex flex-col gap-2">
          <button onclick="abrirVerPagos(${
            cliente.id
          })" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Ver pagos</button>
          <button onclick="abrirGenerarPago(${
            cliente.id
          })" class="px-4 py-2 bg-green-600 rounded hover:bg-green-700">Generar pago</button>
        </div>
      `;
      $("lista-clientes").appendChild(div);
    });

    offset += limit;
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
      Swal.fire("Error", "No se pudo cargar la lista de clientes", "error");
    }
  } finally {
    inFlightController = null;
  }
}

// Debounce de búsqueda: llamas a buscarClientes() tal como lo tenías
const _buscarDebounced = debounce(() => cargarClientes(true), 450);
function buscarClientes() {
  _buscarDebounced();
}
function cargarMasClientes() {
  cargarClientes(false);
}

/* =========================================================
 *  Sidebar
 * =======================================================*/
function toggleSidebar() {
  const sidebar = $("sidebar");
  const backdrop = $("sidebar-backdrop");
  const btn = $("btn-sidebar");
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
  $("sidebar").classList.add("-translate-x-full");
  $("sidebar-backdrop").classList.add("hidden");
  $("btn-sidebar").classList.remove("hidden");
}

/* =========================================================
 *  Ver pagos (modal) + Solicitud/Eliminación
 * =======================================================*/
let clienteActual = 0;
let idPagoSeleccionado = 0;

function abrirVerPagos(id) {
  clienteActual = id;
  $("vp-id").textContent = id;
  $("modal-ver-pagos").classList.remove("hidden");

  // Select de años
  const añoActual = new Date().getFullYear();
  const select = $("vp-anio");
  select.innerHTML = "";
  for (let i = añoActual + 3; i >= añoActual - 5; i--) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    select.appendChild(opt);
  }
  select.value = añoActual;

  // refrescar al cambiar año
  select.onchange = cargarPagosAnuales;

  // pintar
  cargarPagosAnuales();
}

function normalizaPagosRespuesta(data) {
  const pagosPorMes = {};
  if (!Array.isArray(data)) return pagosPorMes;

  data.forEach(item => {
    if (typeof item === 'number') {
      const idx = Math.max(1, Math.min(12, item)) - 1;
      pagosPorMes[idx] = { mes: idx + 1 };
    } else if (item && typeof item === 'object') {
      let mesNum = null;
      if (item.mes) mesNum = parseInt(item.mes, 10);
      else if (item.fecha) mesNum = parseInt(String(item.fecha).split('-')[1], 10);

      if (Number.isInteger(mesNum)) {
        const idx = Math.max(1, Math.min(12, mesNum)) - 1;
        pagosPorMes[idx] = {
          mes: idx + 1,
          pago: parseFloat(item.pago ?? 0),
          descuento: parseFloat(item.descuento ?? 0),
          idpago: item.idpago ?? item.id ?? null,
          // nuevo: intenta varios nombres de campo
          tipo: (item.tipo ?? item.metodo ?? item.forma_pago ?? null)
        };
      }
    }
  });
  return pagosPorMes;
}


function cargarPagosAnuales() {
  const año = $("vp-anio").value;

  fetch("php/pagos_cliente.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idcliente: clienteActual, anio: año }),
  })
    .then((r) => r.json())
    .then((data) => {
      const lista = $("vp-lista");
      lista.innerHTML = "";

      const pagosPorMes = normalizaPagosRespuesta(data);
      const meses = [
        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE",
      ];

      meses.forEach((mesTexto, i) => {
        const info = pagosPorMes[i];

        if (info) {
          const pagoBase = isNaN(info.pago) ? 0 : info.pago;
          const ajuste = isNaN(info.descuento) ? 0 : info.descuento;
          const montoFinal = pagoBase + ajuste;

          // color según ajuste
          let colorClase = "bg-green-600 hover:bg-green-700";
          if (ajuste > 0) colorClase = "bg-orange-600 hover:bg-orange-700"; // recargo
          if (ajuste < 0) colorClase = "bg-blue-600 hover:bg-blue-700"; // descuento

          const btn = document.createElement("div");
          btn.className = `${colorClase} p-3 rounded text-center transition-all font-bold text-white cursor-pointer`;
          btn.innerHTML = `${mesTexto}<br>$${montoFinal.toFixed(2)}`;

          btn.onclick = () =>
            abrirModalSolicitud({
              idPago: info.idpago,
              clienteId: clienteActual,
              mesTexto,
              monto: montoFinal,
              // usa lo que te mande el backend; fallback efectivo si no viene:
              tipoPago:
                info.tipo !== undefined && info.tipo !== null ? info.tipo : 1,
            });
          lista.appendChild(btn);
        } else {
          const div = document.createElement("div");
          div.className = "bg-gray-700 p-3 rounded text-center text-white";
          div.textContent = mesTexto;
          lista.appendChild(div);
        }
      });
    })
    .catch((err) => {
      console.error(err);
      Swal.fire(
        "Error",
        "No se pudieron cargar los pagos del año seleccionado",
        "error"
      );
    });
}

// Modal de solicitud (para usuarios no admin/root)
function abrirSolicitudEliminacion(idpago, mes, monto) {
  idPagoSeleccionado = idpago;
  $("se-mes").textContent = mes;
  $("se-monto").textContent = monto;
  $("se-motivo").value = "";
  $("modal-solicitud").classList.remove("hidden");
}

function enviarSolicitudEliminacion() {
  const motivo = $("se-motivo").value.trim();
  if (!motivo) {
    Swal.fire("Error", "Debes escribir un motivo", "error");
    return;
  }

  fetch("php/solicitar_eliminacion.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idpago: idPagoSeleccionado,
      cliente: clienteActual,
      motivo,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      Swal.fire(
        data.ok ? "Éxito" : "Error",
        data.message,
        data.ok ? "success" : "error"
      );
      if (data.ok) {
        cerrarModal("modal-solicitud");
        cargarPagosAnuales();
      }
    });
}

function solicitarEliminacion(mes, monto, idpago) {
  if (!idpago) {
    Swal.fire(
      "Atención",
      "No se encontró el ID del pago para este mes.",
      "warning"
    );
    return;
  }

  if (tipoUsuario === "root" || tipoUsuario === "admin") {
    Swal.fire({
      title: "¿Eliminar pago?",
      html: `Mes: <b>${mes}</b><br>Monto: <b>$${monto}</b>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        fetch("php/eliminar_pago.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idpago }),
        })
          .then((r) => r.json())
          .then((data) => {
            Swal.fire(
              data.ok ? "Eliminado" : "Error",
              data.message,
              data.ok ? "success" : "error"
            );
            if (data.ok) cargarPagosAnuales();
          });
      }
    });
  } else {
    abrirSolicitudEliminacion(idpago, mes, monto);
  }
}

/* =========================================================
 *  Generar pago (modal) + ticket
 * =======================================================*/
function abrirGenerarPago(id) {
  clienteActual = id;
  $("gp-id").textContent = id;
  $("modal-generar-pago").classList.remove("hidden");

  $("btn-pago-del-mes").classList.add("hidden");
  $("info-pagado").classList.add("hidden");
  $("adelantado").classList.add("hidden");

  // Reset checkboxes y campos de descuento
  ["recargo", "descuento", "descuento-especial"].forEach((cid) => {
    const el = $(cid);
    if (el) el.checked = false;
  });
  const esp = $("descuento-especial-monto");
  if (esp) {
    esp.value = "";
    esp.disabled = true;
  }

  fetch("php/verificar_mes_actual.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idcliente: id }),
  })
    .then((r) => r.json())
    .then((data) => {
      const fechaInput = $("adelantado-fecha");
      const hoy = new Date();
      const yyyyMM = hoy.toISOString().slice(0, 7);
      fechaInput.value = "";
      // fechaInput.min = yyyyMM; // si quieres limitar hacia atrás, descomenta

      if (data.pagado) {
        $("info-pagado").classList.remove("hidden");
        $("adelantado").classList.remove("hidden");
      } else {
        $("btn-pago-del-mes").classList.remove("hidden");
      }
    });
}

function confirmarPagoDelMes() {
  registrarPago(new Date().toISOString().slice(0, 7));
}
function confirmarPagoAdelantado() {
  const fecha = $("adelantado-fecha").value;
  if (!fecha) return Swal.fire("Error", "Selecciona un mes válido", "error");
  registrarPago(fecha);
}

function registrarPago(yyyymm) {
  const tipo =
    document.querySelector('input[name="tipo"]:checked')?.value ?? "0";
  let descuento = 0;

  if ($("recargo").checked) descuento = 50;
  else if ($("descuento").checked) descuento = -50;
  else if ($("descuento-especial").checked) {
    const monto = parseFloat($("descuento-especial-monto").value) || 0;
    descuento = -monto;
  }

  fetch("php/registrar_pago.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idcliente: clienteActual,
      fecha: yyyymm + "-01",
      tipo,
      descuento,
    }),
  })
    .then((r) => r.json())
    .then((resp) => {
      Swal.fire(
        resp.ok ? "Éxito" : "Error",
        resp.message,
        resp.ok ? "success" : "error"
      );
      if (resp.ok) {
        cerrarModal("modal-generar-pago");
        if (resp.ticket) generarTicket(resp.ticket);
        // si estabas viendo el modal de ver pagos, refresca:
        if (!$("modal-ver-pagos")?.classList.contains("hidden")) {
          cargarPagosAnuales();
        }
      }
    });
}

// Exclusividad de checkboxes
["recargo", "descuento", "descuento-especial"].forEach((id) => {
  const el = $(id);
  if (el) {
    el.addEventListener("change", () => {
      ["recargo", "descuento", "descuento-especial"].forEach((otherId) => {
        if (id !== otherId) {
          const other = $(otherId);
          if (other) other.checked = false;
        }
      });
      const esp = $("descuento-especial-monto");
      if (esp) esp.disabled = id !== "descuento-especial" || !el.checked;
    });
  }
});
// Abrir modal unificado (eliminar / cambio_monto / cambio_tipo)
function abrirModalSolicitud({ idPago, clienteId, mesTexto, monto, tipoPago }) {
  $("se-mes").textContent = mesTexto || "";
  $("se-idpago").textContent = idPago ?? "";
  $("se-monto-actual").textContent = Number(monto ?? 0).toFixed(2);
  const tipoTxt =
    String(tipoPago) === "1" || tipoPago === "efectivo"
      ? "efectivo"
      : "transferencia";
  $("se-tipo-actual").textContent = tipoTxt;

  // hidden
  $("se-idpago-hidden").value = idPago ?? "";
  $("se-cliente-hidden").value = clienteId ?? "";
  $("se-monto-actual-hidden").value = Number(monto ?? 0).toFixed(2);
  $("se-tipo-actual-hidden").value = tipoTxt;

  // reset
  document.querySelector(
    'input[name="se-tipo-solicitud"][value="eliminacion"]'
  ).checked = true;
  $("se-campo-monto").classList.add("hidden");
  $("se-campo-tipo").classList.add("hidden");
  $("se-monto-nuevo").value = "";
  document
    .querySelectorAll('input[name="se-tipo-nuevo"]')
    .forEach((r) => (r.checked = false));
  $("se-motivo").value = "";

  $("modal-solicitud").classList.remove("hidden");
}

// Toggle de campos según la selección
document.addEventListener("change", (e) => {
  if (e.target?.name === "se-tipo-solicitud") {
    const v = e.target.value;
    $("se-campo-monto").classList.toggle("hidden", v !== "cambio_monto");
    $("se-campo-tipo").classList.toggle("hidden", v !== "cambio_tipo");
  }
});

// Enviar solicitud (inserta en eliminacion_pagos con campos nuevos)
async function enviarSolicitudCambio() {
  const idpago = $("se-idpago-hidden").value;
  const cliente = $("se-cliente-hidden").value;
  const tipoSolicitud =
    document.querySelector('input[name="se-tipo-solicitud"]:checked')?.value ||
    "eliminacion";
  const motivo = $("se-motivo").value.trim();
  const monto_actual = $("se-monto-actual-hidden").value;
  const tipo_actual = $("se-tipo-actual-hidden").value;

  let monto_nuevo = null,
    tipo_nuevo = null;

  if (tipoSolicitud === "cambio_monto") {
    const v = $("se-monto-nuevo").value;
    if (!v || Number(v) < 0)
      return Swal.fire("Falta dato", "Ingresa un monto válido.", "warning");
    monto_nuevo = Number(v).toFixed(2);
  }
  if (tipoSolicitud === "cambio_tipo") {
    const r = document.querySelector('input[name="se-tipo-nuevo"]:checked');
    if (!r)
      return Swal.fire(
        "Falta dato",
        "Selecciona el nuevo tipo de pago.",
        "warning"
      );
    tipo_nuevo = r.value; // 'efectivo' | 'transferencia'
  }
  if (!motivo)
    return Swal.fire(
      "Falta motivo",
      "Describe brevemente el motivo.",
      "warning"
    );

  const payload = {
    idpago: Number(idpago),
    cliente: cliente ? Number(cliente) : null,
    motivo,
    tipo_solicitud: tipoSolicitud,
    monto_actual: monto_actual ? Number(monto_actual) : null,
    monto_nuevo: monto_nuevo ? Number(monto_nuevo) : null,
    tipo_actual,
    tipo_nuevo,
  };

  try {
    const res = await fetch("php/solicitar_eliminacion.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok)
      throw new Error(data?.message || "Error al enviar la solicitud");

    Swal.fire("Listo", "Tu solicitud fue enviada para revisión.", "success");
    cerrarModal("modal-solicitud");
    // Refresca si estás viendo los pagos
    if (!$("modal-ver-pagos")?.classList.contains("hidden"))
      cargarPagosAnuales();
  } catch (err) {
    console.error(err);
    Swal.fire(
      "Error",
      err.message || "No se pudo enviar la solicitud.",
      "error"
    );
  }
}

/* =========================================================
 *  Utilidades de modales
 * =======================================================*/
function cerrarModal(id) {
  $(id)?.classList.add("hidden");
}

/* =========================================================
 *  Ticket (igual al tuyo)
 * =======================================================*/
function generarTicket(datos) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [58, 200],
  });
  let y = 8;

  if (logoBase64) {
    const imgWidth = 48,
      imgHeight = imgWidth * (332 / 590);
    doc.addImage(logoBase64, "PNG", 5, y, imgWidth, imgHeight);
    y += imgHeight + 5;
  }
  const center = (text, y, size = 9, bold = false) => {
    doc.setFontSize(size);
    doc.setFont(undefined, bold ? "bold" : "normal");
    const x = (58 - doc.getTextWidth(text)) / 2;
    doc.text(text, x, y);
  };
  const centerBlock = (label, content, y) => {
    const lines = doc.splitTextToSize(content, 48);
    center(label, y, 8, true);
    y += 5;
    lines.forEach((line) => {
      center(line, y, 8);
      y += 4;
    });
    return y;
  };

  center("TEKNE SEND.4", y);
  y += 5;
  center("RFC: TSE230302694", y);
  y += 5;
  center(`Fecha: ${datos.fecha}`, y);
  y += 8;

  y = centerBlock("Referencia:", datos.cliente, y);
  y = centerBlock("Cliente:", datos.nombre, y);
  y = centerBlock("Dirección:", datos.direccion, y);
  y = centerBlock("Localidad:", datos.localidad, y);
  y = centerBlock("Paquete:", datos.paquete, y);

  const pagoBase = parseFloat(datos.pago) || 0;
  const descuento = parseFloat(datos.descuento) || 0;
  const total = pagoBase + descuento;

  y = centerBlock("Mensualidad:", `$${pagoBase.toFixed(2)}`, y);
  if (descuento !== 0) {
    const tipoAjuste = descuento > 0 ? "Recargo" : "Descuento";
    const simbolo = descuento > 0 ? "+" : "-";
    y = centerBlock(
      tipoAjuste + ":",
      `${simbolo}$${Math.abs(descuento).toFixed(2)}`,
      y
    );
  }
  y = centerBlock("Total:", `$${total.toFixed(2)}`, y);

  y += 5;
  center("Gracias por su preferencia!", y);
  y += 6;
  center("Dudas o Aclaraciones al:", y);
  y += 5;
  center("4451533504", y);
  y += 6;
  center("Horario de atención:", y);
  y += 5;
  center("Lunes a Viernes", y);
  y += 5;
  center("11:00 a.m. - 6:00 p.m.", y);
  y += 5;
  center("Sábados: 11:00 a.m. - 2:00 p.m.", y);
  y += 6;

  y = centerBlock("Atendió:", datos.user, y);
  center("bbsnetworks.net", y);
  y += 8;
  center("--------GRACIAS POR SU PAGO--------", y, 8);

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}

let logoBase64 = "";
fetch("includes/logo.txt")
  .then((res) => res.text())
  .then((data) => {
    logoBase64 = data;
  })
  .catch((err) => console.error("Error al cargar el logo:", err));

/* =========================================================
 *  Exponer a global (si usas atributos HTML)
 * =======================================================*/
window.abrirGenerarPago = abrirGenerarPago;
window.abrirVerPagos = abrirVerPagos;
window.confirmarPagoDelMes = confirmarPagoDelMes;
window.confirmarPagoAdelantado = confirmarPagoAdelantado;
window.cerrarModal = cerrarModal;
window.buscarClientes = buscarClientes;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.cargarPagosAnuales = cargarPagosAnuales;
window.cargarMasClientes = cargarMasClientes;
window.abrirModalSolicitud = abrirModalSolicitud;
window.enviarSolicitudCambio = enviarSolicitudCambio;

/* =========================================================
 *  Arranque
 * =======================================================*/
document.addEventListener("DOMContentLoaded", () => {
  // Si tu input no tiene oninput en HTML, puedes descomentar:
  // $("buscador")?.addEventListener('input', buscarClientes);
  cargarClientes(true);
});
