"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";

export default function SupportPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_SUPPORT_URL || "http://localhost:3500";
  const apiKey = process.env.NEXT_PUBLIC_SUPPORT_API_KEY || "sk_dlog_a3f7b2c1d4e5f6a7b8c9d0e1f2a3b4c5";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          name: user?.name || "",
          role: user?.role || "",
          page_url: window.location.href,
          browser_info: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(data.ticket_number);
      setSubject("");
      setDescription("");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Check size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold mb-1">Ticket Submitted</h2>
        <p className="text-sm text-muted-foreground mb-1">{submitted}</p>
        <p className="text-sm text-muted-foreground">We'll review it and get back to you.</p>
        <button
          onClick={() => setSubmitted(null)}
          className="mt-6 px-5 py-2.5 bg-foreground text-white rounded-xl text-sm font-semibold"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight mb-1">Report an Issue</h2>
      <p className="text-sm text-muted-foreground mb-5">Tell us what happened and we'll look into it.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Your name</label>
            <input
              value={user?.name || ""}
              readOnly
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-slate-50 text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              rows={5}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-foreground text-white rounded-xl font-semibold text-sm disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
