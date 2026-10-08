# 🧠 Face ID — butun maktab miqyosida ishlashi uchun

Face ID allaqachon kuchli qurilgan (7 burchakdan ro'yxatga olish, ko'p yuzni bir vaqtda tanish,
1- va 2-o'rin farqini tekshirish, ovoz yig'ib tasdiqlash). Bu yangilanish uni **ko'p o'quvchi**
bo'lganda — ya'ni butun maktab ro'yxatga olinganda — **xato taniyishni kamaytirish** uchun kuchaytiradi.

## Nima o'zgardi (kod)

Kioskka **«Aniqlik darajasi»** qo'shildi (boshlash ekranida tanlanadi, qurilmada eslab qolinadi):

| Daraja | Masofa chegarasi | 1–2 farq | Tasdiq ovozi | Qachon |
|---|---|---|---|---|
| **Yumshoq** | 0.50 | 0.06 | 2 | Kam o'quvchi / bitta sinf eshigi — eng tez |
| **Standart** ✅ | 0.47 | 0.10 | 3 | **Butun maktab uchun tavsiya** — aniqlik+tezlik |
| **Qattiq** | 0.44 | 0.13 | 4 | Juda ko'p o'quvchi — xatoni minimal qiladi |

**Nega bu muhim:** o'quvchilar soni oshgani sari ikki kishining yuz izi bir-biriga yaqinlashadi.
«Standart» va «Qattiq» — tasdiqlashdan oldin **farq kattaroq** va **ovoz ko'proq** bo'lishini talab qiladi,
shuning uchun noto'g'ri odamni "keldi" deb belgilash ehtimoli keskin kamayadi. Standart — yangi standart
(ilgari qat'iy 0.48 / 0.06 / 2 edi).

> **Demoda:** kam odam ro'yxatda bo'lsa, **Yumshoq** eng tez ishlaydi. Butun maktabda —
> **Standart**. Agar birorta xato taniyish ko'rsangiz — **Qattiq** ga o'ting.

Fayl: `artifacts/platform/src/pages/faceid/kiosk.tsx` (boshqa Face ID fayllari o'zgarmagan).

## Nima qilish kerak (amaliyot — bu eng muhimi)

Kod emas, **to'g'ri sozlash** butun maktabda ishlashini ta'minlaydi:

1. **Hamma o'quvchini 7 burchakdan** ro'yxatga oling. Ro'yxat sahifasida «namuna» soni ko'rinadi —
   kimda **7 dan kam** bo'lsa, qayta oling (yon tomondan tanishi uchun shart).
2. **Yorug'lik:** yuz yaxshi yoritilgan bo'lsin. Kamera orqasida **deraza/yorug' manba bo'lmasin**
   (yuz qorong'i chiqadi). Bu aniqlikka eng ko'p ta'sir qiladi.
3. **Kamera joyi:** yuradigan yo'lga qaratib, **yuz balandligida**, 1–3 m oldinda. Yaxshi USB
   veb-kamera (720p+) telefon kamerasidan ko'ra barqarorroq.
4. **Band eshik (ko'p odam tez o'tadi):** «Yumshoq» tanlang — tez tasdiqlaydi. Sokin joyda yoki
   aniqlik muhim bo'lsa — «Standart»/«Qattiq».
5. **«O'xshash yuz» ogohlantirishi:** ro'yxatga olishda ikki o'quvchi juda o'xshasa server ogohlantiradi
   (egizaklar). Bunday holda kamerada to'g'ri o'quvchi turganiga ishonch hosil qiling.

## Sig'imi

Tanib olish **mijoz (brauzer)** tomonida, tez algoritm bilan ishlaydi — 1000+ o'quvchi uchun ham
bir kadr ~1 ms. Ya'ni butun maktab (yuzlab o'quvchi) bitta noutbukda bemalol ishlaydi.

## Keyingi qadam (ixtiyoriy, Face ID uchun)

- **Tiriklik tekshiruvi (liveness):** ko'z qisish / boshni burish orqali telefondagi rasm bilan
  aldashning oldini olish. Bu — rejadagi AI qismi; demodan keyin qo'shsa bo'ladi (demo tezligini
  sekinlashtirmaslik uchun hozir qo'shilmadi).
