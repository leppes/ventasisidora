// Pestaña Ventas: registrar ventas (el stock se descuenta solo), ver las del mes y bajarlas a Excel.
const MEDIOS_PAGO = ["Efectivo", "Débito", "Crédito", "Transferencia", "Otro"];
const OTRO_PRODUCTO = "otro";
const LIBRERIA_EXCEL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const FORMATO_PESOS_EXCEL = '"$"#,##0';
const FORMATO_FECHA_EXCEL = "dd-mm-yyyy hh:mm";

let ventasMes = [];
let cotizacionEnVenta = null; // cotización que se está pasando a venta (pestaña Cotizaciones)

// Registrar venta
function opcionesProductos() {
  const grupos = datos.categorias
    .map((c) => {
      const productos = datos.productos.filter((p) => p.categoria_id === c.id);
      if (!productos.length) return "";
      const opciones = productos
        .map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}${p.activo ? "" : " (oculto)"}</option>`)
        .join("");
      return `<optgroup label="${esc(c.nombre)}">${opciones}</optgroup>`;
    })
    .join("");
  return `<option value="">Elige un producto</option>${grupos}<option value="${OTRO_PRODUCTO}">Otro producto o servicio…</option>`;
}

function agregarItem() {
  document.querySelector("[data-items]").insertAdjacentHTML(
    "beforeend",
    `<div class="admin-item" data-item>
      <select data-item-producto aria-label="Producto">${opcionesProductos()}</select>
      <input data-item-nombre placeholder="¿Qué vendiste? Ej: Instalación" aria-label="Qué vendiste" autocomplete="off" hidden>
      <div class="admin-item__numeros">
        <label>Cantidad <input data-item-cantidad inputmode="numeric" value="1" autocomplete="off"></label>
        <label>Precio c/u <input data-item-precio inputmode="numeric" placeholder="$" autocomplete="off"></label>
        <span class="admin-item__subtotal" data-item-subtotal>$0</span>
        <button type="button" class="admin-item__quitar" data-quitar-item aria-label="Quitar este producto">×</button>
      </div>
      <small class="admin-item__aviso" data-item-aviso hidden></small>
    </div>`
  );
  actualizarBotonesQuitar();
}

function actualizarBotonesQuitar() {
  const filas = document.querySelectorAll("[data-item]");
  filas.forEach((fila) => {
    fila.querySelector("[data-quitar-item]").hidden = filas.length === 1;
  });
}

function leerItem(fila) {
  const valor = fila.querySelector("[data-item-producto]").value;
  const producto = datos.productos.find((p) => p.id === valor) ?? null;
  return {
    valor,
    producto,
    nombre: valor === OTRO_PRODUCTO ? fila.querySelector("[data-item-nombre]").value.trim() : producto?.nombre ?? "",
    cantidad: leerEntero(fila.querySelector("[data-item-cantidad]").value),
    precio: leerEntero(fila.querySelector("[data-item-precio]").value),
  };
}

function recalcularVenta() {
  let total = 0;
  document.querySelectorAll("[data-item]").forEach((fila) => {
    const { producto, cantidad, precio } = leerItem(fila);
    const subtotal = cantidad > 0 && precio >= 0 ? cantidad * precio : 0;
    total += subtotal;
    fila.querySelector("[data-item-subtotal]").textContent = formatoPeso.format(subtotal);

    // Avisa, pero deja registrar: a veces el stock del panel no está al día
    const aviso = fila.querySelector("[data-item-aviso]");
    const faltaStock = producto?.stock != null && cantidad > producto.stock;
    aviso.hidden = !faltaStock;
    if (faltaStock) {
      aviso.textContent =
        producto.stock > 0
          ? `En el panel solo quedan ${producto.stock}. Igual puedes registrarla.`
          : "En el panel figura sin stock. Igual puedes registrarla.";
    }
  });
  document.querySelector("[data-total-venta]").textContent = formatoPeso.format(total);
}

// Devuelve el problema a corregir, o "" si está todo bien
function revisarItems(items) {
  for (const [numero, item] of items.entries()) {
    const cual = items.length > 1 ? ` (producto ${numero + 1})` : "";
    if (!item.valor) return `Elige el producto${cual}.`;
    if (!item.nombre) return `Escribe qué vendiste${cual}.`;
    if (!(item.cantidad > 0)) return `La cantidad tiene que ser mayor que 0${cual}.`;
    // Ojo: en JavaScript null >= 0 es verdadero, por eso se revisa el vacío aparte
    if (item.precio == null || !(item.precio >= 0)) return `Escribe el precio${cual}, por ejemplo 19.990.`;
  }
  return "";
}

const dosDigitos = (numero) => String(numero).padStart(2, "0");

function fechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;
}

// Si la venta es de hoy se guarda la hora actual; si es de otro día, a mediodía
function fechaDeVenta(valor) {
  if (valor === fechaHoy()) return new Date().toISOString();
  const [anio, mes, dia] = valor.split("-").map(Number);
  return new Date(anio, mes - 1, dia, 12).toISOString();
}

// Sin cotización: venta en blanco. Con cotización: sus productos y los datos del cliente ya puestos
function abrirRegistroVenta(cotizacion = null) {
  const form = document.querySelector("[data-form-venta]");
  form.reset();
  form.querySelector("details").open = false;
  document.querySelector("[data-items]").innerHTML = "";
  cotizacionEnVenta = cotizacion;
  if (cotizacion) {
    cotizacion.items.forEach((item) => {
      agregarItem();
      const fila = [...document.querySelectorAll("[data-item]")].at(-1);
      const producto = datos.productos.find((p) => p.id === item.producto_id);
      const select = fila.querySelector("[data-item-producto]");
      if (producto) {
        select.value = producto.id;
      } else {
        // El producto ya no está en el catálogo: se registra con el nombre que tenía
        select.value = OTRO_PRODUCTO;
        const nombre = fila.querySelector("[data-item-nombre]");
        nombre.hidden = false;
        nombre.value = item.nombre;
      }
      fila.querySelector("[data-item-cantidad]").value = item.cantidad;
      fila.querySelector("[data-item-precio]").value = numeroParaCampo(producto?.precio ?? item.precio_unitario);
    });
    form.cliente_nombre.value = cotizacion.cliente_nombre ?? "";
    form.cliente_telefono.value = cotizacion.cliente_telefono ?? "";
    form.comuna.value = cotizacion.comuna ?? "";
    form.notas.value = cotizacion.referencia ? `Cotización ${cotizacion.referencia}` : "";
    form.querySelector("details").open = true;
  } else {
    agregarItem();
  }
  form.fecha.value = fechaHoy();
  form.fecha.max = fechaHoy();
  mostrarError("[data-error-venta]", "");
  recalcularVenta();
  document.querySelector("[data-dialogo-venta]").showModal();
}

async function guardarVenta(e) {
  e.preventDefault();
  const form = e.target;
  const items = [...document.querySelectorAll("[data-item]")].map(leerItem);
  let problema = revisarItems(items);
  if (!problema && !form.fecha.value) problema = "Elige la fecha de la venta.";
  if (!problema && form.fecha.value > fechaHoy()) problema = "La fecha no puede ser de un día que todavía no llega.";
  if (problema) return mostrarError("[data-error-venta]", problema);

  const boton = form.querySelector('[type="submit"]');
  boton.disabled = true;
  boton.textContent = "Guardando…";
  mostrarError("[data-error-venta]", "");
  const { error } = await db.rpc("registrar_venta", {
    venta: {
      fecha: fechaDeVenta(form.fecha.value),
      medio_pago: form.medio_pago.value,
      entrega: form.entrega.value,
      cliente_nombre: form.cliente_nombre.value,
      cliente_telefono: form.cliente_telefono.value,
      comuna: form.comuna.value,
      notas: form.notas.value,
    },
    items: items.map((item) => ({
      producto_id: item.producto?.id ?? null,
      nombre_producto: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
    })),
  });
  boton.disabled = false;
  boton.textContent = "Guardar venta";
  if (error) {
    console.error(error);
    return mostrarError("[data-error-venta]", "No se pudo guardar la venta. Revisa tu conexión e intenta de nuevo.");
  }

  document.querySelector("[data-dialogo-venta]").close();
  avisar("Venta registrada");
  // Si venía de una cotización, queda marcada como "Compró"
  if (cotizacionEnVenta) {
    const { error: errorCotizacion } = await db.from("cotizaciones").update({ estado: "aceptada" }).eq("id", cotizacionEnVenta.id);
    if (errorCotizacion) console.error(errorCotizacion);
    cotizacionEnVenta = null;
    if (pestanaAbierta() === "cotizaciones") cargarCotizaciones();
    else contarPendientes();
  }
  // Se muestra el mes de la venta y se recargan los productos, porque la venta descontó stock
  usarMes(form.fecha.value.slice(0, 7));
  await Promise.all([recargarProductos(), cargarVentas()]);
}

// Ventas del mes
function tarjetaVenta(v) {
  const productos = v.venta_items
    .map((i) => `<li><span>${i.cantidad} × ${esc(i.nombre_producto)}</span><span>${formatoPeso.format(i.subtotal)}</span></li>`)
    .join("");
  const cliente = [v.cliente_nombre, v.cliente_telefono, v.comuna].filter(Boolean).map(esc).join(" · ");
  const datosVenta = [`#${v.id}`, formatoFecha.format(new Date(v.fecha)), v.medio_pago, ENTREGAS[v.entrega]].filter(Boolean).map(esc).join(" · ");
  return `
    <article class="admin-venta">
      <header>
        <span>${datosVenta}</span>
        <button type="button" class="admin-venta__borrar" data-borrar-venta="${v.id}">Eliminar</button>
      </header>
      ${cliente ? `<p class="admin-venta__cliente">${cliente}</p>` : ""}
      <ul>${productos}</ul>
      ${v.notas ? `<p class="admin-venta__notas">${esc(v.notas)}</p>` : ""}
      <p class="admin-venta__total"><span>Total</span><strong>${formatoPeso.format(v.total)}</strong></p>
    </article>`;
}

function mostrarVentas() {
  const lista = document.querySelector("[data-lista-ventas]");
  const resumen = document.querySelector("[data-total-ventas]");
  if (!ventasMes.length) {
    resumen.textContent = "";
    lista.innerHTML = `<p class="admin__vacio">No hay ventas registradas en ${nombreMes(mesElegido)}.</p>`;
    return;
  }
  const total = ventasMes.reduce((suma, v) => suma + v.total, 0);
  const cantidad = `${ventasMes.length} ${ventasMes.length === 1 ? "venta" : "ventas"}`;
  resumen.innerHTML = `${cantidad} en ${nombreMes(mesElegido)} · <strong>${formatoPeso.format(total)}</strong>`;
  lista.innerHTML = ventasMes.map(tarjetaVenta).join("");
}

async function cargarVentas() {
  const lista = document.querySelector("[data-lista-ventas]");
  lista.innerHTML = `<p class="admin__vacio">Cargando ventas…</p>`;
  try {
    ventasMes = await obtenerVentasMes(mesElegido);
    mostrarVentas();
  } catch (error) {
    console.error(error);
    document.querySelector("[data-total-ventas]").textContent = "";
    lista.innerHTML = `<p class="admin__vacio">No se pudieron cargar las ventas. Revisa tu conexión.</p>`;
  }
}

async function borrarVenta(id) {
  const confirma = await confirmar(`¿Eliminar la venta #${id}? Los productos vuelven al stock.`);
  if (!confirma) return;
  const { data, error } = await db.from("ventas").delete().eq("id", id).select("id");
  if (error || !data.length) {
    console.error(error);
    return avisar("No se pudo eliminar la venta.", "error");
  }
  avisar("Venta eliminada");
  await Promise.all([recargarProductos(), cargarVentas()]);
}

// Excel
// La librería (SheetJS) se carga recién al descargar, para que el panel abra rápido en el celular
function cargarLibreriaExcel() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = LIBRERIA_EXCEL;
    script.onload = resolver;
    script.onerror = () => rechazar(new Error("No se pudo cargar la librería de Excel"));
    document.head.append(script);
  });
}

// Excel guarda las fechas como días desde el 30-12-1899, en hora local.
// Se calcula aquí porque la librería corre la hora unos segundos con la zona horaria de Chile.
function fechaExcel(fecha) {
  const local = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), fecha.getHours(), fecha.getMinutes(), fecha.getSeconds());
  return (local - Date.UTC(1899, 11, 30)) / 86400000;
}

// Da formato a columnas enteras: $19.990 en las de plata, día y hora en la fecha
function darFormato(hoja, columnas, formato) {
  const rango = XLSX.utils.decode_range(hoja["!ref"]);
  for (let c = rango.s.c; c <= rango.e.c; c++) {
    if (!columnas.includes(hoja[XLSX.utils.encode_cell({ r: 0, c })]?.v)) continue;
    for (let r = 1; r <= rango.e.r; r++) {
      const celda = hoja[XLSX.utils.encode_cell({ r, c })];
      if (celda?.t === "n") celda.z = formato;
    }
  }
}

const COLUMNAS_VENTAS = [
  "N° venta", "Fecha", "Cliente", "Teléfono", "Comuna", "Medio de pago", "Entrega",
  "Producto", "Cantidad", "Precio unitario", "Subtotal", "Total de la venta", "Notas",
];

// Hojas: "Ventas" (una fila por producto vendido), "Stock" (inicial, compras, vendidos y disponible)
// y "Por producto" (totales vendidos)
function crearLibroExcel(ventas, stock) {
  const enOrden = [...ventas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const filas = enOrden.flatMap((v) =>
    v.venta_items.map((i) => ({
      "N° venta": v.id,
      Fecha: fechaExcel(new Date(v.fecha)),
      Cliente: v.cliente_nombre ?? "",
      Teléfono: v.cliente_telefono ?? "",
      Comuna: v.comuna ?? "",
      "Medio de pago": v.medio_pago ?? "",
      Entrega: ENTREGAS[v.entrega] ?? "",
      Producto: i.nombre_producto,
      Cantidad: i.cantidad,
      "Precio unitario": i.precio_unitario,
      Subtotal: i.subtotal,
      "Total de la venta": v.total,
      Notas: v.notas ?? "",
    }))
  );
  const hojaVentas = XLSX.utils.json_to_sheet(filas, { header: COLUMNAS_VENTAS });
  darFormato(hojaVentas, ["Fecha"], FORMATO_FECHA_EXCEL);
  darFormato(hojaVentas, ["Precio unitario", "Subtotal", "Total de la venta"], FORMATO_PESOS_EXCEL);
  hojaVentas["!cols"] = [9, 17, 22, 14, 16, 15, 15, 34, 9, 15, 13, 17, 30].map((wch) => ({ wch }));

  // Las celdas quedan vacías en los productos que no tienen el stock cargado
  const vacioSiNulo = (numero) => (numero == null ? "" : numero);
  const filasStock = stock.map((s) => ({
    Producto: s.producto.nombre,
    Categoría: nombreCategoria(s.producto.categoria_id),
    "Stock inicial": vacioSiNulo(s.inicial),
    Compras: s.compras,
    Vendidos: s.vendidos,
    Correcciones: s.correcciones,
    "Stock disponible": vacioSiNulo(s.final),
    Precio: vacioSiNulo(s.producto.precio),
    "Valor del stock": s.final != null && s.producto.precio != null ? Math.max(0, s.final) * s.producto.precio : "",
  }));
  const hojaStock = XLSX.utils.json_to_sheet(filasStock);
  darFormato(hojaStock, ["Precio", "Valor del stock"], FORMATO_PESOS_EXCEL);
  hojaStock["!cols"] = [34, 16, 13, 10, 10, 13, 16, 12, 16].map((wch) => ({ wch }));

  const porProducto = resumenPorProducto(ventas).map((p) => ({
    Producto: p.nombre,
    "Unidades vendidas": p.unidades,
    "Total vendido": p.total,
  }));
  const hojaProductos = XLSX.utils.json_to_sheet(porProducto);
  darFormato(hojaProductos, ["Total vendido"], FORMATO_PESOS_EXCEL);
  hojaProductos["!cols"] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaVentas, "Ventas");
  XLSX.utils.book_append_sheet(libro, hojaStock, "Stock");
  XLSX.utils.book_append_sheet(libro, hojaProductos, "Por producto");
  return libro;
}

async function descargarExcel() {
  const boton = document.querySelector("[data-excel]");
  boton.disabled = true;
  boton.textContent = "Preparando…";
  try {
    const [ventas, stock] = await Promise.all([obtenerVentasMes(mesElegido), obtenerStockMes(mesElegido), cargarLibreriaExcel()]);
    const hayStock = stock.some((s) => s.final != null || s.compras);
    if (!ventas.length && !hayStock) return avisar(`No hay ventas ni stock cargado en ${nombreMes(mesElegido)}.`, "error");
    XLSX.writeFile(crearLibroExcel(ventas, stock), `ventas-y-stock-${mesElegido}.xlsx`);
  } catch (error) {
    console.error(error);
    avisar("No se pudo crear el Excel. Revisa tu conexión.", "error");
  } finally {
    boton.disabled = false;
    boton.textContent = "Descargar Excel";
  }
}

function prepararVentas() {
  const form = document.querySelector("[data-form-venta]");
  form.medio_pago.innerHTML = MEDIOS_PAGO.map((medio) => `<option>${medio}</option>`).join("");
  form.addEventListener("submit", guardarVenta);

  const items = document.querySelector("[data-items]");
  // Al elegir un producto se pone su precio (se puede cambiar, por ejemplo si hubo descuento)
  items.addEventListener("change", (e) => {
    const select = e.target.closest("[data-item-producto]");
    if (!select) return;
    const fila = select.closest("[data-item]");
    const producto = datos.productos.find((p) => p.id === select.value);
    const esOtro = select.value === OTRO_PRODUCTO;
    const nombre = fila.querySelector("[data-item-nombre]");
    nombre.hidden = !esOtro;
    if (esOtro) nombre.focus();
    fila.querySelector("[data-item-precio]").value = numeroParaCampo(producto?.precio);
    recalcularVenta();
  });
  items.addEventListener("input", recalcularVenta);
  items.addEventListener("click", (e) => {
    const quitar = e.target.closest("[data-quitar-item]");
    if (!quitar) return;
    quitar.closest("[data-item]").remove();
    actualizarBotonesQuitar();
    recalcularVenta();
  });

  document.querySelector("[data-agregar-item]").addEventListener("click", () => {
    agregarItem();
    recalcularVenta();
  });
  document.querySelector("[data-nueva-venta]").addEventListener("click", () => abrirRegistroVenta());
  document.querySelector("[data-excel]").addEventListener("click", descargarExcel);
  document.querySelector("[data-lista-ventas]").addEventListener("click", (e) => {
    const borrar = e.target.closest("[data-borrar-venta]");
    if (borrar) borrarVenta(Number(borrar.dataset.borrarVenta));
  });
}
