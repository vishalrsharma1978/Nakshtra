// Standard North-Indian (उत्तर भारतीय) kundli chart as SVG, all labels in Hindi.
//
// Matches the layout used by AstroSage / Drik Panchang / Jagannatha Hora:
//  - a plain square with both diagonals and the inner diamond, thin dark lines;
//  - house 1 (Lagna) is the top diamond, houses run anticlockwise from it;
//  - each house shows its rashi NUMBER as a small figure at the inner corner nearest the
//    chart centre (the usual place), and the planets as plain bold text in the open middle;
//  - no pills, badges or boxes: everything is plain text, so it stays crisp at 4 charts/page.

import { PLANET_HI } from "@nakshtra/shared";

/** Short Hindi chart labels for planets and special points. */
const LABEL_HI: Record<string, string> = {
  Su: "सू",
  Mo: "चं",
  Ma: "मं",
  Me: "बु",
  Ju: "गु",
  Ve: "शु",
  Sa: "श",
  Ra: "रा",
  Ke: "के",
  Gk: "गुलि",
  Md: "मां",
  BP: "भृ",
  AL: "आ॰ल",
  Mu: "मुं",
};

/** Planet text colours; all pass 4.5:1 contrast on the cream chart background. */
const LABEL_COLOR: Record<string, string> = {
  Su: "#a14f00",
  Mo: "#3b5068",
  Ma: "#b3261e",
  Me: "#17693a",
  Ju: "#7a5f00",
  Ve: "#a02f6c",
  Sa: "#27304f",
  Ra: "#52368a",
  Ke: "#6e3f2d",
  Gk: "#4f463d",
  Md: "#4f463d",
  BP: "#175b59",
  AL: "#7a3a18",
  Mu: "#175b59",
};

/** Splits "Su(R)" into base label + retrograde flag. */
function parseLabel(label: string): { base: string; retro: boolean } {
  const retro = label.endsWith("(R)");
  return { base: retro ? label.slice(0, -3) : label, retro };
}

/**
 * Houses of the North Indian chart in a 400x400 box.
 * - `poly`: house polygon (used to tint the Lagna house).
 * - `num`: where the small rashi number sits (inner corner nearest the centre).
 * - `area`: [x0,y0,x1,y1] open text area in the middle of the house, clear of `num`.
 */
interface HouseGeom {
  poly: string;
  num: [number, number];
  area: [number, number, number, number];
}

const HOUSES: HouseGeom[] = [
  // 1 top diamond (Lagna)
  {
    poly: "200,200 100,100 200,0 300,100",
    num: [200, 172],
    area: [152, 52, 244, 148],
  },
  // 2 top-left triangle
  { poly: "0,0 200,0 100,100", num: [100, 70], area: [52, 6, 144, 48] },
  // 3 left-top triangle
  { poly: "0,0 100,100 0,200", num: [70, 100], area: [4, 54, 44, 146] },
  // 4 left diamond
  {
    poly: "200,200 100,100 0,200 100,300",
    num: [172, 200],
    area: [52, 152, 144, 248],
  },
  // 5 left-bottom triangle
  { poly: "0,200 100,300 0,400", num: [70, 300], area: [4, 254, 44, 346] },
  // 6 bottom-left triangle
  { poly: "0,400 100,300 200,400", num: [100, 330], area: [52, 352, 144, 396] },
  // 7 bottom diamond
  {
    poly: "200,200 100,300 200,400 300,300",
    num: [200, 228],
    area: [152, 252, 244, 348],
  },
  // 8 bottom-right triangle
  {
    poly: "200,400 300,300 400,400",
    num: [300, 330],
    area: [252, 352, 344, 396],
  },
  // 9 right-bottom triangle
  {
    poly: "400,200 300,300 400,400",
    num: [330, 300],
    area: [356, 254, 396, 346],
  },
  // 10 right diamond
  {
    poly: "200,200 300,100 400,200 300,300",
    num: [236, 200],
    area: [260, 146, 336, 254],
  },
  // 11 right-top triangle
  { poly: "400,0 300,100 400,200", num: [330, 100], area: [356, 50, 396, 150] },
  // 12 top-right triangle
  { poly: "200,0 400,0 300,100", num: [300, 70], area: [252, 6, 344, 48] },
];

export interface DesignerChartInput {
  /** Main Hindi title, e.g. "लग्न कुण्डली (D1)" */
  title: string;
  /** Small Hindi caption under the title */
  subtitle?: string;
  lagnaSignIndex: number;
  planets: { label: string; houseFromLagna: number }[];
  accent: string;
  gold: string;
  /** Kept for API compatibility; the chart looks the same at every size. */
  large?: boolean;
}

/** Font of the rashi number, and the half-box used to keep text clear of it. */
export const NUM_FONT = 17;
export const NUM_HALF = { w: 10, h: 10 };
const MAX_FONT = 26;
const MIN_FONT = 10;
const LINE_H = 1.3;
/** Width of a label in em: Devanagari clusters average ~0.62em, plus a 0.45em word gap. */
const emW = (n: number) => n * 0.78 + 0.3;

export function designerChart(c: DesignerChartInput): string {
  const { accent } = c;
  const byHouse: Record<number, string[]> = {};
  for (const p of c.planets) (byHouse[p.houseFromLagna] ??= []).push(p.label);

  let tint = "";
  let nums = "";
  let planetsSvg = "";
  for (let h = 1; h <= 12; h++) {
    const G = HOUSES[h - 1];
    const signIdx = (c.lagnaSignIndex + h - 1) % 12;
    if (h === 1)
      tint += `<polygon points="${G.poly}" fill="#fbf0cf" stroke="none"/>`;

    const [nx, ny] = G.num;
    nums += `<text x="${nx}" y="${ny + NUM_FONT * 0.35}" class="hn" style="font-size:${NUM_FONT}px">${signIdx + 1}</text>`;

    const labels = byHouse[h] ?? [];
    if (!labels.length) continue;

    // Plain text lines, centred in the house's open area; largest font that fits
    const [x0, y0, x1, y1] = G.area;
    const areaW = x1 - x0;
    const areaH = y1 - y0;
    const tokens = labels.map((l) => {
      const { base, retro } = parseLabel(l);
      const txt = (LABEL_HI[base] ?? base) + (retro ? "ᵛ" : "");
      return { txt, color: LABEL_COLOR[base] ?? "#333", n: txt.length };
    });
    let font = MAX_FONT;
    let lines: (typeof tokens)[] = [];
    for (; font >= MIN_FONT; font -= 1) {
      lines = [[]];
      let w = 0;
      for (const t of tokens) {
        const tw = emW(t.n) * font;
        const cur = lines[lines.length - 1];
        if (cur.length && w + tw > areaW) {
          lines.push([t]);
          w = tw;
        } else {
          cur.push(t);
          w += tw;
        }
      }
      const widest = Math.max(
        ...lines.map((ln) => ln.reduce((q, t) => q + emW(t.n) * font, 0)),
      );
      if (lines.length * font * LINE_H <= areaH && widest <= areaW) break;
    }
    if (font < MIN_FONT) font = MIN_FONT;
    const lineH = font * LINE_H;
    const top = y0 + (areaH - lines.length * lineH) / 2;
    lines.forEach((ln, i) => {
      const spans = ln
        .map((t) => `<tspan fill="${t.color}">${t.txt}</tspan>`)
        .join(`<tspan> </tspan>`);
      planetsSvg += `<text x="${(x0 + x1) / 2}" y="${top + i * lineH + font * 0.95}" class="pl" style="font-size:${font}px">${spans}</text>`;
    });
  }

  return `
  <div class="chart-box designer">
    <div class="chart-head">${c.title}</div>
    ${c.subtitle ? `<div class="chart-sub">${c.subtitle}</div>` : ""}
    <svg viewBox="-3 -3 406 406" xmlns="http://www.w3.org/2000/svg">
      <rect x="-3" y="-3" width="406" height="406" fill="#fffdf4"/>
      ${tint}
      <g stroke="${accent}" stroke-width="2" fill="none" stroke-linejoin="round">
        <rect x="0" y="0" width="400" height="400"/>
        <line x1="0" y1="0" x2="400" y2="400"/>
        <line x1="400" y1="0" x2="0" y2="400"/>
        <polygon points="200,0 400,200 200,400 0,200"/>
      </g>
      ${nums}
      ${planetsSvg}
    </svg>
  </div>`;
}

/** One compact legend for a whole page of charts. */
export function chartLegendHtml(): string {
  const names: Record<string, string> = {
    Su: "Sun",
    Mo: "Moon",
    Ma: "Mars",
    Me: "Mercury",
    Ju: "Jupiter",
    Ve: "Venus",
    Sa: "Saturn",
    Ra: "Rahu",
    Ke: "Ketu",
  };
  const planets = Object.keys(names)
    .map(
      (b) =>
        `<span class="lg"><b style="color:${LABEL_COLOR[b]}">${LABEL_HI[b]}</b>=${PLANET_HI[names[b]]}</span>`,
    )
    .join("");
  const special = [
    ["Gk", "गुलिक"],
    ["Md", "मांदी"],
    ["BP", "भृगु बिंदु"],
    ["AL", "आरूढ़ लग्न"],
    ["Mu", "मुंथा"],
  ]
    .map(
      ([b, n]) =>
        `<span class="lg"><b style="color:${LABEL_COLOR[b]}">${LABEL_HI[b]}</b>=${n}</span>`,
    )
    .join("");
  return `<div class="legend">${planets}${special}<span class="lg"><b>ᵛ</b>=वक्री</span><span class="lg">छोटा अंक = राशि (1 मेष, 2 वृषभ … 12 मीन) · ऊपर का भाग = लग्न</span></div>`;
}
