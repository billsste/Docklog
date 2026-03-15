import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HARBORDESK_URL = process.env.HARBORDESK_URL || "http://localhost:3200";
const HARBORDESK_API_KEY = process.env.HARBORDESK_API_KEY || "hd_internal_key_2026";

// GET /api/work-orders — proxy to HarborDesk internal API
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const slip = searchParams.get("slip") || "";

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (slip) params.set("slip", slip);

  try {
    const url = `${HARBORDESK_URL}/api/internal/work-orders${params.toString() ? `?${params}` : ""}`;
    const resp = await fetch(url, {
      headers: { "x-api-key": HARBORDESK_API_KEY },
      next: { revalidate: 0 },
    });
    if (!resp.ok) throw new Error(`HarborDesk returned ${resp.status}`);
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("work-orders proxy error:", err.message);
    return NextResponse.json({ error: "Could not reach HarborDesk" }, { status: 503 });
  }
}
