"use client";

import { useState } from "react";
import { MessageCircle, X, Check } from "lucide-react";

interface Props {
  userName?: string;
  userRole?: string;
}

export default function SupportWidget({ userName = "", userRole = "" }: Props) {
  const [open, setOpen] = useState(false);
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
      setError("Please fill in subject and description.");
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
          name: userName,
          role: userRole,
          page_url: window.location.href,
          browser_info: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(data.ticket_number);
      setTimeout(() => {
        setSubmitted(null);
        setSubject("");
        setDescription("");
        setOpen(false);
      }, 4000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Report an issue"
        className="fixed bottom-20 right-4 z-[9999] w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed bottom-36 right-4 z-[9999] w-80 bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div className="bg-blue-600 px-5 py-4">
            <p className="text-white font-semibold text-[15px]">Report an Issue</p>
            <p className="text-blue-100 text-xs mt-0.5">We'll look into it and get back to you.</p>
          </div>

          <div className="p-4">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={22} className="text-emerald-600" />
                </div>
                <p className="font-semibold text-sm">Ticket submitted!</p>
                <p className="text-xs text-muted-foreground mt-1">{submitted} has been received.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Subject</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What happened? What did you expect?"
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
