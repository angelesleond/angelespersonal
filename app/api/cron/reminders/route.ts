import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentCycle } from "@/lib/cycle";
import { sendPushToPerson } from "@/lib/push";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cycle = await getOrCreateCurrentCycle();
  if (!cycle) return NextResponse.json({ ok: true, reminded: 0 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const intervalDays = settings?.reminderIntervalDays ?? 1;
  const cutoff = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000);

  const pending = cycle.payments.filter(
    (p) => p.status !== "APPROVED" && (!p.lastReminderAt || p.lastReminderAt < cutoff)
  );

  let reminded = 0;
  for (const payment of pending) {
    await sendPushToPerson(payment.payerId, {
      title: "Ya po morosa",
      body: "Si no pagas las notificaciones serán cada hora, no seas lata y paga ❤️",
      url: "/dashboard",
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { lastReminderAt: new Date() } });
    reminded++;
  }

  return NextResponse.json({ ok: true, reminded });
}
