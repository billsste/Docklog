import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { name, pin, role = "WORKER" } = await req.json();
  if (!name || !pin) return NextResponse.json({ error: "name and pin required" }, { status: 400 });
  const hashedPin = await bcrypt.hash(pin, 10);
  const user = await prisma.user.create({
    data: { name, pin: hashedPin, role },
    select: { id: true, name: true, role: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { userId } = await req.json();
  await prisma.user.update({ where: { id: userId }, data: { active: false } });
  return NextResponse.json({ success: true });
}
