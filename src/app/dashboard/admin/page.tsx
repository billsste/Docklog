"use client";

import { useState, useEffect } from "react";
import { Download, Settings, Plus, X, ChevronRight, ChevronLeft } from "lucide-react";

function dur(ms: number) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function AdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [showRoster, setShowRoster] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [fW, setFW] = useState("");
  const [fS, setFS] = useState("");
  const [fT, setFT] = useState("");
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch("/api/sessions").then(r => r.json()).then(d => setLogs(d.filter((s: any) => s.status === "COMPLETED")));
    fetch("/api/users").then(r => r.json()).then(setWorkers);
  }, []);

  const addWorker = async () => {
    if (!newName.trim() || !newPin.trim()) return;
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), pin: newPin.trim() }),
    });
    setNewName(""); setNewPin("");
    fetch("/api/users").then(r => r.json()).then(setWorkers);
  };

  const removeWorker = async (id: string) => {
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    fetch("/api/users").then(r => r.json()).then(setWorkers);
  };

  const exportExcel = () => {
    window.location.href = "/api/export";
  };

  const allSlips = [...new Set(logs.filter(l => l.slipNumber).map(l => l.slipNumber))].sort();
  const allTasks = [...new Set(logs.filter(l => l.taskType).map(l => l.taskType))].sort();
  const filtered = logs.filter(l => {
    if (fW && l.user?.name !== fW) return false;
    if (fS && l.slipNumber !== fS) return false;
    if (fT && l.taskType !== fT) return false;
    return true;
  });
  const total = filtered.reduce((s, l) => s + (l.duration || 0), 0);

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm font-medium text-blue-600 mb-4">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
          <div className="flex gap-1.5 flex-wrap mb-3">
            {selected.slipNumber && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">Slip {selected.slipNumber}</span>}
            {selected.taskType && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">{selected.taskType}</span>}
          </div>
          <p className="text-[15px] font-semibold">{selected.user?.name}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(selected.startTime).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} ·{" "}
            {new Date(selected.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
            {selected.endTime ? new Date(selected.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </p>
          <p className="text-3xl font-extralight tabular-nums mt-3">{dur(selected.duration || 0)}</p>
        </div>
        {selected.transcript && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Voice memo</p>
            <p className="text-sm text-slate-500 italic">"{selected.transcript}"</p>
          </div>
        )}
        {selected.photos?.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Photos</p>
            <div className="flex gap-2 flex-wrap">
              {selected.photos.map((p: any) => (
                <img key={p.id} src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Admin</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} sessions · {dur(total)} total</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowRoster(!showRoster)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-slate-50 transition-colors">
            <Settings size={14} /> Roster
          </button>
        </div>
      </div>

      {showRoster && (
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Manage workers</p>
          <div className="space-y-1.5 mb-3">
            {workers.map(w => (
              <div key={w.id} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">{w.name}</span>
                  {w.role === "ADMIN" && <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">Admin</span>}
                </div>
                <button onClick={() => removeWorker(w.id)} className="text-red-400 hover:text-red-600 p-1"><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />
            <input value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="PIN" type="password" className="w-20 px-3 py-2 border border-border rounded-lg text-sm text-center" />
            <button onClick={addWorker} className="flex items-center gap-1 px-3 py-2 bg-foreground text-white rounded-lg text-sm font-medium">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <select value={fW} onChange={e => setFW(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="">All workers</option>
          {workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
        </select>
        <select value={fS} onChange={e => setFS(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="">All slips</option>
          {allSlips.map(s => <option key={s} value={s}>Slip {s}</option>)}
        </select>
        <select value={fT} onChange={e => setFT(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-border rounded-lg text-sm bg-white">
          <option value="">All tasks</option>
          {allTasks.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Slip breakdown */}
      {!fS && allSlips.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Time by slip</p>
          {allSlips.map(s => {
            const st = filtered.filter(l => l.slipNumber === s).reduce((sum, l) => sum + (l.duration || 0), 0);
            const pct = total > 0 ? (st / total) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-2.5 mb-1.5">
                <span className="w-12 text-xs font-semibold">Slip {s}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">{dur(st)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground shadow-sm">No sessions yet</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <button key={l.id} onClick={() => setSelected(l)}
              className="w-full text-left p-3.5 bg-white border border-border rounded-xl flex items-center gap-3 shadow-sm hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {l.slipNumber && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">Slip {l.slipNumber}</span>}
                  {l.taskType && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">{l.taskType}</span>}
                </div>
                <p className="text-[13px] text-slate-500">{l.user?.name} · {dur(l.duration || 0)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(l.startTime).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
                  {new Date(l.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
