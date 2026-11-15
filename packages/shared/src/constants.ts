import type { Language } from './types';

export interface ZodiacSign {
  key: string;
  en: string;
  hi: string;
  symbol: string;
  element: string;
  /** [startMonth, startDay] inclusive */
  start: [number, number];
  /** [endMonth, endDay] inclusive */
  end: [number, number];
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { key: 'aries', en: 'Aries', hi: 'मेष', symbol: '♈', element: 'Fire', start: [3, 21], end: [4, 19] },
  { key: 'taurus', en: 'Taurus', hi: 'वृषभ', symbol: '♉', element: 'Earth', start: [4, 20], end: [5, 20] },
  { key: 'gemini', en: 'Gemini', hi: 'मिथुन', symbol: '♊', element: 'Air', start: [5, 21], end: [6, 20] },
  { key: 'cancer', en: 'Cancer', hi: 'कर्क', symbol: '♋', element: 'Water', start: [6, 21], end: [7, 22] },
  { key: 'leo', en: 'Leo', hi: 'सिंह', symbol: '♌', element: 'Fire', start: [7, 23], end: [8, 22] },
  { key: 'virgo', en: 'Virgo', hi: 'कन्या', symbol: '♍', element: 'Earth', start: [8, 23], end: [9, 22] },
  { key: 'libra', en: 'Libra', hi: 'तुला', symbol: '♎', element: 'Air', start: [9, 23], end: [10, 22] },
  { key: 'scorpio', en: 'Scorpio', hi: 'वृश्चिक', symbol: '♏', element: 'Water', start: [10, 23], end: [11, 21] },
  { key: 'sagittarius', en: 'Sagittarius', hi: 'धनु', symbol: '♐', element: 'Fire', start: [11, 22], end: [12, 21] },
  { key: 'capricorn', en: 'Capricorn', hi: 'मकर', symbol: '♑', element: 'Earth', start: [12, 22], end: [1, 19] },
  { key: 'aquarius', en: 'Aquarius', hi: 'कुंभ', symbol: '♒', element: 'Air', start: [1, 20], end: [2, 18] },
  { key: 'pisces', en: 'Pisces', hi: 'मीन', symbol: '♓', element: 'Water', start: [2, 19], end: [3, 20] },
];

export const QUESTION_CATEGORIES = [
  'career',
  'love',
  'marriage',
  'health',
  'finance',
  'education',
  'family',
  'other',
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<QuestionCategory, Record<Language, string>> = {
  career: { en: 'Career', hi: 'करियर' },
  love: { en: 'Love', hi: 'प्रेम' },
  marriage: { en: 'Marriage', hi: 'विवाह' },
  health: { en: 'Health', hi: 'स्वास्थ्य' },
  finance: { en: 'Finance', hi: 'वित्त' },
  education: { en: 'Education', hi: 'शिक्षा' },
  family: { en: 'Family', hi: 'परिवार' },
  other: { en: 'Other', hi: 'अन्य' },
};

export const JITSI_BASE_URL = 'https://meet.jit.si';
