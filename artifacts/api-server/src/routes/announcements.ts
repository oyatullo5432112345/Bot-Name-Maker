import { Router, type IRouter } from "express";
import { query, queryOne } from "../lib/db.js";
import { requireAuth, getAuthUser } from "./auth.js";

const router: IRouter = Router();

// GET /api/announcements — barcha e'lonlar
router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = getAuthUser(req.headers.authorization);
    if (!user) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }

    const rows = await query<{
      id: string; title: string; content: string;
      author_name: string; role_filter: string | null;
      pinned: boolean; created_at: string;
    }>(
      `SELECT id, title, content, author_name, role_filter, pinned, created_at
       FROM announcements
       WHERE role_filter IS NULL OR role_filter = $1 OR role_filter = 'all'
       ORDER BY pinned DESC, created_at DESC
       LIMIT 50`,
      [user.role]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/announcements — yangi e'lon (admin/director/teacher/zavuch)
router.post("/announcements", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }

  const allowed = ["admin", "director", "zam_direktor", "zavuch", "teacher", "sinf_rahbari"];
  if (!allowed.includes(user.role)) {
    res.status(403).json({ error: "E'lon qo'shish uchun ruxsat yo'q" });
    return;
  }

  const { title, content, role_filter, pinned } = req.body as {
    title?: string; content?: string; role_filter?: string; pinned?: boolean;
  };

  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ error: "Sarlavha va matn kiritilishi shart" });
    return;
  }

  try {
    const row = await queryOne<{ id: string; created_at: string }>(
      `INSERT INTO announcements (title, content, author_name, author_login, role_filter, pinned)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        title.trim(),
        content.trim(),
        user.full_name ?? user.login,
        user.login,
        role_filter ?? null,
        pinned ?? false,
      ]
    );
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/announcements/:id — e'lonni o'chirish
router.delete("/announcements/:id", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Autentifikatsiya talab qilinadi" }); return; }

  const canDelete = ["admin", "director"].includes(user.role);
  const canDeleteOwn = ["zam_direktor", "zavuch", "teacher", "sinf_rahbari"].includes(user.role);

  if (!canDelete && !canDeleteOwn) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }

  const { id } = req.params;

  try {
    if (canDelete) {
      await query("DELETE FROM announcements WHERE id = $1", [id]);
    } else {
      await query("DELETE FROM announcements WHERE id = $1 AND author_login = $2", [id, user.login]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /api/announcements/:id/pin — pinlash
router.patch("/announcements/:id/pin", requireAuth, async (req, res): Promise<void> => {
  const user = getAuthUser(req.headers.authorization);
  if (!user || !["admin", "director"].includes(user.role)) {
    res.status(403).json({ error: "Ruxsat yo'q" }); return;
  }

  const { pinned } = req.body as { pinned?: boolean };
  try {
    await query("UPDATE announcements SET pinned = $1 WHERE id = $2", [pinned ?? false, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
