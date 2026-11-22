// Prints a kundli's D1/D9/D10 charts in a compact form so they can be compared
// against standard software (Jagannatha Hora, AstroSage, Drik Panchang).
import { computeKundli } from "../src/index";
import {
  computeSpecialPoints,
  computeVargaCharts,
  vargaSign,
} from "../src/kundliExtras";

const CASES = [
  // J2000 reference: 1 Jan 2000 12:00 UTC at Greenwich-ish; Lahiri ayanamsa should be 23.853 deg
  {
    name: "Mumbai 1992",
    date: "1992-10-25",
    time: "14:30",
    utcOffsetMinutes: 330,
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    name: "Delhi 2000",
    date: "2000-01-01",
    time: "12:00",
    utcOffsetMinutes: 330,
    latitude: 28.6139,
    longitude: 77.209,
  },
];

const RASHI = [
  "Ari",
  "Tau",
  "Gem",
  "Can",
  "Leo",
  "Vir",
  "Lib",
  "Sco",
  "Sag",
  "Cap",
  "Aqu",
  "Pis",
];

for (const c of CASES) {
  const k = computeKundli(c);
  const sp = computeSpecialPoints(c, k);
  const charts = computeVargaCharts(k, sp);
  console.log(`\n=== ${c.name} ${c.date} ${c.time} ===`);
  console.log(
    `Ayanamsa ${k.ayanamsa.toFixed(4)}  Lagna ${k.lagna.sign} ${k.lagna.degreeInSign.toFixed(2)}`,
  );
  for (const p of k.planets) {
    console.log(
      `${p.planet.padEnd(8)} ${p.sign.padEnd(12)} ${p.degreeInSign.toFixed(2).padStart(6)} nak=${p.nakshatra.en} pada=${p.pada} D9=${RASHI[vargaSign(p.longitude, 9)]} D10=${RASHI[vargaSign(p.longitude, 10)]}`,
    );
  }
  for (const code of ["D1", "D9", "D10"]) {
    const ch = charts.find((x) => x.code === code)!;
    console.log(`${code} lagna=${RASHI[ch.lagnaSignIndex]}`);
    const byHouse: Record<number, string[]> = {};
    for (const m of ch.markers) {
      const h = ((m.signIndex - ch.lagnaSignIndex + 12) % 12) + 1;
      (byHouse[h] ??= []).push(m.label);
    }
    for (let h = 1; h <= 12; h++)
      console.log(
        `  H${h} ${RASHI[(ch.lagnaSignIndex + h - 1) % 12]}: ${(byHouse[h] ?? []).join(" ")}`,
      );
  }
}
