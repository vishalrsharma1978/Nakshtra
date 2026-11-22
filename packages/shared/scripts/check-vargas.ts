// Independent re-derivation of divisional-chart rules (BPHS) to cross-check vargaSign().
import { vargaSign } from "../src/kundliExtras";

const MOV = [0, 3, 6, 9];
const FIX = [1, 4, 7, 10];
let bad = 0;
let total = 0;
const odd = (s: number) => s % 2 === 0;

function ref(lon: number, d: number): number {
  const s = Math.floor(lon / 30);
  const deg = lon - s * 30;
  // Exact rational boundary test (deg*n/30), independent of the engine's epsilon
  const p = (n: number) => Math.min(Math.floor((deg * n) / 30 + 1e-9), n - 1);
  switch (d) {
    case 9:
      return (
        ((MOV.includes(s) ? s : FIX.includes(s) ? s + 8 : s + 4) + p(9)) % 12
      );
    case 10:
      return (s + (odd(s) ? 0 : 8) + p(10)) % 12;
    case 7:
      return (s + (odd(s) ? 0 : 6) + p(7)) % 12;
    case 12:
      return (s + p(12)) % 12;
    case 3:
      return (s + 4 * p(3)) % 12;
    case 4:
      return (s + 3 * p(4)) % 12;
    case 16:
      return ((MOV.includes(s) ? 0 : FIX.includes(s) ? 4 : 8) + p(16)) % 12;
    case 20:
      return ((MOV.includes(s) ? 0 : FIX.includes(s) ? 8 : 4) + p(20)) % 12;
    case 24:
      return ((odd(s) ? 4 : 3) + p(24)) % 12;
    case 27:
      return ([0, 3, 6, 9][s % 4] + p(27)) % 12;
    case 40:
      return ((odd(s) ? 0 : 6) + p(40)) % 12;
    case 45:
      return ((MOV.includes(s) ? 0 : FIX.includes(s) ? 4 : 8) + p(45)) % 12;
    default:
      return -1;
  }
}

for (const d of [3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 40, 45]) {
  for (let lon = 0.01; lon < 360; lon += 0.37) {
    total++;
    if (ref(lon, d) !== vargaSign(lon, d)) bad++;
  }
}
console.log(`mismatches ${bad} / ${total}`);

// Spot checks with well known textbook values
const R = [
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
const spot: [string, number, number, string][] = [
  ["D9 Aries 0-3.33", 1, 9, "Ari"],
  ["D9 Cancer 1deg (movable->starts Can)", 91, 9, "Can"],
  ["D9 Leo 1deg (fire->Ari)", 121, 9, "Ari"],
  ["D9 Gemini 1deg (dual->Lib)", 61, 9, "Lib"],
  ["D10 Aries 1deg", 1, 10, "Ari"],
  ["D10 Taurus 1deg (even->9th=Cap)", 31, 10, "Cap"],
  ["D7 Aries 1deg", 1, 7, "Ari"],
  ["D7 Taurus 1deg (even->7th=Sco)", 31, 7, "Sco"],
  ["D12 Leo 1deg", 121, 12, "Leo"],
  ["D3 Aries 15deg (2nd->Leo)", 15, 3, "Leo"],
  ["D30 Aries 3deg (Mars->Ari)", 3, 30, "Ari"],
  ["D30 Aries 7deg (Saturn->Aqu)", 7, 30, "Aqu"],
  ["D30 Aries 28deg (Venus->Lib)", 28, 30, "Lib"],
  ["D30 Taurus 3deg (Venus->Tau)", 33, 30, "Tau"],
  ["D30 Taurus 28deg (Mars->Sco)", 58, 30, "Sco"],
];
for (const [name, lon, d, want] of spot) {
  const got = R[vargaSign(lon, d)];
  console.log(
    `${got === want ? "OK " : "BAD"} ${name}: got ${got} want ${want}`,
  );
}
