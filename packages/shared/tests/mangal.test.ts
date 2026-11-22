import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assessMangalDosha,
  computeKundli,
  type PlanetPosition,
} from "../src/kundli";

// Minimal planet stub: only signIndex/house/sign matter for the dosha logic.
const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
function stub(
  planet: string,
  signIndex: number,
  lagnaIndex: number,
): PlanetPosition {
  return {
    planet,
    signIndex,
    sign: SIGNS[signIndex],
    house: ((signIndex - lagnaIndex + 12) % 12) + 1,
  } as PlanetPosition;
}

function assess(
  lagna: number,
  mars: number,
  moon: number,
  venus: number,
  jupiter: number,
) {
  return assessMangalDosha(
    stub("Mars", mars, lagna),
    stub("Moon", moon, lagna),
    stub("Venus", venus, lagna),
    stub("Jupiter", jupiter, lagna),
  );
}

test("Mars in 7th from Lagna (Libra lagna, Mars in Aries) is Manglik", () => {
  // Lagna Libra(6), Mars Aries(0) -> house 7; Aries is own sign so it cancels.
  const own = assess(6, 0, 3, 1, 8);
  assert.equal(own.fromLagna.house, 7);
  assert.equal(own.doshaBeforeCancellation, true);
  assert.equal(own.manglik, false, "own sign cancels");

  // Lagna Gemini(2), Mars Sagittarius(8) -> house 7, not a cancelling sign, Jupiter elsewhere
  const m = assess(2, 8, 4, 1, 5);
  assert.equal(m.fromLagna.house, 7);
  assert.equal(m.manglik, true);
  assert.ok(["Medium", "High", "Low"].includes(m.severity));
});

test("Mars in a non-dosha house from both Lagna and Moon is not Manglik", () => {
  // Lagna Aries(0); Mars Gemini(2) -> house 3; Moon Leo(4) -> Mars is 11th from Moon
  const r = assess(0, 2, 4, 5, 8);
  assert.equal(r.fromLagna.house, 3);
  assert.equal(r.fromMoon.house, 11);
  assert.equal(r.doshaBeforeCancellation, false);
  assert.equal(r.manglik, false);
  assert.equal(r.severity, "None");
});

test("Dosha only from Moon still counts", () => {
  // Lagna Aries(0); Mars Gemini(2) -> house 3 (no dosha); Moon Cancer(3) -> Mars is 12th from Moon
  const r = assess(0, 2, 3, 5, 8);
  assert.equal(r.fromLagna.dosha, false);
  assert.equal(r.fromMoon.house, 12);
  assert.equal(r.fromMoon.dosha, true);
  assert.equal(r.manglik, true);
});

test("Jupiter conjunction and exaltation cancel the dosha", () => {
  // Lagna Aries(0); Mars Cancer(3) -> house 4 (dosha), Jupiter also Cancer -> cancelled
  const conj = assess(0, 3, 6, 5, 3);
  assert.equal(conj.doshaBeforeCancellation, true);
  assert.equal(conj.manglik, false);
  assert.ok(conj.cancellations.some((c) => c.includes("Jupiter")));

  // Lagna Aries(0); Mars Capricorn(9) -> house 10 (no dosha from lagna) ; use lagna Taurus(1): house 9; need dosha:
  // Lagna Libra(6); Mars Capricorn(9) -> house 4 (dosha), exalted -> cancelled
  const exalted = assess(6, 9, 2, 5, 11);
  assert.equal(exalted.fromLagna.house, 4);
  assert.equal(exalted.manglik, false);
  assert.ok(exalted.cancellations.some((c) => c.includes("exalted")));
});

test("computeKundli exposes consistent manglik flag and detail", () => {
  const k = computeKundli({
    date: "1992-10-25",
    time: "14:30",
    utcOffsetMinutes: 330,
    latitude: 19.076,
    longitude: 72.8777,
  });
  // Benchmark: Mars in Gemini = house 5 from Aquarius lagna, 9th from Libra Moon -> not Manglik
  assert.equal(k.mangal.fromLagna.house, 5);
  assert.equal(k.mangal.fromMoon.house, 9);
  assert.equal(k.manglik, false);
  assert.equal(k.manglik, k.mangal.manglik);
});
