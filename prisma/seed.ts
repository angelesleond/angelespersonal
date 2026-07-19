import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, "..", "data", "people.json");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `No existe ${dataPath}. Copiá data/people.example.json a data/people.json y completá las 15 amigas (nombre y fecha de cumpleaños AAAA-MM-DD).`
    );
    process.exit(1);
  }

  const people: { name: string; birthday: string }[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  for (const p of people) {
    await prisma.person.upsert({
      where: { name: p.name },
      update: { birthday: new Date(p.birthday) },
      create: { name: p.name, birthday: new Date(p.birthday) },
    });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, amountPerPerson: 7500, reminderIntervalDays: 3 },
  });

  console.log(`Listo: ${people.length} personas cargadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
