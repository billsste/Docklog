"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Anchor } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setWorkers(data);
        else setWorkers([]);
      })
      .catch(() => setWorkers([]));
  }, []);

  const handleLogin = async () => {
    if (!selected || !pin) return;
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      name: selected,
      pin,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect PIN. Try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="text-blue-600 mb-3">
        <Anchor size={32} strokeWidth={1.8} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">DockLog</h1>
      <p className="text-sm text-slate-500 mb-8">Select your name to clock in</p>

      {!selected ? (
        <div className="w-full max-w-sm space-y-2">
          {workers.length > 0 ? workers.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w.name)}
              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-base font-semibold
                         hover:border-blue-300 hover:bg-blue-50/50 active:scale-[0.98]
                         transition-all shadow-sm"
            >
              {w.name}
            </button>
          )) : (
            <p className="text-center text-slate-400 py-8">Loading workers...</p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Signing in as</p>
            <p className="text-lg font-semibold mb-4">{selected}</p>

            <label className="text-xs font-medium text-slate-500 block mb-2">
              Enter your PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••"
              autoFocus
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-light
                         border border-slate-200 rounded-lg focus:border-blue-500
                         focus:ring-2 focus:ring-blue-100 transition-all"
            />

            {error && (
              <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={!pin || loading}
              className="w-full mt-4 py-3 bg-slate-900 text-white rounded-lg font-medium
                         hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <button
              onClick={() => { setSelected(null); setPin(""); setError(""); }}
              className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-700 transition-colors"
            >
              ← Choose a different name
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
