// Panel de administración: lo que usan todas las pestañas.
// Orden de carga: admin-comun → admin-productos → admin-ventas → admin-resumen → admin (login y arranque).
const db = supabase.createClient(SUPABASE.url, SUPABASE.clave);
const formatoPeso = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat("es-CL");
const formatoFecha = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" });

// Categorías y productos: se cargan al entrar y los usan todas las pestañas
const datos = { categorias: [], productos: [] };

// Los textos vienen de la base: se escapan antes de ponerlos en el HTML
function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// "19.990", "$19.990" o "19990" → 19990. Vacío → null. Texto sin números → NaN.
// No sirve type="number" porque en Chile se escribe 19.990 y el navegador lo lee como 19,99.
function leerEntero(texto) {
  const valor = String(texto ?? "").trim();
  if (valor === "") return null;
  const digitos = valor.replace(/\D/g, "");
  if (digitos === "") return NaN;
  return valor.startsWith("-") ? -Number(digitos) : Number(digitos);
}

// "2,98" o "2.98" → 2.98. Vacío → null. Algo que no es número → NaN
function leerDecimal(texto) {
  const valor = String(texto ?? "").trim().replace(",", ".");
  return valor === "" ? null : Number(valor);
}

// 19990 → "19.990" para mostrarlo en un campo
function numeroParaCampo(numero) {
  return numero == null ? "" : formatoNumero.format(numero);
}

// Las fotos de la carpeta img/ están en la raíz del sitio; las subidas desde el panel son links completos
function rutaFoto(src) {
  if (!src) return "";
  return /^https?:\/\//.test(src) ? src : `../${src}`;
}

function nombreCategoria(id) {
  return datos.categorias.find((c) => c.id === id)?.nombre ?? "";
}

// Mismo orden que la página: por categoría y después por "orden"
function ordenarProductos(lista) {
  const posicion = (p) => datos.categorias.findIndex((c) => c.id === p.categoria_id);
  return lista.sort((a, b) => posicion(a) - posicion(b) || a.orden - b.orden);
}

async function cargarCatalogoAdmin() {
  const [categorias, productos] = await Promise.all([
    db.from("categorias").select("id, nombre, descripcion, orden").order("orden"),
    db.from("productos").select("*"),
  ]);
  if (categorias.error) throw categorias.error;
  if (productos.error) throw productos.error;
  datos.categorias = categorias.data;
  datos.productos = ordenarProductos(productos.data);
}

// Mes elegido en Ventas y Resumen (formato "2026-11"); las dos pestañas comparten el mismo
function mesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

let mesElegido = mesActual();

function usarMes(mes) {
  mesElegido = mes || mesActual();
  document.querySelectorAll("[data-mes]").forEach((campo) => {
    campo.value = mesElegido;
    campo.max = mesActual();
  });
}

// "2026-11" → del 1 de noviembre al 1 de diciembre, en la hora del celular o PC (la de Chile)
function rangoMes(mes) {
  const [anio, numero] = mes.split("-").map(Number);
  return { desde: new Date(anio, numero - 1, 1), hasta: new Date(anio, numero, 1) };
}

function nombreMes(mes) {
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(rangoMes(mes).desde);
}

// Ventas del mes con sus productos (las usan Ventas y Resumen)
async function obtenerVentasMes(mes) {
  const { desde, hasta } = rangoMes(mes);
  const { data, error } = await db
    .from("ventas")
    .select("id, fecha, cliente_nombre, cliente_telefono, comuna, medio_pago, entrega, notas, total, venta_items(id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)")
    .gte("fecha", desde.toISOString())
    .lt("fecha", hasta.toISOString())
    .order("fecha", { ascending: false });
  if (error) throw error;
  data.forEach((venta) => venta.venta_items.sort((a, b) => a.id - b.id));
  return data;
}

const ENTREGAS = { retiro: "Retiro en local", despacho: "Despacho" };

// Stock del mes de cada producto: lo que había al empezar, lo que llegó, lo vendido y lo que quedó.
// Se calcula hacia atrás desde el stock de hoy, con las compras, correcciones y ventas registradas.
async function obtenerStockMes(mes) {
  const { desde, hasta } = rangoMes(mes);
  const [movimientos, ventas] = await Promise.all([
    db.from("movimientos_stock").select("producto_id, tipo, cantidad, fecha").gte("fecha", desde.toISOString()),
    db.from("ventas").select("fecha, venta_items(producto_id, cantidad)").gte("fecha", desde.toISOString()),
  ]);
  if (movimientos.error) throw movimientos.error;
  if (ventas.error) throw ventas.error;

  return datos.productos.map((p) => {
    let compras = 0;
    let correcciones = 0;
    let vendidos = 0;
    let despuesDelMes = 0; // cuánto cambió el stock desde que terminó el mes hasta hoy
    movimientos.data
      .filter((m) => m.producto_id === p.id)
      .forEach((m) => {
        if (new Date(m.fecha) >= hasta) despuesDelMes += m.cantidad;
        else if (m.tipo === "compra") compras += m.cantidad;
        else correcciones += m.cantidad;
      });
    ventas.data.forEach((v) =>
      v.venta_items
        .filter((i) => i.producto_id === p.id)
        .forEach((i) => {
          if (new Date(v.fecha) >= hasta) despuesDelMes -= i.cantidad;
          else vendidos += i.cantidad;
        })
    );
    // Si el producto no tiene stock cargado, solo se informa lo vendido
    const final = p.stock == null ? null : p.stock - despuesDelMes;
    const inicial = final == null ? null : final - compras - correcciones + vendidos;
    return { producto: p, inicial, compras, vendidos, correcciones, final };
  });
}

// Suma unidades y plata por producto (la usan el Excel y el Resumen)
function resumenPorProducto(ventas) {
  const porNombre = new Map();
  ventas.forEach((venta) =>
    venta.venta_items.forEach((item) => {
      const actual = porNombre.get(item.nombre_producto) ?? { nombre: item.nombre_producto, unidades: 0, total: 0 };
      actual.unidades += item.cantidad;
      actual.total += item.subtotal;
      porNombre.set(item.nombre_producto, actual);
    })
  );
  return [...porNombre.values()].sort((a, b) => b.total - a.total);
}

// Mensaje corto abajo de la pantalla
let temporizadorAviso;
function avisar(mensaje, tipo = "ok") {
  const aviso = document.querySelector("[data-aviso]");
  aviso.textContent = mensaje;
  aviso.dataset.tipo = tipo;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    aviso.hidden = true;
  }, 3500);
}

// Pregunta antes de borrar algo. Devuelve true si la persona confirma.
function confirmar(texto, textoBoton = "Eliminar") {
  const dialogo = document.querySelector("[data-dialogo-confirmar]");
  dialogo.querySelector("[data-confirmar-texto]").textContent = texto;
  dialogo.querySelector("[data-confirmar-si]").textContent = textoBoton;
  dialogo.returnValue = "";
  dialogo.showModal();
  return new Promise((resolver) => {
    dialogo.addEventListener("close", () => resolver(dialogo.returnValue === "si"), { once: true });
  });
}

function mostrarError(selector, mensaje) {
  const error = document.querySelector(selector);
  error.textContent = mensaje;
  error.hidden = !mensaje;
  if (mensaje) error.scrollIntoView({ block: "nearest" });
}

// Botones × de las ventanas
document.addEventListener("click", (e) => {
  const cerrar = e.target.closest("[data-cerrar]");
  if (cerrar) cerrar.closest("dialog").close();
});
