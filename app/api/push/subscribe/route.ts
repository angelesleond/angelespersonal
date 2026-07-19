import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentPersonId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionPersonId = await getCurrentPersonId();
  const { personId, subscription } = await req.json();

  if (!sessionPersonId || sessionPersonId !== personId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { personId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      personId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}
