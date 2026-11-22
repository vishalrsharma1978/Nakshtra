// Builds the royal Janma Kundli report as self-contained HTML:
// - King (Maharaja) or Queen (Maharani) ethnic frame on every page
// - Nakshtra eye-logo brand header repeated on each printed page
// - North Indian style Lagna (D1) and Navamsa (D9) charts drawn as SVG
// - Avakahada chakra, panchang, planetary table, vimshottari dasha

import {
  RASHIS,
  formatDegree,
  antardashas,
  computeAshtakavarga,
  computeSpecialPoints,
  computeTransitChart,
  computeVargaCharts,
  computeVarshaphal,
  varshaphalPredictions,
  type BirthInput,
  type Kundli,
  type PlanetPosition,
  type VargaChart,
} from "@nakshtra/shared";
import type { BrandAssets } from "./brandAssets";

export interface KundliPerson {
  name: string;
  gender: "male" | "female";
  date: string;
  time: string;
  place: string;
  latitude: number;
  longitude: number;
  utcOffsetMinutes: number;
}

const PLANET_ABBR: Record<string, string> = {
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

/** Content anchor points for the 12 houses of a North Indian chart (400x400 viewBox). */
const HOUSE_POS: [number, number][] = [
  [200, 95],
  [100, 48],
  [48, 110],
  [105, 200],
  [48, 290],
  [100, 352],
  [200, 305],
  [300, 352],
  [352, 290],
  [295, 200],
  [352, 110],
  [300, 48],
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * North Indian diamond chart. `signOfHouse(h)` gives the rashi index sitting in
 * house h (1-12); `planetsInHouse(h)` the planet labels for that house.
 */
function northIndianChart(
  title: string,
  lagnaSignIndex: number,
  planets: { label: string; houseFromLagna: number }[],
  accent: string,
): string {
  const byHouse: Record<number, string[]> = {};
  for (const p of planets) {
    (byHouse[p.houseFromLagna] ??= []).push(p.label);
  }
  const SMALL = new Set(["Gk", "Md", "BP", "AL", "Mu"]);
  let cells = "";
  for (let h = 1; h <= 12; h++) {
    const [x, y] = HOUSE_POS[h - 1];
    const rashiNum = ((lagnaSignIndex + h - 1) % 12) + 1;
    const labels = byHouse[h] ?? [];
    const lines = [
      `<text x="${x}" y="${y - 8}" class="rashi-num">${rashiNum}</text>`,
    ];
    labels.forEach((label, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cols = Math.min(labels.length - row * 3, 3);
      const lx = x + (col - (cols - 1) / 2) * 26;
      const cls = SMALL.has(label) ? "planet special" : "planet";
      lines.push(
        `<text x="${lx}" y="${y + 10 + row * 15}" class="${cls}">${label}</text>`,
      );
    });
    cells += lines.join("");
  }
  return `
  <div class="chart-box">
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="392" height="392" fill="#fffdf4" stroke="${accent}" stroke-width="4"/>
      <line x1="4" y1="4" x2="396" y2="396" stroke="${accent}" stroke-width="2"/>
      <line x1="396" y1="4" x2="4" y2="396" stroke="${accent}" stroke-width="2"/>
      <polygon points="200,4 396,200 200,396 4,200" fill="none" stroke="${accent}" stroke-width="2"/>
      ${cells}
    </svg>
    <p class="chart-title">${title}</p>
  </div>`;
}

function chartFromVarga(
  c: VargaChart,
  accent: string,
  titleOverride?: string,
): string {
  const planets = c.markers.map((m) => ({
    label: m.label,
    houseFromLagna: ((m.signIndex - c.lagnaSignIndex + 12) % 12) + 1,
  }));
  return northIndianChart(
    titleOverride ?? `${c.code} · ${c.name} · ${c.hi}`,
    c.lagnaSignIndex,
    planets,
    accent,
  );
}

const fmtDate = (dt: Date) =>
  dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const fmtTime = (dt: Date | null) =>
  dt
    ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "—";

export function buildKundliHtml(
  person: KundliPerson,
  k: Kundli,
  brand: BrandAssets,
  input: BirthInput,
): string {
  const isKing = person.gender === "male";
  const frame = isKing ? brand.kingFrame : brand.queenFrame;
  const accent = isKing ? "#7a1f1f" : "#a81d5b";
  const gold = "#b8860b";

  const special = computeSpecialPoints(input, k);
  const vargas = computeVargaCharts(k, special);
  const transit = computeTransitChart(input, k, special);
  const ashtak = computeAshtakavarga(k);
  const antar = antardashas(k.dashas);
  const nowYear = new Date().getFullYear();
  const varsha = computeVarshaphal(
    input,
    k,
    Math.max(nowYear, k.utcDate.getUTCFullYear() + 1),
  );
  const varshaNotes = varshaphalPredictions(varsha, k);

  const planetRows = k.planets
    .map(
      (p) => `<tr>
        <td>${p.planet}</td>
        <td>${p.sign} (${RASHIS[p.signIndex].hi})</td>
        <td>${formatDegree(p.degreeInSign)}</td>
        <td>${p.nakshatra.en} – ${p.pada}</td>
        <td>${p.navamsaSign}</td>
        <td>${p.house}</td>
        <td>${p.retrograde ? "Retro" : "Direct"}</td>
        <td>${p.dignity}</td>
      </tr>`,
    )
    .join("");

  const now = Date.now();
  const dashaRows = k.dashas
    .map(
      (d) =>
        `<tr><td>${d.lord}</td><td>${fmtDate(d.start)}</td><td>${fmtDate(d.end)}</td></tr>`,
    )
    .join("");

  const offsetH = Math.floor(Math.abs(person.utcOffsetMinutes) / 60);
  const offsetM = Math.abs(person.utcOffsetMinutes) % 60;
  const offsetStr = `UTC${person.utcOffsetMinutes < 0 ? "-" : "+"}${String(offsetH).padStart(2, "0")}:${String(offsetM).padStart(2, "0")}`;

  const header = `
    <div class="brand-header">
      <img src="${brand.logo}" class="brand-logo" />
      <div class="brand-name">NAKSHTRA</div>
      <div class="brand-tag">Astrology · Remedies · Expert Guidance — www.nakshtra.app</div>
    </div>`;

  const page = (content: string) => `
    <div class="page">
      <img src="${frame}" class="frame" />
      ${header}
      <div class="content">${content}</div>
      <div class="brand-footer">Nakshtra · Janma Kundli</div>
    </div>`;

  const page1 = `
    <h1 class="doc-title">श्री जन्म कुण्डली</h1>
    <p class="person-name">${escapeHtml(person.name)}</p>

    <h3 class="section-title">Birth Details · जन्म विवरण</h3>
    <table class="kv">
      <tr><td>Name</td><td>${escapeHtml(person.name)}</td><td>Gender</td><td>${isKing ? "Male" : "Female"}</td></tr>
      <tr><td>Date of Birth</td><td>${person.date}</td><td>Time of Birth</td><td>${person.time} (${offsetStr})</td></tr>
      <tr><td>Place of Birth</td><td colspan="3">${escapeHtml(person.place)} (${person.latitude.toFixed(3)}°, ${person.longitude.toFixed(3)}°)</td></tr>
      <tr><td>Lagna (Ascendant)</td><td>${k.lagna.sign} ${formatDegree(k.lagna.degreeInSign)}</td><td>Rashi (Moon Sign)</td><td>${k.moonSign}</td></tr>
      <tr><td>Janma Nakshatra</td><td>${k.moonNakshatra.en} (${k.moonNakshatra.hi}) – Pada ${k.moonPada}</td><td>Sun Sign (Vedic)</td><td>${k.sunSign}</td></tr>
      <tr><td>Ayanamsa</td><td>Lahiri ${k.ayanamsa.toFixed(4)}°</td><td>Manglik Vichar</td><td>${k.manglik ? `Manglik ⚠️ (${k.mangal.severity})` : k.mangal.doshaBeforeCancellation ? "Non-Manglik ✓ (cancelled)" : "Non-Manglik ✓"}</td></tr>
    </table>

    <h3 class="section-title">Avakahada Chakra · अवकहड़ा चक्र</h3>
    <table class="kv">
      <tr><td>Varna</td><td>${k.avakahada.varna}</td><td>Vashya</td><td>${k.avakahada.vashya}</td></tr>
      <tr><td>Yoni</td><td>${k.avakahada.yoni}</td><td>Gana</td><td>${k.avakahada.gana}</td></tr>
      <tr><td>Nadi</td><td>${k.avakahada.nadi}</td><td>Nakshatra Lord</td><td>${k.avakahada.nakshatraLord}</td></tr>
      <tr><td>Rashi Lord</td><td>${k.avakahada.rashiLord}</td><td>Paya</td><td>—</td></tr>
    </table>

    <h3 class="section-title">Panchang at Birth · जन्म पंचांग</h3>
    <table class="kv">
      <tr><td>Tithi</td><td>${k.panchang.paksha} ${k.panchang.tithi}</td><td>Vara (Day)</td><td>${k.panchang.vara}</td></tr>
      <tr><td>Yoga</td><td>${k.panchang.yoga}</td><td>Karana</td><td>${k.panchang.karana}</td></tr>
    </table>`;

  const pt = (p: { sign: string; degreeInSign: number }) =>
    `${p.sign} ${formatDegree(p.degreeInSign)}`;

  // Compact layout: D1 + D9 sit with the planet table; the other vargas go 6 per page (3 x 2)
  const mainCharts = vargas.filter((c) => c.code === "D1" || c.code === "D9");
  const otherCharts = vargas.filter((c) => c.code !== "D1" && c.code !== "D9");
  const pageMain = `
    <h2 class="doc-subtitle" style="margin-top:0">Lagna &amp; Navamsa · लग्न एवं नवांश कुण्डली</h2>
    <div class="charts">${mainCharts.map((c) => chartFromVarga(c, accent)).join("")}</div>
    <h3 class="section-title">Planetary Positions · ग्रह स्थिति</h3>
    <table class="data">
      <tr><th>Planet</th><th>Rashi</th><th>Degree</th><th>Nakshatra–Pada</th><th>Navamsa</th><th>House</th><th>Motion</th><th>Dignity</th></tr>
      ${planetRows}
    </table>
    <p class="note">Charts also show Gulika (Gk), Mandi (Md), Arudha Lagna (AL) and Bhrigu Bindu (BP). Gulika ${pt(special.gulika)} · Mandi ${pt(special.mandi)} · Bhrigu Bindu ${pt(special.bhriguBindu)} · Arudha Lagna ${special.arudhaLagna.sign} · Sunrise ${fmtTime(special.sunrise)} · Sunset ${fmtTime(special.sunset)}.</p>`;
  const chartPages: string[] = [];
  for (let i = 0; i < otherCharts.length; i += 6) {
    chartPages.push(`
    <h2 class="doc-subtitle" style="margin-top:0">Divisional Charts · वर्ग कुण्डली</h2>
    <div class="charts grid3">${otherCharts
      .slice(i, i + 6)
      .map((c) => chartFromVarga(c, accent))
      .join("")}</div>`);
  }

  const transitRows = transit.planets
    .map(
      (p, i) =>
        `<tr><td>${p.planet}</td><td>${p.sign}</td><td>${formatDegree(p.degreeInSign)}</td><td>${p.house}</td><td>${transit.fromMoon[i].house}</td></tr>`,
    )
    .join("");
  const antarRowsData = antar;
  const pageTransitVarsha = `
    <h2 class="doc-subtitle" style="margin-top:0">Transit &amp; Varshaphal ${varsha.year} · गोचर एवं वर्षफल</h2>
    <div class="charts">
      ${chartFromVarga(transit.chart, accent, "Gochar · " + fmtDate(transit.date))}
      ${chartFromVarga(varsha.chart, accent, `Varsha Kundli ${varsha.year}`)}
    </div>
    <div class="charts">
      <div class="chart-box"><table class="data compact">
        <tr><th>Planet</th><th>Sign</th><th>Degree</th><th>H (Lagna)</th><th>H (Moon)</th></tr>
        ${transitRows}
      </table></div>
      <div class="chart-box">
        <p class="note" style="margin-top:0">Solar return <strong>${fmtDate(varsha.returnDate)}</strong> (age ${varsha.age}) · Varsha Lagna <strong>${varsha.kundli.lagna.sign}</strong> · Muntha <strong>${RASHIS[varsha.munthaSignIndex].en}</strong> · Year lord <strong>${varsha.yearLord}</strong></p>
        <ul class="pred">${varshaNotes.map((n) => `<li>${n}</li>`).join("")}</ul>
      </div>
    </div>`;

  const SIGN_ABBR = RASHIS.map((r) => r.en.slice(0, 3));
  const bavPlanets = Object.keys(ashtak.bav);
  const ashtakRows = bavPlanets
    .map(
      (pl) =>
        `<tr><td><strong>${pl}</strong></td>${ashtak.bav[pl].map((v) => `<td>${v}</td>`).join("")}<td><strong>${ashtak.totals[pl]}</strong></td></tr>`,
    )
    .join("");
  const pageAshtakDasha = `
    <h2 class="doc-subtitle" style="margin-top:0">Ashtakavarga &amp; Mahadasha · अष्टकवर्ग एवं महादशा</h2>
    <table class="data compact">
      <tr><th>Planet</th>${SIGN_ABBR.map((s) => `<th>${s}</th>`).join("")}<th>Total</th></tr>
      ${ashtakRows}
      <tr><td><strong>Sarva</strong></td>${ashtak.sav.map((v) => `<td><strong>${v}</strong></td>`).join("")}<td><strong>${ashtak.sav.reduce((a, b) => a + b, 0)}</strong></td></tr>
    </table>
    <p class="note">Signs with 28+ Sarvashtakavarga points are strong; below 25 are weak (Parashari system).</p>
    <h3 class="section-title">Vimshottari Mahadasha · विंशोत्तरी महादशा</h3>
    <p class="note">Dasha at birth: <strong>${k.currentDashaAtBirth} Mahadasha</strong>.</p>
    <table class="data compact dasha">
      <tr><th>Mahadasha Lord</th><th>From</th><th>To</th></tr>
      ${dashaRows}
    </table>`;

  // Antardasha: 3 side-by-side columns of Mahadasha blocks per page
  const antarByMaha: { lord: string; rows: string }[] = [];
  for (const a of antar) {
    const cur = a.start.getTime() <= now && now < a.end.getTime();
    const row = `<tr${cur ? ' class="current"' : ""}><td>${a.lord}</td><td>${fmtDate(a.start)}</td><td>${fmtDate(a.end)}</td></tr>`;
    const last = antarByMaha[antarByMaha.length - 1];
    if (last && last.lord === a.mahadasha) last.rows += row;
    else antarByMaha.push({ lord: a.mahadasha, rows: row });
  }
  const antarBlocks = antarByMaha.map(
    (m) => `<div class="antar-block"><table class="data compact">
      <tr><th colspan="3">${m.lord} Mahadasha</th></tr>
      <tr><th>Antar</th><th>From</th><th>To</th></tr>${m.rows}</table></div>`,
  );
  const antarPages: string[] = [];
  for (let i = 0; i < antarBlocks.length; i += 9) {
    antarPages.push(`
    <h2 class="doc-subtitle" style="margin-top:0">Antardasha Periods · अंतर्दशा</h2>
    <div class="antar-grid">${antarBlocks.slice(i, i + 9).join("")}</div>`);
  }

  const page3 = `
    <h2 class="doc-subtitle" style="margin-top:0">Mangal Dosha &amp; Blessings</h2>
    <h3 class="section-title">Mangal Dosha Vichar</h3>
    <table class="kv">
      <tr><td>Mars from Lagna</td><td>House ${k.mangal.fromLagna.house} ${k.mangal.fromLagna.dosha ? "(dosha)" : "(no dosha)"}</td><td>Mars from Moon</td><td>House ${k.mangal.fromMoon.house} ${k.mangal.fromMoon.dosha ? "(dosha)" : "(no dosha)"}</td></tr>
      <tr><td>Mars from Venus</td><td>House ${k.mangal.fromVenus.house} ${k.mangal.fromVenus.dosha ? "(dosha)" : "(no dosha)"}</td><td>Result</td><td>${k.manglik ? `Manglik – ${k.mangal.severity}` : "Non-Manglik"}</td></tr>
    </table>
    <p class="note">${
      k.manglik
        ? "Mars occupies a dosha-forming house (1, 2, 4, 7, 8 or 12) from the Lagna or the Moon and no cancellation applies. Traditional remedies and an expert consultation are recommended before marriage decisions."
        : k.mangal.doshaBeforeCancellation
          ? `Mars falls in a dosha-forming house, but the dosha is cancelled: ${k.mangal.cancellations.join("; ")}.`
          : "Mars does not occupy a dosha-forming house from the Lagna or the Moon. No Mangal Dosha is formed in this kundli."
    }</p>
    <h3 class="section-title">Blessing · आशीर्वाद</h3>
    <p class="blessing">${
      isKing
        ? "May the nine planets bestow upon this son the valour of a Maharaja, wisdom upon his throne, and prosperity in every royal endeavour."
        : "May the nine planets bestow upon this daughter the grace of a Maharani, wisdom upon her throne, and prosperity in every royal endeavour."
    }</p>
    <p class="disclaimer">This kundli is computed with NASA-JPL grade planetary ephemeris (Lahiri ayanamsa, whole-sign houses) and auto-generated by Nakshtra.
    For personalised interpretation and remedies, consult our expert astrologers in the Nakshtra app.</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nakshtra — Janma Kundli — ${escapeHtml(person.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Noto Serif', 'Times New Roman', serif; color: #3a2410; background: #efe7d8; }
  .page {
    position: relative; width: 210mm; min-height: 296mm; margin: 0 auto;
    page-break-after: always; overflow: hidden; background: #fffdf4;
  }
  .page:last-child { page-break-after: auto; }
  .frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
  .brand-header {
    position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center;
    gap: 2mm; padding: 14mm 18mm 0;
  }
  .brand-logo {
    width: 64px; height: 64px; object-fit: cover; border-radius: 50%;
    border: 2.5px solid ${gold}; background: #fffdf4;
  }
  .brand-name { font-size: 24px; letter-spacing: 10px; font-weight: bold; color: ${gold}; text-align: center; }
  .brand-tag { font-size: 10px; color: #7a5c2e; text-align: center; letter-spacing: 1px; }
  .brand-footer {
    position: absolute; bottom: 12mm; left: 0; right: 0; z-index: 2;
    text-align: center; font-size: 10px; color: #7a5c2e; letter-spacing: 2px;
  }
  .content { position: relative; z-index: 2; padding: 5mm 18mm 20mm; }
  .doc-title { text-align: center; font-size: 28px; color: ${accent}; margin-top: 1mm; }
  .doc-subtitle { text-align: center; font-size: 15px; color: ${gold}; margin: 2mm 0 4mm; letter-spacing: 2px; }
  .person-name { text-align: center; font-size: 22px; font-weight: bold; color: #3a2410; margin-bottom: 4mm; }
  .section-title {
    font-size: 14px; color: ${accent}; border-bottom: 2px solid ${gold};
    margin: 6mm 0 2.5mm; padding-bottom: 1mm; letter-spacing: 1px;
  }
  table.kv { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  table.kv td { padding: 2mm 2.5mm; border: 1px solid ${gold}55; }
  table.kv td:nth-child(odd) { font-weight: bold; color: ${accent}; width: 22%; background: #f9f2df88; }
  table.data { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 2mm; }
  table.data th { background: ${accent}; color: #fff8e7; padding: 2mm 1.5mm; font-size: 10px; }
  table.data td { border: 1px solid ${gold}55; padding: 1.8mm 1.5mm; text-align: center; }
  table.data tr:nth-child(even) td { background: #f9f2df66; }
  table.dasha { font-size: 11.5px; }
  .charts { display: flex; justify-content: space-between; gap: 6mm; }
  .chart-box { width: 48%; }
  .charts.grid3 { flex-wrap: wrap; row-gap: 5mm; }
  .charts.grid3 .chart-box { width: 31.5%; }
  .antar-grid { display: flex; flex-wrap: wrap; gap: 3mm; }
  .antar-block { width: 32%; }
  .antar-block table.compact { font-size: 8px; }
  .antar-block table.compact td { padding: 0.8mm 0.6mm; }
  .antar-block table.compact th { font-size: 8px; padding: 1mm 0.6mm; }
  .chart-box svg { width: 100%; height: auto; }
  .chart-title { text-align: center; font-size: 11px; font-weight: bold; color: ${accent}; margin-top: 1.5mm; }
  .rashi-num { font-size: 13px; fill: ${gold}; text-anchor: middle; font-weight: bold; }
  .planet { font-size: 14px; fill: #3a2410; text-anchor: middle; font-weight: bold; }
  .planet.special { font-size: 11px; fill: ${accent}; }
  table.compact { font-size: 10px; }
  table.compact td { padding: 1.1mm 1.5mm; }
  tr.current td { background: #ffe9a8 !important; font-weight: bold; }
  ul.pred { font-size: 11.5px; line-height: 1.6; padding-left: 5mm; }
  .charts { align-items: flex-start; }
  .note { font-size: 11.5px; line-height: 1.6; margin: 2mm 0; }
  .blessing { font-size: 12.5px; font-style: italic; line-height: 1.7; color: ${accent}; text-align: center; margin: 3mm 8mm; }
  .disclaimer { font-size: 9.5px; color: #7a5c2e; line-height: 1.5; margin-top: 5mm; text-align: center; }
  @page { size: A4; margin: 0; }
  @media print {
    body { background: none; }
    .page { margin: 0; width: 100%; min-height: 296mm; }
  }
</style>
</head>
<body>
  ${[page1, pageMain, ...chartPages, pageTransitVarsha, pageAshtakDasha, ...antarPages, page3].map(page).join("\n")}
</body>
</html>`;
}
