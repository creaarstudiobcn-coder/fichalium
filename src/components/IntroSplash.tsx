"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/Brand";

// Se recuerda que el usuario ya vio la intro para no repetirla en cada visita.
const STORAGE_KEY = "fichalium-intro-seen";
const WORD = "fichalium";

export function IntroSplash({ enterHref }: { enterHref: string }) {
  const router = useRouter();
  // null = aún comprobando localStorage (no pintamos nada → sin flash al volver).
  const [show, setShow] = useState<boolean | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      setShow(localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sin almacenamiento: la intro podría reaparecer, no es crítico.
    }
  }

  // "Saltar": cierra la intro con un fundido y revela la landing detrás.
  function skip() {
    markSeen();
    setLeaving(true);
    window.setTimeout(() => setShow(false), 500);
  }

  // "Entrar": marca como vista y navega al login/dashboard.
  function enter() {
    markSeen();
    router.push(enterHref);
  }

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden bg-navy px-6 text-center sm:gap-8 ${
        leaving ? "intro-leaving" : ""
      }`}
      role="dialog"
      aria-label="Bienvenida a Fichalium"
    >
      <div className="intro-pop">
        <LogoMark size={120} />
      </div>

      <h1 className="font-display text-4xl lowercase tracking-tight text-white sm:text-5xl">
        {WORD.split("").map((ch, i) => (
          <span
            key={i}
            className="intro-letter"
            style={{ animationDelay: `${0.6 + i * 0.06}s` }}
          >
            {ch}
          </span>
        ))}
      </h1>

      <p
        className="intro-rise max-w-sm text-sm text-white/60"
        style={{ animationDelay: "1.3s" }}
      >
        Control horario sencillo y conforme a la ley para tu empresa.
      </p>

      <div
        className="intro-rise flex flex-col items-center gap-3"
        style={{ animationDelay: "1.5s" }}
      >
        <button
          type="button"
          onClick={enter}
          className="rounded-lg bg-ficha px-8 py-3 font-semibold text-navy transition hover:bg-ficha/90"
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={skip}
          className="text-sm font-medium text-white/50 transition hover:text-white"
        >
          Saltar
        </button>
      </div>
    </div>
  );
}
