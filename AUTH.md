# Kirish (login) — Face ID va 5 xonali ID

Mahfiy kod bilan ro'yxatdan o'tish **bekor qilindi**. Endi hisobni maktab ma'muriyati ochadi,
foydalanuvchi esa quyidagicha kiradi:

| Kim | Asosiy usul | Zaxira |
|-----|-------------|--------|
| **O'quvchi** | Yuz (Face ID) | 5 xonali ID |
| **O'qituvchi / sinf rahbari** | 5 xonali ID | — |
| **Admin / rahbariyat** | 5 xonali ID | Parol (`ADMIN_PASSWORD`) |

- **Yuz bilan kirgach sessiya 1 soat.** 1 soat ichida qayta kirsa — yuz so'ralmaydi. 1 soatdan oshsa — qayta skaner.
- **5 xonali ID bilan kirgach sessiya 12 soat** (sozlanadi).
- Sessiya tugasa foydalanuvchi avtomatik kirish sahifasiga qaytadi.

## Yuz bilan kirish qanday ishlaydi
1. Kirish sahifasida **"Yuz bilan kirish"**.
2. To'g'ri qaraydi → keyin **boshini biroz buradi** (tiriklik tekshiruvi — oddiy rasm bilan aldashni qiyinlashtiradi).
3. Yuz izi (128 son) **serverga** yuboriladi va u yerda solishtiriladi.
   Boshqa o'quvchilarning yuz ma'lumoti brauzerga **hech qachon** yuborilmaydi.
4. Tanilsa — 1 soatlik sessiya bilan kiradi. Tanilmasa — "5 xonali ID bilan kiring".

> **Muhim:** yuz bilan kirish uchun o'quvchi avval **Face ID → Yuzlarni ro'yxatga olish** sahifasida
> ota-ona roziligi bilan ro'yxatga olingan bo'lishi kerak (bu allaqachon bor). Ro'yxatda bo'lmasa —
> faqat 5 xonali ID bilan kiradi.

## 5 xonali ID
- Har bir foydalanuvchiga bitta **unikal 5 xonali ID** beriladi.
- **Qayerdan olish:** chap menyu → **Kirish IDlari**. Rahbariyat sinfni tanlab, hammaning IDsini ko'radi va **chop etadi**.
  O'qituvchi/sinf rahbari faqat o'z sinfini ko'radi. O'quvchi o'z IDsini **"Mening ID kartam"** sahifasida ko'radi.
- IDlar birinchi marta ro'yxat ochilganda avtomatik yaratiladi.
- Sahifaning yuqorisida sizning **o'z kirish IDingiz** ham ko'rinadi.

## Admin
- Admin dastlab **parol** bilan kiradi (`ADMIN_PASSWORD` — o'zgarmagan).
- Admin ham 5 xonali ID oladi (Kirish IDlari sahifasida ko'rinadi) va u bilan kira oladi.
- Parol **zaxira** sifatida saqlanadi — yuz yoki ID ishlamay qolsa, kirish yo'li yo'qolmaydi.

## Xavfsizlik (ochig'i)
- **Rasm bilan aldash:** telefonda to'liq "tiriklik" yo'q. Boshni burish tekshiruvi oddiy bosma rasmni to'sadi,
  lekin video bilan aldash nazariy jihatdan mumkin. Shu sabab **o'qituvchi/admin yuz bilan kirmaydi** — faqat o'quvchi.
- **5 xonali ID** — 100 000 ta variant. Har bir IP uchun urinishlar cheklangan (bir necha daqiqada bir necha marta).
  IDlarni sir tuting, o'quvchiga shaxsan bering.
- Yuz izi solishtiruvi serverda; brauzerga birovning ma'lumoti chiqmaydi.

## Sozlash (ixtiyoriy, Render env)
| O'zgaruvchi | Standart | Ma'nosi |
|-------------|----------|---------|
| `FACE_SESSION_MIN` | `60` | Yuz bilan kirish sessiyasi (daqiqa) |
| `ID_SESSION_MIN` | `720` | 5 xonali ID sessiyasi (daqiqa) |
| `ADMIN_PASSWORD` | (bor) | Admin zaxira paroli — o'zgarmagan |

Sozlamasangiz standart qiymatlar ishlatiladi — hech narsa qo'shish shart emas.

## Fayllar
- `migrations/014_auth_faceid_login.sql` — login_id ustunlari, auth_settings (server ishga tushganda ham avtomatik yaratiladi)
- `artifacts/api-server/src/routes/auth-login.ts` — face-login, id-login, my-id, login-ids
- `artifacts/api-server/src/routes/auth.ts` — mahfiy kod bilan ro'yxatdan o'tish o'chirildi (410)
- `artifacts/platform/src/pages/login.tsx` — kirish sahifasi (Yuz / ID / parol)
- `artifacts/platform/src/components/login-face.tsx` — yuz bilan kirish oynasi
- `artifacts/platform/src/components/login-id.tsx` — 5 xonali ID oynasi (klaviatura)
- `artifacts/platform/src/pages/admin/login-ids.tsx` — IDlar ro'yxati (chop etish)
- `artifacts/platform/src/pages/students/id-card.tsx` — o'quvchi o'z kirish IDsini ko'radi
