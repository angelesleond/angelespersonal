import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentPersonId } from "@/lib/auth";
import { getOrCreateCurrentCycle } from "@/lib/cycle";
import OrganizerActions from "./OrganizerActions";
import PushSetup from "./PushSetup";
import LogoutButton from "./LogoutButton";
import ProfileEditor from "./ProfileEditor";
import Onboarding from "./Onboarding";
import Celebration from "./Celebration";

export const dynamic = "force-dynamic";

function daysUntil(date: Date): number {
  const today = new Date();
  const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diffMs = date.getTime() - todayMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const personId = await getCurrentPersonId();
  if (!personId) redirect("/");

  const me = await prisma.person.findUnique({ where: { id: personId } });
  if (!me) redirect("/");

  const cycle = await getOrCreateCurrentCycle();
  if (!cycle) {
    return (
      <main>
        <h1>Regalos Amigas</h1>
        <p className="subtitle">Hola {me.name}. Carga al menos 2 personas con su cumpleaños para empezar.</p>
      </main>
    );
  }

  const allPeople = await prisma.person.findMany({ orderBy: { name: "asc" } });
  const paymentsByPayer = new Map(cycle.payments.map((p) => [p.payerId, p]));
  const contributors = allPeople
    .filter((p) => p.id !== cycle.beneficiaryId)
    .sort((a, b) => {
      const aPaid = paymentsByPayer.get(a.id)?.status === "APPROVED" ? 1 : 0;
      const bPaid = paymentsByPayer.get(b.id)?.status === "APPROVED" ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid;
      return a.name.localeCompare(b.name);
    });

  const started = cycle.payments.length > 0;
  const approvedCount = cycle.payments.filter((p) => p.status === "APPROVED").length;
  const total = contributors.length;
  const collected = approvedCount * cycle.amountPerPerson;
  const expected = total * cycle.amountPerPerson;
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const myPayment = paymentsByPayer.get(me.id);
  const iAmOrganizer = me.id === cycle.organizerId;
  const iAmBeneficiary = me.id === cycle.beneficiaryId;
  const daysLeft = daysUntil(cycle.occursOn);

  const organizerMpAccount = await prisma.mpAccount.findUnique({ where: { personId: cycle.organizerId } });

  const host = (await headers()).get("host");
  const origin = process.env.APP_URL ?? `https://${host}`;
  const whatsappMessage = `Métete al link y pagame el regalo porfa, te quiero mucho 💕\n${origin}/dashboard`;

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Regalos Amigas</h1>
        <LogoutButton />
      </div>
      <p className="subtitle">Hola, {me.name}</p>

      <Onboarding />
      {cycle.status === "COMPLETED" && (
        <Celebration cycleId={cycle.id} beneficiaryName={cycle.beneficiary.name} />
      )}

      <PushSetup personId={me.id} />

      <div className="card">
        <div className="birthday-highlight">
          <p className="eyebrow">Cumpleaños actual</p>
          <p className="name">
            {cycle.beneficiary.name}
            {iAmBeneficiary && " (¡eres tú!)"}
          </p>
          <p className="countdown">
            {daysLeft <= 0 ? "¡Es hoy!" : daysLeft === 1 ? "Falta 1 día" : `Faltan ${daysLeft} días`}
          </p>
          {iAmBeneficiary && (
            <p style={{ marginTop: "0.4rem", marginBottom: 0 }}>No aportas a tu propio regalo.</p>
          )}
        </div>

        <div className="organizer-highlight">
          <span className="eyebrow">Organiza</span>
          <span className="name">{cycle.organizer.name}</span>
          {iAmOrganizer && <span>(¡eres tú!)</span>}
        </div>

        <p>Monto por persona: ${cycle.amountPerPerson.toLocaleString("es-CL")} CLP</p>
        {cycle.beneficiary.wishlist && (
          <>
            <p style={{ marginBottom: "0.35rem", fontWeight: 600 }}>Lista de deseos</p>
            <div className="wishlist-box">{cycle.beneficiary.wishlist}</div>
          </>
        )}
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
              <span className="person-name">
                <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
                {p.name}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {iAmOrganizer && !paid && p.phone && (
                  <a
                    className="wp-btn"
                    href={`https://wa.me/${p.phone}?text=${encodeURIComponent(whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Catetear por wp
                  </a>
                )}
                <span className={paid ? "badge-ok" : "badge-pending"}>{paid ? "Pagó" : "Pendiente"}</span>
              </span>
            </div>
          );
        })}
      </div>

      <ProfileEditor birthday={me.birthday.toISOString().slice(0, 10)} wishlist={me.wishlist} />
    </main>
  );
}
