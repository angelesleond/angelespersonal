import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentPersonId } from "@/lib/auth";
import { getOrCreateCurrentCycle } from "@/lib/cycle";
import OrganizerActions from "./OrganizerActions";
import PushSetup from "./PushSetup";
import LogoutButton from "./LogoutButton";
import ProfileEditor from "./ProfileEditor";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const personId = await getCurrentPersonId();
  if (!personId) redirect("/");

  const me = await prisma.person.findUnique({ where: { id: personId } });
  if (!me) redirect("/");

  const cycle = await getOrCreateCurrentCycle();
  if (!cycle) {
    return (
      <main>
        <h1>🎁 Regalos Rotativos</h1>
        <p>Hola {me.name}. Carga al menos 2 personas con su cumpleaños para empezar.</p>
      </main>
    );
  }

  const allPeople = await prisma.person.findMany({ orderBy: { name: "asc" } });
  const paymentsByPayer = new Map(cycle.payments.map((p) => [p.payerId, p]));
  const contributors = allPeople.filter((p) => p.id !== cycle.beneficiaryId);

  const started = cycle.payments.length > 0;
  const approvedCount = cycle.payments.filter((p) => p.status === "APPROVED").length;
  const total = contributors.length;
  const collected = approvedCount * cycle.amountPerPerson;
  const expected = total * cycle.amountPerPerson;
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const myPayment = paymentsByPayer.get(me.id);
  const iAmOrganizer = me.id === cycle.organizerId;
  const iAmBeneficiary = me.id === cycle.beneficiaryId;

  const organizerMpAccount = await prisma.mpAccount.findUnique({ where: { personId: cycle.organizerId } });

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>🎁 Regalos</h1>
        <LogoutButton />
      </div>
      <p>Hola, {me.name} 👋</p>

      <PushSetup personId={me.id} />

      <div className="card">
        <h2>Cumpleaños actual</h2>
        <p>
          🎂 <strong>{cycle.beneficiary.name}</strong>
          {iAmBeneficiary && " (¡eres tú! no aportas a tu propio regalo)"}
        </p>
        <p>
          Organiza: <strong>{cycle.organizer.name}</strong>
          {iAmOrganizer && " (¡eres tú!)"}
        </p>
        <p>Monto por persona: ${cycle.amountPerPerson.toLocaleString("es-CL")} CLP</p>
      </div>

      <div className="card">
        <h2>Total acumulado</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p>
          ${collected.toLocaleString("es-CL")} de ${expected.toLocaleString("es-CL")} ({pct}%)
        </p>
      </div>

      {iAmOrganizer && (
        <OrganizerActions
          cycleId={cycle.id}
          started={started}
          organizerConnected={!!organizerMpAccount}
        />
      )}

      {!iAmBeneficiary && started && myPayment && myPayment.status !== "APPROVED" && myPayment.initPoint && (
        <div className="card">
          <h2>Tu aporte</h2>
          <a className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }} href={myPayment.initPoint}>
            Pagar ${cycle.amountPerPerson.toLocaleString("es-CL")}
          </a>
        </div>
      )}

      <div className="card">
        <h2>Estado del grupo</h2>
        {contributors.map((p) => {
          const pay = paymentsByPayer.get(p.id);
          const paid = pay?.status === "APPROVED";
          return (
            <div className="person-row" key={p.id}>
              <span>{p.name}</span>
              <span className={paid ? "badge-ok" : "badge-pending"}>{paid ? "✅ Pagó" : "⏳ Pendiente"}</span>
            </div>
          );
        })}
      </div>

      <ProfileEditor birthday={me.birthday.toISOString().slice(0, 10)} wishlist={me.wishlist} />
    </main>
  );
}
