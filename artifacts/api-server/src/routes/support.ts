import { Router, type IRouter } from "express";
import { sendToAdmin } from "../lib/telegram.js";

const router: IRouter = Router();

router.post("/support", async (req, res): Promise<void> => {
  const { message, name, contact } = req.body as {
    message?: string;
    name?: string;
    contact?: string;
  };

  if (!message || message.trim().length < 3) {
    res.status(400).json({ error: "Xabar juda qisqa" });
    return;
  }

  const from = name?.trim() ? `👤 *${name.trim()}*` : "👤 *Noma'lum foydalanuvchi*";
  const contactLine = contact?.trim() ? `📞 Aloqa: ${contact.trim()}\n` : "";

  const text =
    `📩 *Yangi murojaat (veb-sayt)*\n\n` +
    `${from}\n` +
    `${contactLine}` +
    `💬 *Xabar:*\n${message.trim()}`;

  await sendToAdmin(text);

  res.json({ ok: true });
});

export default router;
