import { test } from "node:test";
import assert from "node:assert/strict";
import { computeKundli, antardashas } from "../src/index";
import {
  VARGA_LIST,
  vargaSign,
  computeSpecialPoints,
  computeVargaCharts,
  computeAshtakavarga,
  computeTransitChart,
  computeVarshaphal,
  varshaphalPredictions,
} from "../src/kundliExtras";

const INPUT = {
  date: "1992-10-25",
  time: "14:30",
  utcOffsetMinutes: 330,
  latitude: 19.076,
  longitude: 72.8777,
};

test("all requested divisional charts are defined", () => {
  const codes = VARGA_LIST.map((v) => v.code);
  for (const c of [
    "D1",
    "D2",
    "D3",
    "D4",
    "D7",
    "D9",
    "D10",
    "D12",
    "D16",
    "D20",
    "D24",
    "D27",
    "D30",
    "D40",
    "D45",
    "D60",
  ]) {
    assert.ok(codes.includes(c), `${c} missing`);
  }
});

test("varga signs are valid and D1/D9 follow classical rules", () => {
  for (const v of VARGA_LIST) {
    for (let lon = 0; lon < 360; lon += 1.37) {
      const s = vargaSign(lon, v.division);
      assert.ok(
        Number.isInteger(s) && s >= 0 && s < 12,
        `${v.code} @${lon} -> ${s}`,
      );
    }
  }
  assert.equal(vargaSign(1, 9), 0); // Aries first navamsa -> Aries
  assert.equal(vargaSign(29, 9), 8); // Aries last navamsa -> Sagittarius
  assert.equal(vargaSign(30.5, 9), 9); // Taurus first navamsa -> Capricorn
  assert.equal(vargaSign(10, 1), 0);
  assert.equal(vargaSign(5, 2), 4); // Aries (odd) first hora -> Leo
  assert.equal(vargaSign(20, 2), 3); // Aries second hora -> Cancer
  assert.equal(vargaSign(15, 3), 4); // Aries 2nd drekkana -> Leo (5th)
  assert.equal(vargaSign(1, 10), 0); // Aries first dasamsa -> Aries
  assert.equal(vargaSign(31, 10), 9); // Taurus (even) first dasamsa -> 9th = Capricorn
});

test("special points, charts with BP/Gk/Md/AL, ashtakavarga", () => {
  const k = computeKundli(INPUT);
  const sp = computeSpecialPoints(INPUT, k);
  assert.ok(sp.sunrise && sp.sunset);
  for (const pt of [sp.gulika, sp.mandi, sp.bhriguBindu]) {
    assert.ok(pt.signIndex >= 0 && pt.signIndex < 12);
  }
  const charts = computeVargaCharts(k, sp);
  assert.equal(charts.length, VARGA_LIST.length);
  for (const c of charts) {
    for (const label of ["BP", "Gk", "Md", "AL"]) {
      assert.ok(
        c.markers.some((m) => m.label === label),
        `${c.code} lacks ${label}`,
      );
    }
  }
  const av = computeAshtakavarga(k);
  // Classical totals: Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39 => 337
  const expected: Record<string, number> = {
    Sun: 48,
    Moon: 49,
    Mars: 39,
    Mercury: 54,
    Jupiter: 56,
    Venus: 52,
    Saturn: 39,
  };
  for (const [p, t] of Object.entries(expected))
    assert.equal(av.totals[p], t, `${p} total`);
  assert.equal(
    av.sav.reduce((a, b) => a + b, 0),
    337,
  );
});

test("transit, varshaphal and antardashas", () => {
  const k = computeKundli(INPUT);
  const sp = computeSpecialPoints(INPUT, k);
  const tr = computeTransitChart(INPUT, k, sp, new Date(Date.UTC(2026, 0, 1)));
  assert.equal(tr.planets.length, 9);
  const v = computeVarshaphal(INPUT, k, 2026);
  const sunNatal = k.planets.find((p) => p.planet === "Sun")!.longitude;
  const sunReturn = v.kundli.planets.find((p) => p.planet === "Sun")!.longitude;
  assert.ok(
    Math.abs(sunNatal - sunReturn) < 0.05,
    `sun return diff ${sunNatal - sunReturn}`,
  );
  assert.ok(varshaphalPredictions(v, k).length >= 4);
  const ad = antardashas(k.dashas);
  assert.ok(ad.length > 60);
  assert.ok(ad.every((a) => a.end.getTime() > a.start.getTime()));
});
