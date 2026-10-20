// Elektron kutubxona — Maktab Olami o'yinidagi "Kutubxona" binosiga bog'langan.
//   O'quvchi: kitobni 10 kunga oladi, o'qiydi/tinglaydi, topshiradi, 10 savollik testdan o'tadi
//   (5 tadan ko'p to'g'ri → keyingi kitob ochiladi). Eng yaxshi kitobxon reytingi, xabar yuborish.
//   Kutubxonachi/rahbariyat: kitob qo'shadi (muqova/PDF/audio havolasi + parcha + 10 savol), xabarlarni ko'radi.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, BookOpen, Headphones, Trophy, Plus, X, Trash2, Send, MessageSquare, Lock, CheckCircle2, Clock, BookMarked, History, Building2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, API_BASE } from "@/lib/face";

// Havolasiz yuklangan PDF/audio — token bilan (brauzer yangi tabda ochganda header bo'lmaydi)
const fileUrl = (id: string, kind: "pdf" | "audio") => `${API_BASE}/elib/file/${id}/${kind}?t=${encodeURIComponent(localStorage.getItem("talim_auth_token") ?? "")}`;
const readDataUrl = (file: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("o'qilmadi")); r.readAsDataURL(file); });
async function fileToParts(file: File): Promise<{ mime: string; b64: string }> {
  const d = await readDataUrl(file); const c = d.indexOf(",");
  const meta = d.slice(0, c); const b64 = d.slice(c + 1);
  const mime = meta.slice(5, meta.indexOf(";")) || file.type;
  return { mime: mime || file.type, b64 };
}
const MAX_MB = 20;

const INK = "#0E1230", INK2 = "#161B3C", PANEL = "#1B2150", GOLD = "#E8B04B", CREAM = "#F3EEE2", TEAL = "#1EA896";

interface Borrow { id: string; borrowed_at: string; due_at: string; returned_at: string | null; quiz_passed: boolean; quiz_score: number }
interface Book {
  id: string; title: string; author: string; cover_url: string; pdf_url: string; audio_url: string;
  pdf_uploaded: boolean; audio_uploaded: boolean;
  excerpt: string; description: string; question_count: number; my_borrow: Borrow | null;
}
interface BooksResp { books: Book[]; locked: boolean; borrow_days: number; quiz_total: number; quiz_pass: number; can_manage: boolean }
interface QuizQ { i: number; q: string; options: string[] }
interface LbRow { rank: number; name: string; class_name: string; books: number; me: boolean }

const btn = (bg: string, color = INK): CSSProperties => ({ borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)", background: bg, color, cursor: "pointer" });
const daysLeft = (due: string) => Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);

export default function Kutubxona() {
  const { toast } = useToast();
  const [data, setData] = useState<BooksResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [audioFor, setAudioFor] = useState("");
  const [quizBook, setQuizBook] = useState<Book | null>(null);
  const [lbOpen, setLbOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);     // o'quvchi xabar yozadi
  const [inboxOpen, setInboxOpen] = useState(false); // kutubxonachi xabarlarni ko'radi
  const [myHistOpen, setMyHistOpen] = useState(false);   // o'quvchining o'qiganlari
  const [mgHistOpen, setMgHistOpen] = useState(false);   // rahbariyat: barcha tarix
  const [ovOpen, setOvOpen] = useState(false);           // umumiy ko'rinish (maktablar)

  const load = async () => { try { setData(await api<BooksResp>("/elib/books")); } catch (e) { toast({ variant: "destructive", title: "Xatolik", description: (e as Error).message }); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []); // eslint-disable-line

  const borrow = async (b: Book) => {
    setBusy(b.id);
    try { await api("/elib/borrow", { method: "POST", body: JSON.stringify({ book_id: b.id }) }); toast({ title: "Olindi!", description: `${data?.borrow_days} kun muddatga berildi` }); await load(); }
    catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(""); }
  };
  const giveBack = async (b: Book) => {
    if (!b.my_borrow) return;
    setBusy(b.id);
    try { await api("/elib/return", { method: "POST", body: JSON.stringify({ borrow_id: b.my_borrow.id }) }); toast({ title: "Topshirildi" }); await load(); }
    catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(""); }
  };
  const del = async (b: Book) => {
    if (!confirm(`"${b.title}" o'chirilsinmi?`)) return;
    setBusy(b.id);
    try { await api(`/elib/books/${b.id}`, { method: "DELETE" }); await load(); }
    catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(""); }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, #241B4A 0%, ${INK2} 42%, ${INK} 100%)`, color: CREAM }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 48px" }}>
        {/* Yuqori panel */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Link href="/oyin" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(243,238,226,0.7)", fontSize: 14 }}><ArrowLeft size={18} /> Shaharcha</Link>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setLbOpen(true)} style={btn(PANEL, CREAM)}><Trophy size={14} color={GOLD} style={{ verticalAlign: "-2px" }} /> Reyting</button>
            <button onClick={() => setMyHistOpen(true)} style={btn(PANEL, CREAM)}><BookMarked size={14} style={{ verticalAlign: "-2px" }} /> O'qiganlarim</button>
            {data?.can_manage
              ? <><button onClick={() => setOvOpen(true)} style={btn(PANEL, CREAM)}><Building2 size={14} style={{ verticalAlign: "-2px" }} /> Umumiy</button>
                  <button onClick={() => setMgHistOpen(true)} style={btn(PANEL, CREAM)}><History size={14} style={{ verticalAlign: "-2px" }} /> Tarix</button>
                  <button onClick={() => setInboxOpen(true)} style={btn(PANEL, CREAM)}><MessageSquare size={14} style={{ verticalAlign: "-2px" }} /></button>
                  <button onClick={() => setAddOpen(true)} style={btn(`linear-gradient(135deg, ${TEAL}, ${GOLD})`)}><Plus size={14} style={{ verticalAlign: "-2px" }} /> Kitob</button></>
              : <button onClick={() => setMsgOpen(true)} style={btn(PANEL, CREAM)}><Send size={14} style={{ verticalAlign: "-2px" }} /> Xabar</button>}
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Maktab Kutubxonasi</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(243,238,226,0.6)" }}>Kitob o'qish mutlaqo bepul · 10 kunga ol · o'qi yoki tingla · testdan o't · keyingisini och</p>
        </div>

        {data?.locked && (
          <div style={{ marginTop: 10, borderRadius: 12, padding: "10px 14px", background: "rgba(232,176,75,0.12)", border: `1px solid ${GOLD}44`, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={15} color={GOLD} /> Sizda tugatilmagan kitob bor — testdan o'tsangiz yangisini olasiz.
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        ) : !data || data.books.length === 0 ? (
          <div style={{ textAlign: "center", padding: 50, color: "rgba(243,238,226,0.55)" }}>
            <BookOpen size={40} color={GOLD} style={{ opacity: 0.5 }} />
            <p style={{ marginTop: 10 }}>Hali kitob yo'q.{data?.can_manage ? " \"Kitob\" tugmasi orqali qo'shing." : ""}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginTop: 14 }}>
            {data.books.map((b) => {
              const mb = b.my_borrow;
              const active = mb && !mb.quiz_passed;
              const passed = mb?.quiz_passed;
              const dl = mb ? daysLeft(mb.due_at) : 0;
              const pdfHref = b.pdf_url || (b.pdf_uploaded ? fileUrl(b.id, "pdf") : "");
              const audioSrc = b.audio_url || (b.audio_uploaded ? fileUrl(b.id, "audio") : "");
              return (
                <div key={b.id} style={{ borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
                  {/* Muqova */}
                  <div style={{ position: "relative", aspectRatio: "3/4", background: `linear-gradient(135deg, ${PANEL}, ${INK})`, display: "grid", placeItems: "center", overflow: "hidden" }}>
                    {b.cover_url
                      ? <img src={b.cover_url} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      : <BookOpen size={34} color={GOLD} style={{ opacity: 0.6 }} />}
                    {passed && <span style={{ position: "absolute", top: 6, right: 6, background: TEAL, color: INK, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 7px" }}>✓ O'qilgan</span>}
                    {active && <span style={{ position: "absolute", top: 6, right: 6, background: GOLD, color: INK, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 3 }}><Clock size={10} /> {dl > 0 ? `${dl} kun` : "muddati o'tgan"}</span>}
                    {data.can_manage && <button onClick={() => void del(b)} style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 8, padding: 5, cursor: "pointer" }}><Trash2 size={13} color="#F08A8A" /></button>}
                  </div>
                  {/* Ma'lumot */}
                  <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25 }}>{b.title}</div>
                    {b.author && <div style={{ fontSize: 11.5, color: "rgba(243,238,226,0.55)" }}>{b.author}</div>}
                    {b.excerpt && <div style={{ fontSize: 11, color: "rgba(243,238,226,0.5)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.excerpt}</div>}
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                      {!mb ? (
                        <button onClick={() => void borrow(b)} disabled={!!busy || data.locked} style={{ ...btn(data.locked ? "rgba(255,255,255,0.07)" : `linear-gradient(135deg, ${TEAL}, ${GOLD})`, data.locked ? "rgba(243,238,226,0.5)" : INK), cursor: data.locked ? "not-allowed" : "pointer" }}>
                          {busy === b.id ? "…" : data.locked ? "Qulf" : `Bepul olish · ${data.borrow_days} kun`}
                        </button>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 6 }}>
                            {pdfHref && <a href={pdfHref} target="_blank" rel="noreferrer" style={{ ...btn("rgba(255,255,255,0.08)", CREAM), flex: 1, textAlign: "center", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}><BookOpen size={13} /> O'qish</a>}
                            {audioSrc && <button onClick={() => setAudioFor(audioFor === b.id ? "" : b.id)} style={{ ...btn("rgba(255,255,255,0.08)", CREAM), flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Headphones size={13} /> Audio</button>}
                          </div>
                          {audioFor === b.id && audioSrc && <audio controls autoPlay src={audioSrc} style={{ width: "100%", height: 34 }} />}
                          {!passed && b.question_count > 0 && <button onClick={() => setQuizBook(b)} style={btn(`linear-gradient(135deg, ${GOLD}, #D97706)`)}>Test ({b.question_count} savol)</button>}
                          {!mb.returned_at && <button onClick={() => void giveBack(b)} disabled={!!busy} style={btn("rgba(255,255,255,0.06)", "rgba(243,238,226,0.8)")}>{busy === b.id ? "…" : "Topshirish"}</button>}
                          {passed && <span style={{ fontSize: 12, color: TEAL, fontWeight: 600, textAlign: "center" }}><CheckCircle2 size={13} style={{ verticalAlign: "-2px" }} /> Testdan o'tdingiz</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {quizBook && <QuizModal book={quizBook} onClose={() => setQuizBook(null)} onDone={() => { setQuizBook(null); void load(); }} />}
      {lbOpen && <LeaderboardModal onClose={() => setLbOpen(false)} />}
      {addOpen && <AddBookModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); void load(); }} />}
      {msgOpen && <MessageModal onClose={() => setMsgOpen(false)} />}
      {inboxOpen && <InboxModal onClose={() => setInboxOpen(false)} />}
      {myHistOpen && <MyHistoryModal onClose={() => setMyHistOpen(false)} />}
      {mgHistOpen && <ManageHistoryModal onClose={() => setMgHistOpen(false)} />}
      {ovOpen && <OverviewModal onClose={() => setOvOpen(false)} />}
    </div>
  );
}

// ─── Statusni rangli yorliqqa aylantirish ───────────────────────────────────────
function statusChip(h: { quiz_passed: boolean; quiz_score: number; returned_at: string | null }): { text: string; color: string } {
  if (h.quiz_passed) return { text: `✓ Test o'tdi${h.quiz_score >= 0 ? ` (${h.quiz_score}/10)` : ""}`, color: TEAL };
  if (h.returned_at) return { text: "Topshirilgan", color: "rgba(243,238,226,0.55)" };
  return { text: "O'qilmoqda", color: GOLD };
}

// ─── O'quvchining o'zi o'qigan kitoblari ─────────────────────────────────────────
interface HistRow { id: string; title: string; author: string; cover_url: string; borrowed_at: string; returned_at: string | null; quiz_passed: boolean; quiz_score: number }
function MyHistoryModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<HistRow[] | null>(null);
  useEffect(() => { void (async () => { try { setRows(await api<HistRow[]>("/elib/my-history")); } catch { setRows([]); } })(); }, []);
  return (
    <Shell title="O'qigan kitoblarim" onClose={onClose}>
      {!rows ? <div style={{ display: "grid", placeItems: "center", padding: 30 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        : rows.length === 0 ? <p style={{ textAlign: "center", color: "rgba(243,238,226,0.6)" }}>Hali kitob olmagansiz.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((h) => { const s = statusChip(h); return (
              <div key={h.id} style={{ display: "flex", gap: 10, padding: 8, borderRadius: 12, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 40, height: 54, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: INK, display: "grid", placeItems: "center" }}>
                  {h.cover_url ? <img src={h.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : <BookOpen size={16} color={GOLD} style={{ opacity: 0.6 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{h.title}</div>
                  {h.author && <div style={{ fontSize: 11.5, color: "rgba(243,238,226,0.55)" }}>{h.author}</div>}
                  <div style={{ fontSize: 11.5, marginTop: 3 }}><span style={{ color: s.color, fontWeight: 600 }}>{s.text}</span> <span style={{ color: "rgba(243,238,226,0.4)" }}>· {String(h.borrowed_at).slice(0, 10)}</span></div>
                </div>
              </div>
            ); })}
          </div>}
    </Shell>
  );
}

// ─── Umumiy ko'rinish: har maktabdan kitoblar + sinflar qancha o'qigani (super-admin) ──
interface OvSchool { maktab_id: number; maktab_nom: string; book_count: number; borrow_count: number; passed_count: number; classes: { class_name: string; total: number; passed: number }[] }
function OverviewModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ schools: OvSchool[]; is_admin: boolean } | null>(null);
  useEffect(() => { void (async () => { try { setData(await api<{ schools: OvSchool[]; is_admin: boolean }>("/elib/overview")); } catch { setData({ schools: [], is_admin: false }); } })(); }, []);
  return (
    <Shell title="Umumiy ko'rinish" onClose={onClose} wide>
      {!data ? <div style={{ display: "grid", placeItems: "center", padding: 30 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        : data.schools.length === 0 ? <p style={{ textAlign: "center", color: "rgba(243,238,226,0.6)" }}>Hali kitob yoki o'qish yo'q.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.schools.map((s) => (
              <div key={s.maktab_id} style={{ borderRadius: 14, padding: 12, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>🏫 {s.maktab_nom}</div>
                  <div style={{ fontSize: 12, color: "rgba(243,238,226,0.6)" }}>📚 {s.book_count} kitob · ✓ {s.passed_count} o'qilgan</div>
                </div>
                {s.classes.length === 0 ? <div style={{ fontSize: 12, color: "rgba(243,238,226,0.45)" }}>Hali hech kim o'qimagan</div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6 }}>
                      {s.classes.map((c, ci) => (
                        <div key={ci} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.class_name}</span>
                          <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{c.passed}<span style={{ color: "rgba(243,238,226,0.4)", fontWeight: 400 }}>/{c.total}</span></span>
                        </div>
                      ))}
                    </div>}
              </div>
            ))}
            <p style={{ fontSize: 11.5, color: "rgba(243,238,226,0.45)", margin: 0 }}>Har sinfda: testdan o'tgan (o'qilgan) / jami olingan kitoblar.</p>
          </div>}
    </Shell>
  );
}

// ─── Rahbariyat: barcha o'quvchilar o'qigan kitoblari (o'quvchi bo'yicha guruhlab) ──
interface MgRow { student_login: string; student_name: string; class_name: string; title: string; author: string; borrowed_at: string; returned_at: string | null; quiz_passed: boolean; quiz_score: number }
function ManageHistoryModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<MgRow[] | null>(null);
  useEffect(() => { void (async () => { try { setRows(await api<MgRow[]>("/elib/history")); } catch { setRows([]); } })(); }, []);
  const groups = (() => {
    if (!rows) return null;
    const m = new Map<string, { name: string; cls: string; items: MgRow[] }>();
    for (const r of rows) {
      const g = m.get(r.student_login) ?? { name: r.student_name || "O'quvchi", cls: r.class_name, items: [] };
      g.items.push(r); m.set(r.student_login, g);
    }
    return Array.from(m.values()).sort((a, b) => b.items.length - a.items.length);
  })();
  return (
    <Shell title="O'quvchilar o'qigan kitoblar" onClose={onClose} wide>
      {!groups ? <div style={{ display: "grid", placeItems: "center", padding: 30 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        : groups.length === 0 ? <p style={{ textAlign: "center", color: "rgba(243,238,226,0.6)" }}>Hali hech kim kitob olmagan.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {groups.map((g, gi) => (
              <div key={gi}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{g.name} <span style={{ fontWeight: 400, fontSize: 12, color: "rgba(243,238,226,0.5)" }}>· {g.cls}</span></div>
                  <span style={{ fontSize: 11.5, color: GOLD }}>{g.items.filter((x) => x.quiz_passed).length} ta o'qigan</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {g.items.map((r, ri) => { const s = statusChip(r); return (
                    <div key={ri} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 12.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                      <span style={{ fontSize: 11, color: s.color, fontWeight: 600, flexShrink: 0 }}>{s.text}</span>
                    </div>
                  ); })}
                </div>
              </div>
            ))}
          </div>}
    </Shell>
  );
}

// ─── Modal qobig'i ─────────────────────────────────────────────────────────────
function Shell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", padding: 16, zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: PANEL, borderRadius: 20, padding: 18, width: "100%", maxWidth: wide ? 560 : 420, maxHeight: "88vh", overflowY: "auto", border: `1px solid ${GOLD}33`, color: CREAM }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <b style={{ fontSize: 17 }}>{title}</b>
          <button onClick={onClose} style={{ background: "none", border: "none", color: CREAM, cursor: "pointer" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Test ───────────────────────────────────────────────────────────────────────
function QuizModal({ book, onClose, onDone }: { book: Book; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [qs, setQs] = useState<QuizQ[] | null>(null);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; reward: number } | null>(null);
  useEffect(() => { void (async () => { try { const r = await api<{ questions: QuizQ[] }>(`/elib/quiz/${book.id}`); setQs(r.questions); } catch { setQs([]); } })(); }, [book.id]);

  const submit = async () => {
    if (!qs) return;
    const answers = qs.map((q) => ans[q.i] ?? -1);
    setBusy(true);
    try { const r = await api<{ score: number; total: number; passed: boolean; reward: number }>("/elib/quiz", { method: "POST", body: JSON.stringify({ book_id: book.id, answers }) }); setResult(r); if (r.reward > 0) toast({ title: `+${r.reward} 🪙`, description: "Kitobxonlik mukofoti!" }); }
    catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(false); }
  };

  return (
    <Shell title={`Test — ${book.title}`} onClose={onClose} wide>
      {!qs ? <div style={{ display: "grid", placeItems: "center", padding: 30 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        : result ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 44 }}>{result.passed ? "🎉" : "📖"}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{result.score} / {result.total}</div>
            <p style={{ color: result.passed ? TEAL : "rgba(243,238,226,0.7)", fontWeight: 600, marginTop: 4 }}>
              {result.passed ? "Tabriklaymiz — testdan o'tdingiz! Keyingi kitob ochildi." : "5 tadan ko'p to'g'ri javob kerak. Kitobni qayta o'qib, yana urinib ko'ring."}
            </p>
            <button onClick={onDone} style={{ ...btn(`linear-gradient(135deg, ${TEAL}, ${GOLD})`), marginTop: 14, width: "100%" }}>Yopish</button>
          </div>
        ) : qs.length === 0 ? <p style={{ textAlign: "center", color: "rgba(243,238,226,0.6)" }}>Bu kitobda test yo'q.</p>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {qs.map((q, n) => (
              <div key={q.i}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{n + 1}. {q.q}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.options.map((o, oi) => {
                    const on = ans[q.i] === oi;
                    return <button key={oi} onClick={() => setAns({ ...ans, [q.i]: oi })} style={{ textAlign: "left", borderRadius: 10, padding: "8px 12px", fontSize: 13, cursor: "pointer", color: CREAM, background: on ? `${GOLD}22` : "rgba(0,0,0,0.25)", border: on ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.1)" }}>{o}</button>;
                  })}
                </div>
              </div>
            ))}
            <button onClick={() => void submit()} disabled={busy || Object.keys(ans).length < qs.length} style={{ ...btn(`linear-gradient(135deg, ${GOLD}, #D97706)`), width: "100%", opacity: Object.keys(ans).length < qs.length ? 0.5 : 1 }}>
              {busy ? "…" : `Testni topshirish (${Object.keys(ans).length}/${qs.length})`}
            </button>
          </div>
        )}
    </Shell>
  );
}

// ─── Reyting (eng yaxshi kitobxon) ──────────────────────────────────────────────
function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<LbRow[] | null>(null);
  useEffect(() => { void (async () => { try { setRows(await api<LbRow[]>("/elib/leaderboard")); } catch { setRows([]); } })(); }, []);
  return (
    <Shell title="Eng yaxshi kitobxonlar" onClose={onClose}>
      {!rows ? <div style={{ display: "grid", placeItems: "center", padding: 30 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        : rows.length === 0 ? <p style={{ textAlign: "center", color: "rgba(243,238,226,0.6)" }}>Hali hech kim testdan o'tmagan.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: r.me ? `${GOLD}1f` : "rgba(0,0,0,0.22)", border: r.me ? `1px solid ${GOLD}66` : "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ width: 24, fontWeight: 800, color: r.rank <= 3 ? GOLD : "rgba(243,238,226,0.6)" }}>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name || "O'quvchi"}</div><div style={{ fontSize: 11, color: "rgba(243,238,226,0.5)" }}>{r.class_name}</div></div>
                <span style={{ fontWeight: 800, color: GOLD }}>{r.books} <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(243,238,226,0.55)" }}>kitob</span></span>
              </div>
            ))}
          </div>}
    </Shell>
  );
}

// ─── Xabar yuborish (o'quvchi) ──────────────────────────────────────────────────
function MessageModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (body.trim().length < 2) return;
    setBusy(true);
    try { await api("/elib/message", { method: "POST", body: JSON.stringify({ body }) }); toast({ title: "Yuborildi", description: "Kutubxonachi xabaringizni ko'radi" }); onClose(); }
    catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Kutubxonachiga xabar" onClose={onClose}>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Qaysi kitobni so'ramoqchisiz yoki savolingiz..." style={{ width: "100%", borderRadius: 10, padding: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.12)", color: CREAM, fontSize: 14, resize: "vertical" }} />
      <button onClick={() => void send()} disabled={busy || body.trim().length < 2} style={{ ...btn(`linear-gradient(135deg, ${TEAL}, ${GOLD})`), width: "100%", marginTop: 10, opacity: body.trim().length < 2 ? 0.5 : 1 }}>{busy ? "…" : "Yuborish"}</button>
    </Shell>
  );
}

// ─── Xabarlar qutisi (kutubxonachi) ─────────────────────────────────────────────
function InboxModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  useEffect(() => { void (async () => { try { setRows(await api<Record<string, string>[]>("/elib/messages")); } catch { setRows([]); } })(); }, []);
  return (
    <Shell title="O'quvchilar xabarlari" onClose={onClose}>
      {!rows ? <div style={{ display: "grid", placeItems: "center", padding: 30 }}><Loader2 className="animate-spin" color={GOLD} /></div>
        : rows.length === 0 ? <p style={{ textAlign: "center", color: "rgba(243,238,226,0.6)" }}>Xabar yo'q.</p>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((m) => (
              <div key={m.id} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.from_name || "O'quvchi"} <span style={{ fontWeight: 400, color: "rgba(243,238,226,0.5)" }}>· {m.class_name}</span></div>
                <div style={{ fontSize: 13, marginTop: 3, color: "rgba(243,238,226,0.85)" }}>{m.body}</div>
                <div style={{ fontSize: 10.5, color: "rgba(243,238,226,0.4)", marginTop: 4 }}>{String(m.created_at).slice(0, 16).replace("T", " ")}</div>
              </div>
            ))}
          </div>}
    </Shell>
  );
}

// ─── Kitob qo'shish (kutubxonachi) ──────────────────────────────────────────────
interface QDraft { q: string; options: string[]; correct: number }
function AddBookModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [f, setF] = useState({ title: "", author: "", cover_url: "", pdf_url: "", audio_url: "", excerpt: "", description: "" });
  const [coverData, setCoverData] = useState("");            // yuklangan muqova (data-URL)
  const [coverName, setCoverName] = useState("");
  const [pdfFile, setPdfFile] = useState<{ mime: string; b64: string } | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [audioFile, setAudioFile] = useState<{ mime: string; b64: string } | null>(null);
  const [audioName, setAudioName] = useState("");
  const [qs, setQs] = useState<QDraft[]>(Array.from({ length: 10 }, () => ({ q: "", options: ["", "", "", ""], correct: 0 })));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setQ = (i: number, patch: Partial<QDraft>) => setQs((p) => p.map((q, n) => n === i ? { ...q, ...patch } : q));
  const setOpt = (i: number, oi: number, v: string) => setQs((p) => p.map((q, n) => n === i ? { ...q, options: q.options.map((o, k) => k === oi ? v : o) } : q));

  const pick = async (file: File | null, kind: "cover" | "pdf" | "audio") => {
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) { toast({ variant: "destructive", title: "Fayl juda katta", description: `Eng ko'pi ${MAX_MB} MB` }); return; }
    try {
      if (kind === "cover") { setCoverData(await readDataUrl(file)); setCoverName(file.name); }
      else { const parts = await fileToParts(file); if (kind === "pdf") { setPdfFile(parts); setPdfName(file.name); } else { setAudioFile(parts); setAudioName(file.name); } }
    } catch { toast({ variant: "destructive", title: "Faylni o'qib bo'lmadi" }); }
  };

  const save = async () => {
    if (!f.title.trim()) { toast({ variant: "destructive", title: "Sarlavha kerak" }); return; }
    const questions = qs.filter((q) => q.q.trim() && q.options.every((o) => o.trim()));
    setBusy(true);
    try {
      await api("/elib/books", { method: "POST", body: JSON.stringify({
        ...f, cover_url: coverData || f.cover_url,
        pdf_data: pdfFile ?? undefined, audio_data: audioFile ?? undefined, questions,
      }) });
      toast({ title: "Kitob qo'shildi", description: `${questions.length} ta savol bilan` }); onDone();
    }
    catch (e) { toast({ variant: "destructive", title: "Bo'lmadi", description: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const inp: CSSProperties = { width: "100%", borderRadius: 9, padding: "8px 10px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.12)", color: CREAM, fontSize: 13, marginBottom: 8 };
  const fileBtn: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 9, padding: "8px 12px", background: "rgba(30,168,150,0.15)", border: `1px dashed ${TEAL}88`, color: CREAM, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" };
  return (
    <Shell title="Yangi kitob" onClose={onClose} wide>
      <input style={inp} placeholder="Kitob nomi *" value={f.title} onChange={(e) => set("title", e.target.value)} />
      <input style={inp} placeholder="Muallif" value={f.author} onChange={(e) => set("author", e.target.value)} />

      {/* Muqova rasmi — fayldan yuklash (havolasiz) yoki havola */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {coverData && <img src={coverData} alt="" style={{ width: 40, height: 54, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
        <label style={fileBtn}><Upload size={14} /> {coverName || "Muqova rasmini yuklash"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void pick(e.target.files?.[0] ?? null, "cover")} /></label>
      </div>

      {/* PDF — fayl yoki havola (ixtiyoriy) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <label style={fileBtn}><Upload size={14} /> {pdfName || "PDF yuklash"}
          <input type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={(e) => void pick(e.target.files?.[0] ?? null, "pdf")} /></label>
        <span style={{ fontSize: 11, color: "rgba(243,238,226,0.4)" }}>yoki</span>
        <input style={{ ...inp, marginBottom: 0, flex: 1, minWidth: 140 }} placeholder="PDF havolasi (ixtiyoriy)" value={f.pdf_url} onChange={(e) => set("pdf_url", e.target.value)} />
      </div>

      {/* Audio — fayl yoki havola (ixtiyoriy) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <label style={fileBtn}><Upload size={14} /> {audioName || "Audio yuklash"}
          <input type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => void pick(e.target.files?.[0] ?? null, "audio")} /></label>
        <span style={{ fontSize: 11, color: "rgba(243,238,226,0.4)" }}>yoki</span>
        <input style={{ ...inp, marginBottom: 0, flex: 1, minWidth: 140 }} placeholder="Audio havolasi (ixtiyoriy)" value={f.audio_url} onChange={(e) => set("audio_url", e.target.value)} />
      </div>

      <textarea style={{ ...inp, resize: "vertical" }} rows={2} placeholder="Parcha (kitobdan qisqa ko'chirma)" value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      <p style={{ fontSize: 11.5, color: "rgba(243,238,226,0.5)", margin: "2px 0 8px" }}>PDF va audio <b>ixtiyoriy</b> — bo'lmasa, qo'shmang. Fayl eng ko'pi {MAX_MB} MB. Test savollarida to'g'ri javobni yashil doira bilan belgilang.</p>

      <div style={{ fontSize: 13, fontWeight: 700, margin: "6px 0 8px", color: GOLD }}>Test savollari (10 tagacha) — kerakligicha to'ldiring</div>
      {qs.map((q, i) => (
        <div key={i} style={{ borderRadius: 12, padding: 10, marginBottom: 8, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <input style={{ ...inp, marginBottom: 6 }} placeholder={`${i + 1}-savol`} value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} />
          {q.options.map((o, oi) => (
            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <button onClick={() => setQ(i, { correct: oi })} title="To'g'ri javob" style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, cursor: "pointer", border: q.correct === oi ? `2px solid ${TEAL}` : "1px solid rgba(255,255,255,0.25)", background: q.correct === oi ? TEAL : "transparent" }} />
              <input style={{ ...inp, marginBottom: 0 }} placeholder={`Variant ${oi + 1}${q.correct === oi ? " (to'g'ri)" : ""}`} value={o} onChange={(e) => setOpt(i, oi, e.target.value)} />
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => void save()} disabled={busy} style={{ ...btn(`linear-gradient(135deg, ${TEAL}, ${GOLD})`), width: "100%", marginTop: 4 }}>{busy ? "…" : "Kitobni saqlash"}</button>
    </Shell>
  );
}
