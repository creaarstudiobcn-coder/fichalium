# Marketing — Fichalium

Material para captar clientes (empresas del Maresme que deben cumplir el registro de jornada).

## Ficheros
- **`newsletter-email.html`** — newsletter lista para **Resend** (tablas + CSS inline, 600px).
  Lleva la etiqueta `{{{RESEND_UNSUBSCRIBE_URL}}}` para la baja (solo funciona en *Broadcasts*).
- **`newsletter-web.html`** — misma newsletter en versión web (para verla a pantalla completa o compartir enlace).
- **`logo.png`** — logo oficial rasterizado (para el email; también en `public/logo.png` → `https://www.fichalium.es/logo.png`).
- **`guion-llamadas.md`** — guion de llamada para pedir **permiso** antes de enviar el email (con objeciones).
- **`seguimiento-llamadas.csv`** — hoja para apuntar cada llamada (ábrela en Excel/Sheets).

## Asuntos A/B para probar
Envía el mismo email cambiando solo el asunto (~50/50) y quédate con el de más aperturas.

| Test | 🅰️ | 🅱️ |
|---|---|---|
| 1 — miedo vs. facilidad | Multas de hasta 7.500 € por no fichar: ¿tu empresa está cubierta? | El fichaje de tu equipo, resuelto en 5 minutos |
| 2 — pregunta vs. beneficio | ¿Tu empresa lleva el registro de jornada al día? | Fichaje para tu plantilla, gratis 14 días (sin instalar nada) |
| 3 — local/curiosidad | ¿Aún fichas en papel o en Excel? | Una forma más simple de cumplir el registro horario |

Reglas de asunto: 40–50 caracteres, sin "GRATIS" en mayúsculas ni "!!!" (spam).

## Cómo enviar en Resend (Broadcasts)
1. Audiences → crea la audiencia con **solo contactos que dieron su consentimiento** (los que dijeron "sí" en la llamada).
2. Broadcasts → New broadcast → pega `newsletter-email.html`.
3. From: `Fichalium <hola@fichalium.es>` con **Reply-To** a un buzón que leas (no uses no-reply para newsletter).
4. Manda una **prueba a ti mismo** (Gmail + móvil) antes del envío real.
5. Empieza poco a poco (warm-up): 100–200/día e ir subiendo, vigilando aperturas y quejas.

## ⚠️ Cumplimiento (importante)
- **No** envíes correo a quien no te haya dado permiso: incumple LSSI-CE art. 21 + RGPD.
- **No** uses listas compradas ni scrapeadas: Resend te suspende y **quemas el dominio** `fichalium.es`
  (romperías los emails de recuperación de contraseña y de Stripe de tus clientes reales).
- La vía limpia: **llamar → pedir permiso → enviar solo a quien dijo que sí** (ver `guion-llamadas.md`).
- Guarda la **fecha del consentimiento** en el CSV.
