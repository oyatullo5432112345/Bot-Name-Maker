# ⚠️ OQING — nega o'yin chiqmayapti va to'liq yechim

"Deploy qildim, baribir chiqmayapti, bari bekor" — buning sababi deyarli har doim bitta:
**fayllar GitHub'ga to'liq tushmagan** yoki **bitta fayl yetishmay build yiqilgan**. Bitta fayl
(masalan `App.tsx` yoki `onboarding-tour.tsx`) yetishmasa — **butun sayt build bo'lmaydi va hech narsa
yangilanmaydi** (hamma narsa eski holicha qoladi).

Shuning uchun bu zipda **hamma kerakli fayl** bor. Hammasini o'z joyiga (ustiga) yuklang — bittasini ham
qoldirmang.

## 1. Fayllar ro'yxati (hammasi shu yo'llarda bo'lishi SHART)

### Yangi fayllar
- `migrations/015_sayohat.sql`
- `artifacts/api-server/src/routes/sayohat.ts`
- `artifacts/platform/src/lib/sayohat-progress.ts`
- `artifacts/platform/src/pages/sayohat/sayohatData.ts`
- `artifacts/platform/src/pages/sayohat/_shared.tsx`
- `artifacts/platform/src/pages/sayohat/index.tsx`
- `artifacts/platform/src/pages/sayohat/play.tsx`
- `artifacts/platform/src/pages/sayohat/admin.tsx`
- `artifacts/platform/src/components/onboarding-tour.tsx`

### Almashtiriladigan (eski ustiga) fayllar
- `artifacts/api-server/migrate.mjs`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/platform/src/App.tsx`  ← **route'lar shu yerda; bu bo'lmasa o'yin ochilmaydi**
- `artifacts/platform/src/components/layout.tsx`  ← menyudagi "Sayohat" tugmasi
- `artifacts/platform/src/pages/dashboard.tsx`  ← bosh sahifadagi Face ID + o'yin kartalari
- `artifacts/platform/src/pages/games/index.tsx`  ← O'yinlar sahifasidagi karta
- `artifacts/platform/src/pages/faceid/kiosk.tsx`  ← Face ID aniqlik darajasi

## 2. Deploydan keyin TEKSHIRISH (muhim)

1. **Render build muvaffaqiyatli bo'ldimi?** Render → Events (yoki Logs). Oxirgi deploy:
   - **"Deploy live" (yashil)** bo'lsa — build o'tgan.
   - **"Failed" (qizil)** bo'lsa — build yiqilgan. Logda `Could not resolve "..."` yoki `Rollup failed`
     degan qator bo'ladi — u yetishmayotgan faylni aytadi. **O'sha matnni menga yuboring.**

2. **To'g'ridan-to'g'ri oching:** `https://SIZNING-SAYT.onrender.com/sayohat`
   - Bek/Lola tanlash oynasi chiqsa — ✅ ishladi.
   - Oq ekran / "Not Found" bo'lsa — `App.tsx` yoki `sayohat/` fayllari hali yo'q yoki build yiqilgan.

## 3. Eng ko'p uchraydigan xato

GitHub'da zipni ochib yuklaganda ba'zan fayllar **noto'g'ri papkaga** tushadi (masalan `sayohat/` papkasi
`src/pages/` ga emas, boshqa joyga). Har bir fayl aynan yuqoridagi yo'lda turganini tekshiring.
`App.tsx` ichida `import("@/pages/sayohat/index")` bor — agar `src/pages/sayohat/index.tsx` yo'q bo'lsa,
build yiqiladi.
