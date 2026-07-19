import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentPersonId } from "@/lib/auth";
import { createCheckoutPreference } from "@/lib/mp";
import { getValidAccessToken } from "@/lib/mpAccount";
import { sendPushToPerson } from "@/lib/push";

export async function POST(req: NextRequest) {
  const personId = await getCurrentPersonId();
  if (!personId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { cycleId } = await req.json();
  const cycle = await prisma.giftCycle.findUnique({
    where: { id: cycleId },
    include: { beneficiary: true, organizer: true, payments: true },
  });
  if (!cycle) return NextResponse.json({ error: "Ciclo no encontrado" }, { status: 404 });
  if (cycle.organizerId !== personId) {
    return NextResponse.json({ error: "Solo la organizadora puede iniciar el cobro" }, { status: 403 });
  }
  if (cycle.payments.length > 0) {
    return NextResponse.json({ error: "El cobro ya fue iniciado" }, { status: 409 });
  }

  const organizerAccessToken = await getValidAccessToken(cycle.organizerId);

  // La organizadora ya recibe todos los aportes en su propia cuenta, así que su
  // parte no pasa por un cobro de Mercado Pago (no se puede pagar a una misma):
  // queda registrada como aportada directamente.
  await prisma.payment.create({
    data: {
      cycleId: cycle.id,
      payerId: cycle.organizerId,
      amount: cycle.amountPerPerson,
      status: "APPROVED",
    },
  });

  const contributors = await prisma.person.findMany({
    where: { id: { notIn: [cycle.beneficiaryId, cycle.organizerId] } },
  });

  const baseUrl = process.env.APP_URL ?? new URL(req.url).origin;

  const results = await Promise.allSettled(
    contributors.map(async (payer) => {
      const preference = await createCheckoutPreference({
        organizerAccessToken,
        title: `Regalo de cumpleaños para ${cycle.beneficiary.name}`,
        amount: cycle.amountPerPerson,
        payerName: payer.name,
        externalReference: `${cycle.id}:${payer.id}`,
        notificationUrl: `${baseUrl}/api/mp/webhook`,
        successUrl: `${baseUrl}/dashboard`,
      });

      const payment = await prisma.payment.create({
        data: {
          cycleId: cycle.id,
          payerId: payer.id,
          amount: cycle.amountPerPerson,
          mpPreferenceId: preference.id,
          initPoint: preference.init_point,
        },
      });

      await sendPushToPerson(payer.id, {
        title: "Partimos pagando!!",
        body: `Métete y paga a ${cycle.organizer.name} el regalo de cumple de ${cycle.beneficiary.name}.`,
        url: "/dashboard",
      });

      return payment;
    })
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("Fallaron algunas preferencias de pago", failed);
  }

  return NextResponse.json({ ok: true, created: results.length - failed.length, failed: failed.length });
}
