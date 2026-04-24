import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';
import it from '@/locales/it.json';
import es from '@/locales/es.json';
import pt from '@/locales/pt.json';
import nl from '@/locales/nl.json';
import pl from '@/locales/pl.json';
import ru from '@/locales/ru.json';
import ar from '@/locales/ar.json';
import zh from '@/locales/zh.json';
import ja from '@/locales/ja.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
      es: { translation: es },
      pt: { translation: pt },
      nl: { translation: nl },
      pl: { translation: pl },
      ru: { translation: ru },
      ar: { translation: ar },
      zh: { translation: zh },
      ja: { translation: ja },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Apply RTL on language change
i18n.on('languageChanged', (lng) => {
  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lng);
  document.documentElement.dir = (meta as any)?.rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;