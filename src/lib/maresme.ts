/**
 * Municipios del Maresme para las landings locales de SEO
 * (/control-horario/[municipio]). Cada uno lleva una intro propia para que las
 * páginas no sean contenido duplicado: el hero se localiza con `nombre`+`intro`
 * y el resto de secciones (cómo funciona, precios) son compartidas.
 *
 * Los slugs son estables: no cambiarlos una vez indexados (romperían URLs/SEO).
 */
export type Municipio = { slug: string; nombre: string; intro: string };

export const MUNICIPIOS: Municipio[] = [
  { slug: "mataro", nombre: "Mataró", intro: "Fichaje digital para empresas, comercios y despachos de la capital del Maresme. Cumple el registro horario obligatorio sin papeleo, desde el móvil o el ordenador." },
  { slug: "premia-de-mar", nombre: "Premià de Mar", intro: "Control horario para negocios de Premià de Mar: tu plantilla ficha en segundos y tú tienes el registro de jornada al día para la Inspección de Trabajo." },
  { slug: "el-masnou", nombre: "El Masnou", intro: "El registro de jornada de tu empresa en El Masnou, sin hojas de Excel. Entradas y salidas con hora exacta y, si quieres, ubicación del fichaje." },
  { slug: "premia-de-dalt", nombre: "Premià de Dalt", intro: "Fichaje sencillo para pymes y autónomos con empleados en Premià de Dalt. Registro horario legal, informes listos y prueba gratis sin compromiso." },
  { slug: "vilassar-de-mar", nombre: "Vilassar de Mar", intro: "Control de jornada para comercios, oficinas y talleres de Vilassar de Mar. Cada trabajador ficha desde su cuenta y tú lo ves en tiempo real." },
  { slug: "vilassar-de-dalt", nombre: "Vilassar de Dalt", intro: "Registro horario digital para empresas del entorno industrial de Vilassar de Dalt. Cumple la normativa laboral y olvídate del cuaderno de firmas." },
  { slug: "cabrera-de-mar", nombre: "Cabrera de Mar", intro: "Fichaje para pequeñas empresas y bodegas de Cabrera de Mar. Marca de entrada y salida, horas trabajadas por día e informes exportables." },
  { slug: "cabrils", nombre: "Cabrils", intro: "El control horario de tu negocio en Cabrils, resuelto. Tus empleados fichan desde el móvil y tú conservas el registro los años que exige la ley." },
  { slug: "argentona", nombre: "Argentona", intro: "Registro de jornada para comercios y talleres de Argentona. Sencillo de usar, legal y con informes preparados para cualquier inspección." },
  { slug: "alella", nombre: "Alella", intro: "Fichaje digital para bodegas, restaurantes y empresas de Alella. Controla las horas de tu equipo sin complicaciones y desde cualquier dispositivo." },
  { slug: "teia", nombre: "Teià", intro: "Control horario para autónomos y pymes de Teià. Registra la jornada de tu plantilla al minuto y ten los partes listos cuando los necesites." },
  { slug: "tiana", nombre: "Tiana", intro: "El registro de jornada de tu empresa en Tiana, sin papeleo. Fichaje por empleado, informes automáticos y prueba gratuita para empezar hoy." },
  { slug: "montgat", nombre: "Montgat", intro: "Fichaje para negocios de Montgat, en la puerta sur del Maresme. Entradas y salidas con hora exacta y control de horas trabajadas por día." },
  { slug: "arenys-de-mar", nombre: "Arenys de Mar", intro: "Control horario para el comercio, la hostelería y el puerto de Arenys de Mar. Tu equipo ficha en segundos y cumples el registro obligatorio." },
  { slug: "arenys-de-munt", nombre: "Arenys de Munt", intro: "Registro de jornada digital para empresas de Arenys de Munt. Legal, sencillo y con toda la información centralizada para ti." },
  { slug: "canet-de-mar", nombre: "Canet de Mar", intro: "Fichaje para comercios y pymes de Canet de Mar. Cada trabajador registra su jornada desde su cuenta y tú lo supervisas al instante." },
  { slug: "sant-pol-de-mar", nombre: "Sant Pol de Mar", intro: "Control horario para restaurantes, hoteles y negocios de Sant Pol de Mar. Registro de entradas y salidas sin fricción, cumpliendo la ley." },
  { slug: "calella", nombre: "Calella", intro: "Fichaje para hoteles, comercios y empresas turísticas de Calella. Gestiona los turnos y las horas de tu plantilla desde un solo lugar." },
  { slug: "pineda-de-mar", nombre: "Pineda de Mar", intro: "Registro de jornada para negocios de Pineda de Mar. Fichaje móvil, informes exportables y conservación legal del registro horario." },
  { slug: "santa-susanna", nombre: "Santa Susanna", intro: "Control horario para hoteles y empresas de Santa Susanna. Controla las horas de tu equipo con un sistema simple, legal y siempre disponible." },
  { slug: "malgrat-de-mar", nombre: "Malgrat de Mar", intro: "Fichaje digital para la hostelería y el comercio de Malgrat de Mar. Tu plantilla ficha desde el móvil y tú cumples el registro obligatorio." },
  { slug: "palafolls", nombre: "Palafolls", intro: "Registro de jornada para empresas del polígono y el comercio de Palafolls. Entradas, salidas e informes al día, sin hojas de cálculo." },
  { slug: "tordera", nombre: "Tordera", intro: "Control horario para industria, comercio y pymes de Tordera. Un sistema de fichaje claro, legal y pensado para no perder tiempo." },
  { slug: "sant-cebria-de-vallalta", nombre: "Sant Cebrià de Vallalta", intro: "Fichaje para pequeñas empresas de Sant Cebrià de Vallalta. Registro de jornada por empleado, informes automáticos y prueba gratis." },
  { slug: "sant-iscle-de-vallalta", nombre: "Sant Iscle de Vallalta", intro: "El control horario de tu negocio en Sant Iscle de Vallalta, resuelto. Fichaje sencillo, legal y accesible desde cualquier dispositivo." },
  { slug: "sant-andreu-de-llavaneres", nombre: "Sant Andreu de Llavaneres", intro: "Registro de jornada para comercios y despachos de Sant Andreu de Llavaneres. Tu equipo ficha en segundos y tú tienes todo controlado." },
  { slug: "sant-vicenc-de-montalt", nombre: "Sant Vicenç de Montalt", intro: "Fichaje digital para pymes y autónomos de Sant Vicenç de Montalt. Cumple el registro horario obligatorio sin complicaciones ni papeleo." },
  { slug: "caldes-destrac", nombre: "Caldes d'Estrac", intro: "Control horario para hoteles, balnearios y negocios de Caldes d'Estrac. Registro de entradas y salidas siempre a mano y conforme a la ley." },
  { slug: "dosrius", nombre: "Dosrius", intro: "Registro de jornada para empresas y talleres de Dosrius. Fichaje móvil, control de horas por día e informes listos para presentar." },
  { slug: "orrius", nombre: "Òrrius", intro: "Fichaje sencillo para pequeños negocios de Òrrius. Cada trabajador registra su jornada desde su cuenta y tú conservas el registro legal." },
];
