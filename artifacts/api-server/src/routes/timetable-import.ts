import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { getAuthUser } from "./auth.js";
import { enrichEntry } from "./timetable.js";

const router: IRouter = Router();

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

interface ParsedRow {
  class_name: string;
  day_of_week: number; // 1=Dushanba ... 6=Shanba
  period: number; // 1..8
  subject: string;
  teacher_full_name: string | null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// POST /api/timetable/import — admin dars jadvali rasmini/hujjatini yuboradi,
// Claude uni o'qib, jadvalni avtomatik to'ldiradi.
router.post("/timetable/import", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director", "zavuch", "zam_direktor"].includes(user["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY sozlanmagan. Serverga (.env) ANTHROPIC_API_KEY qo'shing, keyin qayta urinib ko'ring.",
    });
    return;
  }

  const { file_base64, media_type } = req.body as {
    file_base64?: string;
    media_type?: string;
  };

  if (!file_base64 || !media_type) {
    res.status(400).json({ error: "Fayl (rasm yoki PDF) yuborilmadi" });
    return;
  }

  const isPdf = media_type === "application/pdf";
  const isImage = media_type.startsWith("image/");
  if (!isPdf && !isImage) {
    res.status(400).json({ error: "Faqat rasm (JPG/PNG) yoki PDF qabul qilinadi" });
    return;
  }

  // Mavjud sinflar va xodimlar ro'yxatini olib, modelga moslashtirish uchun beramiz.
  const classes = await query<{ id: string; name: string }>("SELECT id, name FROM classes");
  const staff = await query<{ id: string; full_name: string; can_teach: boolean }>(
    "SELECT id, full_name, can_teach FROM staff WHERE can_teach = true"
  );

  const classNames = classes.map((c) => c.name).join(", ");
  const staffNames = staff.map((s) => s.full_name).join(", ");

  const systemPrompt =
    `Siz maktab dars jadvali rasmini/hujjatini o'qib, strukturaviy JSON ma'lumotga aylantiruvchi yordamchisiz. ` +
    `Faqat quyidagi formatdagi JSON massiv qaytaring, boshqa hech narsa yozmang (izoh, markdown belgilari kerak emas):\n` +
    `[{"class_name": "5-A", "day_of_week": 1, "subject": "Matematika", "period": 1, "teacher_full_name": "Aliyev Vali"}]\n\n` +
    `Qoidalar:\n` +
    `- day_of_week: 1=Dushanba, 2=Seshanba, 3=Chorshanba, 4=Payshanba, 5=Juma, 6=Shanba.\n` +
    `- period: kun ichidagi darsning tartib raqami (1 dan 8 gachа).\n` +
    `- class_name jadvaldagi sinf nomi bilan bir xil yozilishi kerak. Tizimda mavjud sinflar: ${classNames || "(hali yo'q)"}.\n` +
    `- teacher_full_name jadvalda ko'rsatilgan o'qituvchi F.I.Sh bo'lsin. Tizimda mavjud o'qituvchilar: ${staffNames || "(hali yo'q)"}. Agar mos keluvchi ismni aniq topolmasangiz, eng yaqinini yozing.\n` +
    `- Agar biror katakcha bo'sh yoki o'qib bo'lmasa, o'sha yozuvni tashlab keting.\n` +
    `- Rasmda nechta sinf va kun bo'lsa, hammasini to'liq chiqaring.`;

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              isPdf
                ? { type: "document", source: { type: "base64", media_type, data: file_base64 } }
                : { type: "image", source: { type: "base64", media_type, data: file_base64 } },
              { type: "text", text: "Ushbu dars jadvalini yuqoridagi qoidalarga ko'ra JSON massivga o'giring." },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      res.status(502).json({ error: `Claude API xatosi: ${errText.slice(0, 300)}` });
      return;
    }

    const aiData = (await aiRes.json()) as { content: { type: string; text?: string }[] };
    const textBlock = aiData.content.find((c) => c.type === "text")?.text ?? "";
    const cleaned = textBlock.replace(/```json|```/g, "").trim();

    let rows: ParsedRow[];
    try {
      rows = JSON.parse(cleaned) as ParsedRow[];
    } catch {
      res.status(502).json({ error: "Jadvalni o'qib bo'lmadi, rasm sifatini yaxshilab qayta urinib ko'ring" });
      return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(422).json({ error: "Rasmda jadval topilmadi" });
      return;
    }

    const classByName = new Map(classes.map((c) => [normalize(c.name), c.id]));
    const staffByName = new Map(staff.map((s) => [normalize(s.full_name), s.id]));

    const inserted: unknown[] = [];
    const unmatched: { row: ParsedRow; reason: string }[] = [];

    for (const row of rows) {
      if (!row.class_name || !row.subject || !row.day_of_week || !row.period) continue;
      const classId = classByName.get(normalize(row.class_name));
      if (!classId) {
        unmatched.push({ row, reason: `Sinf topilmadi: "${row.class_name}"` });
        continue;
      }
      if (row.day_of_week < 1 || row.day_of_week > 6 || row.period < 1 || row.period > 8) {
        unmatched.push({ row, reason: "Kun yoki dars raqami noto'g'ri" });
        continue;
      }

      let teacherId: string | null = null;
      if (row.teacher_full_name) {
        teacherId = staffByName.get(normalize(row.teacher_full_name)) ?? null;
        if (!teacherId) {
          unmatched.push({ row, reason: `O'qituvchi topilmadi: "${row.teacher_full_name}"` });
        }
      }

      try {
        const data = await queryOne<{
          id: string; class_id: string; day_of_week: number;
          period: number; subject: string; teacher_id: string | null; created_at: string;
        }>(
          `INSERT INTO timetable (class_id, day_of_week, period, subject, teacher_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (class_id, day_of_week, period)
           DO UPDATE SET subject = EXCLUDED.subject, teacher_id = EXCLUDED.teacher_id
           RETURNING *`,
          [classId, row.day_of_week, row.period, row.subject.trim(), teacherId]
        );
        if (data) inserted.push(await enrichEntry(data));
      } catch (err) {
        unmatched.push({ row, reason: (err as Error).message ?? "Saqlashda xatolik" });
      }
    }

    res.json({
      total_parsed: rows.length,
      saved: inserted.length,
      unmatched,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? "Kutilmagan xatolik" });
  }
});

export default router;
