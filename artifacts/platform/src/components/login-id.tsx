// 5 xonali ID bilan kirish — yuz bilan kirish imkoni bo'lmaganlar uchun (o'quvchi/o'qituvchi/admin).

import { useState } from "react";
import { KeyRound, X, Delete, Loader2, ScanFace } from "lucide-react";
import { API_BASE } from "@/lib/face";

export function IdLoginDialog({
  onSuccess, onClose, onUseFace,
}: {
  onSuccess: (result: Record<string, unknown>) => void;
  onClose: () => void;
  onUseFace?: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (value: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/auth/id-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: value }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError((data as { error?: string }).error ?? "Xatolik");
        setCode("");
        return;
      }
      onSuccess(data as Record<string, unknown>);
    } catch {
      setError("Serverga ulanib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const press = (d: string) => {
    if (loading) return;
    setError("");
    const next = (code + d).slice(0, 5);
    setCode(next);
    if (next.length === 5) void submit(next);
  };
  const back = () => { setError(""); setCode((c) => c.slice(0, -1)); };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-semibold"><KeyRound className="w-5 h-5 text-primary" /> ID bilan kirish</div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <p className="text-center text-sm text-muted-foreground mb-4">5 xonali kirish IDsini kiriting</p>

          {/* Kod nuqtalari */}
          <div className="flex justify-center gap-3 mb-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`w-11 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${i < code.length ? "border-primary bg-primary/5" : "border-muted"}`}>
                {code[i] ?? ""}
              </div>
            ))}
          </div>
          <div className="h-6 text-center text-sm text-destructive">{loading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : error}</div>

          {/* Klaviatura */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {keys.map((k) => (
              <button key={k} onClick={() => press(k)} disabled={loading}
                className="h-14 rounded-2xl bg-muted hover:bg-accent text-2xl font-semibold active:scale-95 transition">
                {k}
              </button>
            ))}
            <div />
            <button onClick={() => press("0")} disabled={loading}
              className="h-14 rounded-2xl bg-muted hover:bg-accent text-2xl font-semibold active:scale-95 transition">0</button>
            <button onClick={back} disabled={loading}
              className="h-14 rounded-2xl hover:bg-accent flex items-center justify-center active:scale-95 transition">
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {onUseFace && (
            <button onClick={onUseFace} className="w-full mt-4 rounded-xl border py-3 font-medium flex items-center justify-center gap-2">
              <ScanFace className="w-4 h-4" /> Yuz bilan kirish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
