"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Timer, List, Users, Anchor, LogOut, MessageCircle, Wrench } from "lucide-react";

const tabs = [
  { id: "/dashboard", icon: Timer, label: "Timer" },
  { id: "/dashboard/work-orders", icon: Wrench, label: "Work Orders" },
  { id: "/dashboard/logs", icon: List, label: "My Logs" },
  { id: "/dashboard/support", icon: MessageCircle, label: "Support" },
  { id: "/dashboard/admin", icon: Users, label: "Admin" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) { router.push("/login"); return null; }

  const user = session.user as any;
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Anchor size={22} className="text-blue-600" strokeWidth={1.8} />
          <div>
            <p className="text-[15px] font-semibold leading-tight">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground">DockLog</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                     border border-border rounded-lg px-3 py-1.5 transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </header>

      {/* Page content */}
      <main className="px-5 pt-4">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex justify-around
                      py-1.5 pb-[max(env(safe-area-inset-bottom,6px),6px)] z-50">
        {tabs
          .filter((t) => t.id !== "/dashboard/admin" || isAdmin)
          .map((tab) => {
            const active = pathname === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-5 py-1.5 min-w-[64px] transition-colors
                  ${active ? "text-blue-600" : "text-slate-400"}`}
              >
                <tab.icon size={20} strokeWidth={active ? 2 : 1.6} />
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
      </nav>
    </div>
  );
}
