import { Router, type IRouter } from "express";
import { supabase } from "../lib/supabase.js";
import { getAuthUser } from "./auth.js";
import { generateCertificatePNG, generateCertificateSVG, todayUzDate } from "../lib/certificate-generator.js";

const router: IRouter = Router();

async function buildCertParams(role: string, login: string, fullName: string, classNameFromToken?: string) {
  const date = todayUzDate();
  let className: string | undefined;
  let subjects: string[] | undefined;

  if (role === "student") {
    className = classNameFromToken;
    if (!className) {
      const { data } = await supabase
        .from("users")
        .select("class_name")
        .eq("login", login)
        .maybeSingle();
      className = (data as { class_name?: string } | null)?.class_name;
    }
  } else {
    const { data } = await supabase
      .from("staff")
      .select("subjects")
      .eq("login", login)
      .maybeSingle();
    subjects = (data as { subjects?: string[] | null } | null)?.subjects ?? [];
  }

  return { fullName, role, className, subjects, date };
}

// GET /api/certificate — PNG (joriy foydalanuvchi)
router.get("/certificate", async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: "Avtorizatsiya talab etiladi" });
    return;
  }

  const role = user["role"] as string;
  const login = user["login"] as string;
  const fullName = user["full_name"] as string;
  const classNameFromToken = user["class_name"] as string | undefined;

  try {
    const params = await buildCertParams(role, login, fullName, classNameFromToken);
    const fmt = (req.query["format"] as string) ?? "png";

    if (fmt === "svg") {
      res.set("Content-Type", "image/svg+xml");
      res.set("Content-Disposition", `inline; filename="sertifikat-${login}.svg"`);
      res.send(generateCertificateSVG(params));
      return;
    }

    const png = await generateCertificatePNG(params);
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="sertifikat-${login}.png"`);
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: "Sertifikat yaratishda xatolik", details: String(err) });
  }
});

// GET /api/certificate/:userId — admin uchun istalgan foydalanuvchi
router.get("/certificate/:userId", async (req, res): Promise<void> => {
  const admin = getAuthUser(req.headers.authorization);
  if (!admin || !["admin", "director"].includes(admin["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { userId } = req.params as { userId: string };

  // Avval staff dan qidirish
  const { data: staffData } = await supabase
    .from("staff")
    .select("full_name, role, login, subjects")
    .eq("id", userId)
    .maybeSingle();

  let fullName: string;
  let role: string;
  let className: string | undefined;
  let subjects: string[] | undefined;

  if (staffData) {
    const s = staffData as { full_name: string; role: string; login: string; subjects?: string[] };
    fullName = s.full_name;
    role = s.role;
    subjects = s.subjects ?? [];
  } else {
    const { data: userData } = await supabase
      .from("users")
      .select("full_name, role, class_name, login")
      .eq("id", userId)
      .maybeSingle();

    if (!userData) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }

    const u = userData as { full_name: string; role: string; class_name?: string; login: string };
    fullName = u.full_name;
    role = u.role;
    className = u.class_name;
  }

  try {
    const params = { fullName, role, className, subjects, date: todayUzDate() };
    const png = await generateCertificatePNG(params);
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="sertifikat.png"`);
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: "Sertifikat yaratishda xatolik", details: String(err) });
  }
});

export default router;
