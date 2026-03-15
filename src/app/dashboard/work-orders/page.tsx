"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, RefreshCw, AlertTriangle, Clock, Anchor, Wrench } from "lucide-react";

interface WorkOrder {
  id: number;
  work_order_number: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  slip_name?: string;
  first_name?: string;
  last_name?: string;
  assignee_first?: string;
  assignee_last?: string;
  scheduled_date?: string;
  notes?: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-100",
  medium: "bg-amber-50 text-amber-600 border-amber-100",
  low: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  scheduled: "bg-purple-50 text-purple-700",
  completed: "bg-emerald-50 text-emerald-700",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  scheduled: "Scheduled",
  completed: "Completed",
};

function priorityIcon(p: string) {
  if (p === "high") return <AlertTriangle size={13} className="text-red-500" />;
  if (p === "medium") return <Clock size={13} className="text-amber-500" />;
  return null;
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Load any previously selected WO from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("docklog_selected_wo");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSelectedId(parsed.id);
      }
    } catch {}
    loadWorkOrders();
  }, []);

  async function loadWorkOrders() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/work-orders");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setWorkOrders(data);
    } catch {
      setError("Could not reach HarborDesk. Make sure it's running.");
    } finally {
      setLoading(false);
    }
  }

  function selectWorkOrder(wo: WorkOrder) {
    localStorage.setItem("docklog_selected_wo", JSON.stringify(wo));
    setSelectedId(wo.id);
    // Navigate to timer with the WO selected
    router.push("/dashboard");
  }

  function clearSelection() {
    localStorage.removeItem("docklog_selected_wo");
    setSelectedId(null);
  }

  const filtered = workOrders.filter((wo) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      wo.title.toLowerCase().includes(q) ||
      wo.work_order_number.toLowerCase().includes(q) ||
      (wo.slip_name || "").toLowerCase().includes(q)
    );
  });

  const selected = workOrders.find((wo) => wo.id === selectedId);

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight">Work Orders</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Select one before clocking in</p>
        </div>
        <button
          onClick={loadWorkOrders}
          className="p-2 rounded-lg border border-border hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
        </button>
      </div>

      {/* Currently selected */}
      {selected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">Currently selected</p>
              <p className="text-sm font-semibold text-blue-900 leading-tight">{selected.title}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-mono text-blue-500">{selected.work_order_number}</span>
                {selected.slip_name && (
                  <span className="flex items-center gap-0.5 text-[10px] text-blue-600 font-medium">
                    <Anchor size={10} /> Slip {selected.slip_name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded border border-blue-200 bg-white transition-colors flex-shrink-0"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            Go to timer →
          </button>
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by title, WO#, or slip..."
        className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-white mb-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 text-sm text-red-600">{error}</div>
      )}

      {loading && !workOrders.length ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <Wrench size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? "No matching work orders" : "No open work orders"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wo) => {
            const isSelected = wo.id === selectedId;
            return (
              <button
                key={wo.id}
                onClick={() => selectWorkOrder(wo)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-border bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{wo.work_order_number}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[wo.status] || "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABEL[wo.status] || wo.status}
                      </span>
                      <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLE[wo.priority] || ""}`}>
                        {priorityIcon(wo.priority)}
                        {wo.priority}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-[14px] font-semibold text-slate-900 leading-snug">{wo.title}</p>

                    {/* Description preview */}
                    {wo.description && (
                      <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{wo.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {wo.slip_name && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Anchor size={9} /> Slip {wo.slip_name}
                        </span>
                      )}
                      {(wo.first_name || wo.last_name) && (
                        <span className="text-[11px] text-slate-400">
                          {wo.first_name} {wo.last_name}
                        </span>
                      )}
                      {(wo.assignee_first || wo.assignee_last) && (
                        <span className="text-[11px] text-slate-400">
                          → {wo.assignee_first} {wo.assignee_last}
                        </span>
                      )}
                      {wo.scheduled_date && (
                        <span className="text-[11px] text-slate-400">
                          {new Date(wo.scheduled_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {isSelected && (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Selected</span>
                    )}
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground mt-4">
          {filtered.length} work order{filtered.length !== 1 ? "s" : ""} · tap to select, then go clock in
        </p>
      )}
    </div>
  );
}
