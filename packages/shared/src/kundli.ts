// Vedic kundli computation engine.
// Planetary positions come from the open-source `astronomy-engine` library
// (NASA-JPL-grade VSOP87/ELP2000 models); sidereal conversion uses the Lahiri
// ayanamsa. Houses use the whole-sign system (standard for North Indian kundli).

import { Body, Ecliptic, GeoVector, SiderealTime } from "astronomy-engine";
import {
  DASHA_SEQUENCE,
  EXALTATION,
  KARANA_NAMES,
  NAKSHATRAS,
  OWN_SIGNS,
  RASHIS,
  TITHI_NAMES,
  VARA_NAMES,
  VARNA_BY_SIGN,
  VASHYA_BY_SIGN,
  YOGA_NAMES,
  type NakshatraInfo,
} from "./vedicData";

export interface BirthInput {
  /** Local date of birth, YYYY-MM-DD */
  date: string;
  /** Local time of birth, HH:MM (24h) */
  time: string;
  /** UTC offset minutes (IST = 330) */
  utcOffsetMinutes: number;
  latitude: number;
  longitude: number;
}

export interface PlanetPosition {
  planet: string;
  /** Sidereal longitude 0-360 */
  longitude: number;
  signIndex: number;
  sign: string;
  degreeInSign: number;
  nakshatraIndex: number;
  nakshatra: NakshatraInfo;
  pada: number;
  navamsaSignIndex: number;
  navamsaSign: string;
  /** House number 1-12, whole-sign from lagna */
  house: number;
  retrograde: boolean;
  dignity: "Exalted" | "Debilitated" | "Own Sign" | "-";
}

export interface DashaPeriod {
  lord: string;
  start: Date;
  end: Date;
}

export interface Kundli {
  utcDate: Date;
  ayanamsa: number;
  lagna: {
    longitude: number;
    signIndex: number;
    sign: string;
    degreeInSign: number;
  };
  planets: PlanetPosition[];
  moonSignIndex: number;
  moonSign: string;
  moonNakshatra: NakshatraInfo;
  moonPada: number;
  sunSign: string;
  panchang: {
    tithi: string;
    paksha: "Shukla" | "Krishna";
    yoga: string;
    karana: string;
    vara: string;
  };
  avakahada: {
    varna: string;
    vashya: string;
    yoni: string;
    gana: string;
    nadi: string;
    nakshatraLord: string;
    rashiLord: string;
  };
  dashas: DashaPeriod[];
  /** Dasha running at birth */
  currentDashaAtBirth: string;
  /** Headline flag: dosha present from Lagna or Moon and not cancelled */
  manglik: boolean;
  /** Full Mangal (Kuja) Dosha assessment */
  mangal: MangalDosha;
}

export interface MangalDosha {
  manglik: boolean;
  /** House of Mars counted from Lagna, Moon and Venus */
  fromLagna: { house: number; dosha: boolean };
  fromMoon: { house: number; dosha: boolean };
  fromVenus: { house: number; dosha: boolean };
  /** Reasons the dosha is cancelled (Parihara); empty when none apply */
  cancellations: string[];
  /** Raw dosha present before cancellation */
  doshaBeforeCancellation: boolean;
  severity: "None" | "Low" | "Medium" | "High";
}

/** Houses from which Mars causes Kuja Dosha (1, 2, 4, 7, 8, 12). */
export const MANGAL_DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];

const DEG = Math.PI / 180;
const NAK_LEN = 360 / 27; // 13°20'
const PADA_LEN = 360 / 108; // 3°20'

export function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Lahiri (Chitrapaksha) ayanamsa, linear approximation accurate to ~0.01°. */
export function lahiriAyanamsa(date: Date): number {
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const endOfYear = Date.UTC(year + 1, 0, 1);
  const decimalYear =
    year + (date.getTime() - startOfYear) / (endOfYear - startOfYear);
  return 23.853 + 0.0139666 * (decimalYear - 2000);
}

/** Converts local birth details to a UTC Date. */
export function birthToUtc(input: BirthInput): Date {
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = input.time.split(":").map(Number);
  return new Date(
    Date.UTC(y, m - 1, d, hh, mm) - input.utcOffsetMinutes * 60_000,
  );
}

/** Tropical (sayana) geocentric ecliptic longitude of date for a body. */
function tropicalLongitude(body: Body, date: Date): number {
  return norm360(Ecliptic(GeoVector(body, date, true)).elon);
}

/** Mean lunar node (Rahu) tropical longitude. Ketu is opposite. */
function meanNodeTropical(date: Date): number {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;
  const T = d / 36525;
  return norm360(125.0445479 - 0.0529921966 * d + 0.0020754 * T * T);
}

/** Tropical ascendant from local sidereal time, latitude and obliquity. */
function tropicalAscendant(
  date: Date,
  latitude: number,
  longitude: number,
): number {
  const gastHours = SiderealTime(date); // Greenwich apparent sidereal time
  const ramc = norm360(gastHours * 15 + longitude); // local sidereal time in degrees
  const T = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000 / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * DEG;
  const phi = latitude * DEG;
  const ramcR = ramc * DEG;
  const asc = Math.atan2(
    Math.cos(ramcR),
    -(Math.sin(ramcR) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
  );
  return norm360(asc / DEG);
}

function signOf(longitude: number) {
  const signIndex = Math.floor(norm360(longitude) / 30);
  return { signIndex, degreeInSign: norm360(longitude) - signIndex * 30 };
}

function navamsaIndex(longitude: number): number {
  return Math.floor(norm360(longitude) / PADA_LEN) % 12;
}

function dignityOf(
  planet: string,
  signIndex: number,
): PlanetPosition["dignity"] {
  if (EXALTATION[planet] === signIndex) return "Exalted";
  if (
    EXALTATION[planet] !== undefined &&
    (EXALTATION[planet] + 6) % 12 === signIndex
  )
    return "Debilitated";
  if (OWN_SIGNS[planet]?.includes(signIndex)) return "Own Sign";
  return "-";
}

const BODY_MAP: { planet: string; body: Body }[] = [
  { planet: "Sun", body: Body.Sun },
  { planet: "Moon", body: Body.Moon },
  { planet: "Mars", body: Body.Mars },
  { planet: "Mercury", body: Body.Mercury },
  { planet: "Jupiter", body: Body.Jupiter },
  { planet: "Venus", body: Body.Venus },
  { planet: "Saturn", body: Body.Saturn },
];

/** Builds the vimshottari mahadasha table from the moon longitude. */
export function vimshottariDashas(
  moonSidereal: number,
  birthUtc: Date,
): { dashas: DashaPeriod[]; atBirth: string } {
  const nakIndex = Math.floor(norm360(moonSidereal) / NAK_LEN);
  const fraction = (norm360(moonSidereal) % NAK_LEN) / NAK_LEN;
  const startLordIndex = nakIndex % 9;
  const YEAR_MS = 365.25 * 86_400_000;

  const dashas: DashaPeriod[] = [];
  const firstLord = DASHA_SEQUENCE[startLordIndex];
  const balanceMs = firstLord.years * (1 - fraction) * YEAR_MS;
  let cursor = new Date(birthUtc.getTime() + balanceMs);
  dashas.push({ lord: firstLord.lord, start: birthUtc, end: cursor });
  for (let i = 1; i < 9; i++) {
    const seq = DASHA_SEQUENCE[(startLordIndex + i) % 9];
    const end = new Date(cursor.getTime() + seq.years * YEAR_MS);
    dashas.push({ lord: seq.lord, start: cursor, end });
    cursor = end;
  }
  return { dashas, atBirth: firstLord.lord };
}

/**
 * Mangal (Kuja) Dosha assessment.
 * - Dosha: Mars in houses 1, 2, 4, 7, 8, 12 counted from Lagna, Moon or Venus.
 * - Headline `manglik` uses Lagna and Moon (the classical primary references) and is
 *   cleared when a standard cancellation (Parihara) applies.
 * - Cancellations: Mars in own sign (Aries, Scorpio) or exalted (Capricorn); Mars in
 *   Leo or Aquarius; Mars conjunct Jupiter; and the classical house/sign exceptions
 *   (2nd in Gemini/Virgo, 4th in Aries/Scorpio, 7th in Capricorn/Cancer,
 *   8th in Sagittarius/Pisces, 12th in Taurus/Libra).
 */
export function assessMangalDosha(
  mars: PlanetPosition,
  moon: PlanetPosition,
  venus: PlanetPosition,
  jupiter: PlanetPosition,
): MangalDosha {
  const houseFrom = (ref: PlanetPosition) =>
    ((mars.signIndex - ref.signIndex + 12) % 12) + 1;
  const hLagna = mars.house;
  const hMoon = houseFrom(moon);
  const hVenus = houseFrom(venus);
  const isDosha = (h: number) => MANGAL_DOSHA_HOUSES.includes(h);

  const fromLagna = { house: hLagna, dosha: isDosha(hLagna) };
  const fromMoon = { house: hMoon, dosha: isDosha(hMoon) };
  const fromVenus = { house: hVenus, dosha: isDosha(hVenus) };
  const doshaBeforeCancellation = fromLagna.dosha || fromMoon.dosha;

  const cancellations: string[] = [];
  if (doshaBeforeCancellation) {
    const s = mars.signIndex; // 0 Aries ... 11 Pisces
    if (s === 0 || s === 7)
      cancellations.push(`Mars is in its own sign (${mars.sign})`);
    if (s === 9) cancellations.push("Mars is exalted in Capricorn");
    if (s === 4 || s === 10)
      cancellations.push(
        `Mars is in ${mars.sign} (dosha considered nullified)`,
      );
    if (s === jupiter.signIndex) cancellations.push("Mars is conjunct Jupiter");
    const houseSignRules: Record<number, number[]> = {
      2: [2, 5],
      4: [0, 7],
      7: [9, 3],
      8: [8, 11],
      12: [1, 6],
    };
    for (const h of [hLagna, hMoon]) {
      if (houseSignRules[h]?.includes(s)) {
        cancellations.push(
          `Mars in house ${h} in ${mars.sign} is a classical exception`,
        );
        break;
      }
    }
  }
  const uniqueCancel = [...new Set(cancellations)];

  const manglik = doshaBeforeCancellation && uniqueCancel.length === 0;
  let severity: MangalDosha["severity"] = "None";
  if (manglik) {
    const count = [fromLagna.dosha, fromMoon.dosha, fromVenus.dosha].filter(
      Boolean,
    ).length;
    severity =
      count >= 3 || hLagna === 7 || hLagna === 8
        ? "High"
        : count === 2
          ? "Medium"
          : "Low";
  }
  return {
    manglik,
    fromLagna,
    fromMoon,
    fromVenus,
    cancellations: uniqueCancel,
    doshaBeforeCancellation,
    severity,
  };
}

/** Computes a complete Vedic kundli for the given birth details. */
export function computeKundli(input: BirthInput): Kundli {
  const utcDate = birthToUtc(input);
  const ayanamsa = lahiriAyanamsa(utcDate);
  const toSidereal = (tropical: number) => norm360(tropical - ayanamsa);

  // Lagna
  const lagnaSidereal = toSidereal(
    tropicalAscendant(utcDate, input.latitude, input.longitude),
  );
  const lagnaSign = signOf(lagnaSidereal);

  // Planets
  const positions: { planet: string; lon: number; retro: boolean }[] = [];
  const later = new Date(utcDate.getTime() + 3_600_000);
  for (const { planet, body } of BODY_MAP) {
    const lon = tropicalLongitude(body, utcDate);
    const lonLater = tropicalLongitude(body, later);
    const delta = ((lonLater - lon + 540) % 360) - 180;
    positions.push({
      planet,
      lon: toSidereal(lon),
      retro: planet !== "Sun" && planet !== "Moon" && delta < 0,
    });
  }
  const rahuTropical = meanNodeTropical(utcDate);
  positions.push({
    planet: "Rahu",
    lon: toSidereal(rahuTropical),
    retro: true,
  });
  positions.push({
    planet: "Ketu",
    lon: toSidereal(rahuTropical + 180),
    retro: true,
  });

  const planets: PlanetPosition[] = positions.map(({ planet, lon, retro }) => {
    const { signIndex, degreeInSign } = signOf(lon);
    const nakshatraIdx = Math.floor(lon / NAK_LEN);
    const navIdx = navamsaIndex(lon);
    return {
      planet,
      longitude: lon,
      signIndex,
      sign: RASHIS[signIndex].en,
      degreeInSign,
      nakshatraIndex: nakshatraIdx,
      nakshatra: NAKSHATRAS[nakshatraIdx],
      pada: (Math.floor(lon / PADA_LEN) % 4) + 1,
      navamsaSignIndex: navIdx,
      navamsaSign: RASHIS[navIdx].en,
      house: ((signIndex - lagnaSign.signIndex + 12) % 12) + 1,
      retrograde: retro,
      dignity: dignityOf(planet, signIndex),
    };
  });

  const moon = planets.find((p) => p.planet === "Moon")!;
  const sun = planets.find((p) => p.planet === "Sun")!;
  const mars = planets.find((p) => p.planet === "Mars")!;

  // Panchang at birth
  const elongation = norm360(moon.longitude - sun.longitude);
  const tithiNumber = Math.floor(elongation / 12); // 0-29
  const paksha: "Shukla" | "Krishna" = tithiNumber < 15 ? "Shukla" : "Krishna";
  const tithiInPaksha = tithiNumber % 15;
  const tithi =
    tithiInPaksha === 14
      ? paksha === "Shukla"
        ? "Purnima"
        : "Amavasya"
      : TITHI_NAMES[tithiInPaksha];
  const yoga =
    YOGA_NAMES[
      Math.floor(norm360(moon.longitude + sun.longitude) / NAK_LEN) % 27
    ];
  const karanaNumber = Math.floor(elongation / 6); // 0-59
  let karana: string;
  if (karanaNumber === 0) karana = "Kimstughna";
  else if (karanaNumber >= 57)
    karana = ["Shakuni", "Chatushpada", "Naga"][karanaNumber - 57];
  else karana = KARANA_NAMES[(karanaNumber - 1) % 7];
  // Vara uses local midnight-based weekday
  const localMs = utcDate.getTime() + input.utcOffsetMinutes * 60_000;
  const vara = VARA_NAMES[new Date(localMs).getUTCDay()];

  const { dashas, atBirth } = vimshottariDashas(moon.longitude, utcDate);

  const venus = planets.find((p) => p.planet === "Venus")!;
  const jupiter = planets.find((p) => p.planet === "Jupiter")!;
  const mangal = assessMangalDosha(mars, moon, venus, jupiter);
  const manglik = mangal.manglik;

  return {
    utcDate,
    ayanamsa,
    lagna: {
      longitude: lagnaSidereal,
      signIndex: lagnaSign.signIndex,
      sign: RASHIS[lagnaSign.signIndex].en,
      degreeInSign: lagnaSign.degreeInSign,
    },
    planets,
    moonSignIndex: moon.signIndex,
    moonSign: moon.sign,
    moonNakshatra: moon.nakshatra,
    moonPada: moon.pada,
    sunSign: sun.sign,
    panchang: { tithi, paksha, yoga, karana, vara },
    avakahada: {
      varna: VARNA_BY_SIGN[moon.signIndex],
      vashya: VASHYA_BY_SIGN[moon.signIndex],
      yoni: moon.nakshatra.yoni,
      gana: moon.nakshatra.gana,
      nadi: moon.nakshatra.nadi,
      nakshatraLord: moon.nakshatra.lord,
      rashiLord: RASHIS[moon.signIndex].lord,
    },
    dashas,
    currentDashaAtBirth: atBirth,
    manglik,
    mangal,
  };
}

/** Formats a sidereal degree-in-sign as D° M' */
export function formatDegree(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}° ${m}'`;
}
