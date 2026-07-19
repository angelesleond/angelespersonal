import { prisma } from "./db";
import { getCurrentTurn } from "./turn";

/**
 * Devuelve el ciclo de regalo "actual" (creándolo si todavía no existe)
 * para la próxima cumpleañera según la fecha de hoy.
 */
export async function getOrCreateCurrentCycle(today: Date = new Date()) {
  const people = await prisma.person.findMany();
  if (people.length < 2) return null;

  const { beneficiary, organizer, beneficiaryBirthdayDate } = getCurrentTurn(people, today);

  let cycle = await prisma.giftCycle.findUnique({
    where: { beneficiaryId_occursOn: { beneficiaryId: beneficiary.id, occursOn: beneficiaryBirthdayDate } },
    include: { payments: { include: { payer: true } }, beneficiary: true, organizer: true },
  });

  if (!cycle) {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const amountPerPerson = settings?.amountPerPerson ?? 7500;
    cycle = await prisma.giftCycle.create({
      data: {
        beneficiaryId: beneficiary.id,
        organizerId: organizer.id,
        occursOn: beneficiaryBirthdayDate,
        amountPerPerson,
      },
      include: { payments: { include: { payer: true } }, beneficiary: true, organizer: true },
    });
  }

  return cycle;
}

export async function refreshCycleCompletion(cycleId: string) {
  const cycle = await prisma.giftCycle.findUnique({
    where: { id: cycleId },
    include: { payments: true },
  });
  if (!cycle || cycle.status === "COMPLETED") return cycle;

  const allApproved =
    cycle.payments.length > 0 && cycle.payments.every((p) => p.status === "APPROVED");

  if (allApproved) {
    return prisma.giftCycle.update({
      where: { id: cycleId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
  return cycle;
}
