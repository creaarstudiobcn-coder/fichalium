/**
 * Ilustraciones de línea para la sección "Cómo funciona". Sin imágenes externas:
 * SVG inline que heredan los tokens de marca (navy/ficha/pulse) y escalan nítidos.
 * `step` selecciona la escena (1 = alta de equipo, 2 = fichar, 3 = informe PDF).
 */
export function HowItWorksArt({ step }: { step: 1 | 2 | 3 }) {
  const common = {
    viewBox: "0 0 220 150",
    className: "h-auto w-full",
    role: "img" as const,
    "aria-hidden": true,
  };

  if (step === 1) {
    // Alta de empresa e invitación al equipo: tarjetas de empleado + botón "+".
    return (
      <svg {...common}>
        <rect x="14" y="20" width="192" height="110" rx="12" className="fill-offwhite" />
        <rect x="14" y="20" width="192" height="110" rx="12" className="fill-none stroke-navy/10" strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${30 + i * 58}, 44)`}>
            <rect width="46" height="62" rx="9" className="fill-white stroke-navy/10" strokeWidth="1.5" />
            <circle cx="23" cy="22" r="11" className="fill-pulse/15" />
            <circle cx="23" cy="18" r="5" className="fill-pulse" />
            <path d="M13 32c0-6 4.5-9 10-9s10 3 10 9" className="fill-pulse/60" />
            <rect x="12" y="46" width="22" height="4" rx="2" className="fill-navy/15" />
          </g>
        ))}
        <circle cx="188" cy="44" r="15" className="fill-ficha" />
        <path d="M188 38v12M182 44h12" className="stroke-navy" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (step === 2) {
    // Fichar: reloj grande con botón de entrada/salida.
    return (
      <svg {...common}>
        <circle cx="80" cy="75" r="46" className="fill-white stroke-navy/10" strokeWidth="2" />
        <circle cx="80" cy="75" r="46" className="fill-none stroke-ficha" strokeWidth="4" strokeDasharray="215 289" strokeLinecap="round" transform="rotate(-90 80 75)" />
        <path d="M80 75V50M80 75l17 10" className="stroke-navy" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="80" cy="75" r="4" className="fill-navy" />
        <rect x="140" y="52" width="66" height="20" rx="10" className="fill-ficha" />
        <text x="173" y="66" textAnchor="middle" className="fill-navy" fontSize="11" fontWeight="700" fontFamily="system-ui">
          Entrada
        </text>
        <rect x="140" y="80" width="66" height="20" rx="10" className="fill-navy/10" />
        <text x="173" y="94" textAnchor="middle" className="fill-navy/60" fontSize="11" fontWeight="700" fontFamily="system-ui">
          Salida
        </text>
      </svg>
    );
  }

  // Informe legal en PDF: documento con líneas + sello descargable.
  return (
    <svg {...common}>
      <rect x="58" y="18" width="104" height="120" rx="10" className="fill-white stroke-navy/10" strokeWidth="2" />
      <rect x="74" y="34" width="52" height="7" rx="3.5" className="fill-navy/70" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="74" y={54 + i * 12} width={i % 2 ? 60 : 72} height="5" rx="2.5" className="fill-navy/12" />
      ))}
      <circle cx="150" cy="112" r="20" className="fill-ficha" />
      <path d="M150 104v14M144 112l6 6 6-6" className="stroke-navy" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="74" y="118" width="34" height="9" rx="2" className="fill-pulse/15" />
      <text x="91" y="125" textAnchor="middle" className="fill-pulse" fontSize="7" fontWeight="800" fontFamily="system-ui">
        PDF
      </text>
    </svg>
  );
}
