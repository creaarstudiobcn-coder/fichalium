import { NextResponse } from "next/server";

import { registerCompany, RegisterError } from "@/lib/auth/register";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { user } = await registerCompany(parsed.data);
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err) {
    if (err instanceof RegisterError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Error en /api/register:", err);
    return NextResponse.json(
      { error: "Error del servidor. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
