/**
 * Municipios del Maresme para las landings locales de SEO
 * (/control-horario/[municipio]). Cada uno lleva contenido PROPIO (intro, cuerpo
 * y sectores) para que las páginas no sean contenido duplicado: además del hero
 * localizado, cada landing renderiza una sección única sobre el municipio.
 *
 * Los slugs son estables: no cambiarlos una vez indexados (romperían URLs/SEO).
 */
export type Municipio = {
  slug: string;
  nombre: string;
  /** Subtítulo del hero. */
  intro: string;
  /** Párrafo propio del municipio (sección local, contenido único). */
  cuerpo: string;
  /** Sectores locales donde más encaja el fichaje, propios de cada pueblo. */
  sectores: string[];
};

export const MUNICIPIOS: Municipio[] = [
  {
    slug: "mataro",
    nombre: "Mataró",
    intro: "Fichaje digital para empresas, comercios y despachos de la capital del Maresme. Cumple el registro horario obligatorio sin papeleo, desde el móvil o el ordenador.",
    cuerpo: "Como capital de la comarca, Mataró concentra desde despachos profesionales y comercio del centro hasta las naves del Pla d'en Boet y la tradición textil de la ciudad. Fichalium encaja igual de bien en una tienda de la Riera que en una empresa de servicios con varios turnos, dando a cada trabajador su propia cuenta para fichar y a la dirección un registro de jornada siempre listo para la Inspección de Trabajo.",
    sectores: ["Comercio del centro", "Despachos y servicios", "Textil e industria (Pla d'en Boet)", "Hostelería"],
  },
  {
    slug: "premia-de-mar",
    nombre: "Premià de Mar",
    intro: "Control horario para negocios de Premià de Mar: tu plantilla ficha en segundos y tú tienes el registro de jornada al día para la Inspección de Trabajo.",
    cuerpo: "Premià de Mar es uno de los municipios más densos del Maresme, con un comercio de proximidad muy vivo y muchas pymes familiares. Para todas ellas, el registro de jornada dejó de ser opcional en 2019: Fichalium lo resuelve sin instalar nada, con fichaje desde el móvil de cada empleado y partes de horas que se exportan en un clic.",
    sectores: ["Comercio de proximidad", "Peluquerías y estética", "Restauración", "Talleres"],
  },
  {
    slug: "el-masnou",
    nombre: "El Masnou",
    intro: "El registro de jornada de tu empresa en El Masnou, sin hojas de Excel. Entradas y salidas con hora exacta y, si quieres, ubicación del fichaje.",
    cuerpo: "El Masnou combina un frente marítimo con puerto deportivo, comercio local y empresas de servicios. Para negocios con personal que entra y sale a distintas horas, Fichalium ofrece un botón claro de entrada/salida, control de las horas trabajadas por día y la opción de geolocalizar el fichaje cuando interesa comprobar desde dónde se ficha.",
    sectores: ["Puerto y náutica", "Comercio local", "Servicios y oficinas", "Hostelería"],
  },
  {
    slug: "premia-de-dalt",
    nombre: "Premià de Dalt",
    intro: "Fichaje sencillo para pymes y autónomos con empleados en Premià de Dalt. Registro horario legal, informes listos y prueba gratis sin compromiso.",
    cuerpo: "En Premià de Dalt predominan las pequeñas empresas y los autónomos con un puñado de empleados, para quienes montar un sistema de fichaje complejo no tiene sentido. Fichalium está pensado precisamente para eso: se configura en minutos, cada trabajador ficha desde su cuenta y el propietario conserva el registro los años que exige la ley.",
    sectores: ["Autónomos con empleados", "Construcción y oficios", "Comercio", "Servicios"],
  },
  {
    slug: "vilassar-de-mar",
    nombre: "Vilassar de Mar",
    intro: "Control de jornada para comercios, oficinas y talleres de Vilassar de Mar. Cada trabajador ficha desde su cuenta y tú lo ves en tiempo real.",
    cuerpo: "Vilassar de Mar es conocida por su tradición hortícola y su mercado de la flor, además de un comercio y unos servicios muy activos. Sea en un almacén logístico, en una floristería o en una oficina, Fichalium permite ver en tiempo real quién está dentro y cuadra las horas de cada jornada sin cálculos manuales.",
    sectores: ["Horticultura y flor", "Logística y almacén", "Comercio", "Oficinas"],
  },
  {
    slug: "vilassar-de-dalt",
    nombre: "Vilassar de Dalt",
    intro: "Registro horario digital para empresas del entorno industrial de Vilassar de Dalt. Cumple la normativa laboral y olvídate del cuaderno de firmas.",
    cuerpo: "Con sus polígonos industriales, Vilassar de Dalt reúne empresas de fabricación, logística y servicios técnicos donde el control de turnos es clave. Fichalium sustituye el cuaderno de firmas por un registro digital inalterable: cada fichaje queda con su hora exacta y las correcciones se hacen de forma trazable, sin poder borrar el original.",
    sectores: ["Industria y fabricación", "Logística", "Servicios técnicos", "Comercio"],
  },
  {
    slug: "cabrera-de-mar",
    nombre: "Cabrera de Mar",
    intro: "Fichaje para pequeñas empresas y bodegas de Cabrera de Mar. Marca de entrada y salida, horas trabajadas por día e informes exportables.",
    cuerpo: "Cabrera de Mar, con su entorno de viñedos y su yacimiento ibérico, es un municipio pequeño donde predominan las bodegas, el comercio y la restauración. Para estos negocios Fichalium aporta lo justo y necesario: fichaje ágil, horas por día e informes que se entregan sin esfuerzo si llega una inspección.",
    sectores: ["Bodegas y viñedo", "Restauración", "Comercio", "Turismo"],
  },
  {
    slug: "cabrils",
    nombre: "Cabrils",
    intro: "El control horario de tu negocio en Cabrils, resuelto. Tus empleados fichan desde el móvil y tú conservas el registro los años que exige la ley.",
    cuerpo: "Cabrils es un municipio residencial del interior del Maresme con comercio de proximidad, hostelería y servicios a domicilio. Fichalium se adapta bien a plantillas que no siempre están en el mismo sitio: el fichaje se hace desde el móvil y, si se activa, registra también la ubicación del momento del fichaje.",
    sectores: ["Hostelería", "Servicios a domicilio", "Comercio", "Jardinería y mantenimiento"],
  },
  {
    slug: "argentona",
    nombre: "Argentona",
    intro: "Registro de jornada para comercios y talleres de Argentona. Sencillo de usar, legal y con informes preparados para cualquier inspección.",
    cuerpo: "Argentona, célebre por su feria del cántaro y su artesanía, mezcla comercio tradicional, talleres y empresas de servicios. Fichalium encaja en cualquiera de ellos con una curva de aprendizaje mínima: el empleado solo pulsa entrada o salida y el sistema hace el resto, incluido el cálculo de las horas.",
    sectores: ["Artesanía y comercio", "Talleres", "Servicios", "Hostelería"],
  },
  {
    slug: "alella",
    nombre: "Alella",
    intro: "Fichaje digital para bodegas, restaurantes y empresas de Alella. Controla las horas de tu equipo sin complicaciones y desde cualquier dispositivo.",
    cuerpo: "Alella es tierra de vino: su denominación de origen marca el carácter de muchas de sus empresas, junto a la restauración y el comercio. En época de vendimia o en el día a día de una bodega, Fichalium ordena los turnos y las horas de temporada sin necesidad de instalar aplicaciones ni comprar terminales.",
    sectores: ["Bodegas y DO Alella", "Restauración", "Comercio", "Turismo enológico"],
  },
  {
    slug: "teia",
    nombre: "Teià",
    intro: "Control horario para autónomos y pymes de Teià. Registra la jornada de tu plantilla al minuto y ten los partes listos cuando los necesites.",
    cuerpo: "Teià es un municipio tranquilo con viñedo, comercio de proximidad y servicios profesionales. Para el autónomo con dos o tres empleados o la pequeña oficina, Fichalium ofrece registro de jornada al minuto sin coste de instalación y con la tranquilidad de cumplir la normativa laboral.",
    sectores: ["Viñedo y agroalimentario", "Servicios profesionales", "Comercio", "Restauración"],
  },
  {
    slug: "tiana",
    nombre: "Tiana",
    intro: "El registro de jornada de tu empresa en Tiana, sin papeleo. Fichaje por empleado, informes automáticos y prueba gratuita para empezar hoy.",
    cuerpo: "En la puerta sur del Maresme, Tiana combina entorno residencial con bodegas y pequeñas empresas de servicios. Fichalium les da un registro de jornada por empleado, informes automáticos por día y semana, y la posibilidad de empezar con una prueba gratuita antes de decidir.",
    sectores: ["Bodegas", "Servicios", "Comercio", "Educación y ocio"],
  },
  {
    slug: "montgat",
    nombre: "Montgat",
    intro: "Fichaje para negocios de Montgat, en la puerta sur del Maresme. Entradas y salidas con hora exacta y control de horas trabajadas por día.",
    cuerpo: "Montgat, entre el mar y la montaña a las puertas de Barcelona, tiene comercio de playa, restauración y empresas de servicios. Fichalium registra entradas y salidas con hora exacta y suma las horas de cada jornada, algo especialmente útil donde los turnos cambian con la temporada.",
    sectores: ["Restauración de playa", "Comercio", "Servicios", "Pesca y náutica"],
  },
  {
    slug: "arenys-de-mar",
    nombre: "Arenys de Mar",
    intro: "Control horario para el comercio, la hostelería y el puerto de Arenys de Mar. Tu equipo ficha en segundos y cumples el registro obligatorio.",
    cuerpo: "Arenys de Mar vive de su puerto pesquero, su lonja y una hostelería con fuerte estacionalidad. En negocios donde el personal aumenta en verano, Fichalium permite dar de alta y de baja empleados con facilidad y llevar el registro de todos ellos sin perder el control de las horas.",
    sectores: ["Puerto y lonja", "Hostelería", "Comercio", "Encaje de bolillos y artesanía"],
  },
  {
    slug: "arenys-de-munt",
    nombre: "Arenys de Munt",
    intro: "Registro de jornada digital para empresas de Arenys de Munt. Legal, sencillo y con toda la información centralizada para ti.",
    cuerpo: "Arenys de Munt, en el interior sobre Arenys de Mar, tiene un tejido de talleres, comercio y servicios. Fichalium centraliza toda la información de jornada en un solo panel: quién está dentro, las horas por persona y los informes listos para descargar en PDF o Excel.",
    sectores: ["Talleres y oficios", "Comercio", "Servicios", "Agroalimentario"],
  },
  {
    slug: "canet-de-mar",
    nombre: "Canet de Mar",
    intro: "Fichaje para comercios y pymes de Canet de Mar. Cada trabajador registra su jornada desde su cuenta y tú lo supervisas al instante.",
    cuerpo: "Canet de Mar, con su patrimonio modernista y su casco marinero, atrae comercio y turismo cultural. Para las pymes locales, Fichalium convierte el control horario en algo trivial: cada trabajador ficha desde su cuenta y el responsable lo supervisa al instante desde cualquier dispositivo.",
    sectores: ["Turismo cultural", "Comercio", "Hostelería", "Servicios"],
  },
  {
    slug: "sant-pol-de-mar",
    nombre: "Sant Pol de Mar",
    intro: "Control horario para restaurantes, hoteles y negocios de Sant Pol de Mar. Registro de entradas y salidas sin fricción, cumpliendo la ley.",
    cuerpo: "Sant Pol de Mar es un pueblo de calas y gastronomía, con restaurantes de referencia y alojamientos con marcada temporada alta. Fichalium ayuda a estos negocios a ordenar los turnos de cocina y sala y a documentar la jornada real de cada empleado, un punto sensible en hostelería.",
    sectores: ["Restauración", "Hoteles y alojamiento", "Comercio", "Turismo"],
  },
  {
    slug: "calella",
    nombre: "Calella",
    intro: "Fichaje para hoteles, comercios y empresas turísticas de Calella. Gestiona los turnos y las horas de tu plantilla desde un solo lugar.",
    cuerpo: "Calella es uno de los grandes motores turísticos del Alt Maresme, con hoteles, comercio y ocio que multiplican su plantilla en temporada. Fichalium está hecho para esa realidad: alta rápida de empleados de temporada, fichaje por turnos y un registro fiable de las horas de cada uno, imprescindible en un sector tan inspeccionado.",
    sectores: ["Hoteles", "Comercio turístico", "Restauración y ocio", "Servicios de temporada"],
  },
  {
    slug: "pineda-de-mar",
    nombre: "Pineda de Mar",
    intro: "Registro de jornada para negocios de Pineda de Mar. Fichaje móvil, informes exportables y conservación legal del registro horario.",
    cuerpo: "Pineda de Mar combina un núcleo residencial importante con hoteles y comercio de costa. Para todos ellos, Fichalium ofrece fichaje desde el móvil, informes exportables y la conservación del registro durante los cuatro años que marca la normativa, sin tener que preocuparse de guardar papeles.",
    sectores: ["Hoteles y camping", "Comercio", "Restauración", "Servicios"],
  },
  {
    slug: "santa-susanna",
    nombre: "Santa Susanna",
    intro: "Control horario para hoteles y empresas de Santa Susanna. Controla las horas de tu equipo con un sistema simple, legal y siempre disponible.",
    cuerpo: "Santa Susanna es un municipio netamente turístico, con grandes hoteles y campings junto al mar. En establecimientos con mucho personal y turnos rotativos, Fichalium simplifica el control de las horas de cada empleado y evita las discrepancias, con un sistema disponible las 24 horas.",
    sectores: ["Hoteles y campings", "Restauración", "Animación y ocio", "Comercio"],
  },
  {
    slug: "malgrat-de-mar",
    nombre: "Malgrat de Mar",
    intro: "Fichaje digital para la hostelería y el comercio de Malgrat de Mar. Tu plantilla ficha desde el móvil y tú cumples el registro obligatorio.",
    cuerpo: "En el extremo norte del Maresme, Malgrat de Mar vive del turismo de sol y playa y de un comercio que se dispara en verano. Fichalium permite a hoteles, chiringuitos y tiendas gestionar plantillas cambiantes y documentar la jornada real, cumpliendo el registro obligatorio sin fricciones.",
    sectores: ["Hostelería y playa", "Comercio", "Camping", "Servicios de temporada"],
  },
  {
    slug: "palafolls",
    nombre: "Palafolls",
    intro: "Registro de jornada para empresas del polígono y el comercio de Palafolls. Entradas, salidas e informes al día, sin hojas de cálculo.",
    cuerpo: "Palafolls destaca por su actividad industrial y logística, con polígonos que dan empleo a buena parte de la comarca, además de comercio y agricultura. Para naves y empresas con turnos, Fichalium ofrece un registro digital de entradas y salidas y correcciones trazables, dejando atrás las hojas de cálculo.",
    sectores: ["Industria y logística", "Agricultura", "Comercio", "Servicios"],
  },
  {
    slug: "tordera",
    nombre: "Tordera",
    intro: "Control horario para industria, comercio y pymes de Tordera. Un sistema de fichaje claro, legal y pensado para no perder tiempo.",
    cuerpo: "Tordera, el municipio más extenso del Maresme, tiene un fuerte peso industrial y agrícola junto a su comercio de núcleo. Fichalium ordena el control horario tanto en una nave con varios turnos como en una tienda: fichaje claro, cálculo automático de horas e informes que ahorran tiempo de gestión.",
    sectores: ["Industria", "Agricultura", "Comercio", "Logística"],
  },
  {
    slug: "sant-cebria-de-vallalta",
    nombre: "Sant Cebrià de Vallalta",
    intro: "Fichaje para pequeñas empresas de Sant Cebrià de Vallalta. Registro de jornada por empleado, informes automáticos y prueba gratis.",
    cuerpo: "Sant Cebrià de Vallalta es un municipio de interior, con explotaciones agrícolas, oficios y pequeño comercio. Para negocios de pocas personas, Fichalium aporta un registro de jornada por empleado sin coste de instalación, con informes automáticos y una prueba gratuita para valorarlo con calma.",
    sectores: ["Agricultura", "Oficios y construcción", "Comercio", "Servicios"],
  },
  {
    slug: "sant-iscle-de-vallalta",
    nombre: "Sant Iscle de Vallalta",
    intro: "El control horario de tu negocio en Sant Iscle de Vallalta, resuelto. Fichaje sencillo, legal y accesible desde cualquier dispositivo.",
    cuerpo: "Sant Iscle de Vallalta, en el valle sobre Sant Pol, es un pueblo pequeño con agricultura, servicios rurales y algo de turismo. Fichalium se adapta a plantillas reducidas y a trabajos fuera de una oficina fija, con fichaje accesible desde cualquier dispositivo y ubicación opcional del fichaje.",
    sectores: ["Agricultura", "Turismo rural", "Servicios", "Construcción"],
  },
  {
    slug: "sant-andreu-de-llavaneres",
    nombre: "Sant Andreu de Llavaneres",
    intro: "Registro de jornada para comercios y despachos de Sant Andreu de Llavaneres. Tu equipo ficha en segundos y tú tienes todo controlado.",
    cuerpo: "Sant Andreu de Llavaneres es un municipio residencial con puerto deportivo, comercio y servicios profesionales de nivel. Fichalium encaja en despachos, clínicas y tiendas con un fichaje de segundos por empleado y un panel donde el responsable tiene todo el control horario a la vista.",
    sectores: ["Puerto deportivo", "Despachos y clínicas", "Comercio", "Servicios"],
  },
  {
    slug: "sant-vicenc-de-montalt",
    nombre: "Sant Vicenç de Montalt",
    intro: "Fichaje digital para pymes y autónomos de Sant Vicenç de Montalt. Cumple el registro horario obligatorio sin complicaciones ni papeleo.",
    cuerpo: "Sant Vicenç de Montalt es un municipio residencial de la costa central del Maresme, con comercio, restauración y servicios. Para sus pymes y autónomos con empleados, Fichalium resuelve el registro horario obligatorio sin papeleo y con la información siempre disponible en el móvil.",
    sectores: ["Restauración", "Comercio", "Servicios", "Golf y ocio"],
  },
  {
    slug: "caldes-destrac",
    nombre: "Caldes d'Estrac",
    intro: "Control horario para hoteles, balnearios y negocios de Caldes d'Estrac. Registro de entradas y salidas siempre a mano y conforme a la ley.",
    cuerpo: "Caldes d'Estrac (Caldetes) es conocida por su tradición termal y su ambiente de veraneo, con hoteles, balneario y restauración. Fichalium se ajusta a establecimientos con turnos y temporada, manteniendo el registro de entradas y salidas siempre a mano y conforme a la ley.",
    sectores: ["Hoteles y balneario", "Restauración", "Comercio", "Turismo"],
  },
  {
    slug: "dosrius",
    nombre: "Dosrius",
    intro: "Registro de jornada para empresas y talleres de Dosrius. Fichaje móvil, control de horas por día e informes listos para presentar.",
    cuerpo: "Dosrius, en el interior boscoso del Maresme, agrupa varios núcleos con agricultura, oficios y pequeñas empresas. Fichalium encaja bien donde el trabajo no siempre es en un mismo local: fichaje desde el móvil, control de horas por día e informes listos para presentar cuando haga falta.",
    sectores: ["Agricultura y forestal", "Oficios", "Servicios", "Comercio"],
  },
  {
    slug: "orrius",
    nombre: "Òrrius",
    intro: "Fichaje sencillo para pequeños negocios de Òrrius. Cada trabajador registra su jornada desde su cuenta y tú conservas el registro legal.",
    cuerpo: "Òrrius es uno de los municipios más pequeños del Maresme, de carácter rural y con negocios muy locales. Aun con plantillas mínimas, la obligación de registrar la jornada es la misma: Fichalium la cubre con un sistema sencillo, sin coste de instalación y con el registro conservado el tiempo que marca la ley.",
    sectores: ["Agricultura", "Servicios rurales", "Comercio", "Oficios"],
  },
];
