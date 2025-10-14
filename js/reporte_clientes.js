  let offset = 0;
  const limit = 20;
document.addEventListener("DOMContentLoaded", () => {
  cargarMeses();
  cargarAnios();

  
  if (tipoUsuario === "root") {
    cargarUsuarios();
    document.getElementById("filtro-usuario").addEventListener("change", cargarReportes);
  }

  document.getElementById("filtro-cliente").addEventListener("input", debounce(cargarReportes, 300));
  document.getElementById("filtro-mes").addEventListener("change", cargarReportes);
  document.getElementById("filtro-anio").addEventListener("change", cargarReportes);

  cargarReportes(); // Carga inicial
});

function cargarMeses() {
  const select = document.getElementById("filtro-mes");
  const meses = [
    "01 - Enero", "02 - Febrero", "03 - Marzo", "04 - Abril",
    "05 - Mayo", "06 - Junio", "07 - Julio", "08 - Agosto",
    "09 - Septiembre", "10 - Octubre", "11 - Noviembre", "12 - Diciembre"
  ];
  const mesActual = new Date().getMonth();
  select.innerHTML = meses.map((mes, i) =>
    `<option value="${String(i + 1).padStart(2, '0')}" ${i === mesActual ? 'selected' : ''}>${mes}</option>`
  ).join('');
}

function cargarAnios() {
  const select = document.getElementById("filtro-anio");
  const anioActual = new Date().getFullYear();
  for (let i = anioActual; i >= anioActual - 5; i--) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    if (i === anioActual) option.selected = true;
    select.appendChild(option);
  }
}

async function cargarUsuarios() {
  try {
    const res = await fetch("../php/obtener_usuarios.php");
    const usuarios = await res.json();
    const select = document.getElementById("filtro-usuario");

    usuarios.forEach(usuario => {
      const option = document.createElement("option");
      option.value = usuario.nombre; // 👈 usamos el nombre como value
      option.textContent = usuario.nombre;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error al cargar usuarios:", err);
  }
}


async function cargarReportes(reset = true) {
  if (reset) {
    offset = 0;
    document.getElementById("tabla-reportes").innerHTML = "";
  }

  const search = document.getElementById("filtro-cliente").value.trim();
  const mes = document.getElementById("filtro-mes").value;
  const anio = document.getElementById("filtro-anio").value;
  const usuario = (tipoUsuario === "root") 
    ? document.getElementById("filtro-usuario").value 
    : "";

  const body = { search, mes, anio, usuario, offset, limit };

  try {
    const res = await fetch("../php/reporte_clientes.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    dibujarPagos(data.pagos, reset);
    mostrarTotal(data.total);

    // Solo cargar más si hay más resultados
    if (data.pagos.length === limit) {
      mostrarBotonCargarMas();
    } else {
      ocultarBotonCargarMas();
    }

    offset += limit;
  } catch (err) {
    console.error("Error al cargar reportes:", err);
  }
}
async function generarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const mes = document.getElementById("filtro-mes").value;
  const anio = document.getElementById("filtro-anio").value;
  const usuario = (tipoUsuario === "root") 
    ? document.getElementById("filtro-usuario").value 
    : tipoUsuario;

  const body = {
    search: document.getElementById("filtro-cliente").value.trim(),
    mes,
    anio,
    usuario,
    offset: 0,
    limit: 9999 // sin límite
  };

  const [logoRes, pagosRes] = await Promise.all([
    fetch("../php/get_logo.php").then(r => r.json()),
    fetch("../php/reporte_clientes.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(r => r.json())
  ]);

  const base64Logo = logoRes.logo;
  const pagos = pagosRes.pagos;
  const total = pagosRes.total;

  // Cabecera
  if (base64Logo) {
    doc.addImage(base64Logo, 'PNG', 10, 10, 40, 20);
  }
  doc.setFontSize(16);
  doc.text(`Reporte de pagos - ${mes}/${anio}`, 60, 20);
  doc.setFontSize(10);
  doc.text(`Pagos del Usuario: ${usuario}`, 60, 26);

  // Tabla
  const tabla = pagos.map(p => [
  p.fechapago,
  p.nombre,
  p.direccion,
  p.localidad,
  `$${p.pago}`,
  p.user
]);

  doc.autoTable({
  startY: 40,
  head: [["Fecha", "Nombre", "Dirección", "Localidad", "Monto", "Usuario"]],

    body: tabla,
    theme: 'grid',
    styles: { fontSize: 8 }
  });

  // Total
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Total del período: $${parseFloat(total).toFixed(2)}`, 14, finalY);

  window.open(doc.output('bloburl'), '_blank');

}


function dibujarPagos(pagos) {
  const contenedor = document.getElementById("tabla-reportes");
  contenedor.innerHTML = "";

  if (pagos.length === 0) {
    contenedor.innerHTML = `<p class="text-gray-400">No se encontraron pagos para este periodo.</p>`;
    return;
  }

  pagos.forEach(pago => {
    const div = document.createElement("div");
    div.className = "bg-gray-800 border border-gray-700 rounded p-4";
    div.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <p class="text-lg font-semibold">${pago.nombre}</p>
        <p class="text-sm text-green-400">
  Pago realizado: ${formatearFecha(pago.fechapago)}<br>
  Mes pagado: ${formatearMesServicio(pago.fecha)}
</p>

      </div>
      <p class="text-sm text-gray-300"><strong>Dirección:</strong> ${pago.direccion}</p>
      <p class="text-sm text-gray-300"><strong>IP:</strong> ${pago.ip} &nbsp; <strong>Tel:</strong> ${pago.telefono}</p>
      <p class="text-sm text-gray-300"><strong>Paquete:</strong> ${pago.paquete} &nbsp; <strong>Monto:</strong> <span class="text-green-300 font-bold">$${pago.pago}</span></p>
      <p class="text-sm text-gray-400"><strong>Registrado por:</strong> ${pago.user}</p>
    `;
    contenedor.appendChild(div);
  });
}

function formatearFecha(fechaStr) {
  const [year, month, day] = fechaStr.split("-");
  const fecha = new Date(year, month - 1, day); // <-- Local, no UTC
  return fecha.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatearMesServicio(fechaStr) {
  const [year, month, day] = fechaStr.split("-");
  const fecha = new Date(year, month - 1, day); // Local
  return fecha.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long"
  });
}


function mostrarTotal(total) {
  let contenedorTotal = document.getElementById("total-pagos");
  if (!contenedorTotal) {
    contenedorTotal = document.createElement("div");
    contenedorTotal.id = "total-pagos";
    contenedorTotal.className = "text-right font-bold text-green-400 my-4";
    document.getElementById("tabla-reportes").before(contenedorTotal);
  }
  contenedorTotal.textContent = `Total del período: $${parseFloat(total).toFixed(2)}`;
}

function mostrarBotonCargarMas() {
  let btn = document.getElementById("btn-cargar-mas");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btn-cargar-mas";
    btn.textContent = "Cargar más";
    btn.className = "mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded";
    btn.onclick = () => cargarReportes(false);
    document.getElementById("tabla-reportes").after(btn);
  } else {
    btn.style.display = "inline-block";
  }
}

function ocultarBotonCargarMas() {
  const btn = document.getElementById("btn-cargar-mas");
  if (btn) btn.style.display = "none";
}

// Utilidad: debounce para evitar llamadas excesivas
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

