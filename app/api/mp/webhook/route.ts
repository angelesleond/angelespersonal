import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature, getPayment } from "@/lib/mp";
import { refreshCycleCompletion } from "@/lib/cycle";
import { sendPushToPerson } from "@/lib/push";

function mapStatus(mpStatus: string): "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" {
  switch (mpStatus) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

export async function POST(req: NextRequest) {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const dataIdFromQuery = req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // algunos pings de MP llegan sin body
  }

  const dataId = String(dataIdFromQuery ?? body?.data?.id ?? "");
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!xSignature || !xRequestId || !dataId || !secret) {
    return NextResponse.json({ error: "Faltan datos para validar el webhook" }, { status: 400 });
  }

  const valid = verifyWebhookSignature({ xSignature, xRequestId, dataId, secret });
  if (!valid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const topic = body?.type ?? req.nextUrl.searchParams.get("type");
  if (topic !== "payment") {
    return NextResponse.json({ ok: true });
  }

  const platformAccessToken = process.env.MP_ACCESS_TOKEN;
  if (!platformAccessToken) {
    return NextResponse.json({ error: "Falta MP_ACCESS_TOKEN" }, { status: 500 });
  }

  const mpPayment = await getPayment(dataId, platformAccessToken);
  const externalReference: string = mpPayment.external_reference ?? "";
  const [cycleId, payerId] = externalReference.split(":");
  if (!cycleId || !payerId) {
    return NextResponse.json({ ok: true });
  }

  const status = mapStatus(mpPayment.status);

  const payment = await prisma.payment.update({
    where: { cycleId_payerId: { cycleId, payerId } },
    data: { status, mpPaymentId: String(mpPayment.id) },
  }).catch(() => null);

  if (!payment) return NextResponse.json({ ok: true });

  if (status === "APPROVED") {
    const updatedCycle = await refreshCycleCompletion(cycleId);
    if (updatedCycle?.status === "COMPLETED") {
      const everyone = await prisma.person.findMany();
      await Promise.all(
        everyone.map((person) =>
          sendPushToPerson(person.id, {
            title: "Listo!!",
            body: "Ya todas pagamos, miren que rápidas fuimos yei",
            url: "/dashboard",
          })
        )
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
