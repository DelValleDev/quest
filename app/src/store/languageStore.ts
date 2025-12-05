import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "../lib/i18n";

type Language = "en" | "es";

const getDeviceLanguage = (): Language => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0].languageCode) {
      const lang = locales[0].languageCode;
      return lang === "es" ? "es" : "en";
    }
    return "en";
  } catch {
    return "en";
  }
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  initLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: getDeviceLanguage(),

      setLanguage: (lang: Language) => {
        i18n.locale = lang;
        set({ language: lang });
      },

      initLanguage: () => {
        // This is called on app start to sync i18n with stored language
        const storedLang = useLanguageStore.getState().language;
        i18n.locale = storedLang;
      },
    }),
    {
      name: "quest-language",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
