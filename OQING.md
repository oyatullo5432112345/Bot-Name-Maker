# To'liq yangilanish — bitta to'plam (OQING)

Shu zipda bu sessiyadagi HAMMA yangilanish bor. Faqat shuni yuklasangiz — eng so'nggi holat.
Ichida 3 ta papka: `artifacts/`, `lib/`, `migrations/`. Uchalasini ham GitHub'ga o'z joyiga (ustiga) joylang.

⚠️ MUHIM: zip ichidagi `talim-...` nomli O'ROVCHI papka YO'Q. GitHub'ga `artifacts`, `lib`, `migrations`
papkalarining O'ZINI sudrang (zip nomini emas).

## Ichidagi yangilanishlar
1. Bek va Lola o'yini + admin ochish vaqtlari + **o'yin QULFI** (hozircha yopiq; ochish: sayohatData.ts dagi SAYOHAT_LOCKED=false)
2. Interaktiv yo'riqnoma (onboarding) + bosh sahifa kartalari + menyu "Sayohat"
3. Face ID kuchaytirish (Aniqlik darajasi)
4. Yangi rol: **Boshlang'ich sinf o'qituvchisi** + "O'qituvchi" -> "Fan o'qituvchisi"
5. Ommaviy qo'shish — faqat F.I.O
6. Baza tuzatmasi: 016 migratsiya (yangi rolga ruxsat)
7. Majburiy kanal: endi HAR amaldan oldin tekshiradi (bot kanalda ADMIN bo'lishi shart)
8. Davomat: Face ID avtomatik bog'langan; fan o'qituvchisi sinf tanlab "Sababli" qo'yadi; "Ruxsat bilan ketdi"

## Deploy
1. `artifacts/`, `lib/`, `migrations/` papkalarini GitHub'ga joylang (ustiga yoziladi).
2. Render avtomatik build qiladi; migratsiyalar (015, 016) o'zi ishga tushadi.
3. Build YASHIL bo'lsin.
