// Tayyor so'rovnoma shablonlari — "Yangi so'rovnoma" oynasida bir bosishda to'ldiriladi.
export interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  questions: { question: string; options: string[] }[];
}

export const PLATFORM_FEEDBACK: SurveyTemplate = {
  id: "platform-feedback",
  title: "Platforma haqida fikringiz",
  description: "O'quvchilar platformadan qanchalik mamnun ekanini bilish uchun 10 savol",
  questions: [
    { question: "Ta'lim platformasidan qanchalik tez-tez foydalanasiz?", options: ["Har kuni", "Haftada bir necha marta", "Oyda bir-ikki marta", "Deyarli foydalanmayman"] },
    { question: "Platformaning umumiy qulayligi haqida fikringiz qanday?", options: ["Juda qulay, hammasi tushunarli", "Qulay, lekin ba'zi joylari murakkab", "Ancha murakkab, tushunish qiyin", "Umuman qulay emas"] },
    { question: "Platformaning qaysi bo'limi sizga eng foydali?", options: ["Baholash va monitoring testlari", "Dars jadvali va e'lonlar", "Kutubxona va darsliklar", "O'yinlar va intelektual o'yinlar"] },
    { question: "Telefoningizda sayt qanchalik tez va barqaror ishlaydi?", options: ["Juda tez, muammo yo'q", "Yaxshi, ba'zida sekinlashadi", "Tez-tez sekin ishlaydi yoki qotib qoladi", "Deyarli ochilmaydi"] },
    { question: "Face ID orqali davomat qilinishi haqida fikringiz?", options: ["Juda yoqadi, qulay va tez", "Yaxshi, lekin ba'zan yuzimni tanimaydi", "Tushunmayapman, qo'shimcha tushuntirish kerak", "Yoqmaydi, boshqa usul yaxshiroq"] },
    { question: "Monitoring (chorak) testlari sizga nima beradi?", options: ["O'z bilimimni aniq ko'raman", "Qaysi mavzuni takrorlash kerakligini bilaman", "Faqat baho uchun yechaman", "Foydasini sezmayapman"] },
    { question: "Platformadagi o'yinlar (Zukko, Maktab Olami va boshqalar) haqida nima deysiz?", options: ["Juda qiziq, o'rganishga yordam beradi", "Qiziq, lekin ko'proq turdagi o'yin kerak", "Vaqt o'tkazish uchun, o'rganishga yordam bermaydi", "Foydalanmayman"] },
    { question: "Kutubxonadagi kitoblar va darsliklarni qanchalik ishlatasiz?", options: ["Doim foydalanaman", "Ba'zida kerak bo'lsa", "Kitoblar yetarli emas, ko'proq kerak", "Foydalanmayman"] },
    { question: "Platformaga qaysi yangilik eng ko'p kerak deb o'ylaysiz?", options: ["Ko'proq test va mashq", "Videodarslar", "O'qituvchi bilan chat va savol-javob", "Mukofot, tanga va reyting tizimi"] },
    { question: "Platformani do'stlaringizga tavsiya qilasizmi?", options: ["Albatta tavsiya qilaman", "Ehtimol, ba'zi kamchiliklar tuzatilsa", "Hali ishonchim komil emas", "Tavsiya qilmayman"] },
  ],
};

export const SURVEY_TEMPLATES: SurveyTemplate[] = [PLATFORM_FEEDBACK];
