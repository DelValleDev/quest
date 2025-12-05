import { useCallback } from "react";
import { useLanguageStore } from "../store";
import i18n from "./i18n";

/**
 * Hook to use translations in React components
 * Re-renders when language changes
 *
 * Usage:
 * const { t, language, setLanguage } = useTranslation();
 * <Text>{t('home.greeting.morning')}</Text>
 */
export function useTranslation() {
  const { language, setLanguage } = useLanguageStore();

  // Ensure i18n locale is synced with store
  if (i18n.locale !== language) {
    i18n.locale = language;
  }

  const t = useCallback(
    (key: string, options?: object): string => {
      return i18n.t(key, options);
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    isEnglish: language === "en",
    isSpanish: language === "es",
  };
}

/**
 * Simple translation function for use outside components
 * Note: Won't trigger re-renders, use useTranslation hook in components
 */
export function translate(key: string, options?: object): string {
  return i18n.t(key, options);
}

export default useTranslation;
