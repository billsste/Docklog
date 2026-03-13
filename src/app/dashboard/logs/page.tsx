"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

function dur(ms: number) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    await fetch(`/api/sessions?sessionId=${selected.id}`, { method: "DELETE" });
    setLogs(prev => prev.filter(l => l.id !== selected.id));
    setSelected(null);
    setConfirming(false);
  }

  useEffect(() => {
    fetch("/api/sessions").then(r => r.json()).then(data => {
      setLogs(data.filter((s: any) => s.status === "COMPLETED"));
    });
  }, []);

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
            {new Date(selected.startTime).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
            {new Date(selected.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
            {selected.endTime ? new Date(selected.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </p>
          <p className="text-3xl font-extralight text-foreground tabular-nums mt-3">{dur(selected.duration || 0)}</p>
        </div>
        {selected.transcript && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Voice memo</p>
            <p className="text-sm text-slate-500 italic leading-relaxed">"{selected.transcript}"</p>
          </div>
        )}
        {selected.photos?.length > 0 && (() => {
          const isAudio = (url: string) => /\.(webm|ogg|mp3|m4a|wav|mp4)$/i.test(url);
          const photos = selected.photos.filter((p: any) => !isAudio(p.url));
          const audioFiles = selected.photos.filter((p: any) => isAudio(p.url));
          return (
            <>
              {photos.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {photos.map((p: any) => (
                      <img key={p.id} src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                    ))}
                  </div>
                </div>
              )}
              {audioFiles.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Voice recording</p>
                  <div className="space-y-2">
                    {audioFiles.map((p: any) => (
                      <audio key={p.id} controls src={p.url} className="w-full" />
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</p>
          <div className="space-y-2">
            <p className="text-sm text-slate-500"><span className="text-xs font-medium text-muted-foreground">Slip: </span>{selected.slipNumber || "—"}</p>
            <p className="text-sm text-slate-500"><span className="text-xs font-medium text-muted-foreground">Task: </span>{selected.taskType || "—"}</p>
            <p className="text-sm text-slate-500"><span className="text-xs font-medium text-muted-foreground">Notes: </span>{selected.notes || "—"}</p>
          </div>
        </div>
        {confirming ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm font-medium text-red-700 mb-3">Delete this log? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg">Delete</button>
              <button onClick={() => setConfirming(false)} className="flex-1 py-2 bg-white border border-border text-sm font-medium rounded-lg">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl bg-white hover:bg-red-50 transition-colors">
            Delete Log
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight mb-4">My Sessions</h2>
      {logs.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground shadow-sm">
          No sessions yet. Clock in to start.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <button key={l.id} onClick={() => setSelected(l)}
              className="w-full text-left p-3.5 bg-white border border-border rounded-xl flex items-center gap-3 shadow-sm hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {l.slipNumber && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">Slip {l.slipNumber}</span>}
                  {l.taskType && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full">{l.taskType}</span>}
                  {!l.slipNumber && !l.taskType && <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-semibold rounded-full">No details</span>}
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
