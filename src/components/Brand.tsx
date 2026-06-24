import Link from "next/link";

/**
 * Marca de Fichalium. El logo va inline (SVG) para que escale nítido y, en la
 * intro, sea animable. El wordmark usa Manrope ExtraBold en minúsculas.
 */

export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="90" fill="#0F1339" />
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
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-display lowercase tracking-tight ${className ?? ""}`}>
      fichalium
    </span>
  );
}

/**
 * Lockup logo + wordmark. Por defecto enlaza a la raíz. Pasa `href={null}`
 * para usarlo como elemento estático (sin enlace).
 */
export function Brand({
  href = "/",
  size = 32,
  textClassName = "text-xl text-navy",
  className,
}: {
  href?: string | null;
  size?: number;
  textClassName?: string;
  className?: string;
}) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark size={size} />
      <Wordmark className={textClassName} />
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex" aria-label="Fichalium — inicio">
      {content}
    </Link>
  );
}
