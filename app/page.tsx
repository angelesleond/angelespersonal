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
      <h1>🎁 Regalos Rotativos</h1>
      <p>Elegí tu nombre para entrar. Sin contraseña — grupo cerrado entre amigas.</p>
      <LoginForm people={people.map((p) => ({ id: p.id, name: p.name }))} />
    </main>
  );
}
