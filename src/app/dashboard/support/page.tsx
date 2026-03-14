"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Check, Paperclip, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || "http://localhost:3500";
const API_KEY = process.env.NEXT_PUBLIC_SUPPORT_API_KEY || "sk_dlog_a3f7b2c1d4e5f6a7b8c9d0e1f2a3b4c5";

const TYPE_OPTIONS = [
  { value: "bug", label: "Bug / Issue" },
  { value: "feature", label: "Feature Request" },
  { value: "improvement", label: "Improvement" },
  { value: "question", label: "Question" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const AREA_OPTIONS = [
  "Dashboard", "Timer", "My Logs", "Admin", "Support", "Login", "Other",
];

const statusColors: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  in_progress: "bg-blue-50 text-blue-700",
  waiting: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

export default function SupportPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"new" | "mine">("new");

  // Form
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [area, setArea] = useState("Dashboard");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  // My tickets
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const fetchMyTickets = useCallback(async () => {
    if (!user?.name) return;
    setLoadingTickets(true);
    try {
      const res = await fetch(
        `${API_URL}/api/tickets/mine?submitter_name=${encodeURIComponent(user.name)}`,
        { headers: { "X-API-Key": API_KEY } }
      );
      const data = await res.json();
      setMyTickets(data.tickets || []);
    } catch {}
    setLoadingTickets(false);
  }, [user?.name]);

  useEffect(() => {
    if (tab === "mine") fetchMyTickets();
  }, [tab, fetchMyTickets]);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    const nextPreviews = [...previews];
    Array.from(incoming).forEach(file => {
      if (next.length >= 5) return;
      next.push(file);
      const reader = new FileReader();
      reader.onload = e => setPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(file);
      nextPreviews.push(""); // placeholder until reader finishes
    });
    setFiles(next);
  }

  function removeFile(i: number) {
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      // 1. Create ticket
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({
          subject: subject.trim(),
          description: `${description.trim()}${steps.trim() ? `\n\nSteps to Reproduce:\n${steps.trim()}` : ""}`,
          name: user?.name || "",
          role: user?.role || "",
          page_url: area,
          browser_info: navigator.userAgent,
          priority,
          type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      // 2. Upload photos if any
      if (files.length > 0 && data.id) {
        const fd = new FormData();
        files.forEach(f => fd.append("photos", f));
        await fetch(`${API_URL}/api/tickets/${data.id}/photos`, {
          method: "POST",
          headers: { "X-API-Key": API_KEY },
          body: fd,
        }).catch(() => {});
      }

      setSubmitted(data.ticket_number);
      setSubject(""); setDescription(""); setSteps("");
      setFiles([]); setPreviews([]);
      setType("bug"); setPriority("normal"); setArea("Dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white";

  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight mb-4">Support</h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {[{ id: "new", label: "New Ticket" }, { id: "mine", label: "My Tickets" }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "new" | "mine")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── New Ticket ── */}
      {tab === "new" && (
        submitted ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Check size={26} className="text-emerald-600" />
            </div>
            <h3 className="text-base font-bold mb-1">Ticket Submitted</h3>
            <p className="text-sm text-muted-foreground mb-0.5">{submitted}</p>
            <p className="text-sm text-muted-foreground">We'll review it and get back to you.</p>
            <button onClick={() => setSubmitted(null)}
              className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">
              Submit Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

            {/* Type + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={inputCls}>
                  {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of your issue" className={inputCls} />
            </div>

            {/* Page / Area */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Page / Area</label>
              <select value={area} onChange={e => setArea(e.target.value)} className={inputCls}>
                {AREA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue or request in detail..."
                rows={4}
                className={`${inputCls} resize-none`} />
            </div>

            {/* Steps to Reproduce */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-0.5">Steps to Reproduce</label>
              <p className="text-xs text-muted-foreground mb-1.5">For bugs — help us recreate the issue</p>
              <textarea value={steps} onChange={e => setSteps(e.target.value)}
                placeholder={"1. Go to...\n2. Click on...\n3. See error..."}
                rows={3}
                className={`${inputCls} resize-none`} />
            </div>

            {/* Attachments */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Attachments</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                  dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {files.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Paperclip size={15} />
                    Drag & drop files here or click to browse (max 5 files, 5MB each)
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {previews.map((p, i) => (
                      <div key={i} className="relative group">
                        {p && p.startsWith("data:image") ? (
                          <img src={p} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-gray-200 bg-slate-100 flex items-center justify-center">
                            <Paperclip size={14} className="text-muted-foreground" />
                          </div>
                        )}
                        <button type="button" onClick={e => { e.stopPropagation(); removeFile(i); }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={9} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {files.length < 5 && (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-muted-foreground hover:border-gray-300">
                        <Paperclip size={14} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
                onChange={e => addFiles(e.target.files)} />
            </div>

            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        )
      )}

      {/* ── My Tickets ── */}
      {tab === "mine" && (
        <div>
          {loadingTickets ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : myTickets.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No tickets submitted yet.</p>
              <button onClick={() => setTab("new")} className="mt-3 text-sm text-blue-600 font-medium">
                Submit your first ticket →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map((t: any) => (
                <div key={t.id} className="p-3.5 bg-white border border-border rounded-xl shadow-sm">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{t.ticket_number}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColors[t.status] || statusColors.closed}`}>
                      {t.status.replace("_", " ")}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                      {t.manual_type || t.ticket_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(t.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
