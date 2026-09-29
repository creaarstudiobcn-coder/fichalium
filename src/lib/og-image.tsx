import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** `featureSize`: cuerpo de la fila de ventajas (26 por defecto; el catalán, más largo, necesita 24 para caber en una línea). */
export type OgTexts = { pill: string; title: string; features: string[]; featureSize?: number };

/**
 * Manrope es la tipografía de la marca (títulos y wordmark).
 * Si Google Fonts no responde en el build, la imagen sale con la de serie.
 */
async function manrope(weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}&text=${encodeURIComponent(text)}`,
      )
    ).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src?.[1]) return null;
    const res = await fetch(src[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * Imagen Open Graph (1200×630): logo y titular real de la portada del idioma.
 * La usan app/opengraph-image.tsx (es) y app/ca/opengraph-image.tsx (ca).
 */
export async function renderOgImage({ pill, title, features, featureSize = 26 }: OgTexts) {
  const [bold, medium] = await Promise.all([
    manrope(800, "fichalium" + title),
    manrope(600, pill.toUpperCase() + features.join("") + "fichalium.es"),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Manrope", data: bold, weight: 800 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "Manrope", data: medium, weight: 600 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 76px",
          backgroundColor: "#0F1339",
          backgroundImage:
            "radial-gradient(circle at 88% 14%, rgba(0,196,154,0.28), transparent 45%), radial-gradient(circle at 8% 100%, rgba(75,123,229,0.22), transparent 40%)",
          color: "#F4F5FA",
          fontFamily: fonts.length ? "Manrope" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width={76} height={76} viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="90" fill="#F4F5FA" opacity="0.08" />
            <rect x="62" y="52" width="16" height="96" rx="4" fill="#00C49A" />
            <rect x="62" y="52" width="72" height="16" rx="4" fill="#00C49A" />
            <rect x="62" y="88" width="56" height="14" rx="4" fill="#00C49A" />
            <circle cx="148" cy="136" r="18" fill="#00C49A" opacity="0.18" />
            <polyline
              points="138,136 145,144 160,126"
              stroke="#00C49A"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -1.5 }}>fichalium</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: "#8FB0F2",
              backgroundColor: "rgba(75,123,229,0.18)",
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            {pill.toUpperCase()}
          </div>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5, maxWidth: 1000 }}>
            {title}
          </div>
        </div>

        <div style={{ display: "flex", gap: 34, fontSize: featureSize, fontWeight: 600, color: "#C9CDE0" }}>
          {features.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#00C49A" }} />
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
