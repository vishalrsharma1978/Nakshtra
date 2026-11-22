// Daily horoscope generated from the real sky, with no database row needed.
//
// For the user's Moon sign (Chandra Rashi, the standard basis for Indian daily
// horoscopes) we read where the slow planets and the Moon are TODAY, counted from
// that sign, and turn them into a short, plain-language forecast. The same sign and
// date always give the same text; a different day gives different text, because the
// planets move. If the user's kundli is known we use their Moon sign, otherwise the
// sun sign from their date of birth.

import { ZODIAC_SIGNS, type ZodiacSign } from "./constants";
import { computeKundli, type PlanetPosition } from "./kundli";

export interface DailyHoroscope {
  /** YYYY-MM-DD the forecast is for */
  date: string;
  sign: ZodiacSign;
  headline: string;
  /** The full paragraph shown to the user */
  text: string;
  love: string;
  career: string;
  money: string;
  health: string;
  /** 1-5 star rating per area, derived from the transits */
  ratings: { love: number; career: number; money: number; health: number };
  luckyColour: string;
  luckyNumber: number;
  luckyTime: string;
  mood: string;
}

/** Whether the transit planet in house h from the Moon sign is favourable (Gochar rules). */
const GOOD_HOUSES: Record<string, number[]> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 7, 10, 11],
  Mars: [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 10, 11],
  Ketu: [3, 6, 11],
};

const MOON_HOUSE_LINE: string[] = [
  "",
  "You feel energetic and self-focused; trust your instincts today",
  "Family and money matters come into focus; speak kindly",
  "Courage and communication are strong; a good day to reach out to people",
  "Home and inner peace matter most; take some quiet time",
  "Creativity, learning and romance are favoured",
  "A good day to clear pending work, but watch your diet and stress",
  "Partnerships and meetings go well; cooperate rather than compete",
  "Go slowly: avoid risks and heated discussions",
  "Luck supports you; a good day to learn, travel or seek advice",
  "Work and status are highlighted; your effort will be noticed",
  "Gains and good news through friends and contacts",
  "Rest and spending are indicated; avoid unnecessary costs",
];

const COLOURS = [
  "Red",
  "White",
  "Green",
  "Silver",
  "Gold",
  "Green",
  "Pink",
  "Maroon",
  "Yellow",
  "Blue",
  "Sky blue",
  "Sea green",
];
const SIGN_RULER_NUM = [9, 6, 5, 2, 1, 5, 6, 9, 3, 8, 8, 3];
const LUCKY_TIMES = [
  "6:00 - 8:00 am",
  "9:00 - 11:00 am",
  "11:00 am - 1:00 pm",
  "1:00 - 3:00 pm",
  "3:00 - 5:00 pm",
  "5:00 - 7:00 pm",
];

const MOODS = [
  "Calm and steady",
  "Hopeful and bright",
  "Focused and driven",
  "Thoughtful and quiet",
  "Warm and social",
  "Patient and careful",
];

const stars = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

function planetHouse(
  planets: PlanetPosition[],
  name: string,
  fromSign: number,
) {
  const p = planets.find((x) => x.planet === name);
  if (!p) return null;
  return ((p.signIndex - fromSign + 12) % 12) + 1;
}

/** Midday UTC of a given local calendar day, so the Moon position is stable for the day. */
function noonUtc(isoDate: string): { date: string; time: string } {
  return { date: isoDate, time: "06:30" }; // 12:00 IST = 06:30 UTC; fixed reference moment
}

/**
 * @param moonSignIndex 0-11 sidereal sign of the user's Moon (Aries=0); pass the sun-sign
 *                      index when the kundli is not available.
 * @param isoDate       the local calendar day, YYYY-MM-DD
 */
export function dailyHoroscopeFor(
  moonSignIndex: number,
  isoDate: string,
): DailyHoroscope {
  const idx = ((moonSignIndex % 12) + 12) % 12;
  // Aries-first order in our sign list is Mar-Apr; ZODIAC_SIGNS follows the same order.
  const sign = ZODIAC_SIGNS[idx];

  // Sky at midday on that day (observer position hardly matters for sign positions)
  const ref = noonUtc(isoDate);
  const sky = computeKundli({
    date: ref.date,
    time: ref.time,
    utcOffsetMinutes: 0,
    latitude: 28.6139,
    longitude: 77.209,
  });
  const planets = sky.planets;
  const moonSky = planets.find((p) => p.planet === "Moon")!;

  const h = (name: string) => planetHouse(planets, name, idx) ?? 1;
  const moonH = h("Moon");
  const jup = h("Jupiter");
  const sat = h("Saturn");
  const ven = h("Venus");
  const mar = h("Mars");
  const mer = h("Mercury");
  const sun = h("Sun");

  const good = (name: string, house: number) =>
    GOOD_HOUSES[name].includes(house);

  // Area scores: start from 3 and move with the planets that govern each area
  const love =
    3 +
    (good("Venus", ven) ? 1 : -0.5) +
    (good("Moon", moonH) ? 0.5 : 0) +
    ([5, 7].includes(moonH) ? 0.5 : 0) +
    (good("Jupiter", jup) ? 0.5 : 0);
  const career =
    3 +
    (good("Sun", sun) ? 0.5 : 0) +
    (good("Saturn", sat) ? 1 : -0.5) +
    (moonH === 10 ? 1 : 0) +
    (good("Mercury", mer) ? 0.5 : 0);
  const money =
    3 +
    (good("Jupiter", jup) ? 1 : -0.5) +
    ([2, 11].includes(moonH) ? 1 : 0) +
    (good("Mercury", mer) ? 0.5 : 0);
  const health =
    3 +
    (good("Mars", mar) ? 0.5 : -0.5) +
    (good("Moon", moonH) ? 0.5 : -0.5) +
    ([6, 8, 12].includes(moonH) ? -0.5 : 0.5);

  const ratings = {
    love: stars(love),
    career: stars(career),
    money: stars(money),
    health: stars(health),
  };
  const overall =
    (ratings.love + ratings.career + ratings.money + ratings.health) / 4;

  const headline =
    overall >= 4
      ? "A bright and supportive day"
      : overall >= 3.25
        ? "A steady day with good chances"
        : overall >= 2.5
          ? "A mixed day: go step by step"
          : "A day for patience and care";

  const line = (
    area: number,
    goodText: string,
    midText: string,
    lowText: string,
  ) => (area >= 4 ? goodText : area >= 3 ? midText : lowText);

  const loveText = line(
    ratings.love,
    "Warmth and understanding flow in relationships. Say what you feel and make time for someone special.",
    "Relationships are calm. Small gestures and listening matter more than big words today.",
    "Misunderstandings are possible. Stay patient and avoid arguments with loved ones.",
  );
  const careerText = line(
    ratings.career,
    "Your effort is noticed and progress is likely. Take the lead on something important.",
    "Work moves at a steady pace. Finish pending tasks and avoid taking on too much.",
    "Delays or pressure may test you. Stay disciplined, double-check details and avoid conflict at work.",
  );
  const moneyText = line(
    ratings.money,
    "A good day for gains, savings or a sensible purchase. Help may come from a friend or elder.",
    "Income and spending stay balanced. Stick to your budget.",
    "Avoid impulsive spending, lending or risky investments today.",
  );
  const healthText = line(
    ratings.health,
    "Your energy is good. A walk, stretching or time outdoors will keep it high.",
    "Energy is average. Drink enough water and keep regular meal times.",
    "Rest more than usual and avoid heavy or spicy food. Do not ignore tiredness.",
  );

  const jupLine = good("Jupiter", jup)
    ? "Jupiter's support brings luck, wisdom and good advice."
    : "Jupiter asks you to be patient with big plans.";
  const satLine = [12, 1, 2].includes(sat)
    ? " Saturn is close to your sign (Sade Sati), so steady discipline pays off."
    : good("Saturn", sat)
      ? " Saturn rewards hard work today."
      : "";
  const text = `${headline}. ${MOON_HOUSE_LINE[moonH]}. ${jupLine}${satLine} Love: ${loveText} Career: ${careerText} Money: ${moneyText} Health: ${healthText}`;

  // Deterministic lucky details from the sign and the Moon's position that day
  const dayNum = Number(isoDate.slice(8, 10));
  const luckyNumber = ((SIGN_RULER_NUM[idx] + dayNum - 1) % 9) + 1;
  const luckyColour = COLOURS[(idx + moonSky.signIndex) % COLOURS.length];
  const luckyTime = LUCKY_TIMES[(idx + dayNum) % LUCKY_TIMES.length];
  const mood = MOODS[(idx + moonSky.signIndex + dayNum) % MOODS.length];

  return {
    date: isoDate,
    sign,
    headline,
    text,
    love: loveText,
    career: careerText,
    money: moneyText,
    health: healthText,
    ratings,
    luckyColour,
    luckyNumber,
    luckyTime,
    mood,
  };
}

/** Local calendar day as YYYY-MM-DD (not UTC, so it matches the user's wall clock). */
export function localIsoDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
