import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseTranscript } from "@/lib/parse-transcript";

const HARBORDESK_URL = process.env.HARBORDESK_URL || "http://localhost:3200";
const HARBORDESK_API_KEY = process.env.HARBORDESK_API_KEY || "hd_internal_key_2026";

async function pushSessionToHarborDesk(workSession: any, workerName: string) {
  if (!workSession.harborDeskWorkOrderId || workSession.syncedToHarborDesk) return;
  try {
    const photoUrls = (workSession.photos || [])
      .filter((p: any) => !p.url.match(/\.(webm|ogg|mp3|m4a|wav|mp4)$/i))
      .map((p: any) => p.url.startsWith("http") ? p.url : `${HARBORDESK_URL}${p.url}`);

    await fetch(`${HARBORDESK_URL}/api/internal/work-orders/${workSession.harborDeskWorkOrderId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": HARBORDESK_API_KEY },
      body: JSON.stringify({
        docklogSessionId: workSession.id,
        workerName,
        duration: workSession.duration,
        transcript: workSession.transcript,
        notes: workSession.notes,
        slipNumber: workSession.slipNumber,
        taskType: workSession.taskType,
        photoUrls,
      }),
    });

    await prisma.workSession.update({
      where: { id: workSession.id },
      data: { syncedToHarborDesk: true },
    });
  } catch (err: any) {
    console.error("HarborDesk push failed:", err.message);
  }
}

// GET /api/sessions — list sessions
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const slip = searchParams.get("slip");
  const task = searchParams.get("task");
  const isAdmin = (session.user as any).role === "ADMIN";

  const where: any = {};

  // Workers can only see their own sessions
  if (!isAdmin) {
    where.userId = (session.user as any).id;
  } else if (userId) {
    where.userId = userId;
  }

  if (slip) where.slipNumber = slip;
  if (task) where.taskType = task;

  const sessions = await prisma.workSession.findMany({
    where,
    include: { user: { select: { name: true } }, photos: true },
    orderBy: { startTime: "desc" },
    take: 200,
  });

  return NextResponse.json(sessions);
}

// POST /api/sessions — clock in (create session)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Check for active session
  const active = await prisma.workSession.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (active) {
    return NextResponse.json({ error: "Already clocked in", activeSession: active }, { status: 400 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { harborDeskWorkOrderId, harborDeskWorkOrderTitle, slipNumber } = body;

  const workSession = await prisma.workSession.create({
    data: {
      userId,
      startTime: new Date(),
      status: "ACTIVE",
      ...(harborDeskWorkOrderId && { harborDeskWorkOrderId: Number(harborDeskWorkOrderId) }),
      ...(harborDeskWorkOrderTitle && { harborDeskWorkOrderTitle }),
      ...(slipNumber && { slipNumber }),
    },
  });

  return NextResponse.json(workSession);
}

// DELETE /api/sessions — delete a session
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const workSession = await prisma.workSession.findUnique({ where: { id: sessionId } });
  if (!workSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const isAdmin = (session.user as any).role === "ADMIN";
  const userId = (session.user as any).id;

  // Workers can only delete their own sessions
  if (!isAdmin && workSession.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.workSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ success: true });
}

// PATCH /api/sessions — clock out or update session
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sessionId, action, transcript, slipNumber, taskType, notes, harborDeskWorkOrderId, harborDeskWorkOrderTitle } = body;

  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const workSession = await prisma.workSession.findUnique({ where: { id: sessionId } });
  if (!workSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Clock out
  if (action === "clockOut") {
    const endTime = new Date();
    const duration = endTime.getTime() - workSession.startTime.getTime();

    const updated = await prisma.workSession.update({
      where: { id: sessionId },
      data: { endTime, duration, status: "COMPLETED" },
    });
    return NextResponse.json(updated);
  }

  // Update with transcript/memo
  if (action === "addMemo") {
    let parsedSlip = slipNumber;
    let parsedTask = taskType;

    // Auto-parse transcript if provided
    if (transcript && (!parsedSlip || !parsedTask)) {
      const parsed = parseTranscript(transcript);
      if (!parsedSlip) parsedSlip = parsed.slipNumber;
      if (!parsedTask) parsedTask = parsed.taskType;
    }

    const updated = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        transcript: transcript || undefined,
        slipNumber: parsedSlip || undefined,
        taskType: parsedTask || undefined,
        notes: notes || undefined,
        ...(harborDeskWorkOrderId && !workSession.harborDeskWorkOrderId && {
          harborDeskWorkOrderId: Number(harborDeskWorkOrderId),
          harborDeskWorkOrderTitle: harborDeskWorkOrderTitle || undefined,
        }),
      },
      include: { photos: true },
    });

    // Auto-push to HarborDesk if linked to a work order
    const workerName = (session.user as any).name || "Unknown";
    await pushSessionToHarborDesk(updated, workerName);

    return NextResponse.json(updated);
  }

  // General update
  const updated = await prisma.workSession.update({
    where: { id: sessionId },
    data: {
      slipNumber: slipNumber !== undefined ? slipNumber : undefined,
      taskType: taskType !== undefined ? taskType : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  });
  return NextResponse.json(updated);
}
