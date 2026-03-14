"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronLeft, Pencil, Mic, Check } from "lucide-react";
import { parseTranscript } from "@/lib/parse-transcript";

function dur(ms: number) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const isAudio = (url: string) => /\.(webm|ogg|mp3|m4a|wav|mp4)$/i.test(url);

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSlip, setEditSlip] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [recState, setRecState] = useState<"idle" | "recording" | "done">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const recRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const finalTextRef = useRef("");
  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  const applyTranscript = useCallback((text: string) => {
    setEditTranscript(text);
    const parsed = parseTranscript(text);
    setEditSlip(prev => prev || parsed.slipNumber || "");
    setEditTask(prev => prev || parsed.taskType || "");
    setRecState("done");
  }, []);

  const startVoice = async () => {
    if (!SR) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
    } catch { /* HTTPS required */ }

    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    finalTextRef.current = "";
    r.onresult = (e: any) => {
      let final = finalTextRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { final += e.results[i][0].transcript + " "; finalTextRef.current = final; }
      }
    };
    r.onend = () => { const t = finalTextRef.current.trim(); if (t) applyTranscript(t); else setRecState("idle"); };
    r.onerror = () => setRecState("idle");
    r.start();
    recRef.current = r;
    setRecState("recording");
  };

  const stopVoice = () => { recRef.current?.stop(); mediaRecorderRef.current?.stop(); };

  const reRecord = () => {
    recRef.current?.stop(); mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null; setAudioBlob(null); setEditTranscript(""); setRecState("idle");
  };

  async function handleDelete() {
    await fetch(`/api/sessions?sessionId=${selected.id}`, { method: "DELETE" });
    setLogs(prev => prev.filter(l => l.id !== selected.id));
    setSelected(null);
    setConfirming(false);
  }

  function startEdit() {
    setEditSlip(selected.slipNumber || "");
    setEditTask(selected.taskType || "");
    setEditNotes(selected.notes || "");
    setEditTranscript("");
    setRecState("idle");
    setAudioBlob(null);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const res = await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: selected.id,
        slipNumber: editSlip || null,
        taskType: editTask || null,
        notes: editNotes || null,
        transcript: editTranscript || undefined,
      }),
    });
    const updated = await res.json();

    if (audioBlob) {
      const ext = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
      const fd = new FormData();
      fd.append("file", new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: audioBlob.type }));
      fd.append("sessionId", selected.id);
      await fetch("/api/photos", { method: "POST", body: fd });
    }

    const merged = { ...selected, ...updated };
    setSelected(merged);
    setLogs(prev => prev.map(l => l.id === merged.id ? merged : l));
    setSaving(false);
    setEditing(false);
  }

  useEffect(() => {
    fetch("/api/sessions").then(r => r.json()).then(data => {
      setLogs(data.filter((s: any) => s.status === "COMPLETED"));
    });
  }, []);

  if (selected) {
    const photos = selected.photos?.filter((p: any) => !isAudio(p.url)) || [];
    const audioFiles = selected.photos?.filter((p: any) => isAudio(p.url)) || [];

    if (editing) {
      return (
        <div>
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-sm font-medium text-blue-600 mb-4">
            <ChevronLeft size={18} /> Back
          </button>
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Edit Log</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Slip Number</label>
              <input value={editSlip} onChange={e => setEditSlip(e.target.value)}
                placeholder="e.g. 42"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Task Type</label>
              <input value={editTask} onChange={e => setEditTask(e.target.value)}
                placeholder="e.g. Cleaning"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                placeholder="Any notes..."
                rows={3}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Voice memo</label>
              {recState === "done" ? (
                <div>
                  <div className="flex items-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium mb-1 justify-center">
                    <Check size={14} /> Recorded{audioBlob ? " · audio saved" : ""}
                  </div>
                  <p className="text-xs text-slate-500 italic mb-1">"{editTranscript}"</p>
                  <button onClick={reRecord} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Mic size={12} /> Re-record
                  </button>
                </div>
              ) : recState === "recording" ? (
                <button onClick={stopVoice} className="w-full py-3 border-2 border-red-300 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2 text-sm font-medium">
                  <Mic size={16} /> Tap to stop
                </button>
              ) : (
                <button onClick={startVoice} className="w-full py-3 border border-border bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center gap-2 text-sm font-medium">
                  <Mic size={16} /> Record new memo
                </button>
              )}
            </div>
            <button onClick={saveEdit} disabled={saving}
              className="w-full py-3 bg-foreground text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setSelected(null); setConfirming(false); }} className="flex items-center gap-1 text-sm font-medium text-blue-600">
            <ChevronLeft size={18} /> Back
          </button>
          <button onClick={startEdit} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Pencil size={14} /> Edit
          </button>
        </div>
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
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
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
            <button key={l.id} onClick={() => { setSelected(l); setConfirming(false); setEditing(false); }}
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
