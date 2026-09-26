// Kompyuterlar — maktab kompyuter sinfini platformadan boshqarish (Veyon bilan).
// Jonli holat, bloklash / ochish (aylanuvchi kod), o'chirish/qayta yuklash/xabar, jurnal.
// Amaliy qulflashni Veyon bajaradi; platforma buyruq beradi, ko'prik (bridge) uzatadi.

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Monitor, Lock, Unlock, Power, RefreshCw, Plus, Settings2, Trash2, KeyRound,
  MessageSquare, RotateCw, Wifi, WifiOff, ScrollText, Pencil, ShieldCheck, Info,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
function authHeaders(): HeadersInit {
  const t = localStorage.getItem("talim_auth_token");
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error ?? `Xatolik (${r.status})`);
  return data as T;
}

interface Room { id: string; name: string; note: string }
interface Computer {
  id: string; room_id: string | null; name: string; host: string;
  online: boolean; locked: boolean; locked_by: string; locked_at: string | null;
  current_user: string; last_seen: string | null; note: string; unlock_code?: string;
}
interface Settings {
  lock_message?: string; code_digits?: number;
  teacher_can_lock: boolean; teacher_can_unlock: boolean; show_message_on_lock?: boolean;
}
interface Overview {
  manager: boolean; settings: Settings; rooms: Room[]; computers: Computer[];
  counts: { total: number; online: number; offline: number; locked: number };
}
interface LabEvent { computer_name: string; action: string; detail: string; actor: string; created_at: string }

const ACTION_UZ: Record<string, string> = {
  add: "qo'shildi", remove: "o'chirildi", lock: "bloklandi", unlock: "ochildi",
  unlock_fail: "ochish (kod xato)", code: "kod yangilandi", reboot: "qayta yuklash",
  poweroff: "o'chirish", logoff: "chiqish", message: "xabar",
};

function ago(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hozir";
  if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return `${Math.floor(s / 86400)} kun oldin`;
}

export default function LabPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const manager = !!user && ["admin", "director", "zam_direktor", "zavuch"].includes(user.role);

  const ov = useQuery<Overview>({
    queryKey: ["lab-overview"],
    queryFn: () => api<Overview>("/lab/overview"),
    refetchInterval: 10_000,
  });

  const [room, setRoom] = useState<string>("all");
  const [busy, setBusy] = useState<string>(""); // "<id>:<action>"
  const [addOpen, setAddOpen] = useState(false);
  const [editComp, setEditComp] = useState<Computer | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [unlockFor, setUnlockFor] = useState<{ kind: "pc" | "room"; id: string; name: string } | null>(null);
  const [showLog, setShowLog] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lab-overview"] });

  const rooms = ov.data?.rooms ?? [];
  const computers = ov.data?.computers ?? [];
  const filtered = useMemo(() => {
    if (room === "all") return computers;
    if (room === "none") return computers.filter((c) => !c.room_id);
    return computers.filter((c) => c.room_id === room);
  }, [computers, room]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
    finally { setBusy(""); refresh(); }
  };

  const lockPc = (c: Computer) =>
    run(`${c.id}:lock`, async () => {
      const r = await api<{ code?: string }>(`/lab/computers/${c.id}/lock`, { method: "POST", body: "{}" });
      toast({ title: `🔒 ${c.name} bloklandi`, description: r.code ? `Ochish kodi: ${r.code}` : "Ochish kodi rahbariyatda" });
    });

  const regen = (c: Computer) =>
    run(`${c.id}:code`, async () => {
      const r = await api<{ code: string }>(`/lab/computers/${c.id}/code`, { method: "POST", body: "{}" });
      toast({ title: `🔑 ${c.name} — yangi kod`, description: `Ochish kodi: ${r.code}` });
    });

  const doAction = (c: Computer, action: string, label: string) =>
    run(`${c.id}:${action}`, async () => {
      await api(`/lab/computers/${c.id}/action`, { method: "POST", body: JSON.stringify({ action }) });
      toast({ title: `${c.name}: ${label} yuborildi` });
    });

  const lockRoom = (id: string, name: string) =>
    run(`room-${id}:lock`, async () => {
      const r = await api<{ code?: string; count: number }>(`/lab/rooms/${id}/lock`, { method: "POST", body: "{}" });
      toast({ title: `🔒 ${name}: ${r.count} ta bloklandi`, description: r.code ? `Umumiy ochish kodi: ${r.code}` : "Kod rahbariyatda" });
    });

  const submitUnlock = (code: string, force: boolean) => {
    if (!unlockFor) return;
    const { kind, id, name } = unlockFor;
    const path = kind === "pc" ? `/lab/computers/${id}/unlock` : `/lab/rooms/${id}/unlock`;
    void run(`${kind}-${id}:unlock`, async () => {
      await api(path, { method: "POST", body: JSON.stringify({ code, force }) });
      toast({ title: `🔓 ${name} ochildi` });
      setUnlockFor(null);
    });
  };

  const counts = ov.data?.counts;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Kompyuterlar</h1>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Yangilash</span></Button>
        {manager && <Button variant="outline" size="sm" onClick={() => setSetOpen(true)}><Settings2 className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Sozlama</span></Button>}
        {manager && <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">Kompyuter</span></Button>}
      </div>

      {/* Hisob */}
      {counts && (
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Jami" value={counts.total} />
          <Stat label="Onlayn" value={counts.online} color="text-emerald-500" />
          <Stat label="Oflayn" value={counts.offline} color="text-slate-400" />
          <Stat label="Bloklangan" value={counts.locked} color="text-red-500" />
        </div>
      )}

      {/* Xona filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <RoomChip active={room === "all"} onClick={() => setRoom("all")}>Hammasi</RoomChip>
          {rooms.map((r) => (
            <RoomChip key={r.id} active={room === r.id} onClick={() => setRoom(r.id)}>{r.name}</RoomChip>
          ))}
          {computers.some((c) => !c.room_id) && <RoomChip active={room === "none"} onClick={() => setRoom("none")}>Xonasiz</RoomChip>}
        </div>
        <div className="flex-1" />
        {manager && <Button variant="ghost" size="sm" onClick={() => setRoomOpen(true)}><Plus className="w-4 h-4 mr-1" />Xona</Button>}
        {/* Xona bo'yicha ommaviy */}
        {room !== "all" && room !== "none" && filtered.length > 0 && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="text-red-600" disabled={busy === `room-${room}:lock`} onClick={() => lockRoom(room, rooms.find((r) => r.id === room)?.name ?? "Xona")}>
              <Lock className="w-4 h-4 mr-1" />Xonani bloklash
            </Button>
            <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => setUnlockFor({ kind: "room", id: room, name: rooms.find((r) => r.id === room)?.name ?? "Xona" })}>
              <Unlock className="w-4 h-4 mr-1" />Ochish
            </Button>
          </div>
        )}
      </div>

      {ov.isLoading && <div className="text-center text-muted-foreground py-10">Yuklanmoqda…</div>}
      {ov.isError && <div className="text-destructive text-sm">{(ov.error as Error).message}</div>}

      {/* Bo'sh holat — o'rnatish yo'riqnomasi */}
      {ov.data && computers.length === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-base font-semibold"><Info className="w-5 h-5 text-primary" /> Boshlash</div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Har bir maktab kompyuteriga <b className="text-foreground">Veyon</b> o'rnating (veyon.io).</li>
              <li>O'qituvchi kompyuteriga <b className="text-foreground">ko'prik (bridge)</b> dasturini o'rnating — <code>LAB.md</code> ga qarang.</li>
              <li>Bu yerga har bir kompyuterni <b className="text-foreground">nomi va IP manzili</b> bilan qo'shing.</li>
              <li>Tayyor — jonli holatni ko'rasiz va bloklash/ochish ishlaydi.</li>
            </ol>
            {manager && <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Birinchi kompyuterni qo'shish</Button>}
          </CardContent>
        </Card>
      )}

      {/* Kompyuterlar to'ri */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c) => (
          <ComputerCard
            key={c.id}
            c={c}
            manager={manager}
            settings={ov.data!.settings}
            busy={busy}
            onLock={() => lockPc(c)}
            onUnlock={() => setUnlockFor({ kind: "pc", id: c.id, name: c.name })}
            onRegen={() => regen(c)}
            onAction={(a, l) => doAction(c, a, l)}
            onEdit={() => setEditComp(c)}
          />
        ))}
      </div>

      {/* Jurnal */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => setShowLog((v) => !v)}>
          <ScrollText className="w-4 h-4 mr-1.5" /> Jurnal {showLog ? "▲" : "▼"}
        </Button>
        {showLog && <LogPanel />}
      </div>

      {/* Muloqotlar */}
      {(addOpen || editComp) && (
        <ComputerDialog
          rooms={rooms}
          comp={editComp}
          onClose={() => { setAddOpen(false); setEditComp(null); }}
          onSaved={() => { setAddOpen(false); setEditComp(null); refresh(); }}
        />
      )}
      {roomOpen && <RoomDialog onClose={() => setRoomOpen(false)} onSaved={() => { setRoomOpen(false); refresh(); }} />}
      {setOpen && ov.data && <SettingsDialog onClose={() => setSetOpen(false)} onSaved={() => { setSetOpen(false); refresh(); }} />}
      {unlockFor && (
        <UnlockDialog
          name={unlockFor.name}
          manager={manager}
          onClose={() => setUnlockFor(null)}
          onSubmit={submitUnlock}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-center">
      <div className={`text-2xl font-bold ${color ?? ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function RoomChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
    >
      {children}
    </button>
  );
}

function ComputerCard({
  c, manager, settings, busy, onLock, onUnlock, onRegen, onAction, onEdit,
}: {
  c: Computer; manager: boolean; settings: Settings; busy: string;
  onLock: () => void; onUnlock: () => void; onRegen: () => void;
  onAction: (a: string, label: string) => void; onEdit: () => void;
}) {
  const canControl = manager || settings.teacher_can_lock || settings.teacher_can_unlock;
  const isBusy = busy.startsWith(`${c.id}:`);
  return (
    <div className={`rounded-2xl border bg-card p-4 space-y-3 ${c.locked ? "ring-2 ring-red-500/40" : ""}`}>
      <div className="flex items-start gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.online ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
          <Monitor className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate flex items-center gap-1.5">
            {c.name}
            {c.locked && <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />}
          </div>
          <div className="text-xs text-muted-foreground truncate">{c.host}</div>
        </div>
        {manager && (
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground shrink-0" title="Tahrirlash">
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        {c.online ? (
          <span className="flex items-center gap-1 text-emerald-500"><Wifi className="w-3.5 h-3.5" /> Onlayn</span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground"><WifiOff className="w-3.5 h-3.5" /> Oflayn · {ago(c.last_seen)}</span>
        )}
        {c.current_user && <span className="text-muted-foreground truncate">· {c.current_user}</span>}
      </div>

      {c.locked && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs">
          <div className="text-red-600 font-medium">Bloklangan</div>
          {manager && c.unlock_code && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Ochish kodi:</span>
              <span className="font-mono font-bold text-base tracking-widest text-foreground">{c.unlock_code}</span>
            </div>
          )}
          {c.locked_by && <div className="mt-0.5 text-muted-foreground truncate">{c.locked_by}</div>}
        </div>
      )}

      {canControl && (
        <div className="flex flex-wrap gap-1.5">
          {!c.locked ? (
            <Button size="sm" variant="outline" className="flex-1 text-red-600" disabled={isBusy} onClick={onLock}>
              <Lock className="w-4 h-4 mr-1" /> Bloklash
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 text-emerald-600" disabled={isBusy} onClick={onUnlock}>
              <Unlock className="w-4 h-4 mr-1" /> Ochish
            </Button>
          )}
          {manager && (
            <>
              {c.locked && (
                <Button size="sm" variant="ghost" disabled={isBusy} onClick={onRegen} title="Kodni yangilash">
                  <KeyRound className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onAction("message", "Xabar")} title="Xabar">
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => onAction("reboot", "Qayta yuklash")} title="Qayta yuklash">
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={isBusy} onClick={() => onAction("poweroff", "O'chirish")} title="O'chirish">
                <Power className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LogPanel() {
  const { data } = useQuery<LabEvent[]>({
    queryKey: ["lab-events"],
    queryFn: () => api<LabEvent[]>("/lab/events"),
    refetchInterval: 15_000,
  });
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground px-2 py-3">Hozircha yozuv yo'q</div>;
  return (
    <div className="mt-2 rounded-xl border divide-y max-h-80 overflow-y-auto">
      {data.map((e, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
          <span className="font-medium">{e.computer_name || "—"}</span>
          <span className="text-muted-foreground">{ACTION_UZ[e.action] ?? e.action}</span>
          {e.detail && <span className="text-xs text-muted-foreground">· {e.detail}</span>}
          <span className="flex-1" />
          <span className="text-xs text-muted-foreground truncate max-w-[40%]">{e.actor}</span>
          <span className="text-xs text-muted-foreground shrink-0">{ago(e.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

function ComputerDialog({ rooms, comp, onClose, onSaved }: { rooms: Room[]; comp: Computer | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(comp?.name ?? "");
  const [host, setHost] = useState(comp?.host ?? "");
  const [roomId, setRoomId] = useState<string>(comp?.room_id ?? "none");
  const [note, setNote] = useState(comp?.note ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({ name, host, room_id: roomId === "none" ? null : roomId, note });
      if (comp) await api(`/lab/computers/${comp.id}`, { method: "PATCH", body });
      else await api("/lab/computers", { method: "POST", body });
      toast({ title: comp ? "Saqlandi" : "Kompyuter qo'shildi" });
      onSaved();
    } catch (e) {
      toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message });
    } finally { setSaving(false); }
  };

  const del = async () => {
    if (!comp || !confirm(`${comp.name} — ro'yxatdan o'chirilsinmi?`)) return;
    try { await api(`/lab/computers/${comp.id}`, { method: "DELETE" }); toast({ title: "O'chirildi" }); onSaved(); }
    catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
  };

  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{comp ? "Kompyuterni tahrirlash" : "Kompyuter qo'shish"}</DialogTitle>
          <DialogDescription>IP manzil Veyon o'rnatilgan kompyuterniki bo'lsin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nomi</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="PC-01" />
          </div>
          <div>
            <Label>IP yoki hostname</Label>
            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.21" />
          </div>
          <div>
            <Label>Xona</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Xonasiz</SelectItem>
                {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Izoh (ixtiyoriy)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {comp && <Button variant="ghost" className="text-destructive mr-auto" onClick={del}><Trash2 className="w-4 h-4 mr-1" />O'chirish</Button>}
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button disabled={saving || !name.trim() || !host.trim()} onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await api("/lab/rooms", { method: "POST", body: JSON.stringify({ name }) }); toast({ title: "Xona qo'shildi" }); onSaved(); }
    catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Xona qo'shish</DialogTitle></DialogHeader>
        <div>
          <Label>Xona nomi</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Informatika xonasi" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button disabled={saving || !name.trim()} onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [s, setS] = useState<Settings & { lock_message: string; code_digits: number; show_message_on_lock: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void api<Required<Settings>>("/lab/settings").then((d) =>
      setS({ ...d, lock_message: d.lock_message ?? "", code_digits: d.code_digits ?? 4, show_message_on_lock: d.show_message_on_lock ?? true })
    );
  }, []);
  const save = async () => {
    if (!s) return;
    setSaving(true);
    try { await api("/lab/settings", { method: "POST", body: JSON.stringify(s) }); toast({ title: "Sozlama saqlandi" }); onSaved(); }
    catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Sozlamalar</DialogTitle></DialogHeader>
        {!s ? <div className="py-6 text-center text-muted-foreground">Yuklanmoqda…</div> : (
          <div className="space-y-4">
            <div>
              <Label>Bloklanganda ekrandagi xabar</Label>
              <Textarea value={s.lock_message} onChange={(e) => setS({ ...s, lock_message: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Ochish kodi uzunligi</Label>
              <Select value={String(s.code_digits)} onValueChange={(v) => setS({ ...s, code_digits: Number(v) })}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[4, 5, 6].map((n) => <SelectItem key={n} value={String(n)}>{n} raqam</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ToggleRow label="Ekranga xabar chiqarilsin" val={s.show_message_on_lock} onChange={(v) => setS({ ...s, show_message_on_lock: v })} />
            <ToggleRow label="O'qituvchilar bloklay olsin" val={s.teacher_can_lock} onChange={(v) => setS({ ...s, teacher_can_lock: v })} />
            <ToggleRow label="O'qituvchilar kod bilan ocha olsin" val={s.teacher_can_unlock} onChange={(v) => setS({ ...s, teacher_can_unlock: v })} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button disabled={saving || !s} onClick={save}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({ label, val, onChange }: { label: string; val: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={val} onCheckedChange={onChange} />
    </div>
  );
}

function UnlockDialog({ name, manager, onClose, onSubmit }: { name: string; manager: boolean; onClose: () => void; onSubmit: (code: string, force: boolean) => void }) {
  const [code, setCode] = useState("");
  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Unlock className="w-5 h-5" /> {name} — ochish</DialogTitle>
          <DialogDescription>Administrator bergan ochish kodini kiriting.</DialogDescription>
        </DialogHeader>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Kod"
          className="text-center text-2xl tracking-[0.4em] font-mono"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && code) onSubmit(code, false); }}
        />
        <DialogFooter className="gap-2">
          {manager && (
            <Button variant="ghost" className="mr-auto text-muted-foreground" onClick={() => onSubmit("", true)}>
              <ShieldCheck className="w-4 h-4 mr-1" />Kodsiz ochish (rahbar)
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button disabled={!code} onClick={() => onSubmit(code, false)}>Ochish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
