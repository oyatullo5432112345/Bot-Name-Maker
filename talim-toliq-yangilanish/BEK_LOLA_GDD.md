# 🧭 "BEK VA LOLA: SAYOHAT" — O'yin Dizayn Hujjati (GDD)

> Ta'lim platformasi uchun yakka tartibdagi ta'limiy sarguzasht o'yini.
> Ushbu hujjat — o'yinning to'liq rejasi. "Detal-detal" bo'yicha yozilgan.
> **Versiya:** Faza 1 (MVP) tayyor. Keyingi fazalar — pastda.

---

## 1. 🎯 Konsepsiya (asosiy g'oya)

O'quvchi **Bek** yoki **Lola** qahramonini tanlab, **O'zbekiston bo'ylab sayohat** qiladi.
Har bir viloyatda:
- qiziqarli fakt eshitadi (o'sha yurt haqida),
- **bosh qotirmalar va topshiriqlarni** yechadi,
- **yulduz (1–3)**, **esdalik sovg'a** va **tanga** yutib oladi.

O'zbekiston to'liq zabt etilgach — **boshqa davlatlar** sari yo'l ochiladi (keyingi sayohat).

**Maqsad:** o'yin orqali Vatanni, tarixni, geografiyani va mantiqni o'rgatish.
Bu — oddiy test emas, bu **sarguzasht**: xarita, qahramon, yo'l, mukofot.

---

## 2. 🧒 Qahramonlar

| | Bek | Lola |
|---|---|---|
| Kim | O'g'il bola | Qiz bola |
| Rang | ko'k | pushti/fuksiya |
| Ismi | **o'zgartirilsa bo'ladi** (o'z ismini yozishi mumkin) | **o'zgartirilsa bo'ladi** |

- O'quvchi o'yin boshida qahramonni **tanlaydi**, **ismini yozadi** va **qiyinlik darajasini** tanlaydi.
- Keyin istalgan vaqtda **Sozlamalar** orqali o'zgartira oladi.
- Qahramonlar kod bilan chizilgan **jonli SVG** (video/rasm fayl yuklanmaydi): salom beradi, sakraydi, xaritada yo'l bo'ylab yuradi.

---

## 3. 🗺️ Xarita — 1-sayohat: O'ZBEKISTON (14 manzil)

Sayohat **Farg'ona vodiysidan** (bizning uyimizdan) boshlanib, g'arbga — **Orol dengizigacha** boradi.

| Tartib | Manzil | Diqqatga sazovor joy | Esdalik |
|---|---|---|---|
| 0 | **Farg'ona** 🌾 | Marg'ilon atlasi, vodiy | 🧣 Atlas |
| 1 | **Andijon** 📖 | Bobur bog'i | 📜 Boburnoma |
| 2 | Namangan 🌷 | Gullar shahri | 🌷 Lola |
| 3 | Toshkent shahri 🏙️ | Amir Temur xiyoboni | 🚇 Metro jetoni |
| 4 | Toshkent viloyati ⛰️ | Chorvoq | 🏔️ Tosh |
| 5 | Sirdaryo 🌊 | Sirdaryo | 🤍 Paxta |
| 6 | Jizzax 🌲 | Zomin | 🌲 Archa |
| 7 | Samarqand 🕌 | Registon | 🏛️ Registon maketi |
| 8 | Qashqadaryo 🏰 | Shahrisabz, Oqsaroy | 🏰 Oqsaroy toshi |
| 9 | Surxondaryo ☀️ | Termiz | 🪷 Yodgorlik |
| 10 | Buxoro 🕌 | Minorai Kalon | 🗼 Minora maketi |
| 11 | Navoiy ⛏️ | Qizilqum, Sarmishsoy | 🪨 Qoyatosh |
| 12 | Xorazm 🏯 | Xiva, Ichan Qal'a | 🏯 Darvoza |
| 13 | Qoraqalpog'iston 🐪 | Mo'ynoq, Orol | ⚓ Langar |

**Ochilish qoidasi (unlock) — 2 xil:**
1. **Jadval bo'yicha (standart):** 1-manzil doim ochiq. Keyingi manzil oldingisini (kamida 1⭐) yakunlagach ochiladi.
2. **Admin belgilagan vaqt bo'yicha:** rahbariyat har bir viloyatga **ochilish sana-vaqtini** belgilashi mumkin (xarita → «Ochish vaqtlari» tugmasi, yoki `/sayohat/admin`). Vaqt belgilansa — viloyat **o'sha vaqtdan keyin** hammaga ochiladi (oldingisini tugatish shart emas). Bu — nazoratli, bosqichma-bosqich chiqarish uchun (masalan, har hafta bitta viloyat). Vaqt belgilanmasa — jadval bo'yicha ishlaydi. Qulflangan manzilga bosilsa — ochilish vaqti yoki sababi ko'rsatiladi.

**Hozir o'ynaladi:** Farg'ona (to'liq, 5 topshiriq — **namuna**) va Andijon (3 topshiriq).
Qolgan 12 manzil xaritada ko'rinadi, lekin "⏳ tez kunda" holatida — **topshiriqlarni siz to'ldirasiz** (pastga qarang).

---

## 4. 🎮 O'yin aylanishi (gameplay loop)

Har bir manzilda:

1. **Kirish sahnasi** — qahramon jonli sahnada turadi, o'sha yurt haqida qiziqarli fakt aytadi (gap pufagi).
2. **Topshiriqlar** — tanlangan darajaga mos topshiriqlar ketma-ket chiqadi. Har birida: maslahat tugmasi, javobdan keyin tushuntirish.
3. **Yakun** — to'g'ri javoblar soniga qarab **yulduz** beriladi:
   - hammasi to'g'ri → ⭐⭐⭐
   - ≥ 60% → ⭐⭐
   - ≥ 40% → ⭐
   - < 40% → qayta urinish kerak (manzil yakunlanmaydi)
4. Manzil yakunlansa (≥1⭐): **esdalik** to'planadi + **tanga** beriladi + keyingi manzil ochiladi.

---

## 5. ✍️ Topshiriqlarni O'ZINGIZ tuzish (eng muhim qism)

Siz tanlagandek — **topshiriqlarni o'zingiz, mantiqiy qilib tuzasiz**.
Buning uchun kod bilish shart emas. Hamma topshiriqlar bitta faylda:

```
artifacts/platform/src/pages/sayohat/sayohatData.ts
```

Har bir viloyatning `tasks: [ ... ]` qismiga topshiriq qo'shasiz. **3 xil tur** bor:

### A) Test (4 variant) — `quiz`
```ts
{
  id: "sm1",                 // noyob belgi (istalgan harf-raqam)
  type: "quiz",
  level: "oson",             // oson | orta | qiyin  (yozilmasa — hamma darajada)
  prompt: "Registon maydoni qaysi shaharda?",
  options: ["Samarqand", "Buxoro", "Xiva", "Toshkent"],
  correct: 0,                // to'g'ri variant: 0=birinchi, 1=ikkinchi...
  hint: "Amir Temur poytaxti.",       // ixtiyoriy
  explain: "Registon — Samarqandning yuragi.", // ixtiyoriy
}
```

### B) To'g'ri / Noto'g'ri — `truefalse`
```ts
{
  id: "sm2",
  type: "truefalse",
  level: "orta",
  prompt: "Samarqand 2750 yildan ortiq tarixga ega.",
  answer: true,              // true = To'g'ri, false = Noto'g'ri
  explain: "To'g'ri — 2750 yillik qadimiy shahar.",
}
```

### C) Javobni yozish — `input`
```ts
{
  id: "sm3",
  type: "input",
  level: "qiyin",
  prompt: "Amir Temur qaysi shaharni poytaxt qilgan?",
  answers: ["samarqand"],    // qabul qilinadigan javoblar (bir nechta yozsa bo'ladi)
  numeric: false,            // true bo'lsa — faqat son (raqamli klaviatura)
  hint: "...",
  explain: "...",
}
```

> **Mantiqiy topshiriq** uchun `input` yoki `quiz` juda qulay — masalada hisob-kitob, ketma-ketlik, sabab-natija bera olasiz. Farg'onadagi `fr4` namunasiga qarang (atlas bo'yash masalasi).

**Qoidalar:**
- `id` har bir topshiriqda **noyob** bo'lsin (takrorlanmasin).
- `level` yozilmasa — topshiriq **hamma darajada** ko'rinadi.
- Bitta viloyatga istagancha topshiriq qo'shing. Ko'p bo'lsa — o'yin uzunroq bo'ladi.

---

## 6. ⚙️ Qiyinlik darajalari

O'quvchi o'zi tanlaydi:
- 🌱 **Oson** — boshlovchilar uchun
- ⚡ **O'rta** — fikrlashni talab qiladi
- 🔥 **Qiyin** — jiddiy sinov

Daraja o'zgarsa — faqat o'sha darajaga `level` qo'yilgan topshiriqlar (va darajasiz umumiy topshiriqlar) ko'rinadi.

---

## 7. 🏆 Mukofotlar

- **Yulduzlar (⭐1–3):** har manzil uchun, eng yaxshi natija saqlanadi.
- **Tanga:** 1⭐=5, 2⭐=10, 3⭐=15 tanga. **Server nazorat qiladi** — har manzildan faqat bir marta (yulduz yaxshilansa — farqi) beriladi, firibgarlik bo'lmaydi. Tanga umumiy **Tanga tizimiga** (do'kon, unvonlar) qo'shiladi.
- **Esdaliklar:** har viloyatning o'ziga xos sovg'asi. Xarita ostidagi "javonchada" to'planadi.
- **Kelajakda:** Bek/Lola uchun kiyim-bosh (outfit), maxsus unvonlar, "sayohat pasporti".

---

## 8. 🧱 Texnik tuzilma

**Frontend (React):**
| Fayl | Vazifa |
|---|---|
| `pages/sayohat/sayohatData.ts` | Xarita + barcha topshiriqlar (siz tahrirlaysiz) |
| `pages/sayohat/_shared.tsx` | Jonli SVG qismlar (qahramon, bulut, sahna, yulduz) |
| `pages/sayohat/index.tsx` | Qahramon tanlash + xarita hub |
| `pages/sayohat/play.tsx` | Manzil o'yini (sahna→topshiriq→yakun) |
| `pages/sayohat/admin.tsx` | Rahbariyat: viloyat ochilish vaqtlarini belgilash |
| `lib/sayohat-progress.ts` | Holat + ochilish vaqtlarini saqlash/o'qish |

**Backend (Express + Postgres):**
| Fayl | Vazifa |
|---|---|
| `routes/sayohat.ts` | progress (o'qish/saqlash), reward (tanga), unlocks (ochilish vaqti) |
| `migrations/015_sayohat.sql` | `sayohat_progress` + `sayohat_rewards` + `sayohat_region_unlock` |

**Holat (progress):** serverda JSONB bo'lib saqlanadi — o'quvchi boshqa qurilmada kirsa ham davom etadi. Internet bo'lmasa `localStorage` zaxira.

---

## 9. 🛣️ Fazalar (yo'l xaritasi)

- **Faza 1 (MVP) — ✅ TAYYOR (shu yetkazib berish):** qahramon tanlash+nom+daraja, 14 manzilli jonli xarita, 2 manzil o'ynaladi (Farg'ona namuna), server progress, tanga+yulduz+esdalik, o'yinlar sahifasida karta.
- **Faza 2 — Kontent:** qolgan 12 viloyatga topshiriq to'ldirish (siz) + **admin tahrirlagich** (topshiriqni sayt ichidan qo'shish, kod tegmasdan).
- **Faza 3 — Chuqurlashtirish:** yangi topshiriq turlari (tartiblash, moslashtirish), Bek/Lola kiyimlari, "sayohat pasporti", ovoz/animatsiya kuchaytirish.
- **Faza 4 — Dunyo:** O'zbekistondan keyin boshqa davlatlar (Qozog'iston, Turkiya, Misr... dunyo).

---

## 10. 🚀 Deploy va sinab ko'rish

1. Ushbu fayllarni GitHub'ga yuklang (odatdagidek) → Render avtomatik deploy qiladi.
2. `migrate.mjs` yangi jadvallarni avtomatik yaratadi (`015_sayohat.sql`).
3. Saytda: **O'yinlar → Bek va Lola: Sayohat**, yoki to'g'ridan-to'g'ri `/sayohat`.
4. Qahramon tanlang → Farg'onani o'ynang → yulduz, esdalik, tanga oling.

> Demoda (noutbuk + proyektor) bu bo'lim juda yaxshi ko'rinadi — mudirga ko'rsatish uchun ayni muddao.
