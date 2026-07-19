import { NextRequest, NextResponse } from "next/server";
import { getCurrentPersonId, signOAuthState } from "@/lib/auth";
import { getOAuthAuthorizationUrl } from "@/lib/mp";
import { getOrCreateCurrentCycle } from "@/lib/cycle";

export async function GET(req: NextRequest) {
  const personId = await getCurrentPersonId();
  if (!personId) return NextResponse.redirect(new URL("/", req.url));

  const cycle = await getOrCreateCurrentCycle();
  if (!cycle || cycle.organizerId !== personId) {
    return NextResponse.json({ error: "Solo la organizadora del ciclo actual puede conectar su cuenta" }, { status: 403 });
  }

  const state = signOAuthState(personId);
  const url = getOAuthAuthorizationUrl(state);
  return NextResponse.redirect(url);
}
