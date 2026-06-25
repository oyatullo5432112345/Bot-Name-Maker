import { useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { useListStudents } from "@workspace/api-client-react";
import { useAuth } from "@/lib/use-auth";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download } from "lucide-react";
import { Link } from "wouter";

const SCHOOL_NAME = "Toshloq tumani 3-maktab";
const SCHOOL_FULL = "Farg'ona viloyati Toshloq tumani\n3-umumta'lim maktabi";
const ACADEMIC_YEAR = "2025–2026 o'quv yili";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function IdCardFront({
  full_name,
  class_name,
  login,
  id,
}: {
  full_name: string;
  class_name: string;
  login: string;
  id: string;
}) {
  const initials = getInitials(full_name);

  return (
    <div
      className="id-card-front"
      style={{
        width: 340,
        height: 214,
        borderRadius: 14,
        overflow: "hidden",
        background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)",
        boxShadow: "0 8px 32px rgba(30,58,138,0.35)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: "absolute", width: 140, height: 140, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)", top: -40, right: -30,
      }} />
      <div style={{
        position: "absolute", width: 80, height: 80, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)", bottom: 20, left: -20,
      }} />

      {/* Header */}
      <div style={{
        padding: "12px 16px 8px",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        zIndex: 1,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: "white",
          border: "1px solid rgba(255,255,255,0.3)",
        }}>T</div>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>
            {SCHOOL_NAME}
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, lineHeight: 1.3 }}>
            O'QUVCHI GUVOHNOMASI · {ACADEMIC_YEAR}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        gap: 14, padding: "10px 16px", zIndex: 1,
      }}>
        {/* Avatar */}
        <div style={{
          width: 70, height: 70, borderRadius: 12,
          background: "rgba(255,255,255,0.2)",
          border: "2px solid rgba(255,255,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ color: "white", fontSize: 22, fontWeight: 800 }}>{initials}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "white", fontWeight: 800, fontSize: 15,
            lineHeight: 1.3, marginBottom: 6,
            whiteSpace: "normal", wordBreak: "break-word",
          }}>
            {full_name}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 6, padding: "2px 8px",
            marginBottom: 6,
          }}>
            <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>
              {class_name} sinf
            </span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
            Login: <span style={{ color: "white", fontFamily: "monospace", fontWeight: 600 }}>{login}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, marginTop: 2 }}>
            ID: {id}
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div style={{
        height: 6,
        background: "linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)",
        zIndex: 1,
      }} />
    </div>
  );
}

function IdCardBack({
  full_name,
  class_name,
  login,
}: {
  full_name: string;
  class_name: string;
  login: string;
}) {
  const qrValue = `Talim Platform\nO'quvchi: ${full_name}\nSinf: ${class_name}\nLogin: ${login}`;

  return (
    <div
      className="id-card-back"
      style={{
        width: 340,
        height: 214,
        borderRadius: 14,
        overflow: "hidden",
        background: "#f8faff",
        border: "2px solid #e0e7ff",
        boxShadow: "0 8px 32px rgba(30,58,138,0.12)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 20,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
      }}
    >
      {/* Top blue strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 6,
        background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 6,
        background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
      }} />

      {/* QR code */}
      <div style={{
        padding: 8, background: "white",
        borderRadius: 10, border: "1px solid #e0e7ff",
        boxShadow: "0 2px 8px rgba(30,58,138,0.08)",
        flexShrink: 0,
      }}>
        <QRCodeSVG value={qrValue} size={100} level="M" />
      </div>

      {/* Right info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#1e3a8a", marginBottom: 8 }}>
          {SCHOOL_NAME}
        </div>
        <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.8, whiteSpace: "pre-line" }}>
          {SCHOOL_FULL}
        </div>
        <div style={{ marginTop: 10, fontSize: 9, color: "#94a3b8" }}>
          Ushbu guvohnoma faqat o'quvchining maktab
          ichidagi shaxsini tasdiqlovchi hujjat hisoblanadi.
        </div>
        <div style={{
          marginTop: 8, fontSize: 9, color: "#1e3a8a",
          fontWeight: 600, letterSpacing: "0.05em",
        }}>
          {ACADEMIC_YEAR}
        </div>
      </div>
    </div>
  );
}

export default function StudentIdCard() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const studentIdParam = params.get("id");
  const [, navigate] = useLocation();

  const isStudent = user?.role === "student";

  const { data: students, isLoading } = useListStudents(
    {},
    { query: { staleTime: 60_000 } }
  );

  type StudentRow = { telegram_id: number | string | null; full_name: string; class_name: string; login: string; password: string; phone_number: string };
  const student = isStudent
    ? (students as StudentRow[] | undefined)?.find((s) => String(s.telegram_id) === String(user?.telegram_id))
    : (students as StudentRow[] | undefined)?.find((s) => String(s.telegram_id) === studentIdParam);

  useEffect(() => {
    if (!isLoading && !isStudent && !studentIdParam) {
      navigate("/students");
    }
  }, [isLoading, isStudent, studentIdParam, navigate]);

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <p className="text-muted-foreground">O'quvchi topilmadi</p>
        <Button variant="outline" asChild>
          <Link href="/students"><ArrowLeft className="w-4 h-4 mr-2" />Orqaga</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print-only styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { 
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 24px !important;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 no-print">
          {!isStudent && (
            <Button variant="outline" size="icon" asChild>
              <Link href="/students"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">O'quvchi ID Karta</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{student.full_name}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Chop etish
            </Button>
          </div>
        </div>

        {/* Cards */}
        <div className="print-area">
          <div className="flex flex-col items-center gap-6">
            {/* Labels */}
            <div className="flex flex-col items-center gap-2 no-print">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Oldingi tomon
              </p>
            </div>

            <IdCardFront
              full_name={student.full_name}
              class_name={student.class_name}
              login={student.login}
              id={String(student.telegram_id)}
            />

            <div className="flex items-center gap-3 no-print">
              <div className="h-px bg-border flex-1 w-20" />
              <span className="text-xs text-muted-foreground">· orqa tomon ·</span>
              <div className="h-px bg-border flex-1 w-20" />
            </div>

            <IdCardBack
              full_name={student.full_name}
              class_name={student.class_name}
              login={student.login}
            />

            {/* Hint */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground no-print bg-muted/50 rounded-lg px-4 py-2.5 border">
              <Download className="w-3.5 h-3.5" />
              <span>
                Kartani chop etish uchun yuqoridagi <strong>"Chop etish"</strong> tugmasini bosing.
                Chiroyli bo'lishi uchun <em>A4 o'rniga ID karta o'lchamini</em> tanlang.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
