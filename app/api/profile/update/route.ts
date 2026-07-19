import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentPersonId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const personId = await getCurrentPersonId();
  if (!personId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { birthday, wishlist } = await req.json();
  const data: { birthday?: Date; wishlist?: string } = {};
  if (typeof birthday === "string" && birthday) data.birthday = new Date(birthday);
  if (typeof wishlist === "string") data.wishlist = wishlist;

  await prisma.person.update({ where: { id: personId }, data });
  return NextResponse.json({ ok: true });
}
