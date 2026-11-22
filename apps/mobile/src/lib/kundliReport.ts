// Builds the royal Janma Kundli report as self-contained HTML:
// - King (Maharaja) or Queen (Maharani) ethnic frame on every page
// - Nakshtra eye-logo brand header repeated on each printed page
// - North Indian style Lagna (D1) and Navamsa (D9) charts drawn as SVG
// - Avakahada chakra, panchang, planetary table, vimshottari dasha

import {
  RASHIS,
  PLANET_HI,
  formatDegree,
  antardashas,
  computeAshtakavarga,
  computeSpecialPoints,
  computeTransitChart,
  computeVargaCharts,
  computeVarshaphal,
  varshaphalPredictionsHi,
  type BirthInput,
  type Kundli,
  type PlanetPosition,
  type VargaChart,
} from "@nakshtra/shared";
import type { BrandAssets } from "./brandAssets";
import { designerChart, chartLegendHtml } from "./kundliChart";
import {
  planetHi,
  varnaHi,
  vashyaHi,
  yoniHi,
  ganaHi,
  nadiHi,
  pakshaHi,
  tithiHi,
  yogaHi,
  karanaHi,
  varaHi,
  severityHi,
  genderHi,
  fmtDateHi,
  doshaHi,
} from "./kundliHindi";

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

/** Hindi names/captions for each divisional chart. */
const VARGA_HI: Record<string, { title: string; sub: string }> = {
  D1: { title: "लग्न कुण्डली (D1)", sub: "जन्म कुण्डली · स्वयं, शरीर, जीवन" },
  D2: { title: "होरा (D2)", sub: "धन · संपत्ति" },
  D3: { title: "द्रेष्काण (D3)", sub: "भाई-बहन · साहस" },
  D4: { title: "चतुर्थांश (D4)", sub: "भूमि · भवन · वाहन" },
  D7: { title: "सप्तांश (D7)", sub: "संतान" },
  D9: { title: "नवांश कुण्डली (D9)", sub: "जीवनसाथी · धर्म · भाग्य" },
  D10: { title: "दशमांश (D10)", sub: "कर्म · व्यवसाय" },
  D12: { title: "द्वादशांश (D12)", sub: "माता-पिता" },
  D16: { title: "षोडशांश (D16)", sub: "वाहन · सुख" },
  D20: { title: "विंशांश (D20)", sub: "उपासना · साधना" },
  D24: { title: "चतुर्विंशांश (D24)", sub: "विद्या · शिक्षा" },
  D27: { title: "सप्तविंशांश (D27)", sub: "बल · सामर्थ्य" },
  D30: { title: "त्रिंशांश (D30)", sub: "अरिष्ट · कष्ट" },
  D40: { title: "खवेदांश (D40)", sub: "मातृ पक्ष" },
  D45: { title: "अक्षवेदांश (D45)", sub: "पितृ पक्ष" },
  D60: { title: "षष्ट्यांश (D60)", sub: "पूर्व कर्म" },
};

function chartFromVarga(
  c: VargaChart,
  accent: string,
  titleOverride?: string,
  subOverride?: string,
  large = false,
): string {
  const planets = c.markers.map((m) => ({
    label: m.label,
    houseFromLagna: ((m.signIndex - c.lagnaSignIndex + 12) % 12) + 1,
  }));
  const hi = VARGA_HI[c.code];
  return designerChart({
    title: titleOverride ?? hi?.title ?? c.hi,
    subtitle: subOverride ?? hi?.sub,
    lagnaSignIndex: c.lagnaSignIndex,
    planets,
    accent,
    gold: "#b8860b",
    large,
  });
}

const DIGNITY_HI: Record<string, string> = {
  Exalted: "उच्च",
  Debilitated: "नीच",
  "Own Sign": "स्वराशि",
  "-": "—",
};

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
  const varshaNotes = varshaphalPredictionsHi(varsha, k);

  const planetRows = k.planets
    .map(
      (p) => `<tr>
        <td><strong>${PLANET_HI[p.planet] ?? p.planet}</strong></td>
        <td>${RASHIS[p.signIndex].hi}</td>
        <td>${formatDegree(p.degreeInSign)}</td>
        <td>${p.nakshatra.hi} – ${p.pada}</td>
        <td>${RASHIS[p.navamsaSignIndex].hi}</td>
        <td>${p.house}</td>
        <td>${p.retrograde ? "वक्री" : "मार्गी"}</td>
        <td>${DIGNITY_HI[p.dignity] ?? p.dignity}</td>
      </tr>`,
    )
    .join("");

  const now = Date.now();
  const dashaRows = k.dashas
    .map(
      (d) =>
        `<tr${d.start.getTime() <= now && now < d.end.getTime() ? ' class="current"' : ""}><td><strong>${planetHi(d.lord)}</strong></td><td>${fmtDateHi(d.start)}</td><td>${fmtDateHi(d.end)}</td></tr>`,
    )
    .join("");

  const offsetH = Math.floor(Math.abs(person.utcOffsetMinutes) / 60);
  const offsetM = Math.abs(person.utcOffsetMinutes) % 60;
  const offsetStr = `UTC${person.utcOffsetMinutes < 0 ? "-" : "+"}${String(offsetH).padStart(2, "0")}:${String(offsetM).padStart(2, "0")}`;

  const header = `
    <div class="brand-header">
      <img src="${brand.logo}" class="brand-logo" />
      <div class="brand-name">NAKSHTRA</div>
      <div class="brand-tag">ज्योतिष · उपाय · विशेषज्ञ मार्गदर्शन — www.nakshtra.app</div>
    </div>`;

  const page = (content: string) => `
    <div class="page">
      <img src="${frame}" class="frame" />
      ${header}
      <div class="content">${content}</div>
      <div class="brand-footer">नक्षत्र · जन्म कुण्डली</div>
    </div>`;

  const mangalLine = k.manglik
    ? `मांगलिक ⚠️ (${severityHi(k.mangal.severity)})`
    : k.mangal.doshaBeforeCancellation
      ? "अमांगलिक ✓ (दोष परिहार)"
      : "अमांगलिक ✓";

  const page1 = `
    <h1 class="doc-title">॥ श्री जन्म कुण्डली ॥</h1>
    <p class="person-name">${escapeHtml(person.name)}</p>

    <h3 class="section-title">✦ जन्म विवरण</h3>
    <table class="kv">
      <tr><td>नाम</td><td>${escapeHtml(person.name)}</td><td>लिंग</td><td>${genderHi(isKing)}</td></tr>
      <tr><td>जन्म तिथि</td><td>${person.date}</td><td>जन्म समय</td><td>${person.time} (${offsetStr})</td></tr>
      <tr><td>जन्म स्थान</td><td colspan="3">${escapeHtml(person.place)} (${person.latitude.toFixed(3)}°, ${person.longitude.toFixed(3)}°)</td></tr>
      <tr><td>लग्न</td><td>${RASHIS[k.lagna.signIndex].hi} ${formatDegree(k.lagna.degreeInSign)}</td><td>चंद्र राशि</td><td>${RASHIS[k.moonSignIndex].hi}</td></tr>
      <tr><td>जन्म नक्षत्र</td><td>${k.moonNakshatra.hi} – चरण ${k.moonPada}</td><td>सूर्य राशि</td><td>${RASHIS.find((r) => r.en === k.sunSign)?.hi ?? k.sunSign}</td></tr>
      <tr><td>अयनांश</td><td>लाहिड़ी ${k.ayanamsa.toFixed(4)}°</td><td>मांगलिक विचार</td><td>${mangalLine}</td></tr>
    </table>

    <h3 class="section-title">✦ अवकहड़ा चक्र</h3>
    <table class="kv">
      <tr><td>वर्ण</td><td>${varnaHi(k.avakahada.varna)}</td><td>वश्य</td><td>${vashyaHi(k.avakahada.vashya)}</td></tr>
      <tr><td>योनि</td><td>${yoniHi(k.avakahada.yoni)}</td><td>गण</td><td>${ganaHi(k.avakahada.gana)}</td></tr>
      <tr><td>नाड़ी</td><td>${nadiHi(k.avakahada.nadi)}</td><td>नक्षत्र स्वामी</td><td>${planetHi(k.avakahada.nakshatraLord)}</td></tr>
      <tr><td>राशि स्वामी</td><td>${planetHi(k.avakahada.rashiLord)}</td><td>पाया</td><td>—</td></tr>
    </table>

    <h3 class="section-title">✦ जन्म पंचांग</h3>
    <table class="kv">
      <tr><td>तिथि</td><td>${pakshaHi(k.panchang.paksha)} · ${tithiHi(k.panchang.tithi)}</td><td>वार</td><td>${varaHi(k.panchang.vara)}</td></tr>
      <tr><td>योग</td><td>${yogaHi(k.panchang.yoga)}</td><td>करण</td><td>${karanaHi(k.panchang.karana)}</td></tr>
    </table>`;

  const pt = (p: { signIndex: number; degreeInSign: number }) =>
    `${RASHIS[p.signIndex].hi} ${formatDegree(p.degreeInSign)}`;

  // Compact layout: D1 + D9 sit with the planet table; the other vargas go 6 per page (3 x 2)
  const mainCharts = vargas.filter((c) => c.code === "D1" || c.code === "D9");
  const otherCharts = vargas.filter((c) => c.code !== "D1" && c.code !== "D9");
  const pageMain = `
    <h2 class="doc-subtitle" style="margin-top:0">❂ लग्न एवं नवांश कुण्डली ❂</h2>
    <div class="charts">${mainCharts.map((c) => chartFromVarga(c, accent, undefined, undefined, true)).join("")}</div>
    ${chartLegendHtml()}
    <h3 class="section-title">☉ ग्रह स्थिति</h3>
    <table class="data">
      <tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र–चरण</th><th>नवांश</th><th>भाव</th><th>गति</th><th>बल</th></tr>
      ${planetRows}
    </table>
    <p class="note">गुलिक ${pt(special.gulika)} · मांदी ${pt(special.mandi)} · भृगु बिंदु ${pt(special.bhriguBindu)} · आरूढ़ लग्न ${RASHIS[special.arudhaLagna.signIndex].hi} · सूर्योदय ${fmtTime(special.sunrise)} · सूर्यास्त ${fmtTime(special.sunset)}</p>`;
  const chartPages: string[] = [];
  for (let i = 0; i < otherCharts.length; i += 4) {
    chartPages.push(`
    <h2 class="doc-subtitle" style="margin-top:0">❂ वर्ग कुण्डलियाँ ❂</h2>
    <div class="charts grid3">${otherCharts
      .slice(i, i + 4)
      .map((c) => chartFromVarga(c, accent))
      .join("")}</div>
    ${chartLegendHtml()}`);
  }

  const transitRows = transit.planets
    .map(
      (p, i) =>
        `<tr><td><strong>${planetHi(p.planet)}</strong></td><td>${RASHIS[p.signIndex].hi}</td><td>${formatDegree(p.degreeInSign)}</td><td>${p.house}</td><td>${transit.fromMoon[i].house}</td></tr>`,
    )
    .join("");
  const pageTransitVarsha = `
    <h2 class="doc-subtitle" style="margin-top:0">❂ गोचर एवं वर्षफल ${varsha.year} ❂</h2>
    <div class="charts">
      ${chartFromVarga(transit.chart, accent, "गोचर कुण्डली", "आज की ग्रह स्थिति · " + fmtDateHi(transit.date), true)}
      ${chartFromVarga(varsha.chart, accent, `वर्ष कुण्डली ${varsha.year}`, `आयु ${varsha.age} वर्ष · मुंथा (मुं)`, true)}
    </div>
    ${chartLegendHtml()}
    <div class="charts">
      <div class="chart-box"><table class="data compact">
        <tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>भाव (लग्न)</th><th>भाव (चंद्र)</th></tr>
        ${transitRows}
      </table></div>
      <div class="chart-box">
        <p class="note" style="margin-top:0">सौर पुनरागमन <strong>${fmtDateHi(varsha.returnDate)}</strong> (आयु ${varsha.age}) · वर्ष लग्न <strong>${RASHIS[varsha.kundli.lagna.signIndex].hi}</strong> · मुंथा <strong>${RASHIS[varsha.munthaSignIndex].hi}</strong> · वर्षेश <strong>${planetHi(varsha.yearLord)}</strong></p>
        <ul class="pred">${varshaNotes.map((n) => `<li>${n}</li>`).join("")}</ul>
      </div>
    </div>`;

  const SIGN_ABBR = RASHIS.map((r) => r.hi);
  const bavPlanets = Object.keys(ashtak.bav);
  const ashtakRows = bavPlanets
    .map(
      (pl) =>
        `<tr><td><strong>${planetHi(pl)}</strong></td>${ashtak.bav[pl].map((v) => `<td>${v}</td>`).join("")}<td><strong>${ashtak.totals[pl]}</strong></td></tr>`,
    )
    .join("");
  const pageAshtakDasha = `
    <h2 class="doc-subtitle" style="margin-top:0">❂ अष्टकवर्ग एवं महादशा ❂</h2>
    <table class="data compact">
      <tr><th>ग्रह</th>${SIGN_ABBR.map((s) => `<th>${s}</th>`).join("")}<th>योग</th></tr>
      ${ashtakRows}
      <tr><td><strong>सर्व</strong></td>${ashtak.sav.map((v) => `<td><strong>${v}</strong></td>`).join("")}<td><strong>${ashtak.sav.reduce((a, b) => a + b, 0)}</strong></td></tr>
    </table>
    <p class="note">जिस राशि में सर्वाष्टकवर्ग के 28 या अधिक बिंदु हों वह राशि बलवान मानी जाती है; 25 से कम बिंदु कमज़ोर माने जाते हैं (पाराशरी पद्धति)।</p>
    <h3 class="section-title">✦ विंशोत्तरी महादशा</h3>
    <p class="note">जन्म के समय <strong>${planetHi(k.currentDashaAtBirth)} महादशा</strong> चल रही थी। वर्तमान महादशा पीले रंग में दर्शाई गई है।</p>
    <table class="data compact dasha">
      <tr><th>महादशा स्वामी</th><th>आरंभ</th><th>समाप्ति</th></tr>
      ${dashaRows}
    </table>`;

  // Antardasha: 3 side-by-side columns of Mahadasha blocks per page
  const antarByMaha: { lord: string; rows: string }[] = [];
  for (const a of antar) {
    const cur = a.start.getTime() <= now && now < a.end.getTime();
    const row = `<tr${cur ? ' class="current"' : ""}><td>${planetHi(a.lord)}</td><td>${fmtDateHi(a.start)}</td><td>${fmtDateHi(a.end)}</td></tr>`;
    const last = antarByMaha[antarByMaha.length - 1];
    if (last && last.lord === a.mahadasha) last.rows += row;
    else antarByMaha.push({ lord: a.mahadasha, rows: row });
  }
  const antarBlocks = antarByMaha.map(
    (m) => `<div class="antar-block"><table class="data compact">
      <tr><th colspan="3">${planetHi(m.lord)} महादशा</th></tr>
      <tr><th>अंतर</th><th>आरंभ</th><th>समाप्ति</th></tr>${m.rows}</table></div>`,
  );
  const antarPages: string[] = [];
  for (let i = 0; i < antarBlocks.length; i += 9) {
    antarPages.push(`
    <h2 class="doc-subtitle" style="margin-top:0">❂ अंतर्दशा विवरण ❂</h2>
    <div class="antar-grid">${antarBlocks.slice(i, i + 9).join("")}</div>`);
  }

  const page3 = `
    <h2 class="doc-subtitle" style="margin-top:0">❂ मंगल दोष एवं आशीर्वाद ❂</h2>
    <h3 class="section-title">✦ मंगल दोष विचार</h3>
    <table class="kv">
      <tr><td>लग्न से मंगल</td><td>${k.mangal.fromLagna.house} वाँ भाव ${doshaHi(k.mangal.fromLagna.dosha)}</td><td>चंद्र से मंगल</td><td>${k.mangal.fromMoon.house} वाँ भाव ${doshaHi(k.mangal.fromMoon.dosha)}</td></tr>
      <tr><td>शुक्र से मंगल</td><td>${k.mangal.fromVenus.house} वाँ भाव ${doshaHi(k.mangal.fromVenus.dosha)}</td><td>परिणाम</td><td>${k.manglik ? `मांगलिक – ${severityHi(k.mangal.severity)}` : "अमांगलिक"}</td></tr>
    </table>
    <p class="note">${
      k.manglik
        ? "मंगल लग्न या चंद्र से दोष बनाने वाले भाव (1, 2, 4, 7, 8 या 12) में है और कोई परिहार लागू नहीं होता। विवाह संबंधी निर्णय से पहले पारंपरिक उपाय और किसी विशेषज्ञ ज्योतिषी से परामर्श उचित है।"
        : k.mangal.doshaBeforeCancellation
          ? `मंगल दोष बनाने वाले भाव में है, किंतु दोष का परिहार हो जाता है (${k.mangal.cancellations.length} कारण)। इसलिए यह कुण्डली अमांगलिक मानी जाती है।`
          : "मंगल लग्न या चंद्र से दोष बनाने वाले भाव में नहीं है। इस कुण्डली में मंगल दोष नहीं बनता।"
    }</p>
    <h3 class="section-title">✦ आशीर्वाद</h3>
    <p class="blessing">${
      isKing
        ? "नवग्रह इस पुत्र को महाराजा जैसा पराक्रम, राजसिंहासन जैसी बुद्धि और हर शुभ कार्य में समृद्धि प्रदान करें।"
        : "नवग्रह इस पुत्री को महारानी जैसी गरिमा, राजसिंहासन जैसी बुद्धि और हर शुभ कार्य में समृद्धि प्रदान करें।"
    }</p>
    <p class="disclaimer">यह कुण्डली उच्च-स्तरीय ग्रह-गणना (लाहिड़ी अयनांश, सम्पूर्ण-राशि भाव) से नक्षत्र द्वारा स्वतः तैयार की गई है।
    व्यक्तिगत फलादेश एवं उपायों के लिए नक्षत्र ऐप में हमारे विशेषज्ञ ज्योतिषियों से परामर्श करें।</p>`;

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
  .charts.grid3 .chart-box { width: 48.5%; }
  .antar-grid { display: flex; flex-wrap: wrap; gap: 3mm; }
  .antar-block { width: 32%; }
  .antar-block table.compact { font-size: 8px; }
  .antar-block table.compact td { padding: 0.8mm 0.6mm; }
  .antar-block table.compact th { font-size: 8px; padding: 1mm 0.6mm; }
  .chart-box svg { width: 100%; height: auto; filter: drop-shadow(0 1px 2px #0003); }
  .chart-head { text-align: center; font-size: 13px; font-weight: bold; color: ${accent}; margin-bottom: 0.5mm; }
  .chart-ico { color: ${gold}; }
  .chart-sub { text-align: center; font-size: 9.5px; color: #7a5c2e; margin-bottom: 1.2mm; }
  .charts.grid3 .chart-head { font-size: 13px; }
  .charts.grid3 .chart-sub { font-size: 9.5px; }
  .hn { text-anchor: middle; font-weight: 700; fill: #7a1f1f; font-family: Arial, Helvetica, sans-serif; }
  .pl { text-anchor: middle; font-weight: 700; }
  .legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.2mm 3mm; margin: 2.5mm 0 1mm; font-size: 10px; color: #3a2410; page-break-inside: avoid; }
  .legend .lg { display: inline-flex; align-items: center; gap: 0.8mm; }
  .legend b { font-weight: 800; font-size: 11px; }
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
