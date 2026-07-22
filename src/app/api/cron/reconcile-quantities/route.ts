import { NextResponse } from "next/server";
import { reconcileSubscriptionQuantities } from "@/lib/billing/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron de reconciliación del `quantity` de Stripe (lo programa Vercel; ver
 * vercel.json). Vercel Cron envía `Authorization: Bearer ${CRON_SECRET}`.
 * Fail-closed: sin `CRON_SECRET` configurado o sin coincidencia → 401.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const summary = await reconcileSubscriptionQuantities();
    if (summary.changed > 0 || summary.errors > 0) {
      console.log(
        `[reconcile] revisadas=${summary.checked} corregidas=${summary.changed} errores=${summary.errors}`,
        JSON.stringify(summary.rows),
      );
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[reconcile] fallo global:", err);
    return NextResponse.json(
      { error: "Error en la reconciliación." },
      { status: 500 },
    );
  }
}
