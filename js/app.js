const formatoPeso = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const EXTRA_CORTES = 1.1;

function linkWhatsapp(mensaje) {
  return `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

function linkCorreo(asunto, mensaje) {
  return `mailto:${NEGOCIO.correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
}

function nombreCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id)?.nombre ?? "";
}

function textoPrecio(producto) {
  if (producto.precio == null) return "Consultar precio";
  return `${formatoPeso.format(producto.precio)} <small>/ ${producto.unidad}</small>`;
}

// Datos del negocio en la página
function cargarDatosNegocio() {
  const mensajeGeneral = `Hola ${NEGOCIO.nombre}, vengo de la página web y quiero cotizar.`;
  document.querySelectorAll("[data-whatsapp]").forEach((a) => {
    a.href = linkWhatsapp(mensajeGeneral);
    a.target = "_blank";
    a.rel = "noopener";
  });
  document.querySelectorAll("[data-instagram]").forEach((a) => {
    a.href = `https://www.instagram.com/${NEGOCIO.instagram}/`;
  });
  document.querySelector(".contacto__direccion").textContent = `${NEGOCIO.direccion} (${NEGOCIO.referencia})`;
  document.querySelector(".contacto__horario").innerHTML = NEGOCIO.horario
    .map((h) => `<p><strong>${h.dias}:</strong> ${h.horas}</p>`)
    .join("");
  document.querySelector(".contacto__despacho").textContent = NEGOCIO.despacho;
  const telefono = document.querySelector("[data-telefono]");
  telefono.href = `tel:+${NEGOCIO.whatsapp}`;
  telefono.textContent = NEGOCIO.telefonoVisible;
  const correo = document.querySelector("[data-correo]");
  correo.href = `mailto:${NEGOCIO.correo}`;
  correo.textContent = NEGOCIO.correo;
  document.querySelector("[data-boton-correo]").href = linkCorreo(
    "Consulta desde la página web",
    `Hola ${NEGOCIO.nombre},\n\nQuiero hacer una consulta sobre:\n\n\nMi nombre:\nMi teléfono:\nComuna:\n`
  );
  document.querySelectorAll("[data-como-llegar]").forEach((a) => {
    a.href = NEGOCIO.comoLlegar;
  });
  cargarMapa();
  document.querySelector("[data-anio]").textContent = new Date().getFullYear();
}

// El link de vista previa de Claude bloquea mapas externos: ahí se muestra una tarjeta que abre Google Maps.
// En el hosting real se carga el mapa interactivo.
function cargarMapa() {
  const mapa = document.querySelector(".contacto__mapa iframe");
  const respaldo = document.querySelector(".mapa-respaldo");
  if (/claude/i.test(location.hostname)) {
    mapa.remove();
    respaldo.hidden = false;
    return;
  }
  mapa.src = NEGOCIO.mapa;
}

// Catálogo
// La tarjeta muestra la foto instalada y, al pasar el mouse, la plancha
function fotosTarjeta(p) {
  if (!p.imagen) return "";
  const principal = `<img src="${p.ambiente ?? p.imagen}" alt="${p.nombre}" loading="lazy">`;
  const plancha = p.ambiente ? `<img class="producto__plancha" src="${p.imagen}" alt="" loading="lazy">` : "";
  return principal + plancha;
}

function tarjetaProducto(p) {
  return `
    <button class="producto" data-id="${p.id}">
      <div class="producto__imagen textura ${p.textura}">
        ${fotosTarjeta(p)}
        ${p.oferta ? '<span class="etiqueta etiqueta--oscura producto__oferta">Oferta</span>' : ""}
      </div>
      <div class="producto__info">
        <span class="producto__categoria">${nombreCategoria(p.categoria)}</span>
        <h3 class="producto__nombre">${p.nombre}</h3>
        <p class="producto__precio">${textoPrecio(p)}</p>
      </div>
    </button>`;
}

function mostrarProductos(categoria) {
  const lista = categoria === "todos" ? PRODUCTOS : PRODUCTOS.filter((p) => p.categoria === categoria);
  document.querySelector(".grilla-productos").innerHTML = lista.map(tarjetaProducto).join("");
}

function cargarFiltros() {
  const contenedor = document.querySelector(".filtros");
  const opciones = [{ id: "todos", nombre: "Todos" }, ...CATEGORIAS];
  contenedor.innerHTML = opciones
    .map((c, i) => `<button class="filtro" role="tab" data-categoria="${c.id}" aria-selected="${i === 0}">${c.nombre}</button>`)
    .join("");

  contenedor.addEventListener("click", (e) => {
    const boton = e.target.closest(".filtro");
    if (!boton) return;
    contenedor.querySelectorAll(".filtro").forEach((b) => b.setAttribute("aria-selected", b === boton));
    mostrarProductos(boton.dataset.categoria);
  });
}

// Ficha de producto
function galeriaFicha(p) {
  if (!p.imagen) return `<div class="ficha__imagen textura ${p.textura}"></div>`;
  const fotos = [
    p.ambiente && { src: p.ambiente, texto: "Instalado" },
    { src: p.imagen, texto: "Plancha" },
  ].filter(Boolean);
  const miniaturas = fotos.length > 1
    ? `<div class="ficha__miniaturas">${fotos
        .map((f, i) => `<button type="button" data-foto="${f.src}" aria-pressed="${i === 0}"><img src="${f.src}" alt=""><span>${f.texto}</span></button>`)
        .join("")}</div>`
    : "";
  return `
    <div class="ficha__imagen ficha__galeria">
      <img class="ficha__foto" src="${fotos[0].src}" alt="${p.nombre}">
      ${miniaturas}
    </div>`;
}

function abrirFicha(id) {
  const p = PRODUCTOS.find((x) => x.id === id);
  if (!p) return;
  const mensaje = `Hola ${NEGOCIO.nombre}, me interesa: ${p.nombre}. ¿Me pueden cotizar?`;
  const correo = linkCorreo(
    `Cotización: ${p.nombre}`,
    `Hola ${NEGOCIO.nombre},\n\nMe interesa cotizar: ${p.nombre}.\nCantidad o m² aproximados:\n\nMi nombre:\nMi teléfono:\nComuna:\n`
  );
  const ficha = document.querySelector(".ficha");
  ficha.querySelector(".ficha__contenido").innerHTML = `
    ${galeriaFicha(p)}
    <div class="ficha__info">
      <span class="producto__categoria">${nombreCategoria(p.categoria)}</span>
      <h3>${p.nombre}</h3>
      <p class="producto__precio">${textoPrecio(p)}</p>
      <ul>${p.detalles.map((d) => `<li>${d}</li>`).join("")}</ul>
      <a class="boton" href="${linkWhatsapp(mensaje)}" target="_blank" rel="noopener">Cotizar por WhatsApp</a>
      <a class="boton boton--borde" href="${correo}">Cotizar por correo</a>
    </div>`;
  ficha.showModal();
}

function prepararFicha() {
  const ficha = document.querySelector(".ficha");
  document.querySelector(".grilla-productos").addEventListener("click", (e) => {
    const tarjeta = e.target.closest(".producto");
    if (tarjeta) abrirFicha(tarjeta.dataset.id);
  });
  ficha.querySelector(".ficha__cerrar").addEventListener("click", () => ficha.close());
  // Cambiar entre la foto instalada y la plancha
  ficha.addEventListener("click", (e) => {
    const miniatura = e.target.closest("[data-foto]");
    if (!miniatura) return;
    ficha.querySelector(".ficha__foto").src = miniatura.dataset.foto;
    ficha.querySelectorAll("[data-foto]").forEach((b) => b.setAttribute("aria-pressed", b === miniatura));
  });
  // Cerrar al hacer clic fuera del contenido
  ficha.addEventListener("click", (e) => {
    if (e.target === ficha) ficha.close();
  });
}

// Calculadora
function prepararCalculadora() {
  const form = document.querySelector(".calculadora__form");
  const select = form.producto;
  const resultado = form.querySelector(".calculadora__resultado");
  const botonCotizar = form.querySelector("[data-whatsapp-calculo]");
  const calculables = PRODUCTOS.filter((p) => p.m2);

  select.innerHTML = CATEGORIAS.map((c) => {
    const opciones = calculables.filter((p) => p.categoria === c.id);
    if (!opciones.length) return "";
    return `<optgroup label="${c.nombre}">${opciones.map((p) => `<option value="${p.id}">${p.nombre}</option>`).join("")}</optgroup>`;
  }).join("");

  function calcular() {
    const p = calculables.find((x) => x.id === select.value);
    const largo = parseFloat(form.largo.value);
    const ancho = parseFloat(form.ancho.value);
    if (!p || !(largo > 0) || !(ancho > 0)) {
      resultado.textContent = "Ingresa las medidas para calcular.";
      botonCotizar.hidden = true;
      return;
    }
    const superficie = largo * ancho;
    const cantidad = Math.ceil((superficie * EXTRA_CORTES) / p.m2);
    const plural = p.unidad === "caja" ? (cantidad === 1 ? "caja" : "cajas") : (cantidad === 1 ? "plancha" : "planchas");
    const total = p.precio ? ` · aprox. ${formatoPeso.format(cantidad * p.precio)}` : "";

    resultado.innerHTML = `
      <strong>${cantidad} ${plural}</strong>
      Superficie: ${superficie.toFixed(2).replace(".", ",")} m² (+10% por cortes)${total}`;

    const mensaje = `Hola ${NEGOCIO.nombre}, quiero cotizar ${cantidad} ${plural} de ${p.nombre} para ${superficie.toFixed(2).replace(".", ",")} m².`;
    botonCotizar.href = linkWhatsapp(mensaje);
    botonCotizar.target = "_blank";
    botonCotizar.rel = "noopener";
    botonCotizar.hidden = false;
  }

  form.addEventListener("input", calcular);
  form.addEventListener("submit", (e) => e.preventDefault());
}

// Menú en celular
function prepararMenu() {
  const boton = document.querySelector(".menu-boton");
  const nav = document.querySelector(".nav");
  boton.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    boton.setAttribute("aria-expanded", abierto);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      nav.classList.remove("abierto");
      boton.setAttribute("aria-expanded", false);
    }
  });
}

cargarDatosNegocio();
cargarFiltros();
mostrarProductos("todos");
prepararFicha();
prepararCalculadora();
prepararMenu();
