import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "regalos_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Falta SESSION_SECRET en las variables de entorno");
  return s;
}

function sign(personId: string) {
  const sig = crypto.createHmac("sha256", secret()).update(personId).digest("base64url");
  return `${personId}.${sig}`;
}

function verify(token: string): string | null {
  const [personId, sig] = token.split(".");
  if (!personId || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(personId).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return personId;
}

export function createSessionCookieValue(personId: string) {
  return sign(personId);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export async function getCurrentPersonId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

/** Estado firmado para el flujo OAuth de Mercado Pago (evita CSRF y asegura que el callback corresponda a quien lo inició). */
export function signOAuthState(personId: string): string {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${personId}.${nonce}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [personId, nonce, sig] = parts;
  const expected = crypto.createHmac("sha256", secret()).update(`${personId}.${nonce}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return personId;
}
