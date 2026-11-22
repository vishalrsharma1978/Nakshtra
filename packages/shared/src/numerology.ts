// Numerology for the built-in Guru: Mulank (birth number), Bhagyank (destiny number),
// Name number (Chaldean), the current Personal Year, and what each number means.
// Pure functions, no network. Traditions differ; this follows the common Indian
// (Vedic/Chaldean) method and is presented as guidance, not as a guarantee.

export interface NumerologyProfile {
  /** Root of the day of birth (1-9): the "inner self" */
  mulank: number;
  /** Root of the full date of birth (1-9): the life path / destiny */
  bhagyank: number;
  /** Root of the name using Chaldean values (1-9), when a name is given */
  nameNumber: number | null;
  /** Year-cycle number for the given year (1-9) */
  personalYear: number;
  /** The planet that rules the Mulank */
  mulankPlanet: string;
  bhagyankPlanet: string;
}

/** Reduce to a single digit 1-9. */
export function digitalRoot(n: number): number {
  let x = Math.abs(Math.floor(n));
  if (x === 0) return 0;
  while (x > 9) {
    x = String(x)
      .split("")
      .reduce((a, d) => a + Number(d), 0);
  }
  return x;
}

/** Planet ruling each number (Indian numerology). */
export const NUMBER_PLANET: Record<number, string> = {
  1: "Sun",
  2: "Moon",
  3: "Jupiter",
  4: "Rahu",
  5: "Mercury",
  6: "Venus",
  7: "Ketu",
  8: "Saturn",
  9: "Mars",
};

/** Chaldean letter values (no letter maps to 9; 9 is considered sacred). */
const CHALDEAN: Record<string, number> = {
  A: 1,
  I: 1,
  J: 1,
  Q: 1,
  Y: 1,
  B: 2,
  K: 2,
  R: 2,
  C: 3,
  G: 3,
  L: 3,
  S: 3,
  D: 4,
  M: 4,
  T: 4,
  E: 5,
  H: 5,
  N: 5,
  X: 5,
  U: 6,
  V: 6,
  W: 6,
  O: 7,
  Z: 7,
  F: 8,
  P: 8,
};

export function nameNumber(name: string): number | null {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  if (!letters) return null;
  const sum = letters.split("").reduce((a, ch) => a + (CHALDEAN[ch] ?? 0), 0);
  return digitalRoot(sum);
}

export function computeNumerology(
  dob: string,
  name: string | undefined,
  year: number,
): NumerologyProfile {
  const [y, m, d] = dob.split("-").map(Number);
  const mulank = digitalRoot(d);
  const bhagyank = digitalRoot(
    String(y)
      .split("")
      .concat(String(m).split(""), String(d).split(""))
      .reduce((a, ch) => a + Number(ch), 0),
  );
  return {
    mulank,
    bhagyank,
    nameNumber: name ? nameNumber(name) : null,
    personalYear: digitalRoot(d + m + digitalRoot(year)),
    mulankPlanet: NUMBER_PLANET[mulank],
    bhagyankPlanet: NUMBER_PLANET[bhagyank],
  };
}

export interface NumberReading {
  title: string;
  nature: string;
  strengths: string;
  watchOut: string;
  career: string;
  love: string;
  luckyDay: string;
  luckyColours: string;
  luckyNumbers: string;
  friendly: number[];
  /** Short advice phrase used in remedies */
  tip: string;
}

export const NUMBER_READING: Record<number, NumberReading> = {
  1: {
    title: "The Leader (Sun)",
    nature:
      "independent, confident and born to lead; you like to start things and stand on your own feet",
    strengths: "leadership, willpower, originality and courage",
    watchOut: "ego, stubbornness and refusing help",
    career:
      "management, government, politics, entrepreneurship, administration",
    love: "loyal and proud; you need a partner who respects your independence",
    luckyDay: "Sunday",
    luckyColours: "gold, orange and saffron",
    luckyNumbers: "1, 4, 10, 19, 28",
    friendly: [2, 3, 9],
    tip: "lead with humility and listen before you decide",
  },
  2: {
    title: "The Peacemaker (Moon)",
    nature:
      "gentle, sensitive and intuitive; you read emotions well and prefer harmony",
    strengths: "diplomacy, imagination, caring and teamwork",
    watchOut: "mood swings, over-sensitivity and indecision",
    career: "counselling, teaching, nursing, hospitality, arts, public dealing",
    love: "deeply romantic and devoted; you need emotional security",
    luckyDay: "Monday",
    luckyColours: "white, cream and light green",
    luckyNumbers: "2, 7, 11, 16, 20",
    friendly: [1, 3, 5],
    tip: "keep a calm routine and speak up about your feelings",
  },
  3: {
    title: "The Teacher (Jupiter)",
    nature:
      "optimistic, wise and expressive; you inspire others and love learning",
    strengths: "wisdom, creativity, communication and generosity",
    watchOut: "over-promising, scattering energy and being preachy",
    career: "teaching, law, finance, advisory, writing, spiritual work",
    love: "warm and generous; you value a partner who grows with you",
    luckyDay: "Thursday",
    luckyColours: "yellow, gold and light orange",
    luckyNumbers: "3, 12, 21, 30",
    friendly: [1, 2, 9],
    tip: "finish what you start and keep your word",
  },
  4: {
    title: "The Builder (Rahu)",
    nature:
      "practical, hard-working and unconventional; you think differently and build step by step",
    strengths: "discipline, organisation, loyalty and technical skill",
    watchOut: "rigidity, sudden setbacks and suspicion",
    career:
      "engineering, technology, research, real estate, systems and analysis",
    love: "steady and loyal; you show love through actions more than words",
    luckyDay: "Saturday (and Sunday)",
    luckyColours: "blue, grey and electric shades",
    luckyNumbers: "4, 8, 13, 22, 31",
    friendly: [1, 5, 6, 7, 8],
    tip: "plan carefully, avoid shortcuts and stay flexible",
  },
  5: {
    title: "The Communicator (Mercury)",
    nature: "quick, curious and adaptable; you love change, travel and ideas",
    strengths: "intelligence, communication, business sense and versatility",
    watchOut: "restlessness, nervous energy and impatience",
    career: "business, sales, media, writing, accounting, travel, technology",
    love: "playful and charming; you need variety and mental connection",
    luckyDay: "Wednesday",
    luckyColours: "green and light grey",
    luckyNumbers: "5, 14, 23, 32",
    friendly: [1, 4, 6],
    tip: "focus on one goal at a time and rest your mind",
  },
  6: {
    title: "The Nurturer (Venus)",
    nature:
      "loving, artistic and responsible; you value beauty, family and comfort",
    strengths: "care, creativity, charm and a sense of duty",
    watchOut: "overindulgence, jealousy and taking on too much for others",
    career:
      "arts, design, fashion, hospitality, medicine, luxury and entertainment",
    love: "romantic and committed; family is central to you",
    luckyDay: "Friday",
    luckyColours: "white, pink and light blue",
    luckyNumbers: "6, 15, 24, 33",
    friendly: [3, 5, 9],
    tip: "balance giving with looking after yourself",
  },
  7: {
    title: "The Seeker (Ketu)",
    nature:
      "thoughtful, spiritual and analytical; you look for the deeper meaning in things",
    strengths: "insight, research, intuition and independence",
    watchOut: "isolation, secrecy, doubt and over-thinking",
    career: "research, spirituality, healing, science, writing and analysis",
    love: "private and deep; you need space and a partner who understands your silence",
    luckyDay: "Monday (and Sunday)",
    luckyColours: "light green, white and pastel shades",
    luckyNumbers: "7, 16, 25, 34",
    friendly: [1, 2, 5],
    tip: "meditate, trust your intuition and stay connected to people",
  },
  8: {
    title: "The Achiever (Saturn)",
    nature:
      "ambitious, disciplined and patient; results come late but last long",
    strengths: "perseverance, authority, organisation and fairness",
    watchOut: "pessimism, workaholism, delays and harsh self-judgement",
    career:
      "business, law, administration, construction, mining, service and politics",
    love: "serious and loyal; you open up slowly and love for the long term",
    luckyDay: "Saturday",
    luckyColours: "dark blue, black and deep purple",
    luckyNumbers: "8, 17, 26, 35",
    friendly: [1, 4, 5, 6],
    tip: "be patient, serve others and never cut corners",
  },
  9: {
    title: "The Warrior (Mars)",
    nature:
      "energetic, courageous and compassionate; you fight for what is right",
    strengths: "courage, drive, generosity and leadership in crises",
    watchOut: "anger, impulsiveness and impatience",
    career:
      "defence, police, sports, surgery, engineering, property and competitive fields",
    love: "passionate and protective; you need a partner who can match your energy",
    luckyDay: "Tuesday",
    luckyColours: "red, crimson and coral",
    luckyNumbers: "9, 18, 27, 36",
    friendly: [1, 2, 3],
    tip: "channel your energy into exercise and count to ten before reacting",
  },
};

export const PERSONAL_YEAR_THEME: Record<number, string> = {
  1: "a year of new beginnings: start the project, job or habit you have been postponing",
  2: "a year of patience, relationships and partnerships: slow down and cooperate",
  3: "a year of expression, learning and joy: write, speak, teach and socialise",
  4: "a year of hard work and foundations: organise your finances, health and home",
  5: "a year of change, travel and freedom: expect movement, new contacts and decisions",
  6: "a year of family, love and responsibility: home, marriage and care take priority",
  7: "a year of reflection and inner growth: study, rest, meditate and review your path",
  8: "a year of power, money and results: your efforts of the past years bear fruit",
  9: "a year of completion and letting go: finish old chapters and forgive",
};

/** How two numbers get along (very general, based on friendly numbers). */
export function numbersCompatible(
  a: number,
  b: number,
): "good" | "neutral" | "careful" {
  if (
    NUMBER_READING[a].friendly.includes(b) ||
    NUMBER_READING[b].friendly.includes(a)
  )
    return "good";
  if (a === b) return "neutral";
  return "careful";
}
