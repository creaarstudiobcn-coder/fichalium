import { NextResponse } from "next/server";
import { COOKIE_APP } from "@/lib/app-movil";

// Puerta de entrada de la app de Android: marca el navegador como «app» y
// sigue al panel (o al login, si no hay sesión).
export function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/dashboard", request.url));
  res.cookies.set(COOKIE_APP, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
