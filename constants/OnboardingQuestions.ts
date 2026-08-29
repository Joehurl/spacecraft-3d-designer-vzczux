export interface OnboardingOption {
  id: string;
  emoji: string;
  label: string;
}

export interface OnboardingQuestion {
  id: string;
  title: string;
  subtitle: string;
  options: OnboardingOption[];
}

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: 'purpose',
    title: 'What will you design?',
    subtitle: "We'll customize your experience",
    options: [
      { id: 'home', emoji: '🏠', label: 'My Home' },
      { id: 'apartment', emoji: '🏢', label: 'Apartment' },
      { id: 'office', emoji: '💼', label: 'Office Space' },
      { id: 'commercial', emoji: '🏪', label: 'Commercial' },
    ],
  },
  {
    id: 'experience',
    title: 'Your design experience?',
    subtitle: "We'll adjust the tools for you",
    options: [
      { id: 'beginner', emoji: '🌱', label: 'Just Starting' },
      { id: 'hobbyist', emoji: '🎨', label: 'Hobbyist' },
      { id: 'professional', emoji: '⭐', label: 'Professional' },
      { id: 'architect', emoji: '📐', label: 'Architect/Designer' },
    ],
  },
  {
    id: 'style',
    title: 'Your favorite style?',
    subtitle: "We'll suggest matching furniture",
    options: [
      { id: 'modern', emoji: '◼️', label: 'Modern' },
      { id: 'scandinavian', emoji: '🌿', label: 'Scandinavian' },
      { id: 'industrial', emoji: '⚙️', label: 'Industrial' },
      { id: 'bohemian', emoji: '🌸', label: 'Bohemian' },
    ],
  },
  {
    id: 'goal',
    title: "What's your main goal?",
    subtitle: 'Help us show you the right features',
    options: [
      { id: 'visualize', emoji: '👁️', label: 'Visualize Space' },
      { id: 'plan', emoji: '📐', label: 'Plan a Move' },
      { id: 'decorate', emoji: '🛋️', label: 'Redecorate' },
      { id: 'buy', emoji: '🛒', label: 'Shop Furniture' },
    ],
  },
];
