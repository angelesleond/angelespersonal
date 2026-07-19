import { prisma } from "@/lib/db";
import { getCurrentPersonId } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentId = await getCurrentPersonId();
  if (currentId) {
    const exists = await prisma.person.findUnique({ where: { id: currentId } });
    if (exists) redirect("/dashboard");
  }

  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });

  return (
    <main>
      <h1>Regalos Amigas</h1>
      <p className="subtitle">
        Elige tu nombre, cuéntanos qué te gustaría de regalo y activa las notificaciones para que
        siempre paguemos a tiempo.
      </p>
      <LoginForm people={people.map((p) => ({ id: p.id, name: p.name }))} />
    </main>
  );
}
