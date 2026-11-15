import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeKundli, norm360, vimshottariDashas, birthToUtc } from '../src/kundli';
import { RASHIS } from '../src/vedicData';

// Benchmark chart: 25 Oct 1992, 14:30 IST, Mumbai (19.076N, 72.8777E).
// Reference sidereal positions from VedAstro (Raman ayanamsa). Our engine uses
// Lahiri; Raman ≈ Lahiri − 1.395°, so positions are compared after conversion.
const INPUT = {
  date: '1992-10-25',
  time: '14:30',
  utcOffsetMinutes: 330,
  latitude: 19.076,
  longitude: 72.8777,
};

const EXPECTED_RAMAN: Record<string, number> = {
  // sidereal longitudes in degrees (sign start + degree in sign)
  Sun: 180 + 9.9,
  Moon: 180 + 3.46,
  Mars: 60 + 28.41,
  Mercury: 210 + 2.67,
  Jupiter: 150 + 10.77,
  Venus: 210 + 14.54,
  Saturn: 270 + 19.59,
  Rahu: 240 + 1.71,
  Ketu: 60 + 1.71,
};

const RAMAN_OFFSET = 1.395;

test('planetary longitudes match benchmark chart within 0.15°', () => {
  const k = computeKundli(INPUT);
  for (const p of k.planets) {
    const ramanLon = norm360(p.longitude + RAMAN_OFFSET);
    const err = Math.abs(((ramanLon - EXPECTED_RAMAN[p.planet] + 540) % 360) - 180);
    assert.ok(err < 0.15, `${p.planet} error ${err.toFixed(3)}° too large`);
  }
});

test('lagna and whole-sign houses match benchmark', () => {
  const k = computeKundli(INPUT);
  assert.equal(k.lagna.sign, 'Aquarius');
  const houses = Object.fromEntries(k.planets.map((p) => [p.planet, p.house]));
  assert.deepEqual(houses, {
    Sun: 9, Moon: 9, Mars: 5, Mercury: 10, Jupiter: 8, Venus: 10, Saturn: 12, Rahu: 11, Ketu: 5,
  });
});

test('moon details drive rashi, nakshatra and avakahada', () => {
  const k = computeKundli(INPUT);
  assert.equal(k.moonSign, 'Libra');
  assert.equal(k.moonNakshatra.en, 'Chitra');
  assert.equal(k.avakahada.gana, 'Rakshasa');
  assert.equal(k.avakahada.rashiLord, 'Venus');
  assert.equal(k.currentDashaAtBirth, 'Mars'); // Chitra is Mars-ruled
});

test('navamsa mapping follows classical scheme', () => {
  const k = computeKundli(INPUT);
  // First navamsa of Aries is Aries; verify via raw formula samples
  const sample = (lon: number) => RASHIS[Math.floor(norm360(lon) / (10 / 3)) % 12].en;
  assert.equal(sample(1), 'Aries'); // Aries 0-3°20' → Aries
  assert.equal(sample(29), 'Sagittarius'); // Aries last navamsa → Sagittarius
  assert.equal(sample(30.5), 'Capricorn'); // Taurus first navamsa → Capricorn (fixed: 9th)
  assert.equal(sample(61), 'Libra'); // Gemini first navamsa → Libra (dual: 5th)
  assert.ok(k.planets.every((p) => p.navamsaSign.length > 0));
});

test('vimshottari dashas cover full 120-year cycle in sequence', () => {
  const birth = birthToUtc(INPUT);
  const { dashas } = vimshottariDashas(185.0, birth); // Chitra region
  assert.equal(dashas.length, 9);
  // Periods are contiguous
  for (let i = 1; i < dashas.length; i++) {
    assert.equal(dashas[i].start.getTime(), dashas[i - 1].end.getTime());
  }
  // Total span = balance of first + remaining 8 full periods < 120y, > 103y
  const spanYears = (dashas[8].end.getTime() - birth.getTime()) / (365.25 * 86_400_000);
  assert.ok(spanYears > 103 && spanYears <= 120, `span ${spanYears}`);
});

test('panchang tithi/paksha derive from sun-moon elongation', () => {
  const k = computeKundli(INPUT);
  // Benchmark: Moon just behind Sun → Krishna Amavasya
  assert.equal(k.panchang.paksha, 'Krishna');
  assert.equal(k.panchang.tithi, 'Amavasya');
  assert.equal(k.panchang.vara, 'Ravivar (Sunday)');
});
