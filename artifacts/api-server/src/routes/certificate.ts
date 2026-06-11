import { Router, type IRouter } from "express";
import { queryOne } from "../lib/db.js";
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
      const data = await queryOne<{ class_name: string }>(
        "SELECT class_name FROM users WHERE login = $1", [login]
      );
      className = data?.class_name;
    }
  } else {
    const data = await queryOne<{ subjects: string[] | null }>(
      "SELECT subjects FROM staff WHERE login = $1", [login]
    );
    subjects = data?.subjects ?? [];
  }

  return { fullName, role, className, subjects, date };
}

// GET /api/certificate
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

// GET /api/certificate/:userId
router.get("/certificate/:userId", async (req, res): Promise<void> => {
  const admin = getAuthUser(req.headers.authorization);
  if (!admin || !["admin", "director"].includes(admin["role"] as string)) {
    res.status(403).json({ error: "Ruxsat yo'q" });
    return;
  }

  const { userId } = req.params as { userId: string };

  const staffData = await queryOne<{ full_name: string; role: string; login: string; subjects?: string[] }>(
    "SELECT full_name, role, login, subjects FROM staff WHERE id = $1", [userId]
  );

  let fullName: string;
  let role: string;
  let className: string | undefined;
  let subjects: string[] | undefined;

  if (staffData) {
    fullName = staffData.full_name;
    role = staffData.role;
    subjects = staffData.subjects ?? [];
  } else {
    const userData = await queryOne<{ full_name: string; class_name?: string; login: string }>(
      "SELECT full_name, class_name, login FROM users WHERE telegram_id::text = $1", [userId]
    );

    if (!userData) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }

    fullName = userData.full_name;
    role = "student";
    className = userData.class_name;
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
