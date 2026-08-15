import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Yangi versiya chiqqanda — kutib turmasdan, DARHOL majburan yangilaydi.
// (Avvalgi "keyingi ochilishda yangilanadi" degan passiv usul ishonchli emas edi —
// PWA keshi tufayli foydalanuvchilar uzoq vaqt eski versiyada qolib ketishardi.)
export function PwaUpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Har 5 daqiqada yangi versiyani tekshiradi (avval 30 daqiqa edi — juda kam edi)
        setInterval(() => r.update(), 5 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      void updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // Yangi Service Worker boshqaruvni olishi bilan — sahifani bir marta majburan qayta yuklaydi
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return null;
}
