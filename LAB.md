# Kompyuterlar — kompyuter sinfini platformadan boshqarish (Veyon bilan)

Maktab kompyuterlari platforma ichidagi **Kompyuterlar** bo'limidan boshqariladi:
jonli holat (onlayn/oflayn), **bloklash / ochish**, o'chirish / qayta yuklash / xabar, jurnal.

## Qanday tuzilgan

```
  ┌─────────────┐   buyruq    ┌───────────────────┐  veyon-cli  ┌──────────────┐
  │  Platforma  │ ─────────▶ │  KO'PRIK (bridge)  │ ─────────▶ │ Veyon (har   │
  │  (Render)   │ ◀───────── │  o'qituvchi PC     │ ◀───────── │ bir kompyuter)│
  └─────────────┘   holat     └───────────────────┘   holat     └──────────────┘
```

- **Platforma** — buyruq navbatini yuritadi va holatni ko'rsatadi (internetda).
- **Veyon** — har bir kompyuterda turadi, ekranni haqiqatda bloklaydi/ochadi (bepul, ochiq kodli: veyon.io).
- **Ko'prik** — o'qituvchi/admin kompyuterida ishlaydigan kichik dastur; platformadan buyruq olib,
  Veyon'ga (`veyon-cli`) uzatadi va kompyuterlar onlaynligini qaytaradi.

> Muhim: platformadan turib, kompyuterga hech narsa o'rnatmasdan uni bloklab bo'lmaydi.
> Shuning uchun Veyon + ko'prik kerak. Bularsiz faqat ro'yxat ko'rinadi, boshqaruv ishlamaydi.

## Bloklash va ochish (aylanuvchi kod)

- Bloklash tugmasi bosilganda kompyuter ekrani Veyon orqali qulflanadi va **yangi ochish kodi** yaratiladi.
- Kodni faqat **rahbariyat** (admin/direktor/zavuch) ko'radi.
- Ochish uchun shu kod kiritiladi. Ochilgach kod **o'chadi** — keyingi bloklashda **yana yangi kod** beriladi.
- Rahbar xohlasa kodsiz ham ochishi mumkin ("Kodsiz ochish").
- Xona bo'yicha ommaviy bloklashda barcha kompyuterга **bitta umumiy kod** beriladi.
- Sozlamada: kim bloklay/ocha oladi (o'qituvchilarga ruxsat), kod uzunligi (4–6 raqam), ekrandagi xabar.

> "Yomon harakatni o'zi sezib avtomat bloklash" hozircha yo'q — buni o'qituvchi Veyon Master'da
> jonli ekranlarni ko'rib turib qo'lda bosadi. Avtomatik aniqlash keyingi bosqich (o'z agentimiz kerak bo'ladi).

## O'rnatish (bir marta)

### 1. Har bir kompyuterga Veyon
- veyon.io dan Veyon'ni yuklab, **hamma o'quvchi kompyuteriga** o'rnating.
- O'qituvchi kompyuterida Veyon'ni **Master** rejimida sozlang.
- Veyon **autentifikatsiya kalitini** yarating va o'quvchi kompyuterlariga tarqating
  (Veyon Configurator → Authentication keys). Shusiz master boshqara olmaydi.
- Hammasi bitta lokal tarmoqda (LAN/Wi‑Fi) bo'lsin.

### 2. O'qituvchi kompyuteriga ko'prik
1. **Node.js 18+** o'rnating (https://nodejs.org).
2. `bridge` papkasini shu kompyuterga ko'chiring.
3. `talim-lab-bridge.config.example.json` dan nusxa oling → nomini `talim-lab-bridge.config.json` qiling.
4. Ichini to'ldiring:
   - `platform_url`: `https://bot-name-maker.onrender.com`
   - `secret`: quyida yaratadigan `LAB_BRIDGE_SECRET` bilan **aynan bir xil**
   - `veyon_cli`: odatda `C:\\Program Files\\Veyon\\veyon-cli.exe`
5. `run-bridge.bat` ni ishga tushiring. "🚀 ... ishga tushdi" chiqsa — tayyor.

### 3. Render'da maxfiy kalit
- Render → Web Service → **Environment** → yangi o'zgaruvchi:
  - `LAB_BRIDGE_SECRET` = uzun tasodifiy matn (masalan 24+ belgi). Ko'prik configidagi `secret` bilan bir xil bo'lsin.
- Saqlang → avtomatik qayta deploy bo'ladi.

### 4. Platformaga kompyuterlarni qo'shish
- Kirish: chap menyu → **Kompyuterlar**.
- (ixtiyoriy) **Xona** qo'shing (masalan "Informatika xonasi").
- Har bir kompyuterni **nomi va IP manzili** bilan qo'shing (IP — Veyon o'rnatilgan kompyuternika).
- Bir necha soniyada ular **onlayn** ko'rinadi. Endi bloklash/ochish ishlaydi.

## Kundalik ishlatish
- **Kuzatish**: Veyon Master ekranida barcha kompyuter oynalari ko'rinadi (kim nima qilyapti).
- **Bloklash**: kerakli kompyuterda "Bloklash" (yoki butun "Xonani bloklash"). Ekran qulflanadi.
- **Ochish**: "Ochish" → admin bergan kodni kiritish. Yoki rahbar kodsiz ochadi.
- **Boshqa**: xabar yuborish, qayta yuklash, o'chirish (rahbariyat).

## Ko'prikni avtomatik ishga tushirish (tavsiya)
O'qituvchi kompyuteri yoqilganda ko'prik o'zi ishga tushsin:
- Windows **Task Scheduler** → Create Task → Trigger: "At log on" → Action: `run-bridge.bat`.
- Yoki `run-bridge.bat` yorlig'ini `shell:startup` papkasiga qo'ying.

## Agar bloklash ishlamasa
- Ko'prik oynasida `⚠️` va xabar chiqadi. Ko'p hollarda Veyon **feature nomi** versiyaga qarab boshqacha bo'ladi.
- O'qituvchi kompyuterida buni ishga tushiring: `veyon-cli feature list` — ro'yxatdan to'g'ri nomni oling
  (masalan `ScreenLock`), so'ng `talim-lab-bridge.config.json` dagi `commands` ichida to'g'rilang.
- Tekshiruv: `veyon-cli feature start ScreenLock <IP>` qo'lda ishlasa, ko'prik ham ishlaydi.
- "Onlayn" ko'rinmasa: `veyon_port` (standart 11100) va tarmoq/faervolni tekshiring.

## Xavfsizlik va cheklovlar
- `LAB_BRIDGE_SECRET` maxfiy — hech kimga bermang, kodni skrinshotda ulashmang.
- Ko'prik kompyuteri **yoqiq** turishi kerak (u o'chsa boshqaruv to'xtaydi).
- Veyon va kompyuterlar bitta LAN'da bo'lsin.
- Internet uzilsa buyruqlar navbatда turadi, ko'prik qayta ulanганда bajaradi.
- Blok — Veyon ekran qulfi; internet yoki ko'prik uzilганда kompyuter mangu qulflanib qolmaydi:
  Veyon xizmatini o'chirsa yoki qayta yuklasa qulf ketadi (bu — xavfsizlik zaxirasi, ataylab shunday).

## Fayllar
- `migrations/013_lab.sql` — jadvallar (server ishga tushganda avtomatik ham yaratiladi)
- `artifacts/api-server/src/routes/lab.ts` — API (holat, bloklash/ochish, kod, ko'prik so'rovlari)
- `artifacts/platform/src/pages/lab/index.tsx` — Kompyuterlar sahifasi
- `bridge/talim-lab-bridge.mjs` — ko'prik dasturi (o'qituvchi kompyuterida)
- `bridge/talim-lab-bridge.config.example.json` — namuna sozlama
- `bridge/run-bridge.bat` — Windows'da ishga tushirish

## Render env o'zgaruvchisi (qo'shiladigan)
| Nomi | Qiymati |
|------|---------|
| `LAB_BRIDGE_SECRET` | uzun tasodifiy matn (ko'prik configidagi `secret` bilan bir xil) |
