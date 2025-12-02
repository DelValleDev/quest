// Pillar types and constants for Quest

export type PillarType =
  | "physical"
  | "mental"
  | "social"
  | "professional"
  | "spiritual"
  | "creative";

export interface Pillar {
  id: PillarType;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const PILLARS: Record<PillarType, Pillar> = {
  physical: {
    id: "physical",
    name: "Physical",
    emoji: "💪",
    description: "Exercise, nutrition, health, sleep",
    color: "#EF4444",
  },
  mental: {
    id: "mental",
    name: "Mental",
    emoji: "🧠",
    description: "Learning, reading, productivity, focus",
    color: "#3B82F6",
  },
  social: {
    id: "social",
    name: "Social",
    emoji: "❤️",
    description: "Friends, family, networking, community",
    color: "#EC4899",
  },
  professional: {
    id: "professional",
    name: "Professional",
    emoji: "💰",
    description: "Career, projects, skills, growth",
    color: "#10B981",
  },
  spiritual: {
    id: "spiritual",
    name: "Spiritual",
    emoji: "🕊️",
    description: "Peace, purpose, reflection, gratitude",
    color: "#8B5CF6",
  },
  creative: {
    id: "creative",
    name: "Creative",
    emoji: "🎨",
    description: "Art, music, writing, hobbies",
    color: "#F97316",
  },
};

export const PILLAR_LIST = Object.values(PILLARS);
