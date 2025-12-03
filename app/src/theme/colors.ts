// Quest App Color Themes
// Supports both dark and light mode

export const colors = {
  // Brand Colors
  primary: "#7C3AED", // Purple - transformation, gaming
  secondary: "#06B6D4", // Cyan - energy, progress
  accent: "#F59E0B", // Gold - achievements, rewards

  // Pillar Colors
  pillars: {
    physical: "#EF4444", // Red - strength, power
    mental: "#3B82F6", // Blue - intelligence, focus
    social: "#EC4899", // Pink - love, connection
    professional: "#10B981", // Green - growth, money
    spiritual: "#8B5CF6", // Purple - peace, inner
    creative: "#F97316", // Orange - creativity, art
  },

  // Dark Theme
  dark: {
    background: "#0F0F1A",
    surface: "#1A1A2E",
    surfaceLight: "#252540",
    card: "#1A1A2E",
    text: "#FFFFFF",
    textSecondary: "#A0A0B0",
    textMuted: "#6B6B80",
    border: "#2D2D42",
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
  },

  // Light Theme
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceLight: "#F1F5F9",
    card: "#FFFFFF",
    text: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    success: "#22C55E",
    error: "#EF4444",
    warning: "#F59E0B",
  },
};

export type ThemeMode = "dark" | "light";

export const getTheme = (mode: ThemeMode) => ({
  ...colors[mode],
  primary: colors.primary,
  secondary: colors.secondary,
  accent: colors.accent,
  pillars: colors.pillars,
});
