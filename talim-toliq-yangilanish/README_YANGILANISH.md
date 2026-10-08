# 📦 Ta'lim — to'liq yangilanish (bitta to'plam)

Bu zip ichida **ikkita yangilanish** birlashtirilgan. Fayllar repo yo'llari bo'yicha —
GitHub'ga o'sha joylarga (ustiga) yuklang, Render avtomatik deploy qiladi.

## 1) Bek va Lola: Sayohat o'yini + admin ochish vaqtlari

**Yangi fayllar:**
- `migrations/015_sayohat.sql`
- `artifacts/api-server/src/routes/sayohat.ts`
- `artifacts/platform/src/pages/sayohat/sayohatData.ts`
- `artifacts/platform/src/pages/sayohat/_shared.tsx`
- `artifacts/platform/src/pages/sayohat/index.tsx`
- `artifacts/platform/src/pages/sayohat/play.tsx`
- `artifacts/platform/src/pages/sayohat/admin.tsx`
- `artifacts/platform/src/lib/sayohat-progress.ts`
- `BEK_LOLA_GDD.md` (o'yin dizayn hujjati — topshiriqlarni qanday qo'shish shu yerda)

**Almashtiriladigan (eski ustiga) fayllar:**
- `artifacts/api-server/migrate.mjs` (015 migratsiya ro'yxatga qo'shildi)
- `artifacts/api-server/src/routes/index.ts` (sayohat router ulandi)
- `artifacts/platform/src/App.tsx` (3 ta route qo'shildi)
- `artifacts/platform/src/pages/games/index.tsx` (o'yin kartasi qo'shildi)

## 2) Face ID kuchaytirish (butun maktab miqyosi)

**Almashtiriladigan fayl:**
- `artifacts/platform/src/pages/faceid/kiosk.tsx` (Aniqlik darajasi: Yumshoq/Standart/Qattiq)

**Qo'llanma:**
- `FACEID_KUCHAYTIRISH.md` (maktab miqyosida aniqlikni oshirish bo'yicha amaliy maslahatlar)

---

## Deploy tartibi

1. Yuqoridagi barcha fayllarni GitHub'ga o'z joylariga yuklang (ustiga yozing).
2. Render avtomatik: `migrate.mjs` → `015_sayohat.sql` jadvallarni yaratadi (`sayohat_progress`,
   `sayohat_rewards`, `sayohat_region_unlock`). Mavjud ma'lumotlarga tegmaydi.
3. Tekshirish: **O'yinlar → Bek va Lola: Sayohat** (yoki `/sayohat`). Rahbariyat uchun xaritada
   **«Ochish vaqtlari»** tugmasi. Face ID kioskida boshlash ekranida **«Aniqlik darajasi»**.

> Eslatma: bu to'plam faqat Sayohat va Face ID yangilanishlarini o'z ichiga oladi. Ilgari yuborilgan
> bot «Platformaga kirish» va qo'llanma sahifasi — alohida to'plamlarda edi.
