// Rozilik — qog'oz formada. Sahifa A4 rozilik varag'ini chop etish uchun tayyorlaydi.
// Maktab, sinf, o'quvchi va ota-ona ma'lumotlari qo'lda yoziladi (bo'sh chiziqlar).
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RulesBody } from "@/components/consent-gate";

const LINE = "border-b border-black flex-1 min-w-0 h-7";

function Field({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-3 py-2 text-[15px]">
      <span className="whitespace-nowrap font-semibold">{label}</span>
      <span className={LINE} />
    </div>
  );
}

export default function RozilikPage() {
  return (
    <div className="space-y-5 max-w-4xl">
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body * { visibility: hidden !important; }
          #rozilik-forma, #rozilik-forma * { visibility: visible !important; }
          #rozilik-forma { position: absolute; left: 0; top: 0; width: 100%; color: #000; background: #fff; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rozilik va qoidalar</h1>
          <p className="text-sm text-muted-foreground mt-1">Rozilik varag'i A4 qog'ozda chop etiladi va qo'lda to'ldiriladi.</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          A4 varaqni chop etish
        </Button>
      </div>

      <div id="rozilik-forma" className="rounded-xl border bg-white text-black p-8 space-y-5">
        <div className="text-center space-y-1">
          <div className="text-sm font-bold">TOSHLOQ TUMANI MAKTABGACHA VA MAKTAB TA'LIMI BO'LIMI</div>
          <div className="text-lg font-extrabold">ROZILIK VARAG'I</div>
          <div className="text-xs">(Face ID davomat tizimi va platforma qoidalari)</div>
        </div>

        <div className="space-y-1">
          <Field label="Maktab:" />
          <Field label="Sinf:" />
          <Field label="O'quvchining F.I.Sh.:" />
          <Field label="Ota-onaning (vakilning) F.I.Sh.:" />
          <Field label="Telefon:" />
        </div>

        <div className="text-sm space-y-3 pt-2">
          <p>Men yuqoridagi shaxsiy ma'lumotlar yozilgan o'quvchining Face ID davomat tizimida yuz ma'lumoti olinishiga va platforma qoidalariga roziman.</p>
          <p>Yuz ma'lumotidan faqat davomat uchun foydalaniladi, rasm saqlanmaydi, faqat raqamli iz saqlanadi. Roziligni istalgan vaqtda maktab rahbariyatiga yozma ravishda bekor qilish mumkin.</p>
        </div>

        <div className="space-y-1 pt-2">
          <div className="text-sm font-semibold">Platforma qoidalari:</div>
          <div className="text-xs">
            <RulesBody />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-8 text-sm">
          <div>
            <div className="border-b border-black h-8" />
            <div className="pt-1">Ota-ona (vakil) imzosi</div>
          </div>
          <div>
            <div className="border-b border-black h-8" />
            <div className="pt-1">O'quvchi imzosi</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-6 text-sm">
          <div>
            <div className="border-b border-black h-8" />
            <div className="pt-1">Sana: "____" ____________ 20___ y.</div>
          </div>
          <div>
            <div className="border-b border-black h-8" />
            <div className="pt-1">Maktab rahbari imzosi va muhri</div>
          </div>
        </div>
      </div>
    </div>
  );
}
