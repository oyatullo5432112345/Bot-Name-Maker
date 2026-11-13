// Matndan savollarni o'qib olish.
//
//   1. Savol matni
//   a) Variant
//   b) Variant
//   Javob: b          ← faqat testda (so'rovnomada kerak emas)
//
// Savollar bo'sh qator bilan yoki raqamli qator ("2.") bilan ajratiladi.
import { DIFFICULTY_TIME, newKey, type DraftQuestion } from "./api";

export type ImportMode = "survey" | "test-options" | "test-text";

const OPTION_RE = /^([a-hA-H])[.)]\s*(.+)$/;
const ANSWER_RE = /^(?:javob|javobi|to'g'ri|togri|ans|answer|correct)\s*[:\-]\s*(.+)$/i;

export function parseQuestions(text: string, mode: ImportMode): DraftQuestion[] {
  const blocks = text
    .replace(/\r/g, "")
    .trim()
    .split(/\n\s*\n+/)
    .flatMap((b) => b.split(/\n(?=\d+[.)]\s)/))
    .map((b) => b.trim())
    .filter(Boolean);

  const out: DraftQuestion[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    let question = lines[0]!.replace(/^\d+[.)]\s*/, "").trim();
    const options: string[] = [];
    let correctIndex = 0;
    let correctText = "";

    for (const line of lines.slice(1)) {
      const ans = line.match(ANSWER_RE);
      if (ans) {
        const val = ans[1]!.trim();
        if (mode === "test-options") {
          const idx = val.toLowerCase().charCodeAt(0) - 97;
          if (/^[a-h]\b/i.test(val) && idx >= 0) correctIndex = idx;
        } else if (mode === "test-text") {
          correctText = val;
        }
        continue;
      }
      const opt = line.match(OPTION_RE);
      if (opt && mode !== "test-text") options.push(opt[2]!.trim());
      else question += " " + line; // savol bir necha qatorda yozilgan bo'lsa
    }

    if (mode !== "test-text") {
      while (options.length < 2) options.push("");
    }
    out.push({
      key: newKey(),
      question,
      options: mode === "test-text" ? ["", ""] : options,
      correct_index: Math.min(correctIndex, Math.max(options.length - 1, 0)),
      correct_text: correctText,
      difficulty: "orta",
      customTime: false,
      time_seconds: DIFFICULTY_TIME.orta,
    });
  }
  return out;
}
