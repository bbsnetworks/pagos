let offset = 0;
const limit = 20;

async function cargarClientes(reset = false) {
  if (reset) {
    offset = 0;
    document.getElementById("lista-clientes").innerHTML = '';
  }

  try {
    const res = await fetch('php/clientes.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offset,
        limit,
        search: document.getElementById("buscador").value
      })
    });

    const data = await res.json();

    data.forEach(cliente => {
      const div = document.createElement("div");
      div.className = "p-4 bg-gray-800 border border-gray-700 rounded flex justify-between items-center";
      div.innerHTML = `
        <div class="flex-1">
          <p class="text-lg font-semibold">${cliente.nombre}</p>
          <p class="text-sm text-gray-400">ID: ${cliente.id}</p>
          <p class="text-sm text-gray-400">Dirección: ${cliente.direccion || '-'}</p>
          <p class="text-sm text-gray-400">Localidad: ${cliente.localidad || '-'}</p>
          <p class="text-sm text-gray-400">IP: ${cliente.ip || '-'}</p>
          <p class="text-sm text-gray-400">Teléfono: ${cliente.telefono || '-'}</p>
          <p class="text-sm text-green-400 font-bold">Mensualidad: ${cliente.mensualidad || '-'}</p>
        </div>
        <div class="flex flex-col gap-2">
          <button onclick="abrirVerPagos(${cliente.id})" class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Ver pagos</button>
          <button onclick="abrirGenerarPago(${cliente.id})" class="px-4 py-2 bg-green-600 rounded hover:bg-green-700">Generar pago</button>
        </div>
      `;
      document.getElementById("lista-clientes").appendChild(div);
    });

    offset += limit;
  } catch (error) {
    Swal.fire('Error', 'No se pudo cargar la lista de clientes', 'error');
    console.error(error);
  }
}

function buscarClientes() {
  cargarClientes(true);
}

function cargarMasClientes() {
  cargarClientes();
}

function verPagos(id) {
  window.location.href = `pagos.php?id=${id}`;
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

let clienteActual = 0;

function abrirVerPagos(id) {
  clienteActual = id;
  document.getElementById('vp-id').textContent = id;
  document.getElementById('modal-ver-pagos').classList.remove('hidden');

  const añoActual = new Date().getFullYear();
  const select = document.getElementById("vp-anio");
  select.innerHTML = '';
  for (let i = añoActual + 3; i >= añoActual - 5; i--) {
    select.innerHTML += `<option value="${i}">${i}</option>`;
  }
  select.value = añoActual;


  cargarPagosAnuales();
}
function cargarPagosAnuales() {
  const año = document.getElementById("vp-anio").value;

  fetch('php/pagos_cliente.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idcliente: clienteActual, anio: año })
  })
  .then(r => r.json())
  .then(data => {
    const lista = document.getElementById("vp-lista");
    lista.innerHTML = '';

    const pagosPorMes = {};
    data.forEach(pago => {
      const mes = parseInt(pago.fecha.split("-")[1], 10) - 1; // ← Corrección aquí
      pagosPorMes[mes] = pago;
    });

    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

    meses.forEach((mes, i) => {
  if (pagosPorMes[i]) {
    const pago = pagosPorMes[i];

    const descuento = parseFloat(pago.descuento || 0);
    const montoFinal = parseFloat(pago.pago) + descuento;

    // Determinar clase de color según tipo
    let colorClase = "bg-green-600 hover:bg-green-700";
    if (descuento > 0) {
      colorClase = "bg-orange-600 hover:bg-orange-700";
    } else if (descuento < 0) {
      colorClase = "bg-blue-600 hover:bg-blue-700";
    }

    const btn = document.createElement("div");
    btn.className = `${colorClase} p-3 rounded text-center transition-all font-bold text-white cursor-pointer`;
    btn.innerHTML = `${mes}<br>$${montoFinal}`;
    btn.onclick = () => solicitarEliminacion(mes, montoFinal, pago.idpago);
    lista.appendChild(btn);

  } else {
    const div = document.createElement("div");
    div.className = "bg-gray-700 p-3 rounded text-center text-white";
    div.textContent = mes;
    lista.appendChild(div);
  }
});

  });
}


let idPagoSeleccionado = 0;

function abrirSolicitudEliminacion(idpago, mes, monto) {
  idPagoSeleccionado = idpago;
  document.getElementById("se-mes").textContent = mes;
  document.getElementById("se-monto").textContent = monto;
  document.getElementById("se-motivo").value = '';
  document.getElementById("modal-solicitud").classList.remove('hidden');
}

function enviarSolicitudEliminacion() {
  const motivo = document.getElementById("se-motivo").value.trim();
  if (!motivo) {
    Swal.fire('Error', 'Debes escribir un motivo', 'error');
    return;
  }

  fetch('php/solicitar_eliminacion.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idpago: idPagoSeleccionado,
      cliente: clienteActual,
      motivo
    })
  })
  .then(r => r.json())
  .then(data => {
    Swal.fire(data.ok ? 'Éxito' : 'Error', data.message, data.ok ? 'success' : 'error');
    if (data.ok) cerrarModal('modal-solicitud');
  });
}

function solicitarEliminacion(mes, monto, idpago) {
  if (tipoUsuario === 'root' || tipoUsuario === 'admin') {
    Swal.fire({
      title: '¿Eliminar pago?',
      text: `Mes: ${mes}\nMonto: $${monto}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        fetch('php/eliminar_pago.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idpago: idpago })
        })
        .then(r => r.json())
        .then(data => {
          Swal.fire(data.ok ? 'Eliminado' : 'Error', data.message, data.ok ? 'success' : 'error');
          if (data.ok) cargarPagosAnuales(); // refrescar vista
        });
      }
    });
  } else {
    // Si NO es admin o root, abrir el modal normal de motivo
    document.getElementById("se-mes").textContent = mes;
    document.getElementById("se-monto").textContent = `${monto}`;
    document.getElementById("se-motivo").value = '';
    idPagoSeleccionado = idpago;
    document.getElementById("modal-solicitud").classList.remove("hidden");
  }
}



function abrirGenerarPago(id) {
  clienteActual = id;
  document.getElementById("gp-id").textContent = id;
  document.getElementById("modal-generar-pago").classList.remove("hidden");

  document.getElementById("btn-pago-del-mes").classList.add("hidden");
  document.getElementById("info-pagado").classList.add("hidden");
  document.getElementById("adelantado").classList.add("hidden");

  // Reset checkboxes y campos de descuento
  ["recargo", "descuento", "descuento-especial"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  ["descuento-especial-monto"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.disabled = true;
    }
  });

  fetch('php/verificar_mes_actual.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idcliente: id })
  })
  .then(r => r.json())
  .then(data => {
    const fechaInput = document.getElementById("adelantado-fecha");
    const hoy = new Date();
    const yyyyMM = hoy.toISOString().slice(0, 7);
    fechaInput.value = "";
    //fechaInput.min = yyyyMM;

    if (data.pagado) {
      document.getElementById("info-pagado").classList.remove("hidden");
      document.getElementById("adelantado").classList.remove("hidden");
    } else {
      document.getElementById("btn-pago-del-mes").classList.remove("hidden");
    }
  });
}

function confirmarPagoDelMes() {
  registrarPago(new Date().toISOString().slice(0, 7));
}

function confirmarPagoAdelantado() {
  const fecha = document.getElementById("adelantado-fecha").value;
  if (!fecha) {
    Swal.fire('Error', 'Selecciona un mes válido', 'error');
    return;
  }
  registrarPago(fecha);
}

function registrarPago(yyyymm) {
  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  let descuento = 0;

  if (document.getElementById("recargo").checked) descuento = 50;
  else if (document.getElementById("descuento").checked) descuento = -50;
  else if (document.getElementById("descuento-especial").checked) {
    const monto = parseFloat(document.getElementById("descuento-especial-monto").value) || 0;
    descuento = -monto;
  }

  fetch('php/registrar_pago.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idcliente: clienteActual,
      fecha: yyyymm + '-01',
      tipo: tipo,
      descuento: descuento
    })
  })
  .then(r => r.json())
  .then(resp => {
    Swal.fire(resp.ok ? 'Éxito' : 'Error', resp.message, resp.ok ? 'success' : 'error');
    if (resp.ok) cerrarModal('modal-generar-pago');
    generarTicket(resp.ticket);
  });
}

["recargo", "descuento", "descuento-especial"].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      ["recargo", "descuento", "descuento-especial"].forEach(otherId => {
        if (id !== otherId) {
          const other = document.getElementById(otherId);
          if (other) other.checked = false;
        }
      });
      const esp = document.getElementById("descuento-especial-monto");
      if (esp) esp.disabled = (id !== "descuento-especial" || !el.checked);
    });
  }
});

function cerrarModal(id) {
  document.getElementById(id).classList.add('hidden');
}

cargarClientes();



function generarTicket(datos) {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [58, 200] // tamaño ticket
  });

  let y = 8;

  if (logoBase64) {
    const imgWidth = 48;
    const imgHeight = imgWidth * (332 / 590); // proporción original del logo
    doc.addImage(logoBase64, 'PNG', 5, y, imgWidth, imgHeight);
    y += imgHeight + 5;
  }

  const center = (text, y, size = 9, bold = false) => {
    doc.setFontSize(size);
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    const x = (58 - textWidth) / 2;
    doc.text(text, x, y);
  };

  const centerBlock = (label, content, y) => {
    const lines = doc.splitTextToSize(content, 48);
    center(label, y, 8, true); y += 5;
    lines.forEach(line => {
      center(line, y, 8); y += 4;
    });
    return y;
  };

  // Datos generales
  center('TEKNE SEND.4', y); y += 5;
  center('RFC: TSE230302694', y); y += 5;
  center(`Fecha: ${datos.fecha}`, y); y += 8;

  y = centerBlock('Referencia:', datos.cliente, y);
  y = centerBlock('Cliente:', datos.nombre, y);
  y = centerBlock('Dirección:', datos.direccion, y);
  y = centerBlock('Localidad:', datos.localidad, y);
  y = centerBlock('Paquete:', datos.paquete, y);

  // Cálculos de pago
  const pagoBase = parseFloat(datos.pago) || 0;
  const descuento = parseFloat(datos.descuento) || 0;
  const total = pagoBase + descuento;

  // Mostrar desglose
  y = centerBlock('Mensualidad:', `$${pagoBase.toFixed(2)}`, y);

  if (descuento !== 0) {
    const tipoAjuste = descuento > 0 ? 'Recargo' : 'Descuento';
    const simbolo = descuento > 0 ? '+' : '-';
    y = centerBlock(tipoAjuste + ':', `${simbolo}$${Math.abs(descuento).toFixed(2)}`, y);
  }

  y = centerBlock('Total:', `$${total.toFixed(2)}`, y);

  // Mensajes finales
  y += 5;
  center('Gracias por su preferencia!', y); y += 6;

  center('Dudas o Aclaraciones al:', y); y += 5;
  center('4451533504', y); y += 6;

  center('Horario de atención:', y); y += 5;
  center('Lunes a Viernes', y); y += 5;
  center('11:00 a.m. - 6:00 p.m.', y); y += 5;
  center('Sábados: 11:00 a.m. - 2:00 p.m.', y); y += 6;

  y = centerBlock('Atendió:', datos.user, y);
  center('bbsnetworks.net', y); y += 8;

  center('--------GRACIAS POR SU PAGO--------', y, 8);

  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}


let logoBase64 = "";

fetch("includes/logo.txt")
  .then(res => res.text())
  .then(data => {
    logoBase64 = data;
    console.log("Logo cargado correctamente.");
  })
  .catch(err => {
    console.error("Error al cargar el logo:", err);
  });



window.abrirGenerarPago = abrirGenerarPago;
window.abrirVerPagos = abrirVerPagos;
window.confirmarPagoDelMes = confirmarPagoDelMes;
window.confirmarPagoAdelantado = confirmarPagoAdelantado;
window.cerrarModal = cerrarModal;
window.buscarClientes = buscarClientes;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.abrirSolicitudEliminacion = abrirSolicitudEliminacion;
window.enviarSolicitudEliminacion = enviarSolicitudEliminacion;
window.solicitarEliminacion = solicitarEliminacion;
window.cargarPagosAnuales = cargarPagosAnuales;
window.cargarMasClientes = cargarMasClientes;
