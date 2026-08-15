import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * MUHIM TUZATISH: avvalgi kod faqat r.update() chaqirar edi (bu shunchaki
 * "yangi versiya bormi?" deb serverdan so'raydi), lekin topilgan yangi
 * service-worker'ni HECH QACHON faollashtirmas va sahifani qayta
 * yuklamas edi. Natijada foydalanuvchi deploy qilingan yangi kodni
 * ko'rmasdi - eski keshlangan versiya cheksiz saqlanib qolardi.
 *
 * Endi: needRefresh true bo'lganda darhol updateServiceWorker(true)
 * chaqiriladi - bu yangi SW'ni faollashtirib, sahifani avtomatik
 * qayta yuklaydi. Shuningdek, ilova oldingi fonga qaytganda (masalan
 * telegram/brauzerdan qaytganda) ham darhol tekshiruv qilinadi -
 * 30 daqiqa kutish shart emas.
 */
export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (!r) return;

      // Sahifa ochilganda darhol tekshir (30 daqiqa kutmasdan)
      r.update();

      // Har 15 daqiqada fon rejimida tekshirib turish
      setInterval(() => r.update(), 15 * 60 * 1000);

      // Ilova qayta ko'rinadigan bo'lganda (foreground) ham tekshir -
      // bu mobil foydalanuvchilar uchun eng muhim holat
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") r.update();
      });
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Yangi versiya topildi - darhol faollashtiramiz va sahifani yangilaymiz
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
