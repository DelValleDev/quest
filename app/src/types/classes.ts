// User class types

export type UserClass = "warrior" | "sage" | "connector" | "creator";

export interface ClassInfo {
  id: UserClass;
  name: string;
  emoji: string;
  title: string;
  description: string;
  focusPillar: string;
}

export const USER_CLASSES: Record<UserClass, ClassInfo> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    emoji: "⚔️",
    title: "The Warrior",
    description:
      "Focus on fitness, health, and physical strength. Master your body.",
    focusPillar: "physical",
  },
  sage: {
    id: "sage",
    name: "Sage",
    emoji: "📚",
    title: "The Sage",
    description:
      "Focus on learning, productivity, and mental growth. Master your mind.",
    focusPillar: "mental",
  },
  connector: {
    id: "connector",
    name: "Connector",
    emoji: "🤝",
    title: "The Connector",
    description:
      "Focus on relationships, community, and social wellbeing. Master your connections.",
    focusPillar: "social",
  },
  creator: {
    id: "creator",
    name: "Creator",
    emoji: "🎨",
    title: "The Creator",
    description:
      "Focus on creativity, art, and self-expression. Master your craft.",
    focusPillar: "creative",
  },
};

export const CLASS_LIST = Object.values(USER_CLASSES);
