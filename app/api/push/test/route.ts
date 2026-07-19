import { NextResponse } from "next/server";
import { getCurrentPersonId } from "@/lib/auth";
import { sendPushToPerson } from "@/lib/push";

export async function POST() {
  const personId = await getCurrentPersonId();
  if (!personId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await sendPushToPerson(personId, {
    title: "🔔 Notificación de prueba",
    body: "¡Funciona! Así te van a llegar los avisos de la app.",
    url: "/dashboard",
  });

  return NextResponse.json({ ok: true });
}
