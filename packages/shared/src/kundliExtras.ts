// Extended kundli computations for the Royal Kundali report:
// divisional (varga) charts, transit chart, Ashtakavarga, Mandi/Gulika,
// Arudha Lagna, Bhrigu Bindu, Vimshottari antardashas and Varshaphal (solar return).

import { Body, Observer, SearchRiseSet } from "astronomy-engine";
import { OWN_SIGNS, PLANET_HI, RASHIS } from "./vedicData";
import {
  computeKundli,
  norm360,
  type BirthInput,
  type DashaPeriod,
  type Kundli,
  type PlanetPosition,
} from "./kundli";
import { DASHA_SEQUENCE } from "./vedicData";

export const VARGA_LIST: {
  code: string;
  division: number;
  name: string;
  hi: string;
}[] = [
  { code: "D1", division: 1, name: "Rashi (Lagna)", hi: "लग्न कुण्डली" },
  { code: "D2", division: 2, name: "Hora (Wealth)", hi: "होरा" },
  { code: "D3", division: 3, name: "Drekkana (Siblings)", hi: "द्रेष्काण" },
  { code: "D4", division: 4, name: "Chaturthamsa (Property)", hi: "चतुर्थांश" },
  { code: "D7", division: 7, name: "Saptamsa (Children)", hi: "सप्तांश" },
  { code: "D9", division: 9, name: "Navamsa (Spouse)", hi: "नवांश" },
  { code: "D10", division: 10, name: "Dasamsa (Career)", hi: "दशमांश" },
  { code: "D12", division: 12, name: "Dwadasamsa (Parents)", hi: "द्वादशांश" },
  { code: "D16", division: 16, name: "Shodasamsa (Vehicles)", hi: "षोडशांश" },
  { code: "D20", division: 20, name: "Vimsamsa (Spiritual)", hi: "विंशांश" },
  {
    code: "D24",
    division: 24,
    name: "Chaturvimsamsa (Education)",
    hi: "चतुर्विंशांश",
  },
  { code: "D27", division: 27, name: "Bhamsa (Strength)", hi: "सप्तविंशांश" },
  {
    code: "D30",
    division: 30,
    name: "Trimsamsa (Misfortunes)",
    hi: "त्रिंशांश",
  },
  { code: "D40", division: 40, name: "Khavedamsa (Maternal)", hi: "खवेदांश" },
  {
    code: "D45",
    division: 45,
    name: "Akshavedamsa (Paternal)",
    hi: "अक्षवेदांश",
  },
  { code: "D60", division: 60, name: "Shashtiamsa (Karma)", hi: "षष्ट्यांश" },
];

const MOVABLE = [0, 3, 6, 9];
const FIXED = [1, 4, 7, 10];

const isOdd = (signIndex: number) => signIndex % 2 === 0; // Aries(0) is odd sign

/** Sign index (0-11) of a sidereal longitude in the given divisional chart (Parashara). */
export function vargaSign(longitude: number, division: number): number {
  const lon = norm360(longitude);
  const signIndex = Math.floor(lon / 30);
  const deg = lon - signIndex * 30;
  // Multiply (not divide by 30/n) and add a tiny epsilon so exact part boundaries
  // (e.g. 10° for D3, D9, D12) don't fall into the previous part through float error.
  const part = (n: number) =>
    Math.min(Math.floor((deg * n) / 30 + 1e-9), n - 1);
  const odd = isOdd(signIndex);

  switch (division) {
    case 1:
      return signIndex;
    case 2: {
      // Parashara hora: odd signs Sun(Leo) first half, Moon(Cancer) second; reverse for even
      const first = deg < 15;
      return odd ? (first ? 4 : 3) : first ? 3 : 4;
    }
    case 3:
      return (signIndex + part(3) * 4) % 12;
    case 4:
      return (signIndex + part(4) * 3) % 12;
    case 7:
      return (signIndex + (odd ? 0 : 6) + part(7)) % 12;
    case 9: {
      const start = MOVABLE.includes(signIndex)
        ? signIndex
        : FIXED.includes(signIndex)
          ? signIndex + 8
          : signIndex + 4;
      return (start + part(9)) % 12;
    }
    case 10:
      return (signIndex + (odd ? 0 : 8) + part(10)) % 12;
    case 12:
      return (signIndex + part(12)) % 12;
    case 16: {
      const start = MOVABLE.includes(signIndex)
        ? 0
        : FIXED.includes(signIndex)
          ? 4
          : 8;
      return (start + part(16)) % 12;
    }
    case 20: {
      const start = MOVABLE.includes(signIndex)
        ? 0
        : FIXED.includes(signIndex)
          ? 8
          : 4;
      return (start + part(20)) % 12;
    }
    case 24: {
      const start = odd ? 4 : 3; // Leo for odd signs, Cancer for even
      return (start + part(24)) % 12;
    }
    case 27: {
      const element = signIndex % 4; // 0 fire, 1 earth, 2 air, 3 water
      const start = [0, 3, 6, 9][element];
      return (start + part(27)) % 12;
    }
    case 30: {
      // Trimsamsa: unequal parts (5,5,8,7,5) ruled by Mars, Saturn, Jupiter, Mercury, Venus
      const oddMap = [
        { to: 5, sign: 0 },
        { to: 10, sign: 10 },
        { to: 18, sign: 8 },
        { to: 25, sign: 2 },
        { to: 30, sign: 6 },
      ];
      const evenMap = [
        { to: 5, sign: 1 },
        { to: 12, sign: 5 },
        { to: 20, sign: 11 },
        { to: 25, sign: 9 },
        { to: 30, sign: 7 },
      ];
      const map = odd ? oddMap : evenMap;
      return (map.find((m) => deg < m.to) ?? map[4]).sign;
    }
    case 40: {
      const start = odd ? 0 : 6; // Aries for odd, Libra for even
      return (start + part(40)) % 12;
    }
    case 45: {
      const start = MOVABLE.includes(signIndex)
        ? 0
        : FIXED.includes(signIndex)
          ? 4
          : 8;
      return (start + part(45)) % 12;
    }
    case 60:
      return (signIndex + Math.min(Math.floor(deg * 2 + 1e-9), 59)) % 12;
    default:
      return signIndex;
  }
}

export interface ChartMarker {
  label: string;
  /** Sign index 0-11 in this chart */
  signIndex: number;
}

export interface VargaChart {
  code: string;
  name: string;
  hi: string;
  lagnaSignIndex: number;
  markers: ChartMarker[];
}

const ABBR: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

export function planetAbbr(p: PlanetPosition): string {
  const retro =
    p.retrograde && p.planet !== "Rahu" && p.planet !== "Ketu" ? "(R)" : "";
  return ABBR[p.planet] + retro;
}

// ---------------------------------------------------------------- Mandi / Gulika

export interface SpecialPoints {
  sunrise: Date | null;
  sunset: Date | null;
  gulika: {
    longitude: number;
    signIndex: number;
    sign: string;
    degreeInSign: number;
  };
  mandi: {
    longitude: number;
    signIndex: number;
    sign: string;
    degreeInSign: number;
  };
  arudhaLagna: { signIndex: number; sign: string };
  bhriguBindu: {
    longitude: number;
    signIndex: number;
    sign: string;
    degreeInSign: number;
  };
}

// Saturn's part (1-8) of day / night for each weekday (0 = Sunday)
const SATURN_DAY_PART = [7, 6, 5, 4, 3, 2, 1]; // Sun..Sat daytime (Sunday: 7th part)
const SATURN_NIGHT_PART = [3, 2, 1, 7, 6, 5, 4];

/**
 * Tropical ascendant, duplicated here (private in kundli.ts) via the public Kundli
 * data is not possible for arbitrary times, so we reuse computeKundli at that instant.
 */
function lagnaLongitudeAt(utc: Date, input: BirthInput): number {
  const local = new Date(utc.getTime() + input.utcOffsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const k = computeKundli({
    ...input,
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  });
  return k.lagna.longitude;
}

function pointInfo(lon: number) {
  const l = norm360(lon);
  const signIndex = Math.floor(l / 30);
  return {
    longitude: l,
    signIndex,
    sign: RASHIS[signIndex].en,
    degreeInSign: l - signIndex * 30,
  };
}

export function computeSpecialPoints(
  input: BirthInput,
  k: Kundli,
): SpecialPoints {
  const observer = new Observer(input.latitude, input.longitude, 0);
  const birth = k.utcDate;
  const localMs = birth.getTime() + input.utcOffsetMinutes * 60_000;
  const localDayStartUtc = new Date(
    Math.floor(localMs / 86_400_000) * 86_400_000 -
      input.utcOffsetMinutes * 60_000,
  );
  const weekday = new Date(localMs).getUTCDay();

  // Sunrise/sunset of the local civil day
  const rise = SearchRiseSet(Body.Sun, observer, +1, localDayStartUtc, 1);
  const set = SearchRiseSet(Body.Sun, observer, -1, localDayStartUtc, 1);
  let sunrise = rise ? rise.date : null;
  let sunset = set ? set.date : null;

  let gulikaLon = k.lagna.longitude;
  let mandiLon = k.lagna.longitude;

  if (sunrise && sunset) {
    // If born before sunrise, use previous day's sunset → today's sunrise as the night
    const born = birth.getTime();
    let isDay = born >= sunrise.getTime() && born < sunset.getTime();
    let start: number;
    let len: number;
    let dayIdx = weekday;
    if (isDay) {
      start = sunrise.getTime();
      len = sunset.getTime() - sunrise.getTime();
    } else if (born >= sunset.getTime()) {
      const nextRise = SearchRiseSet(Body.Sun, observer, +1, sunset, 1);
      start = sunset.getTime();
      len =
        (nextRise
          ? nextRise.date.getTime()
          : sunset.getTime() + 12 * 3_600_000) - start;
    } else {
      // before sunrise: night of previous weekday
      const prevSet = SearchRiseSet(
        Body.Sun,
        observer,
        -1,
        new Date(localDayStartUtc.getTime() - 86_400_000),
        1,
      );
      start = prevSet
        ? prevSet.date.getTime()
        : sunrise.getTime() - 12 * 3_600_000;
      len = sunrise.getTime() - start;
      dayIdx = (weekday + 6) % 7;
    }
    const partLen = len / 8;
    const gulikaPart = (isDay ? SATURN_DAY_PART : SATURN_NIGHT_PART)[dayIdx];
    // Gulika: start of Saturn's part; Mandi: middle of Saturn's part
    const gulikaTime = new Date(start + (gulikaPart - 1) * partLen);
    const mandiTime = new Date(start + (gulikaPart - 0.5) * partLen);
    gulikaLon = lagnaLongitudeAt(gulikaTime, input);
    mandiLon = lagnaLongitudeAt(mandiTime, input);
    sunrise = rise ? rise.date : sunrise;
  }

  // Arudha Lagna (Pada of 1st house): lord of lagna placed N houses from lagna; AL = N houses from lord
  const lagnaIdx = k.lagna.signIndex;
  const lordName = RASHIS[lagnaIdx].lord;
  const lord = k.planets.find((p) => p.planet === lordName)!;
  const dist = ((lord.signIndex - lagnaIdx + 12) % 12) + 1; // house of lord from lagna
  let alIdx = (lord.signIndex + dist - 1) % 12;
  // Exceptions: AL in lagna or 7th from lagna → take 10th from it
  if (alIdx === lagnaIdx) alIdx = (alIdx + 9) % 12;
  else if (alIdx === (lagnaIdx + 6) % 12) alIdx = (alIdx + 9) % 12;

  // Bhrigu Bindu: midpoint of Rahu and Moon (the shorter arc going from Rahu to Moon)
  const moon = k.planets.find((p) => p.planet === "Moon")!;
  const rahu = k.planets.find((p) => p.planet === "Rahu")!;
  const arc = norm360(moon.longitude - rahu.longitude);
  const bb = norm360(rahu.longitude + arc / 2);

  return {
    sunrise,
    sunset,
    gulika: pointInfo(gulikaLon),
    mandi: pointInfo(mandiLon),
    arudhaLagna: { signIndex: alIdx, sign: RASHIS[alIdx].en },
    bhriguBindu: pointInfo(bb),
  };
}

/** Builds all divisional charts, each carrying Gulika (Gk), Mandi (Md), Arudha Lagna (AL) and Bhrigu Bindu (BB). */
export function computeVargaCharts(
  k: Kundli,
  special: SpecialPoints,
): VargaChart[] {
  return VARGA_LIST.map((v) => {
    const lagnaSign = vargaSign(k.lagna.longitude, v.division);
    const markers: ChartMarker[] = k.planets.map((p) => ({
      label: planetAbbr(p),
      signIndex: vargaSign(p.longitude, v.division),
    }));
    markers.push({
      label: "Gk",
      signIndex: vargaSign(special.gulika.longitude, v.division),
    });
    markers.push({
      label: "Md",
      signIndex: vargaSign(special.mandi.longitude, v.division),
    });
    markers.push({
      label: "BP",
      signIndex: vargaSign(special.bhriguBindu.longitude, v.division),
    });
    // Arudha Lagna is a rashi-chart concept; for vargas map its sign by the same lagna offset
    const alOffset =
      (special.arudhaLagna.signIndex - k.lagna.signIndex + 12) % 12;
    markers.push({ label: "AL", signIndex: (lagnaSign + alOffset) % 12 });
    return {
      code: v.code,
      name: v.name,
      hi: v.hi,
      lagnaSignIndex: lagnaSign,
      markers,
    };
  });
}

// ---------------------------------------------------------------- Transit chart

export interface TransitChart {
  date: Date;
  chart: VargaChart;
  planets: PlanetPosition[];
  /** Transit houses counted from natal Moon */
  fromMoon: { planet: string; house: number }[];
}

export function computeTransitChart(
  input: BirthInput,
  natal: Kundli,
  special: SpecialPoints,
  when: Date = new Date(),
): TransitChart {
  const local = new Date(when.getTime() + input.utcOffsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = computeKundli({
    ...input,
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  });
  const natalSpecial = special;
  const markers: ChartMarker[] = t.planets.map((p) => ({
    label: planetAbbr(p),
    signIndex: p.signIndex,
  }));
  markers.push({ label: "BP", signIndex: natalSpecial.bhriguBindu.signIndex });
  const natalMoon = natal.planets.find((p) => p.planet === "Moon")!;
  return {
    date: when,
    // Transit chart is drawn on the natal lagna so houses read as effects on the native
    chart: {
      code: "Transit",
      name: "Gochar (Current Transit)",
      hi: "गोचर कुण्डली",
      lagnaSignIndex: natal.lagna.signIndex,
      markers,
    },
    planets: t.planets,
    fromMoon: t.planets.map((p) => ({
      planet: p.planet,
      house: ((p.signIndex - natalMoon.signIndex + 12) % 12) + 1,
    })),
  };
}

// ---------------------------------------------------------------- Ashtakavarga

const BAV_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
] as const;
type BavPlanet = (typeof BAV_PLANETS)[number];

/** Parashara benefic-point tables: for each target planet, houses (from each contributor) that give a bindu. */
const BAV_RULES: Record<BavPlanet, Record<string, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

export interface Ashtakavarga {
  /** bav[planet][signIndex] = bindus */
  bav: Record<string, number[]>;
  /** Sarvashtakavarga total per sign */
  sav: number[];
  totals: Record<string, number>;
}

export function computeAshtakavarga(k: Kundli): Ashtakavarga {
  const posOf: Record<string, number> = { Lagna: k.lagna.signIndex };
  for (const p of k.planets) posOf[p.planet] = p.signIndex;

  const bav: Record<string, number[]> = {};
  const totals: Record<string, number> = {};
  const sav = new Array(12).fill(0);
  for (const target of BAV_PLANETS) {
    const row = new Array(12).fill(0);
    for (const [contributor, houses] of Object.entries(BAV_RULES[target])) {
      const base = posOf[contributor];
      for (const h of houses) row[(base + h - 1) % 12] += 1;
    }
    bav[target] = row;
    totals[target] = row.reduce((a, b) => a + b, 0);
    row.forEach((v, i) => (sav[i] += v));
  }
  return { bav, sav, totals };
}

// ---------------------------------------------------------------- Dashas (antardasha)

export interface AntarDasha {
  mahadasha: string;
  lord: string;
  start: Date;
  end: Date;
}

export function antardashas(dashas: DashaPeriod[]): AntarDasha[] {
  const out: AntarDasha[] = [];
  for (const d of dashas) {
    const total = d.end.getTime() - d.start.getTime();
    const startIdx = DASHA_SEQUENCE.findIndex((s) => s.lord === d.lord);
    const fullYears = DASHA_SEQUENCE[startIdx].years;
    // For the balance (partial) first dasha antardasha proportions are of the full period
    let cursor = d.start.getTime();
    const fullMs = fullYears * 365.25 * 86_400_000;
    const isPartial = total < fullMs - 1000;
    // Skip the part of the cycle already elapsed before birth for a partial first dasha
    let elapsed = isPartial ? fullMs - total : 0;
    for (let i = 0; i < 9; i++) {
      const sub = DASHA_SEQUENCE[(startIdx + i) % 9];
      const subMs = (fullMs * sub.years) / 120;
      if (elapsed >= subMs) {
        elapsed -= subMs;
        continue;
      }
      const effective = subMs - elapsed;
      elapsed = 0;
      out.push({
        mahadasha: d.lord,
        lord: sub.lord,
        start: new Date(cursor),
        end: new Date(cursor + effective),
      });
      cursor += effective;
    }
  }
  return out;
}

// ---------------------------------------------------------------- Varshaphal

export interface Varshaphal {
  year: number;
  age: number;
  returnDate: Date;
  kundli: Kundli;
  chart: VargaChart;
  munthaSignIndex: number;
  yearLord: string;
}

/** Finds the moment the transiting sidereal Sun returns to its natal longitude in the given calendar year. */
export function computeVarshaphal(
  input: BirthInput,
  natal: Kundli,
  targetYear: number,
): Varshaphal {
  const natalSun = natal.planets.find((p) => p.planet === "Sun")!.longitude;
  const birthYear = natal.utcDate.getUTCFullYear();
  // Initial guess: same month/day in the target year
  let guess = new Date(
    Date.UTC(
      targetYear,
      natal.utcDate.getUTCMonth(),
      natal.utcDate.getUTCDate(),
      natal.utcDate.getUTCHours(),
      natal.utcDate.getUTCMinutes(),
    ),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const sunAt = (d: Date) => {
    const local = new Date(d.getTime() + input.utcOffsetMinutes * 60_000);
    const k = computeKundli({
      ...input,
      date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
      time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
    });
    return k.planets.find((p) => p.planet === "Sun")!.longitude;
  };
  // Newton-style iteration on the Sun's mean rate (~0.9856°/day), converges in a few steps
  for (let i = 0; i < 8; i++) {
    const diff = ((sunAt(guess) - natalSun + 540) % 360) - 180;
    if (Math.abs(diff) < 0.0005) break;
    guess = new Date(guess.getTime() - (diff / 0.9856) * 86_400_000);
  }
  const local = new Date(guess.getTime() + input.utcOffsetMinutes * 60_000);
  const kundli = computeKundli({
    ...input,
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  });
  const age = targetYear - birthYear;
  // Muntha: natal lagna sign advanced by completed years
  const munthaSignIndex = (natal.lagna.signIndex + age) % 12;
  // Year lord (Varshesha) simplified: lord of the Muntha sign
  const yearLord = RASHIS[munthaSignIndex].lord;
  const markers: ChartMarker[] = kundli.planets.map((p) => ({
    label: planetAbbr(p),
    signIndex: p.signIndex,
  }));
  markers.push({ label: "Mu", signIndex: munthaSignIndex });
  return {
    year: targetYear,
    age,
    returnDate: guess,
    kundli,
    chart: {
      code: "Varsha",
      name: `Varshaphal ${targetYear} (Age ${age})`,
      hi: "वर्षफल कुण्डली",
      lagnaSignIndex: kundli.lagna.signIndex,
      markers,
    },
    munthaSignIndex,
    yearLord,
  };
}

const MUNTHA_HOUSE_TEXT: Record<number, string> = {
  1: "a year of renewed vitality, new beginnings and increased self-confidence",
  2: "focus on family, savings and speech; steady financial accumulation",
  3: "courage, short travel and success through effort and communication",
  4: "domestic happiness, property or vehicle matters and emotional peace",
  5: "creativity, education, children and gains through past merit",
  6: "competition and service; health needs care but enemies are overcome",
  7: "partnerships, marriage prospects and business collaborations come into focus",
  8: "transformation and sudden change; avoid risk and maintain good health habits",
  9: "fortune, higher learning, spiritual growth and long journeys",
  10: "career advancement, recognition and increased responsibility",
  11: "gains, fulfilment of desires and support from friends and elders",
  12: "expenses, foreign connections and retreat; keep spending in check",
};

export function varshaphalPredictions(v: Varshaphal, natal: Kundli): string[] {
  const munthaHouse =
    ((v.munthaSignIndex - natal.lagna.signIndex + 12) % 12) + 1;
  const lines: string[] = [];
  lines.push(
    `Muntha falls in ${RASHIS[v.munthaSignIndex].en} (house ${munthaHouse} of the natal chart): ${MUNTHA_HOUSE_TEXT[munthaHouse]}.`,
  );
  lines.push(
    `The year lord (Varshesha) is ${v.yearLord}; its matters dominate the events of this year.`,
  );
  const jup = v.kundli.planets.find((p) => p.planet === "Jupiter")!;
  const sat = v.kundli.planets.find((p) => p.planet === "Saturn")!;
  const goodHouses = [1, 2, 4, 5, 7, 9, 10, 11];
  lines.push(
    goodHouses.includes(jup.house)
      ? `Jupiter in house ${jup.house} of the annual chart brings grace, growth and protection.`
      : `Jupiter in house ${jup.house} of the annual chart asks for patience; results arrive with delay.`,
  );
  lines.push(
    [3, 6, 10, 11].includes(sat.house)
      ? `Saturn in house ${sat.house} rewards discipline, hard work and long-term planning.`
      : `Saturn in house ${sat.house} calls for caution in commitments, health and finances.`,
  );
  const mars = v.kundli.planets.find((p) => p.planet === "Mars")!;
  if ([1, 4, 7, 8, 12].includes(mars.house)) {
    lines.push(
      `Mars in house ${mars.house} of the annual chart: avoid haste and conflict; channel energy into exercise and work.`,
    );
  }
  return lines;
}

const MUNTHA_HOUSE_TEXT_HI: Record<number, string> = {
  1: "नई शुरुआत, बढ़ी हुई ऊर्जा और आत्मविश्वास का वर्ष",
  2: "परिवार, बचत और वाणी पर ध्यान; धन का स्थिर संचय",
  3: "साहस, छोटी यात्राएँ और परिश्रम व संवाद से सफलता",
  4: "घरेलू सुख, भूमि-वाहन संबंधी कार्य और मानसिक शांति",
  5: "रचनात्मकता, शिक्षा, संतान और पूर्व पुण्य से लाभ",
  6: "प्रतिस्पर्धा और सेवा; स्वास्थ्य पर ध्यान, शत्रु पर विजय",
  7: "साझेदारी, विवाह की संभावना और व्यापारिक सहयोग",
  8: "परिवर्तन और अचानक बदलाव; जोखिम से बचें, स्वास्थ्य का ध्यान रखें",
  9: "भाग्य, उच्च शिक्षा, आध्यात्मिक उन्नति और लंबी यात्राएँ",
  10: "कार्यक्षेत्र में उन्नति, सम्मान और बढ़ी हुई ज़िम्मेदारी",
  11: "लाभ, इच्छापूर्ति और मित्रों-बड़ों का सहयोग",
  12: "खर्च, विदेश संबंध और एकांत; व्यय पर नियंत्रण रखें",
};

/** Hindi version of varshaphalPredictions (same rules, Devanagari text). */
export function varshaphalPredictionsHi(
  v: Varshaphal,
  natal: Kundli,
): string[] {
  const munthaHouse =
    ((v.munthaSignIndex - natal.lagna.signIndex + 12) % 12) + 1;
  const hi = (planet: string) => PLANET_HI[planet] ?? planet;
  const lines: string[] = [];
  lines.push(
    `मुंथा ${RASHIS[v.munthaSignIndex].hi} राशि (जन्म कुण्डली के ${munthaHouse} वें भाव) में है: ${MUNTHA_HOUSE_TEXT_HI[munthaHouse]}।`,
  );
  lines.push(
    `वर्ष का स्वामी (वर्षेश) ${hi(v.yearLord)} है; इस वर्ष की घटनाओं में उसके विषयों की प्रधानता रहेगी।`,
  );
  const jup = v.kundli.planets.find((p) => p.planet === "Jupiter")!;
  const sat = v.kundli.planets.find((p) => p.planet === "Saturn")!;
  lines.push(
    [1, 2, 4, 5, 7, 9, 10, 11].includes(jup.house)
      ? `वर्ष कुण्डली में गुरु ${jup.house} वें भाव में है — कृपा, वृद्धि और संरक्षण देता है।`
      : `वर्ष कुण्डली में गुरु ${jup.house} वें भाव में है — धैर्य रखें, फल देर से मिलेंगे।`,
  );
  lines.push(
    [3, 6, 10, 11].includes(sat.house)
      ? `वर्ष कुण्डली में शनि ${sat.house} वें भाव में है — अनुशासन, परिश्रम और दीर्घकालिक योजना का फल देता है।`
      : `वर्ष कुण्डली में शनि ${sat.house} वें भाव में है — वचनबद्धता, स्वास्थ्य और धन के मामलों में सावधानी रखें।`,
  );
  const mars = v.kundli.planets.find((p) => p.planet === "Mars")!;
  if ([1, 4, 7, 8, 12].includes(mars.house)) {
    lines.push(
      `वर्ष कुण्डली में मंगल ${mars.house} वें भाव में है — जल्दबाज़ी और विवाद से बचें, ऊर्जा को व्यायाम व कार्य में लगाएँ।`,
    );
  }
  return lines;
}

export function houseStrengthSummary(
  k: Kundli,
): { planet: string; text: string }[] {
  return k.planets.map((p) => ({
    planet: p.planet,
    text:
      p.dignity !== "-"
        ? `${p.planet} is ${p.dignity.toLowerCase()} in ${p.sign}, giving strong results.`
        : OWN_SIGNS[p.planet]?.length === 0
          ? `${p.planet} acts as a shadow planet in ${p.sign}.`
          : `${p.planet} is placed in ${p.sign} (house ${p.house}).`,
  }));
}
