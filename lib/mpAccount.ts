import { prisma } from "./db";
import { refreshAccessToken } from "./mp";

/** Devuelve un access_token vigente para la persona, refrescándolo si está por vencer. */
export async function getValidAccessToken(personId: string): Promise<string> {
  const account = await prisma.mpAccount.findUnique({ where: { personId } });
  if (!account) throw new Error("Esta persona no conectó su cuenta de Mercado Pago todavía");

  const expiresSoon = account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
  if (!expiresSoon) return account.accessToken;

  const tokens = await refreshAccessToken(account.refreshToken);
  await prisma.mpAccount.update({
    where: { personId },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
  return tokens.access_token;
}
