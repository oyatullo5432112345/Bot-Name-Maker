import { useRegisterSW } from "virtual:pwa-register/react";

// autoUpdate rejimida — foydalanuvchi hech narsa qilmaydi.
// Yangi versiya fon da yuklanadi, sahifa keyingi ochilishda yangilanadi.
export function PwaUpdatePrompt() {
  useRegisterSW({
    onRegistered(r) {
      // Har 30 daqiqada yangi versiyani tekshir
      if (r) {
        setInterval(() => r.update(), 30 * 60 * 1000);
      }
    },
  });

  return null;
}
