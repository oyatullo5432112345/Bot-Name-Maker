export interface SozOyiniLevel {
  level: number;
  word: string;
  hint: string;
  emoji: string;
  category: string;
}

export interface JumboqItem {
  id: number;
  question: string;
  options: string[];
  answer: number;
  emoji: string;
}

export interface ArqonQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number;
  category: string;
}

export interface FlagItem {
  flag: string;
  country: string;
  options: string[];
}

export const SOZ_OYINI_LEVELS: SozOyiniLevel[] = [
  { level: 1,  word: "GUL",    hint: "Bahorda o'sadigan, xushbo'y narsa",       emoji: "🌸", category: "Tabiat" },
  { level: 2,  word: "ONA",    hint: "Eng aziz inson — oilaning asosi",          emoji: "👩", category: "Oila" },
  { level: 3,  word: "OTA",    hint: "Oilaning boshlig'i",                       emoji: "👨", category: "Oila" },
  { level: 4,  word: "TOG",    hint: "Baland va ulug'vor yer massivi",            emoji: "⛰️", category: "Tabiat" },
  { level: 5,  word: "SUV",    hint: "Hayot uchun eng zarur suyuqlik",            emoji: "💧", category: "Tabiat" },
  { level: 6,  word: "NON",    hint: "Dasturxonning asosiy taomi",                emoji: "🍞", category: "Ovqat" },
  { level: 7,  word: "YOZ",    hint: "Eng issiq fasl",                            emoji: "☀️", category: "Fasllar" },
  { level: 8,  word: "QOR",    hint: "Qishda yogʻadigan oq-oq narsa",             emoji: "❄️", category: "Tabiat" },
  { level: 9,  word: "BOG",    hint: "Daraxtlar o'sib, meva beradigan joy",       emoji: "🌳", category: "Joylashuv" },
  { level: 10, word: "KUZ",    hint: "Barglar to'kiladigan fasl",                 emoji: "🍂", category: "Fasllar" },
  { level: 11, word: "OLMA",   hint: "Yashil yoki qizil bo'ladigan keng tarqalgan meva", emoji: "🍎", category: "Mevalar" },
  { level: 12, word: "BOLA",   hint: "Yosh va kichkina inson",                    emoji: "👶", category: "Inson" },
  { level: 13, word: "QUSH",   hint: "Qanotlari bor, uchib yuruvchi jonivor",     emoji: "🐦", category: "Hayvonlar" },
  { level: 14, word: "TOSH",   hint: "Yerda topiluvchi qattiq narsa",              emoji: "🪨", category: "Tabiat" },
  { level: 15, word: "DALA",   hint: "Keng va yassi yer",                         emoji: "🌾", category: "Tabiat" },
  { level: 16, word: "KEMA",   hint: "Suvda suzuvchi katta transport",             emoji: "⛵", category: "Transport" },
  { level: 17, word: "SOAT",   hint: "Vaqtni o'lchash uchun ishlatiladigan asbob", emoji: "⏰", category: "Asboblar" },
  { level: 18, word: "MEVA",   hint: "Daraxtlarda o'sadigan shirinlik",            emoji: "🍊", category: "Ovqat" },
  { level: 19, word: "BAXT",   hint: "Qalbda his qilinadigan yaxshi tuyg'u",       emoji: "😊", category: "His-tuygu" },
  { level: 20, word: "ANOR",   hint: "Ichida qizil donachalar bo'lgan meva",       emoji: "🍇", category: "Mevalar" },
  { level: 21, word: "KITOB",  hint: "O'qish uchun sahifalari bor narsa",          emoji: "📚", category: "Maktab" },
  { level: 22, word: "DARYO",  hint: "Tog'lardan oqib keladigan katta suv yo'li",  emoji: "🌊", category: "Tabiat" },
  { level: 23, word: "OSMON",  hint: "Tepada ko'k rang ko'rinadigan kenglik",      emoji: "☁️", category: "Tabiat" },
  { level: 24, word: "SAVOL",  hint: "Bilmoqchi bo'lganda beriladigan ibora",      emoji: "❓", category: "Maktab" },
  { level: 25, word: "TALIM",  hint: "Bilim olish jarayoni",                       emoji: "🎓", category: "Maktab" },
  { level: 26, word: "VATAN",  hint: "Tug'ilib o'sgan yurt",                       emoji: "🇺🇿", category: "Davlat" },
  { level: 27, word: "MAKTAB", hint: "O'quvchilar dars oladigan bino",             emoji: "🏫", category: "Maktab" },
  { level: 28, word: "SHAHAR", hint: "Ko'p inson yashaydigan katta joylashuv",     emoji: "🏙️", category: "Joylashuv" },
  { level: 29, word: "BALAND", hint: "Yer sirtidan uzoqda joylashgan",             emoji: "↕️", category: "Sifat" },
  { level: 30, word: "DOSTON", hint: "Qahramonlar haqida yoziladigan uzun she'r",  emoji: "📖", category: "Adabiyot" },
];

export const JUMBOQ_LIST: JumboqItem[] = [
  { id: 1,  emoji: "🧠", question: "Qancha o'qisang, shuncha ko'payadi. Bu nima?",                                         options: ["Bilim", "Kitob", "Pul", "Yosh"],                             answer: 0 },
  { id: 2,  emoji: "🥚", question: "Uyi bor, eshigi yo'q. Bu nima?",                                                       options: ["Quti", "Tuxum", "Ko'za", "Sandiq"],                          answer: 1 },
  { id: 3,  emoji: "⏰", question: "Ikki qo'li bor, lekin qo'l olishmaydi. Bu nima?",                                      options: ["Kalit", "Soat", "Eshik", "Stol"],                            answer: 1 },
  { id: 4,  emoji: "⭐", question: "Kechasi ko'rinadi, kunduz ko'rinmaydi. Bu nima?",                                       options: ["Quyosh", "Oy", "Yulduz", "Bulut"],                           answer: 2 },
  { id: 5,  emoji: "🍄", question: "Boshida qalpog'i bor, oyog'i yo'q. Bu nima?",                                          options: ["Sabzi", "Qovun", "Qo'ziqorin", "Lavlagi"],                   answer: 2 },
  { id: 6,  emoji: "🐸", question: "Yerda ham, suvda ham yashaydi. Bu nima?",                                               options: ["Baliq", "Baqa", "Ot", "Qushlar"],                            answer: 1 },
  { id: 7,  emoji: "🐟", question: "Suv ichida yashaydi, quruqlikda o'ladi. Bu nima?",                                      options: ["Baqa", "Qisqichbaqa", "Baliq", "Qayiq"],                     answer: 2 },
  { id: 8,  emoji: "🌧️", question: "Oyoqsiz keladi, qo'lsiz ketadi. Bu nima?",                                             options: ["Shamol", "Qor", "Yomg'ir", "Suv"],                           answer: 2 },
  { id: 9,  emoji: "🌊", question: "Yugurib keladi, yugurib ketadi. Bu nima?",                                               options: ["Shamol", "Bulut", "Qush", "Daryo"],                          answer: 3 },
  { id: 10, emoji: "☀️", question: "Ko'zi yo'q, lekin hammani ko'radi. Bu nima?",                                           options: ["Ko'zgal", "Ko'z", "Oy", "Quyosh"],                           answer: 3 },
  { id: 11, emoji: "🍁", question: "Bahor kelsa, uyg'onadi; qish kelsa, uxlaydi. Bu nima?",                                 options: ["Daraxt", "Qo'y", "Ayiq", "Baliq"],                           answer: 0 },
  { id: 12, emoji: "🌙", question: "Kechasi nur sochadi, kunduz ko'rinmaydi. Bu nima?",                                     options: ["Yulduz", "Fonar", "Quyosh", "Oy"],                           answer: 3 },
  { id: 13, emoji: "🪶", question: "Qanotli, lekin uchmaydigan qush. Bu nima?",                                             options: ["Qoqush", "Tovuq", "Penguen", "O'rdak"],                       answer: 1 },
  { id: 14, emoji: "🪣", question: "Qancha to'ksan, shuncha to'ladi. Bu nima?",                                             options: ["Ko'l", "Ariq", "Hovuz", "Quduq"],                            answer: 3 },
  { id: 15, emoji: "🌿", question: "Qishda yashil, yozda ham yashil. Nima bu?",                                             options: ["Qarag'ay", "Tol", "Olma daraxti", "Terak"],                  answer: 0 },
  { id: 16, emoji: "🕯️", question: "Yonsa, kichrayadi. Bu nima?",                                                          options: ["Fonar", "Sham", "Gulxan", "Elektr"],                         answer: 1 },
  { id: 17, emoji: "🪞", question: "Seni ko'rsatadi, lekin o'zi ko'rinmaydi. Bu nima?",                                    options: ["Rasm", "Ko'z", "Ko'zgal", "Fotografiya"],                     answer: 2 },
  { id: 18, emoji: "💨", question: "Ko'rinmaydi, lekin barcha sezadi. Bu nima?",                                             options: ["Suv", "Havo", "Issiqlik", "Yorug'lik"],                      answer: 1 },
  { id: 19, emoji: "🧊", question: "Qizitsa — suvga aylanadi, sovutsa — muzga aylanadi. Bu nima?",                          options: ["Havo", "Muz", "Suv", "Yog'"],                                answer: 2 },
  { id: 20, emoji: "🔑", question: "Eshigi bor, lekin devor yo'q. Bu nima?",                                                options: ["Deraza", "Kalit", "Qulf", "Eshik"],                          answer: 2 },
];

export const ARQON_QUESTIONS: ArqonQuestion[] = [
  { id: 1,  category: "Matematika",    question: "2 + 3 = ?",                                       options: ["4", "5", "6", "7"],                                                    answer: 1 },
  { id: 2,  category: "Matematika",    question: "5 × 4 = ?",                                       options: ["16", "18", "20", "24"],                                                answer: 2 },
  { id: 3,  category: "Matematika",    question: "10 ÷ 2 = ?",                                      options: ["3", "4", "5", "6"],                                                    answer: 2 },
  { id: 4,  category: "Matematika",    question: "7 + 8 = ?",                                       options: ["13", "14", "15", "16"],                                                answer: 2 },
  { id: 5,  category: "Matematika",    question: "6 × 6 = ?",                                       options: ["30", "34", "36", "40"],                                                answer: 2 },
  { id: 6,  category: "Matematika",    question: "100 - 37 = ?",                                    options: ["53", "63", "73", "83"],                                                answer: 1 },
  { id: 7,  category: "Matematika",    question: "4 × 8 = ?",                                       options: ["28", "30", "32", "34"],                                                answer: 2 },
  { id: 8,  category: "Matematika",    question: "15 + 27 = ?",                                     options: ["38", "40", "42", "44"],                                                answer: 2 },
  { id: 9,  category: "Geografiya",    question: "O'zbekistonning poytaxti qaysi?",                  options: ["Samarqand", "Buxoro", "Toshkent", "Andijon"],                          answer: 2 },
  { id: 10, category: "Geografiya",    question: "Dunyo qit'alari nechtа?",                          options: ["5", "6", "7", "8"],                                                    answer: 1 },
  { id: 11, category: "Geografiya",    question: "Eng katta okean qaysi?",                           options: ["Atlantik", "Hind", "Shimoliy Muz", "Tinch"],                           answer: 3 },
  { id: 12, category: "Geografiya",    question: "O'zbekistonda nechta viloyat bor?",                options: ["12", "13", "14", "15"],                                                answer: 2 },
  { id: 13, category: "Fan",           question: "Quyosh tizimida nechta sayyora bor?",              options: ["7", "8", "9", "10"],                                                   answer: 1 },
  { id: 14, category: "Fan",           question: "Suv necha darajada qaynaydi?",                     options: ["80°C", "90°C", "100°C", "120°C"],                                      answer: 2 },
  { id: 15, category: "Fan",           question: "Suvning kimyoviy formulasi qanday?",               options: ["CO2", "H2O", "O2", "H2"],                                              answer: 1 },
  { id: 16, category: "Fan",           question: "Eng yirik sayyora qaysi?",                         options: ["Zuhro", "Saturn", "Yupiter", "Yer"],                                   answer: 2 },
  { id: 17, category: "Tarix",         question: "O'zbekiston mustaqillikni qachon qo'lga kiritdi?", options: ["1989", "1990", "1991", "1992"],                                         answer: 2 },
  { id: 18, category: "Tarix",         question: "Amir Temur qaysi asrda yashagan?",                 options: ["XII", "XIII", "XIV", "XV"],                                            answer: 2 },
  { id: 19, category: "Tarix",         question: "Ibn Sino qaysi sohada mashhur edi?",               options: ["Astronomiya", "Tibbiyot", "Matematika", "Adabiyot"],                   answer: 1 },
  { id: 20, category: "Tarix",         question: "Ulug'bek kim edi?",                                options: ["Shoir", "Jangchi", "Astronom va olim", "Savdogar"],                     answer: 2 },
  { id: 21, category: "Biologiya",     question: "Eng katta dengiz hayvoni qaysi?",                  options: ["Fil baliq", "Ot baliq", "Ko'k kit", "Oq ayiq"],                        answer: 2 },
  { id: 22, category: "Biologiya",     question: "Baliq nafas olish uchun nima ishlatadi?",          options: ["O'pka", "Jabra", "Teri", "Burun"],                                     answer: 1 },
  { id: 23, category: "Biologiya",     question: "O'simliklar qaysi gazni chiqaradi?",               options: ["CO2", "N2", "O2", "H2"],                                               answer: 2 },
  { id: 24, category: "Ona tili",      question: "O'zbek alifbosida nechta harf bor?",               options: ["26", "29", "32", "35"],                                                answer: 2 },
  { id: 25, category: "Ona tili",      question: "Quyidagilardan qaysi biri unli tovush?",           options: ["B", "D", "A", "N"],                                                    answer: 2 },
  { id: 26, category: "Umumiy bilim",  question: "Hafta necha kun?",                                 options: ["5", "6", "7", "8"],                                                    answer: 2 },
  { id: 27, category: "Umumiy bilim",  question: "1 yil necha oy?",                                  options: ["10", "11", "12", "13"],                                                answer: 2 },
  { id: 28, category: "Umumiy bilim",  question: "Futbol darvozasida nechta futbolchi turadi?",      options: ["1", "2", "3", "4"],                                                    answer: 0 },
  { id: 29, category: "Umumiy bilim",  question: "Insonning nechta qo'li bor?",                      options: ["1", "2", "3", "4"],                                                    answer: 1 },
  { id: 30, category: "Umumiy bilim",  question: "O'zbekiston bayrog'i necha rangdan iborat?",       options: ["2", "3", "4", "5"],                                                    answer: 1 },
];

export const FLAG_RACE_FLAGS: FlagItem[] = [
  { flag: "🇺🇿", country: "O'zbekiston",       options: ["O'zbekiston", "Tojikiston", "Qozog'iston", "Qirg'iziston"] },
  { flag: "🇷🇺", country: "Rossiya",            options: ["Belarus", "Rossiya", "Ukraina", "Polsha"] },
  { flag: "🇺🇸", country: "AQSh",              options: ["Kanada", "Britaniya", "AQSh", "Avstraliya"] },
  { flag: "🇩🇪", country: "Germaniya",          options: ["Germaniya", "Fransiya", "Belgiya", "Avstriya"] },
  { flag: "🇫🇷", country: "Fransiya",           options: ["Italiya", "Ispaniya", "Fransiya", "Belgiya"] },
  { flag: "🇬🇧", country: "Buyuk Britaniya",   options: ["Buyuk Britaniya", "Irlandiya", "AQSh", "Kanada"] },
  { flag: "🇨🇳", country: "Xitoy",             options: ["Xitoy", "Yaponiya", "Koreya", "Vietnam"] },
  { flag: "🇯🇵", country: "Yaponiya",           options: ["Xitoy", "Yaponiya", "Koreya", "Singapur"] },
  { flag: "🇹🇷", country: "Turkiya",            options: ["Pokiston", "Eron", "Turkiya", "Irak"] },
  { flag: "🇸🇦", country: "Saudiya Arabistoni", options: ["Saudiya Arabistoni", "Eron", "Irak", "Misr"] },
  { flag: "🇮🇳", country: "Hindiston",          options: ["Pokiston", "Hindiston", "Bangladesh", "Shri-Lanka"] },
  { flag: "🇧🇷", country: "Braziliya",          options: ["Argentina", "Braziliya", "Kolumbiya", "Meksika"] },
  { flag: "🇰🇿", country: "Qozog'iston",        options: ["O'zbekiston", "Qirg'iziston", "Qozog'iston", "Tojikiston"] },
  { flag: "🇰🇬", country: "Qirg'iziston",       options: ["Qirg'iziston", "O'zbekiston", "Tojikiston", "Turkmaniston"] },
  { flag: "🇹🇯", country: "Tojikiston",         options: ["O'zbekiston", "Afgoniston", "Tojikiston", "Eron"] },
  { flag: "🇹🇲", country: "Turkmaniston",       options: ["Turkmaniston", "Qozog'iston", "Tojikiston", "O'zbekiston"] },
  { flag: "🇰🇷", country: "Janubiy Koreya",    options: ["Yaponiya", "Janubiy Koreya", "Xitoy", "Shimoliy Koreya"] },
  { flag: "🇮🇹", country: "Italiya",            options: ["Ispaniya", "Italiya", "Irlandiya", "Fransiya"] },
  { flag: "🇪🇸", country: "Ispaniya",           options: ["Italiya", "Fransiya", "Germaniya", "Ispaniya"] },
  { flag: "🇦🇺", country: "Avstraliya",         options: ["Yangi Zelandiya", "Kanada", "Austriya", "Avstraliya"] },
  { flag: "🇨🇦", country: "Kanada",             options: ["AQSh", "Kanada", "Meksika", "Yamayka"] },
  { flag: "🇲🇽", country: "Meksika",            options: ["Braziliya", "Meksika", "Argentina", "Italiya"] },
  { flag: "🇦🇷", country: "Argentina",          options: ["Braziliya", "Urugvay", "Argentina", "Boliviya"] },
  { flag: "🇪🇬", country: "Misr",              options: ["Suriya", "Irak", "Misr", "Iordaniya"] },
  { flag: "🇳🇴", country: "Norvegiya",          options: ["Norvegiya", "Daniya", "Finlandiya", "Shvetsiya"] },
  { flag: "🇸🇪", country: "Shvetsiya",          options: ["Norvegiya", "Finlandiya", "Daniya", "Shvetsiya"] },
  { flag: "🇳🇱", country: "Niderlandiya",       options: ["Lyuksemburg", "Niderlandiya", "Belgiya", "Fransiya"] },
  { flag: "🇵🇹", country: "Portugaliya",        options: ["Ispaniya", "Braziliya", "Italiya", "Portugaliya"] },
  { flag: "🇵🇱", country: "Polsha",             options: ["Polsha", "Chexiya", "Slovakiya", "Ukraina"] },
  { flag: "🇺🇦", country: "Ukraina",            options: ["Belarus", "Rossiya", "Ukraina", "Moldova"] },
];
