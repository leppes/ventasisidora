// Catálogo de ejemplo armado con lo que se ve en Instagram.
// PENDIENTE: nombres, medidas y precios reales. precio: null muestra "Consultar".
// "unidad" define cómo se vende y cómo calcula la calculadora:
//   plancha -> m2 = m² que cubre una plancha
//   caja    -> m2 = m² que trae una caja
const CATEGORIAS = [
  { id: "pvc-marmol", nombre: "PVC tipo mármol", descripcion: "Planchas para muros de baños, cocinas y livings. 100% impermeables." },
  { id: "vinilico", nombre: "Piso vinílico", descripcion: "Resistente al agua, ideal para cocinas y baños." },
  { id: "flotante", nombre: "Piso flotante", descripcion: "Calidez de madera, fácil de instalar." },
  { id: "accesorios", nombre: "Accesorios", descripcion: "Adhesivos, molduras y terminaciones." },
];

const PRODUCTOS = [
  {
    id: "pvc-calacatta-oro", categoria: "pvc-marmol", nombre: "PVC Mármol Calacatta Oro",
    textura: "marmol-calacatta", precio: 19990, unidad: "plancha", m2: 2.98,
    detalles: ["Plancha 1,22 x 2,44 m", "Espesor 3 mm", "Impermeable", "Adhesivo de regalo"],
    destacado: true, oferta: true,
  },
  {
    id: "pvc-carrara", categoria: "pvc-marmol", nombre: "PVC Mármol Blanco Carrara",
    textura: "marmol-carrara", precio: 19990, unidad: "plancha", m2: 2.98,
    detalles: ["Plancha 1,22 x 2,44 m", "Espesor 3 mm", "Impermeable", "Adhesivo de regalo"],
    destacado: true, oferta: true,
  },
  {
    id: "pvc-negro-marquina", categoria: "pvc-marmol", nombre: "PVC Mármol Negro Marquina",
    textura: "marmol-negro", precio: 19990, unidad: "plancha", m2: 2.98,
    detalles: ["Plancha 1,22 x 2,44 m", "Espesor 3 mm", "Impermeable", "Adhesivo de regalo"],
    destacado: true,
  },
  {
    id: "pvc-emperador", categoria: "pvc-marmol", nombre: "PVC Mármol Emperador",
    textura: "marmol-emperador", precio: 19990, unidad: "plancha", m2: 2.98,
    detalles: ["Plancha 1,22 x 2,44 m", "Espesor 3 mm", "Impermeable"],
  },
  {
    id: "pvc-gris-piedra", categoria: "pvc-marmol", nombre: "PVC Gris Piedra",
    textura: "marmol-gris", precio: 19990, unidad: "plancha", m2: 2.98,
    detalles: ["Plancha 1,22 x 2,44 m", "Espesor 3 mm", "Impermeable"],
  },
  {
    id: "pvc-arabescato", categoria: "pvc-marmol", nombre: "PVC Mármol Arabescato",
    textura: "marmol-arabescato", precio: 19990, unidad: "plancha", m2: 2.98,
    detalles: ["Plancha 1,22 x 2,44 m", "Espesor 3 mm", "Impermeable"],
  },
  {
    id: "vinilico-roble-55", categoria: "vinilico", nombre: "Piso Vinílico Roble Natural 5,5 mm",
    textura: "madera-clara", precio: null, unidad: "caja", m2: 2.2,
    detalles: ["Espesor 5,5 mm", "Resistente al agua", "Sistema click"],
    destacado: true, oferta: true,
  },
  {
    id: "vinilico-gris-6", categoria: "vinilico", nombre: "Piso Vinílico Gris Ceniza 6 mm",
    textura: "madera-gris", precio: null, unidad: "caja", m2: 2.2,
    detalles: ["Espesor 6 mm", "Resistente al agua", "Sistema click"],
  },
  {
    id: "flotante-nogal-8", categoria: "flotante", nombre: "Piso Flotante Nogal 8 mm",
    textura: "madera-oscura", precio: null, unidad: "caja", m2: 2.4,
    detalles: ["Espesor 8 mm", "Alto tráfico", "Sistema click"],
    destacado: true, oferta: true,
  },
  {
    id: "flotante-miel-8", categoria: "flotante", nombre: "Piso Flotante Roble Miel 8 mm",
    textura: "madera-miel", precio: null, unidad: "caja", m2: 2.4,
    detalles: ["Espesor 8 mm", "Alto tráfico", "Sistema click"],
  },
  {
    id: "adhesivo-montaje", categoria: "accesorios", nombre: "Adhesivo de montaje",
    textura: "accesorio", precio: null, unidad: "unidad",
    detalles: ["Para planchas PVC", "Cartucho"],
  },
  {
    id: "moldura-pvc", categoria: "accesorios", nombre: "Moldura de terminación",
    textura: "accesorio", precio: null, unidad: "unidad",
    detalles: ["Para esquinas y bordes", "Varios colores"],
  },
];
