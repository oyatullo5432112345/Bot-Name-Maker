import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Trash2, Pin, Loader2, AlertCircle, Zap, Star, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");
const authH = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

type Priority = "normal" | "important" | "urgent";

type Announcement = {
  id: string; title: string; content: string;
  author_name: string; role_filter: string | null;
  pinned: boolean; priority: Priority; created_at: string;
};

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "Hamma uchun" },
  { value: "student", label: "Faqat o'quvchilar" },
  { value: "teacher", label: "Faqat o'qituvchilar" },
  { value: "sinf_rahbari", label: "Faqat sinf rahbarlari" },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: typeof Bell; badge: string }> = {
  normal:    { label: "Oddiy",      icon: Bell,  color: "", badge: "bg-muted text-muted-foreground" },
  important: { label: "Muhim",      icon: Star,  color: "border-yellow-500/40 bg-yellow-500/5", badge: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" },
  urgent:    { label: "Shoshilinch", icon: Zap,   color: "border-red-500/40 bg-red-500/5",       badge: "bg-red-500/20 text-red-500 border-red-500/30" },
};

function timeAgo(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: uz });
  } catch {
    return new Date(date).toLocaleDateString("uz-UZ");
  }
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", role_filter: "all", priority: "normal" as Priority });

  const canPost = user && ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"].includes(user.role);
  const canDelete = user && ["admin", "director"].includes(user.role);
  const canPin = user && ["admin", "director"].includes(user.role);

  const { data: announcements = [], isLoading, isError } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/announcements`, { headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
      const items = await r.json() as Announcement[];
      localStorage.setItem("announcements_last_seen", String(Date.now()));
      return items;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch(`${API_BASE}/announcements`, {
        method: "POST",
        headers: authH(),
        body: JSON.stringify({
          title: data.title,
          content: data.content,
          priority: data.priority,
          role_filter: data.role_filter === "all" ? null : data.role_filter,
        }),
      });
      if (!r.ok) throw new Error("Xatolik");
      return r.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      void qc.invalidateQueries({ queryKey: ["announcements-unread-count"] });
      setOpen(false);
      setForm({ title: "", content: "", role_filter: "all", priority: "normal" });
      toast({ title: "✅ E'lon joylashtirildi" });
    },
    onError: () => toast({ variant: "destructive", title: "Xatolik", description: "E'lon joylashtirishda muammo yuz berdi" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API_BASE}/announcements/${id}`, { method: "DELETE", headers: authH() });
      if (!r.ok) throw new Error("Xatolik");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "E'lon o'chirildi" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const r = await fetch(`${API_BASE}/announcements/${id}/pin`, {
        method: "PATCH", headers: authH(), body: JSON.stringify({ pinned }),
      });
      if (!r.ok) throw new Error("Xatolik");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const urgentCount = announcements.filter(a => a.priority === "urgent").length;
  const importantCount = announcements.filter(a => a.priority === "important").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            E'lonlar
          </h1>
          <p className="text-muted-foreground mt-1">Maktab e'lonlari va muhim xabarlar</p>
        </div>
        {canPost && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />E'lon qo'shish</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Yangi e'lon</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Sarlavha</label>
                  <Input placeholder="E'lon sarlavhasi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Matn</label>
                  <Textarea placeholder="E'lon matnini yozing..." rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Kim uchun</label>
                    <Select value={form.role_filter} onValueChange={v => setForm(f => ({ ...f, role_filter: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Muhimlik darajasi</label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Oddiy</SelectItem>
                        <SelectItem value="important">⭐ Muhim</SelectItem>
                        <SelectItem value="urgent">🔴 Shoshilinch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate(form)}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Joylash
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(urgentCount > 0 || importantCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium">
              <Zap className="w-3.5 h-3.5" />{urgentCount} shoshilinch e'lon
            </div>
          )}
          {importantCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-sm font-medium">
              <Star className="w-3.5 h-3.5" />{importantCount} muhim e'lon
            </div>
          )}
        </div>
      )}

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-2 py-6 text-destructive">
            <AlertCircle className="w-5 h-5" />E'lonlarni yuklashda xatolik yuz berdi.
          </CardContent>
        </Card>
      )}
      {!isLoading && !isError && announcements.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground gap-3">
            <Megaphone className="w-12 h-12 opacity-30" />
            <p className="font-medium">Hali e'lonlar yo'q</p>
            <p className="text-sm">E'lonlar bu yerda ko'rsatiladi</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {announcements.map(a => {
          const pcfg = PRIORITY_CONFIG[a.priority ?? "normal"];
          const PIcon = pcfg.icon;
          return (
            <Card key={a.id} className={`transition-all ${a.pinned ? "border-primary/40 bg-primary/5" : ""} ${pcfg.color}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {a.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                    <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                    {a.priority && a.priority !== "normal" && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${pcfg.badge}`}>
                        <PIcon className="w-3 h-3" />{pcfg.label}
                      </span>
                    )}
                    {a.role_filter && a.role_filter !== "all" && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {ROLE_FILTER_OPTIONS.find(o => o.value === a.role_filter)?.label ?? a.role_filter}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canPin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={a.pinned ? "Pinni olib tashlash" : "Pinlash"}
                        onClick={() => pinMutation.mutate({ id: a.id, pinned: !a.pinned })}>
                        <Pin className={`w-3.5 h-3.5 ${a.pinned ? "text-primary" : "text-muted-foreground"}`} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{a.author_name}</span>
                  <span>·</span>
                  <span>{timeAgo(a.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
