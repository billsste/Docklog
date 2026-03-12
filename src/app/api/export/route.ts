import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const sessions = await prisma.workSession.findMany({
    where: { status: "COMPLETED" },
    include: { user: { select: { name: true } } },
    orderBy: { startTime: "desc" },
  });

  const rows = sessions.map((s) => ({
    Worker: s.user.name,
    Date: s.startTime.toLocaleDateString(),
    "Clock In": s.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    "Clock Out": s.endTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || "",
    "Duration (min)": s.duration ? Math.round(s.duration / 60000) : 0,
    "Slip #": s.slipNumber || "",
    "Task Type": s.taskType || "",
    Notes: s.notes || "",
    Transcript: s.transcript || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 40 }, { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DockLog");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="DockLog_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
