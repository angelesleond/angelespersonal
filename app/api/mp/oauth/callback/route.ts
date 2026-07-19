import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/mp";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Faltan parámetros de OAuth" }, { status: 400 });
  }

  const personId = verifyOAuthState(state);
  if (!personId) {
    return NextResponse.json({ error: "Estado OAuth inválido o vencido" }, { status: 400 });
  }

  const tokens = await exchangeCodeForToken(code);

  await prisma.mpAccount.upsert({
    where: { personId },
    update: {
      mpUserId: String(tokens.user_id),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      publicKey: tokens.public_key,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
    create: {
      personId,
      mpUserId: String(tokens.user_id),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      publicKey: tokens.public_key,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
