"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Play, Square, Mic, Keyboard, Check, Camera } from "lucide-react";
import { parseTranscript } from "@/lib/parse-transcript";

export default function TimerPage() {
  const { data: session } = useSession();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"timer" | "memo">("timer");
  const [completedSession, setCompletedSession] = useState<any>(null);
  const [transcript, setTranscript] = useState("");
  const [parsedSlip, setParsedSlip] = useState<string | null>(null);
  const [parsedTask, setParsedTask] = useState<string | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording" | "done">("idle");
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);
  const recRef = useRef<any>(null);
  const finalTextRef = useRef("");

  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

  // Check for active session on mount
  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((sessions) => {
        const active = sessions.find((s: any) => s.status === "ACTIVE");
        if (active) {
          setActiveSessionId(active.id);
          startTimeRef.current = new Date(active.startTime).getTime();
          setRunning(true);
          setElapsed(Date.now() - startTimeRef.current);
        }
        setSessionCount(sessions.filter((s: any) => s.status === "COMPLETED").length);
      });
  }, []);

  // Timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const clockIn = async () => {
    const res = await fetch("/api/sessions", { method: "POST" });
    const data = await res.json();
    if (data.id) {
      setActiveSessionId(data.id);
      startTimeRef.current = new Date(data.startTime).getTime();
      setElapsed(0);
      setRunning(true);
    }
  };

  const clockOut = async () => {
    if (!activeSessionId) return;
    setRunning(false);
    clearInterval(intervalRef.current);

    const res = await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSessionId, action: "clockOut" }),
    });
    const data = await res.json();
    setCompletedSession(data);
    setPhase("memo");
  };

  const applyTranscript = useCallback((text: string) => {
    setTranscript(text);
    const parsed = parseTranscript(text);
    setParsedSlip(parsed.slipNumber);
    setParsedTask(parsed.taskType);
    setRecState("done");
  }, []);

  const startVoice = () => {
    if (!SR) { setShowManual(true); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    finalTextRef.current = "";

    r.onresult = (e: any) => {
      let final = finalTextRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { final += e.results[i][0].transcript + " "; finalTextRef.current = final; }
      }
    };
    r.onend = () => {
      const text = finalTextRef.current.trim();
      if (text) applyTranscript(text);
      else setRecState("idle");
    };
    r.onerror = () => { setRecState("idle"); setShowManual(true); };

    r.start();
    recRef.current = r;
    setRecState("recording");
  };

  const stopVoice = () => { recRef.current?.stop(); };

  const submitManual = () => {
    if (manualText.trim()) applyTranscript(manualText.trim());
  };

  const saveMemo = async () => {
    if (!activeSessionId) return;
    setSaving(true);

    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeSessionId,
        action: "addMemo",
        transcript,
        slipNumber: parsedSlip,
        taskType: parsedTask,
      }),
    });

    // Upload photo if selected
    if (selectedPhoto) {
      const formData = new FormData();
      formData.append("file", selectedPhoto);
      formData.append("sessionId", activeSessionId);
      await fetch("/api/photos", { method: "POST", body: formData });
    }

    resetTimer();
  };

  const skipMemo = async () => {
    // Upload photo even without memo
    if (selectedPhoto && activeSessionId) {
      const formData = new FormData();
      formData.append("file", selectedPhoto);
      formData.append("sessionId", activeSessionId);
      await fetch("/api/photos", { method: "POST", body: formData });
    }
    resetTimer();
  };

  const resetTimer = () => {
    setPhase("timer");
    setActiveSessionId(null);
    setCompletedSession(null);
    setTranscript("");
    setParsedSlip(null);
    setParsedTask(null);
    setRecState("idle");
    setShowManual(false);
    setManualText("");
    setSelectedPhoto(null);
    setSaving(false);
    setElapsed(0);
    setSessionCount((c) => c + 1);
  };

  const mm = Math.floor((elapsed % 3600000) / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);
  const hh = Math.floor(elapsed / 3600000);

  // ─── MEMO PHASE ───
  if (phase === "memo" && completedSession) {
    const durMs = completedSession.duration || elapsed;
    const dMm = Math.floor((durMs % 3600000) / 60000);
    const dSs = Math.floor((durMs % 60000) / 1000);

    return (
      <div className="animate-fadeIn">
        <div className="text-center mb-6 pt-4">
          <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mb-3">
            Clocked Out
          </span>
          <p className="text-4xl font-extralight tracking-tight tabular-nums">
            {String(dMm).padStart(2, "0")}:{String(dSs).padStart(2, "0")}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {(session?.user as any)?.name}
          </p>
        </div>

        {/* Voice memo */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Voice memo <span className="font-normal opacity-60">(optional)</span>
          </p>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            Mention the <span className="font-semibold text-blue-600">slip number</span> and{" "}
            <span className="font-semibold text-amber-600">task</span> for auto-tagging.
          </p>

          {recState === "done" ? (
            <div className="flex items-center justify-center gap-2 py-3.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
              <Check size={16} /> Memo recorded
            </div>
          ) : recState === "recording" ? (
            <button onClick={stopVoice} className="w-full py-4 border-2 border-red-300 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-3 font-medium">
              <div className="flex items-center gap-0.5 h-4">
                {[0, 0.12, 0.24, 0.12, 0].map((d, i) => (
                  <span key={i} className="w-0.5 bg-red-500 rounded-full" style={{ height: "100%", animation: `wave-bar 0.8s ease-in-out ${d}s infinite` }} />
                ))}
              </div>
              <Mic size={18} /> Tap to stop
            </button>
          ) : (
            <button onClick={startVoice} className="w-full py-4 border border-border bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center gap-3 font-medium hover:border-slate-300 transition-colors">
              <Mic size={18} /> Tap to record
            </button>
          )}

          {!showManual && recState === "idle" && (
            <button onClick={() => setShowManual(true)} className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors">
              <Keyboard size={14} /> Type manually
            </button>
          )}

          {showManual && recState !== "done" && (
            <div className="flex gap-2 mt-2">
              <input value={manualText} onChange={(e) => setManualText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitManual()}
                placeholder='e.g. "Slip 42, cleaned hull"' className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <button onClick={submitManual} className="px-4 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          )}
        </div>

        {/* Parsed results */}
        {transcript && (
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3 animate-fadeIn">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Auto-detected</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {parsedSlip ? <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">Slip {parsedSlip}</span>
                : <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-full">No slip</span>}
              {parsedTask ? <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">{parsedTask}</span>
                : <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-full">No task</span>}
            </div>
            <p className="text-sm text-slate-500 italic leading-relaxed">"{transcript}"</p>
          </div>
        )}

        {/* Photo attachment */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Photo <span className="font-normal opacity-60">(optional)</span>
          </p>
          <label className="w-full py-3 border border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-sm text-slate-500 cursor-pointer hover:border-slate-400 transition-colors">
            <Camera size={16} />
            {selectedPhoto ? selectedPhoto.name : "Tap to attach a photo"}
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => setSelectedPhoto(e.target.files?.[0] || null)} />
          </label>
        </div>

        {/* Save buttons */}
        <div className="flex gap-2">
          <button onClick={skipMemo} className={`flex-1 py-3.5 rounded-xl font-medium text-[15px] transition-all ${transcript ? "border border-border text-slate-600" : "bg-foreground text-white"}`}>
            {transcript ? "Skip memo" : "Save session"}
          </button>
          {transcript && (
            <button onClick={saveMemo} disabled={saving} className="flex-1 py-3.5 bg-foreground text-white rounded-xl font-semibold text-[15px] disabled:opacity-50">
              {saving ? "Saving..." : "Save session"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── TIMER PHASE ───
  return (
    <div className="flex flex-col items-center pt-10">
      <p className={`text-7xl font-extralight tracking-tight tabular-nums transition-colors duration-300 ${running ? "text-foreground" : "text-slate-300"}`}>
        {hh > 0 && `${hh}:`}{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </p>
      <p className={`mt-3 text-xs font-semibold uppercase tracking-[3px] transition-colors ${running ? "text-emerald-600" : "text-muted-foreground"}`}>
        {running ? "● Clocked in" : "Ready"}
      </p>

      <div className="mt-10 mb-6">
        <button
          onClick={running ? clockOut : clockIn}
          className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2 cursor-pointer
            transition-all active:scale-95 ${running
              ? "border-2 border-red-400 bg-red-500 text-white shadow-lg"
              : "border-2 border-foreground text-foreground hover:bg-slate-50"
            }`}
          style={running ? { animation: "pulse-ring 2s infinite" } : {}}
        >
          {running ? <Square size={22} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          <span className="text-[11px] font-bold tracking-[2px] uppercase">
            {running ? "Clock out" : "Clock in"}
          </span>
        </button>
      </div>

      {sessionCount > 0 && (
        <p className="text-sm text-muted-foreground">{sessionCount} session{sessionCount !== 1 ? "s" : ""} logged</p>
      )}
    </div>
  );
}
