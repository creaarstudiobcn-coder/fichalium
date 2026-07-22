/**
 * Textos legales de la geolocalización del fichaje que el panel del OWNER pone
 * a disposición de la empresa cliente (responsable del tratamiento). Son
 * PLANTILLAS: la empresa cliente sustituye los [corchetes] por sus datos y los
 * revisa con su asesoría antes de usarlos. Fichalium/Dependalium es el encargado.
 */

/** Texto para informar a la plantilla (art. 90 LOPDGDD, art. 20.3 ET). */
export const INFO_PLANTILLA = `INFORMACIÓN A LA PLANTILLA — GEOLOCALIZACIÓN DEL FICHAJE

En cumplimiento del Reglamento (UE) 2016/679 (RGPD), del artículo 90 de la Ley Orgánica 3/2018 (LOPDGDD) y del artículo 20.3 del Estatuto de los Trabajadores, [NOMBRE DE LA EMPRESA] informa a su plantilla de lo siguiente:

1. Qué se trata. En el momento exacto en que pulsas para fichar (entrada o salida), el sistema realiza una única lectura de la posición geográfica del dispositivo (latitud, longitud y precisión estimada). No se realiza seguimiento ni localización continua, ni fuera de ese acto.

2. Es opcional. Si tu dispositivo o navegador no concede el permiso de ubicación, el fichaje se registra igualmente sin ubicación. En ningún caso se impide fichar por no facilitar la posición.

3. Para qué. Reforzar la veracidad del registro diario de jornada exigido por el artículo 34.9 del Estatuto de los Trabajadores y el Real Decreto-ley 8/2019, permitiendo constatar el lugar desde el que se ficha. No se emplea para otras finalidades (rendimiento, perfiles, etc.).

4. Base jurídica. Cumplimiento de una obligación legal (registro de jornada) e interés legítimo de la empresa en verificar el cumplimiento de la prestación laboral (arts. 6.1.c y 6.1.f RGPD; arts. 20.3 y 34.9 ET).

5. Quién accede. Solo el personal autorizado de la empresa (dirección / recursos humanos). El proveedor del software, Dependalium Global Services S.L., actúa como encargado del tratamiento, con los datos alojados en servidores de la Unión Europea.

6. Conservación. Los datos de fichaje, incluida la ubicación cuando exista, se conservan cuatro (4) años, según exige la normativa de registro de jornada.

7. Tus derechos. Puedes ejercer los derechos de acceso, rectificación, supresión, limitación, oposición y portabilidad dirigiéndote a [EMAIL DE CONTACTO]. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

[NOMBRE DE LA EMPRESA] · [FECHA]`;

/** Datos del encargado (Dependalium), fijos, para el contrato de encargo. */
export const ENCARGADO = {
  razon: "Dependalium Global Services S.L.",
  cif: "B26786962",
  domicilio: "Baixada de les Espenyes 6, 08301 Mataró (Barcelona)",
  email: "info@dependalium.com",
} as const;
