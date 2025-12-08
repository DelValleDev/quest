import { create } from "zustand";
import { ThemeMode } from "../theme/colors";

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "dark", // Default to dark mode
  toggleTheme: () =>
    set((state) => ({ mode: state.mode === "dark" ? "light" : "dark" })),
  setTheme: (mode) => set({ mode }),
}));
