"use client";

import { useActionState } from "react";
import type { SaState } from "./actions";

type Action = (prev: SaState, formData: FormData) => Promise<SaState>;

export function ActionButton({
  action,
  companyId,
  label,
  className,
  confirm,
}: {
  action: Action;
  companyId: string;
  label: string;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState<SaState, FormData>(
    action,
    {},
  );

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <form action={formAction}>
        <input type="hidden" name="companyId" value={companyId} />
        <button
          type="submit"
          disabled={pending}
          onClick={(e) => {
            if (confirm && !window.confirm(confirm)) e.preventDefault();
          }}
          className={
            className ??
            "rounded-lg border border-navy/15 px-3 py-1.5 text-xs font-medium text-navy/80 transition hover:bg-navy/5 disabled:opacity-60"
          }
        >
          {pending ? "…" : label}
        </button>
      </form>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </span>
  );
}
