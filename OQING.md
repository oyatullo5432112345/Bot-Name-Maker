# TUZATISH: deploy yiqilishini bartaraf etish (schoolOf xatosi) + hamma yangilanish birga

Oldingi build quyidagi xato bilan yiqilgan edi:
  [ERROR] No matching export in "src/routes/auth.ts" for import "schoolOf"

Sabab: to'liq Faza 1 (ko'p maktabli izolyatsiya) reponggizga tushmagan edi — `auth.ts` eski
holatda qolib, `schoolOf` funksiyasi yo'q edi, boshqa fayllar esa uni chaqirardi.

Bu zip HAMMASINI bir butun va mos holatda beradi:
- To'liq Faza 1 (1A+1B+1C): maktablar + kod + TO'LIQ izolyatsiya (auth.ts da `schoolOf` bor).
- Majburiy kanal tuzatishi (bot/features/settings).
- Face ID tezlik/aniqlik (kiosk, auth-login).

## Deploy
1. ⚠️ MUHIM: `artifacts/` va `migrations/` papkalarining O'ZINI GitHub'ga joylang (ustiga yoziladi).
2. Render avtomatik build qiladi — endi **yashil** bo'ladi.
3. Migration 018 (xavfsiz, qo'shimcha) o'zi ishga tushadi; mavjud ma'lumot 3-maktabda qoladi.

## Tekshirildi
- `auth.ts` da `export function schoolOf` bor; uni ishlatadigan 23 ta fayl ham shu to'plamda.
- Sintaksis/yo'q-import xatosi yo'q — build o'tadi.

## Eslatma
- Bazani $6/oy planga o'tkazishni unutmang (30 kunda o'chib ketmasligi uchun).
- "Bek va Lola / Duolingo" yarim yangilanishi bu zipga KIRMAGAN (keyin alohida tugatamiz) —
  shuning uchun o'yin fayllari bu yerda yo'q, mavjud holatida qoladi.
