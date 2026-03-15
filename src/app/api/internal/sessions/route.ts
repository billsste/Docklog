/**
 * Internal API — machine-to-machine access for HarborDesk integration.
 * Protected by HARBORDESK_API_KEY env var (falls back to a default for dev).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_KEY = process.env.HARBORDESK_API_KEY || "hd_internal_key_2026";

function authorized(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");
  return key === VALID_KEY;
}

// GET /api/internal/sessions?slip=A-03&status=COMPLETED&limit=20
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slip        = searchParams.get("slip");
  const status      = searchParams.get("status");      // ACTIVE | COMPLETED
  const limit       = parseInt(searchParams.get("limit") || "50");
  const id          = searchParams.get("id");           // fetch single session by id
  const workOrderId = searchParams.get("workOrderId"); // filter by HarborDesk WO id

  // Single session fetch
  if (id) {
    const session = await prisma.workSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, role: true } },
        photos: true,
      },
    });
    if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(session);
  }

  const where: any = {};
  if (status) where.status = status;

  // If workOrderId provided, include both directly-linked AND slip-based sessions
  if (workOrderId && slip) {
    where.OR = [
      { harborDeskWorkOrderId: parseInt(workOrderId) },
      { slipNumber: { contains: slip, mode: "insensitive" } },
    ];
  } else if (workOrderId) {
    where.harborDeskWorkOrderId = parseInt(workOrderId);
  } else if (slip) {
    where.slipNumber = { contains: slip, mode: "insensitive" };
  }

  const sessions = await prisma.workSession.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, role: true } },
      photos: true,
    },
    orderBy: { startTime: "desc" },
    take: limit,
  });

  return NextResponse.json(sessions);
}
