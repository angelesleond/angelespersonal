import type { Person } from "@prisma/client";

/** Ordena personas por día del año de cumpleaños (mes, día), ignorando el año. */
export function sortByBirthday(people: Person[]): Person[] {
  return [...people].sort((a, b) => {
    const ka = a.birthday.getUTCMonth() * 100 + a.birthday.getUTCDate();
    const kb = b.birthday.getUTCMonth() * 100 + b.birthday.getUTCDate();
    return ka - kb;
  });
}

/** Próxima fecha de cumpleaños (con año correcto) a partir de "today". */
export function nextOccurrence(birthday: Date, today: Date): Date {
  const month = birthday.getUTCMonth();
  const day = birthday.getUTCDate();
  let year = today.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, month, day));
  const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (candidate < todayMidnight) {
    candidate = new Date(Date.UTC(year + 1, month, day));
  }
  return candidate;
}

/**
 * Determina quién es la próxima cumpleañera (beneficiaria del ciclo actual)
 * y quién es la organizadora (la última persona que cumplió años antes que ella).
 */
export function getCurrentTurn(people: Person[], today: Date = new Date()) {
  if (people.length < 2) {
    throw new Error("Se necesitan al menos 2 personas para calcular el turno");
  }
  const ordered = sortByBirthday(people);

  let beneficiaryIndex = 0;
  let closest = nextOccurrence(ordered[0].birthday, today);
  for (let i = 1; i < ordered.length; i++) {
    const occ = nextOccurrence(ordered[i].birthday, today);
    if (occ < closest) {
      closest = occ;
      beneficiaryIndex = i;
    }
  }

  const organizerIndex = (beneficiaryIndex - 1 + ordered.length) % ordered.length;

  return {
    beneficiary: ordered[beneficiaryIndex],
    organizer: ordered[organizerIndex],
    beneficiaryBirthdayDate: closest,
    ordered,
  };
}
