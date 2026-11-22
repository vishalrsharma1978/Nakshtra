// Builds a compact plain-text description of a person's complete kundli (all
// divisional charts, special points, ashtakavarga, dashas, transit, varshaphal)
// that is handed to the AI astrologer as grounding context.

import { RASHIS } from "./vedicData";
import { formatDegree, type BirthInput, type Kundli } from "./kundli";
import {
  antardashas,
  computeAshtakavarga,
  computeSpecialPoints,
  computeTransitChart,
  computeVargaCharts,
  computeVarshaphal,
  varshaphalPredictions,
  type VargaChart,
} from "./kundliExtras";

const fmt = (d: Date) => d.toISOString().slice(0, 10);

/** "Aries: Su, Mo | Taurus: - ..." style listing of a chart, with house numbers from its lagna. */
function describeChart(c: VargaChart): string {
  const bySign: string[][] = Array.from({ length: 12 }, () => []);
  for (const m of c.markers) bySign[m.signIndex].push(m.label);
  const parts: string[] = [];
  for (let h = 0; h < 12; h++) {
    const signIdx = (c.lagnaSignIndex + h) % 12;
    if (bySign[signIdx].length) {
      parts.push(
        `H${h + 1} ${RASHIS[signIdx].en}: ${bySign[signIdx].join(",")}`,
      );
    }
  }
  return `${c.code} ${c.name} | Lagna ${RASHIS[c.lagnaSignIndex].en} | ${parts.join(" ; ")}`;
}

export interface KundliSummaryOptions {
  name?: string;
  gender?: string;
  place?: string;
  now?: Date;
}

export function summarizeKundliForAi(
  input: BirthInput,
  k: Kundli,
  opts: KundliSummaryOptions = {},
): string {
  const now = opts.now ?? new Date();
  const special = computeSpecialPoints(input, k);
  const vargas = computeVargaCharts(k, special);
  const ashtak = computeAshtakavarga(k);
  const transit = computeTransitChart(input, k, special, now);
  const varsha = computeVarshaphal(
    input,
    k,
    Math.max(now.getUTCFullYear(), k.utcDate.getUTCFullYear() + 1),
  );
  const antar = antardashas(k.dashas);
  const nowMs = now.getTime();

  const lines: string[] = [];
  lines.push(
    `NATIVE: ${opts.name ?? "User"} (${opts.gender ?? "n/a"}), born ${input.date} ${input.time} (UTC offset ${input.utcOffsetMinutes} min) at ${opts.place ?? `${input.latitude},${input.longitude}`}.`,
  );
  lines.push(
    `Today: ${fmt(now)}. System: sidereal, Lahiri ayanamsa ${k.ayanamsa.toFixed(3)}, whole-sign houses.`,
  );
  lines.push(
    `LAGNA: ${k.lagna.sign} ${formatDegree(k.lagna.degreeInSign)}. MOON SIGN: ${k.moonSign}. NAKSHATRA: ${k.moonNakshatra.en} pada ${k.moonPada} (lord ${k.moonNakshatra.lord}). SUN SIGN: ${k.sunSign}.`,
  );
  lines.push(
    `PANCHANG: ${k.panchang.paksha} ${k.panchang.tithi}, yoga ${k.panchang.yoga}, karana ${k.panchang.karana}, ${k.panchang.vara}. MANGLIK: ${k.manglik ? `yes (${k.mangal.severity})` : "no"}; Mars is in house ${k.mangal.fromLagna.house} from Lagna, ${k.mangal.fromMoon.house} from Moon, ${k.mangal.fromVenus.house} from Venus${k.mangal.cancellations.length ? `; cancellation: ${k.mangal.cancellations.join("; ")}` : ""}.`,
  );
  lines.push(
    `AVAKAHADA: varna ${k.avakahada.varna}, vashya ${k.avakahada.vashya}, yoni ${k.avakahada.yoni}, gana ${k.avakahada.gana}, nadi ${k.avakahada.nadi}.`,
  );

  lines.push("PLANETS (D1):");
  for (const p of k.planets) {
    lines.push(
      `- ${p.planet}: ${p.sign} ${formatDegree(p.degreeInSign)}, house ${p.house}, ${p.nakshatra.en} pada ${p.pada}, navamsa ${p.navamsaSign}${p.retrograde ? ", retrograde" : ""}${p.dignity !== "-" ? `, ${p.dignity}` : ""}`,
    );
  }
  lines.push(
    `SPECIAL POINTS: Gulika ${special.gulika.sign} ${formatDegree(special.gulika.degreeInSign)}; Mandi ${special.mandi.sign} ${formatDegree(special.mandi.degreeInSign)}; Arudha Lagna ${special.arudhaLagna.sign}; Bhrigu Bindu ${special.bhriguBindu.sign} ${formatDegree(special.bhriguBindu.degreeInSign)}.`,
  );

  lines.push(
    "DIVISIONAL CHARTS (H = house from that chart's lagna; Gk Gulika, Md Mandi, AL Arudha lagna, BP Bhrigu bindu):",
  );
  for (const c of vargas) lines.push(`- ${describeChart(c)}`);

  lines.push("ASHTAKAVARGA (bindus Aries..Pisces):");
  for (const [pl, row] of Object.entries(ashtak.bav))
    lines.push(`- ${pl}: ${row.join(",")} (total ${ashtak.totals[pl]})`);
  lines.push(`- Sarva: ${ashtak.sav.join(",")}`);

  lines.push("VIMSHOTTARI MAHADASHAS:");
  for (const d of k.dashas) {
    const cur =
      d.start.getTime() <= nowMs && nowMs < d.end.getTime()
        ? " <== CURRENT"
        : "";
    lines.push(`- ${d.lord}: ${fmt(d.start)} to ${fmt(d.end)}${cur}`);
  }
  const curAntar = antar.find(
    (a) => a.start.getTime() <= nowMs && nowMs < a.end.getTime(),
  );
  if (curAntar) {
    lines.push(
      `CURRENT PERIOD: ${curAntar.mahadasha} Mahadasha / ${curAntar.lord} Antardasha (${fmt(curAntar.start)} to ${fmt(curAntar.end)}).`,
    );
    const upcoming = antar
      .filter((a) => a.start.getTime() >= nowMs)
      .slice(0, 4);
    lines.push(
      `NEXT ANTARDASHAS: ${upcoming.map((a) => `${a.mahadasha}/${a.lord} from ${fmt(a.start)}`).join("; ")}`,
    );
  }

  lines.push(
    `TRANSIT (${fmt(now)}) planets: ${transit.planets.map((p, i) => `${p.planet} ${p.sign} (house ${p.house} from lagna, ${transit.fromMoon[i].house} from Moon)`).join("; ")}.`,
  );
  lines.push(
    `VARSHAPHAL ${varsha.year}: solar return ${fmt(varsha.returnDate)}, varsha lagna ${varsha.kundli.lagna.sign}, muntha ${RASHIS[varsha.munthaSignIndex].en}, year lord ${varsha.yearLord}. Notes: ${varshaphalPredictions(varsha, k).join(" ")}`,
  );

  // Whitelist of every date the AI may quote. All come from the computed dasha,
  // antardasha and varshaphal tables above, never from free estimation.
  const allowed: string[] = [];
  for (const d of k.dashas)
    allowed.push(`${d.lord} Mahadasha: ${fmt(d.start)} to ${fmt(d.end)}`);
  const around = antar.filter(
    (a) =>
      a.end.getTime() >= nowMs &&
      a.start.getTime() <= nowMs + 5 * 365.25 * 86_400_000,
  );
  for (const a of around)
    allowed.push(
      `${a.mahadasha}/${a.lord} Antardasha: ${fmt(a.start)} to ${fmt(a.end)}`,
    );
  allowed.push(
    `Varshaphal ${varsha.year} solar return: ${fmt(varsha.returnDate)}`,
  );
  lines.push(
    "ALLOWED DATES (the ONLY dates you may mention; quote them exactly as listed, never invent, estimate or shift any date):",
  );
  for (const a of allowed) lines.push(`- ${a}`);

  return lines.join("\n");
}
