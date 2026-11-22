// Offline "Guru" engine: answers common astrology questions from the user's own
// kundli with no network and no AI provider. It classifies the question into an
// intent (career, marriage, health, wealth, dasha, mangal, ...), reads the relevant
// houses/planets/divisional charts/dashas/transits, and writes a grounded answer.
// It is rule-based (deterministic), so every statement is traceable to chart data.

import { RASHIS } from "./vedicData";
import {
  DASHA_THEME,
  HOUSE_MEANING,
  LAGNA_TRAITS,
  LORD_IN_HOUSE,
  MOON_TRAITS,
  NAKSHATRA_NATURE,
  PLANET_IN_HOUSE,
  PLANET_NATURE,
  PLANET_REMEDY,
  SIGN_STYLE,
} from "./guruKnowledge";
import {
  computeNumerology,
  NUMBER_READING,
  PERSONAL_YEAR_THEME,
} from "./numerology";
import {
  AREA_REMEDIES,
  GEM_CAUTIONS,
  PLANET_REMEDIES,
  gemSafetyNote,
} from "./remedies";
import {
  formatDegree,
  type BirthInput,
  type Kundli,
  type PlanetPosition,
} from "./kundli";
import {
  antardashas,
  computeAshtakavarga,
  computeSpecialPoints,
  computeTransitChart,
  computeVargaCharts,
  computeVarshaphal,
  vargaSign,
  type Ashtakavarga,
  type AntarDasha,
  type SpecialPoints,
  type TransitChart,
  type Varshaphal,
} from "./kundliExtras";

export type GuruLanguage = "en" | "hi";

export type GuruIntent =
  | "greeting"
  | "career"
  | "marriage"
  | "children"
  | "wealth"
  | "health"
  | "education"
  | "property"
  | "foreign"
  | "spiritual"
  | "mangal"
  | "dasha"
  | "transit"
  | "sadesati"
  | "yearly"
  | "remedy"
  | "gemstone"
  | "numerology"
  | "shortfall"
  | "lucky"
  | "personality"
  | "chart"
  | "unknown";

export interface GuruContext {
  input: BirthInput;
  kundli: Kundli;
  special: SpecialPoints;
  ashtak: Ashtakavarga;
  antar: AntarDasha[];
  transit: TransitChart;
  varsha: Varshaphal;
  now: Date;
  name?: string;
}

export interface GuruAnswer {
  intent: GuruIntent;
  /** Full detailed answer (shown under "More detail"). */
  text: string;
  /** Short plain-language version, easy to read and to hear aloud. */
  simple?: string;
  /** True when a human expert would add real value (UI shows the booking button). */
  suggestExpert: boolean;
}

export function buildGuruContext(
  input: BirthInput,
  kundli: Kundli,
  opts: { name?: string; now?: Date } = {},
): GuruContext {
  const now = opts.now ?? new Date();
  const special = computeSpecialPoints(input, kundli);
  return {
    input,
    kundli,
    special,
    ashtak: computeAshtakavarga(kundli),
    antar: antardashas(kundli.dashas),
    transit: computeTransitChart(input, kundli, special, now),
    varsha: computeVarshaphal(
      input,
      kundli,
      Math.max(now.getUTCFullYear(), kundli.utcDate.getUTCFullYear() + 1),
    ),
    now,
    name: opts.name,
  };
}

// ------------------------------------------------------------------ intent detection

const INTENT_KEYWORDS: [GuruIntent, RegExp][] = [
  ["mangal", /mangal|manglik|kuja|mars dosha|मांगलिक|मंगल दोष/i],
  [
    "sadesati",
    /sade\s*sati|sadesati|saturn.*(7\.5|seven)|शनि.*साढ़े|साढ़े\s*साती/i,
  ],
  [
    "marriage",
    /marr|spouse|wife|husband|partner|wedding|shaadi|shadi|vivah|love|relationship|विवाह|शादी|पति|पत्नी|प्रेम/i,
  ],
  [
    "children",
    /child|kids?|baby|son\b|daughter|progeny|pregnan|santan|संतान|बच्च/i,
  ],
  [
    "career",
    /career|job|profession|work|business|promotion|boss|naukri|नौकरी|करियर|व्यवसाय|व्यापार/i,
  ],
  [
    "wealth",
    /wealth|money|income|finance|financial|rich|savings?|invest|loan|debt|dhan|पैसा|धन|आर्थिक/i,
  ],
  [
    "health",
    /health|disease|illness|sick|surgery|fitness|swasth|स्वास्थ्य|बीमारी|रोग/i,
  ],
  [
    "education",
    /educat|study|studies|exam|degree|college|school|vidya|पढ़ाई|शिक्षा|परीक्षा/i,
  ],
  [
    "property",
    /property|house|home|land|flat|vehicle|car\b|real estate|मकान|घर|जमीन|वाहन/i,
  ],
  ["foreign", /foreign|abroad|overseas|settle|visa|travel|immigra|विदेश/i],
  [
    "spiritual",
    /spiritual|moksha|meditat|dharma|religio|guru|sadhana|आध्यात्म|मोक्ष|ध्यान/i,
  ],
  [
    "numerology",
    /numerolog|mulank|bhagyank|destiny number|life path|birth number|name number|my number\b|अंक ज्योतिष|मूलांक|भाग्यांक/i,
  ],
  [
    "gemstone",
    /gem\b|gems\b|gemstone|stone|ruby|pearl|emerald|sapphire|coral|diamond|hessonite|gomed|cat'?s eye|neelam|pukhraj|manik|moti|panna|moonga|रत्न|नीलम|पुखराज|माणिक|मोती|पन्ना|मूंगा/i,
  ],
  [
    "shortfall",
    /weak planet|weakest|shortfall|short fall|lacking|what is missing|what'?s missing|why (am i|is my).*(not|delay|problem|struggl|stuck)|problem in my|bad luck|obstacle|obstruction|dosh|remove obstacle|kamzor|कमजोर|बाधा|दोष/i,
  ],
  [
    "remedy",
    /remed|upay|mantra|pooja|puja|fast\b|fasting|donat|charity|उपाय|मंत्र|पूजा/i,
  ],
  [
    "lucky",
    /lucky|luck|fortune|colou?r|number|day\b|bhagya|शुभ|भाग्य|रंग|अंक/i,
  ],
  [
    "yearly",
    /this year|next year|varsha|yearly|annual|2025|2026|2027|वर्षफल|इस साल|इस वर्ष/i,
  ],
  [
    "transit",
    /transit|gochar|now|currently|this month|today|these days|गोचर|आजकल|अभी/i,
  ],
  [
    "dasha",
    /dasha|mahadasha|antardasha|period|phase|time|when|दशा|महादशा|अंतर्दशा/i,
  ],
  [
    "personality",
    /personality|nature|character|strength|weakness|who am i|about me|swabhav|स्वभाव|व्यक्तित्व/i,
  ],
  [
    "chart",
    /kundli|kundali|chart|lagna|ascendant|rashi|moon sign|nakshatra|horoscope|कुंडली|लग्न|राशि|नक्षत्र/i,
  ],
  [
    "greeting",
    /^(hi|hello|hey|namaste|namaskar|pranam|good (morning|evening|afternoon))\b|नमस्ते|नमस्कार|प्रणाम/i,
  ],
];

export function detectIntent(question: string): GuruIntent {
  const q = question.trim();
  if (!q) return "unknown";
  // Specific life-area intents win over generic timing words ("when will I get a job" -> career)
  for (const [intent, re] of INTENT_KEYWORDS) {
    if (re.test(q)) return intent;
  }
  return "unknown";
}

// ------------------------------------------------------------------ chart helpers

const BENEFICS = ["Jupiter", "Venus", "Mercury", "Moon"];
const MALEFICS = ["Saturn", "Mars", "Rahu", "Ketu", "Sun"];

function planet(k: Kundli, name: string): PlanetPosition {
  return k.planets.find((p) => p.planet === name)!;
}

function signLord(signIndex: number): string {
  return RASHIS[signIndex].lord;
}

/** Sign index of the Nth house (1-12) from lagna. */
function houseSign(k: Kundli, house: number): number {
  return (k.lagna.signIndex + house - 1) % 12;
}

function planetsInHouse(k: Kundli, house: number): PlanetPosition[] {
  return k.planets.filter((p) => p.house === house);
}

function lordOfHouse(k: Kundli, house: number): PlanetPosition {
  return planet(k, signLord(houseSign(k, house)));
}

const ORD = [
  "",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function currentPeriod(c: GuruContext): {
  maha: string;
  antar: AntarDasha | undefined;
  mahaEnd: Date;
} {
  const nowMs = c.now.getTime();
  const maha = c.kundli.dashas.find(
    (d) => d.start.getTime() <= nowMs && nowMs < d.end.getTime(),
  );
  const antar = c.antar.find(
    (a) => a.start.getTime() <= nowMs && nowMs < a.end.getTime(),
  );
  return {
    maha: maha?.lord ?? c.kundli.currentDashaAtBirth,
    antar,
    mahaEnd: maha?.end ?? c.now,
  };
}

/** Qualitative strength of a planet from dignity, house type and ashtakavarga. */
function planetStrength(
  c: GuruContext,
  name: string,
): { score: number; notes: string[] } {
  const p = planet(c.kundli, name);
  const notes: string[] = [];
  let score = 0;
  if (p.dignity === "Exalted") {
    score += 2;
    notes.push(`exalted in ${p.sign}`);
  } else if (p.dignity === "Own Sign") {
    score += 2;
    notes.push(`in its own sign ${p.sign}`);
  } else if (p.dignity === "Debilitated") {
    score -= 2;
    notes.push(`debilitated in ${p.sign}`);
  }
  if ([1, 4, 5, 7, 9, 10].includes(p.house)) {
    score += 1;
    notes.push(`well placed in house ${p.house}`);
  }
  if ([6, 8, 12].includes(p.house)) {
    score -= 1;
    notes.push(`in a challenging house (${p.house})`);
  }
  const bav = c.ashtak.bav[name];
  if (bav) {
    const bindus = bav[p.signIndex];
    if (bindus >= 5) {
      score += 1;
      notes.push(`strong in Ashtakavarga (${bindus} bindus)`);
    } else if (bindus <= 2) {
      score -= 1;
      notes.push(`weak in Ashtakavarga (${bindus} bindus)`);
    }
  }
  if (p.retrograde && !["Rahu", "Ketu", "Sun", "Moon"].includes(name))
    notes.push("retrograde (results come with delay/intensity)");
  return { score, notes };
}

function verdict(score: number): string {
  if (score >= 3) return "very supportive";
  if (score >= 1) return "supportive";
  if (score === 0) return "mixed";
  if (score >= -2) return "needs care";
  return "challenging";
}

function dashaRelevance(c: GuruContext, relevant: string[]): string {
  const { maha, antar } = currentPeriod(c);
  const parts: string[] = [];
  parts.push(
    `You are running ${maha} Mahadasha${antar ? ` / ${antar.lord} Antardasha (until ${fmtDate(antar.end)})` : ""}.`,
  );
  const tied = [maha, antar?.lord].filter(
    (x): x is string => !!x && relevant.includes(x),
  );
  if (tied.length) {
    parts.push(
      `${tied.join(" and ")} directly govern${tied.length === 1 ? "s" : ""} this area, so this is an active, important phase for it.`,
    );
  } else {
    parts.push(
      "The running periods are not the main significators of this area, so progress here tends to be steady rather than dramatic.",
    );
  }
  const upcoming = c.antar
    .filter(
      (a) => a.start.getTime() > c.now.getTime() && relevant.includes(a.lord),
    )
    .slice(0, 2);
  if (upcoming.length) {
    parts.push(
      `Favourable windows ahead: ${upcoming.map((a) => `${a.mahadasha}/${a.lord} from ${fmtDate(a.start)}`).join(", ")}.`,
    );
  }
  return parts.join(" ");
}

function divisionalNote(
  c: GuruContext,
  division: number,
  planetName: string,
  label: string,
): string {
  const p = planet(c.kundli, planetName);
  const sign = vargaSign(p.longitude, division);
  const lagna = vargaSign(c.kundli.lagna.longitude, division);
  const house = ((sign - lagna + 12) % 12) + 1;
  return `${label}: ${planetName} sits in ${RASHIS[sign].en} (house ${house}) of D${division}.`;
}

// ------------------------------------------------------------------ answer builders

type Builder = (c: GuruContext) => GuruAnswer;

function areaAnswer(
  c: GuruContext,
  intent: GuruIntent,
  title: string,
  house: number,
  extraHouses: number[],
  karakas: string[],
  division: number | null,
  closing: string,
  expertTopic?: boolean,
): GuruAnswer {
  const k = c.kundli;
  const lines: string[] = [];
  const sign = RASHIS[houseSign(k, house)];
  const lord = lordOfHouse(k, house);
  const lordStrength = planetStrength(c, lord.planet);
  const occupants = planetsInHouse(k, house);
  let score = lordStrength.score;

  lines.push(
    `${title}: your ${ORD[house]} house is ${sign.en}, ruled by ${lord.planet}, which is placed in ${lord.sign} (house ${lord.house}) — ${lordStrength.notes.length ? lordStrength.notes.join(", ") : "with ordinary strength"}.`,
  );
  if (occupants.length) {
    const good = occupants.filter((p) => BENEFICS.includes(p.planet));
    const bad = occupants.filter((p) => MALEFICS.includes(p.planet));
    score += good.length - bad.length;
    lines.push(
      `${occupants.map((p) => p.planet).join(", ")} ${occupants.length > 1 ? "occupy" : "occupies"} this house${good.length ? `, with benefic support from ${good.map((p) => p.planet).join(", ")}` : ""}${bad.length ? `, while ${bad.map((p) => p.planet).join(", ")} add${bad.length === 1 ? "s" : ""} pressure that asks for patience` : ""}.`,
    );
  } else {
    lines.push(
      "No planet sits in this house, so the result depends mainly on its lord and on aspects.",
    );
  }
  for (const h of extraHouses) {
    const l = lordOfHouse(k, h);
    lines.push(
      `Supporting house ${h}: lord ${l.planet} is in house ${l.house} (${l.sign}).`,
    );
  }
  for (const kName of karakas) {
    const s = planetStrength(c, kName);
    score += Math.max(-1, Math.min(1, s.score));
    const kp = planet(k, kName);
    lines.push(
      `${kName} (natural significator) is in ${kp.sign}, house ${kp.house}${s.notes.length ? ` — ${s.notes.join(", ")}` : ""}.`,
    );
  }
  if (division) {
    lines.push(divisionalNote(c, division, lord.planet, `D${division} check`));
  }
  const sav = c.ashtak.sav[houseSign(k, house)];
  lines.push(
    `Sarvashtakavarga strength of this house: ${sav} bindus (${sav >= 28 ? "strong" : sav >= 25 ? "average" : "on the weaker side"}).`,
  );
  if (sav >= 28) score += 1;
  else if (sav < 25) score -= 1;

  lines.push(dashaRelevance(c, [lord.planet, ...karakas]));
  lines.push(`Overall indication: ${verdict(score)}. ${closing}`);
  return {
    intent,
    text: lines.join("\n\n"),
    simple: areaNarrative(c, title, house, karakas, score, closing, occupants),
    suggestExpert: Boolean(expertTopic),
  };
}

/**
 * A personal, plain-language story for one life area, assembled from this person's
 * own chart: the sign on the house, where its lord went, who sits in it, the
 * natural significator, the running dasha and the nakshatra of their Moon. Different
 * charts therefore produce visibly different answers.
 */
function areaNarrative(
  c: GuruContext,
  title: string,
  house: number,
  karakas: string[],
  score: number,
  closing: string,
  occupants: PlanetPosition[],
): string {
  const k = c.kundli;
  const hello = c.name ? `${c.name.split(" ")[0]}, ` : "";
  const signIdx = houseSign(k, house);
  const lord = lordOfHouse(k, house);
  const { maha, antar } = currentPeriod(c);
  const out: string[] = [];

  // 1. Opening: the verdict plus how the sign colours this area for them
  const verdictLine: Record<string, string> = {
    "very supportive": "This is one of the stronger areas of your chart",
    supportive: "This area of your chart is working in your favour",
    mixed: "This area gives mixed results: some strong points and some lessons",
    "needs care": "This area needs some patience and care in your chart",
    challenging:
      "This is a demanding area of your chart that grows through effort",
  };
  out.push(
    `${hello}${verdictLine[verdict(score)]}. Your ${title.toLowerCase()} is about ${HOUSE_MEANING[house]}, and in your chart it works ${SIGN_STYLE[signIdx]}.`,
  );

  // 2. Where its ruler went (the single most telling fact in classical reading)
  out.push(
    lord.house === house
      ? `Its ruler ${lord.planet} sits in the house itself, which protects and strengthens this area.`
      : `Its ruler ${lord.planet} sits in your ${ORD[lord.house]} house, which ${LORD_IN_HOUSE[lord.house]}.`,
  );

  // 3. Planets sitting in the house
  if (occupants.length) {
    const o = occupants[0];
    const text = PLANET_IN_HOUSE[o.planet]?.[house];
    if (text) out.push(`${o.planet} in this house ${text}.`);
  }

  // 4. Natural significator (karaka) in plain words
  if (karakas.length) {
    const kp = planet(k, karakas[0]);
    const s = planetStrength(c, kp.planet);
    const text = PLANET_IN_HOUSE[kp.planet]?.[kp.house];
    if (text) {
      out.push(
        `${kp.planet}, the natural giver of this area (${PLANET_NATURE[kp.planet]}), ${s.score >= 1 ? "is strong" : s.score <= -1 ? "is under pressure" : "is steady"} and in house ${kp.house} it ${text}.`,
      );
    }
  }

  // 5. Timing: running dasha in everyday words
  const theme = DASHA_THEME[maha];
  const tied =
    lord.planet === maha ||
    karakas.includes(maha) ||
    (antar && (lord.planet === antar.lord || karakas.includes(antar.lord)));
  out.push(
    `Right now you are in a ${maha} Mahadasha${antar ? ` (${antar.lord} sub-period until ${fmtDate(antar.end)})` : ""}, ${theme.feels}. ${
      tied
        ? "This period directly activates this area of life, so events here are likely to move forward."
        : "It is not the main driver of this area, so progress here is steady rather than sudden."
    }`,
  );

  // 6. Next good window
  const relevant = [lord.planet, ...karakas];
  const next = c.antar.find(
    (a) => a.start.getTime() > c.now.getTime() && relevant.includes(a.lord),
  );
  if (next) {
    out.push(
      `A particularly helpful time for this is the ${next.lord} sub-period starting ${fmtDate(next.start)}.`,
    );
  }

  // 7. Personal flavour from the Moon's nakshatra, then a closing nudge
  const nak = NAKSHATRA_NATURE[moonNakshatraIndex(c)];
  out.push(
    `With your Moon in ${k.moonNakshatra.en}, you are ${nak}. ${closing}`,
  );
  out.push(theme.advice);

  return out.join(" ");
}

function moonNakshatraIndex(c: GuruContext): number {
  return planet(c.kundli, "Moon").nakshatraIndex;
}

const buildCareer: Builder = (c) =>
  areaAnswer(
    c,
    "career",
    "Career",
    10,
    [6, 11],
    ["Sun", "Saturn"],
    10,
    "Steady effort in the favourable periods mentioned above will pay off best.",
  );

const buildMarriage: Builder = (c) => {
  const k = c.kundli;
  const ans = areaAnswer(
    c,
    "marriage",
    "Marriage & relationships",
    7,
    [2, 5],
    ["Venus", "Jupiter"],
    9,
    "Harmony improves when you act during Venus/Jupiter-supported periods.",
    true,
  );
  const extra = k.manglik
    ? `Note: Mangal Dosha is present (${k.mangal.severity}); matching with a partner's chart is advisable.`
    : k.mangal.doshaBeforeCancellation
      ? "Mangal Dosha is formed but cancelled in your chart, so it should not obstruct marriage."
      : "There is no Mangal Dosha in your chart.";
  return {
    ...ans,
    text: `${ans.text}\n\n${extra}\n\nFor detailed partner matching (Ashtakoot/Guna Milan) a human expert is recommended.`,
  };
};

const buildChildren: Builder = (c) =>
  areaAnswer(
    c,
    "children",
    "Children",
    5,
    [9],
    ["Jupiter"],
    7,
    "Jupiter's periods are especially important for this area.",
    true,
  );

const buildWealth: Builder = (c) =>
  areaAnswer(
    c,
    "wealth",
    "Wealth & finances",
    2,
    [11, 5, 9],
    ["Jupiter", "Venus"],
    2,
    "Disciplined saving during supportive periods builds lasting wealth.",
  );

const buildHealth: Builder = (c) => {
  const ans = areaAnswer(
    c,
    "health",
    "Health",
    1,
    [6, 8],
    ["Sun", "Moon"],
    12,
    "This is general astrological guidance, not medical advice.",
    true,
  );
  return {
    ...ans,
    text: `${ans.text}\n\nPlease consult a doctor for any health concern; astrology can only indicate general tendencies.`,
  };
};

const buildEducation: Builder = (c) =>
  areaAnswer(
    c,
    "education",
    "Education & learning",
    4,
    [5, 9],
    ["Mercury", "Jupiter"],
    24,
    "Focused study during Mercury/Jupiter periods gives the best results.",
  );

const buildProperty: Builder = (c) =>
  areaAnswer(
    c,
    "property",
    "Property & vehicles",
    4,
    [11],
    ["Mars", "Venus"],
    4,
    "Large purchases are best planned in a supportive dasha.",
  );

const buildForeign: Builder = (c) =>
  areaAnswer(
    c,
    "foreign",
    "Foreign travel & settlement",
    12,
    [9, 3],
    ["Rahu"],
    null,
    "Rahu and 12th-house periods tend to open overseas opportunities.",
  );

const buildSpiritual: Builder = (c) =>
  areaAnswer(
    c,
    "spiritual",
    "Spiritual path",
    9,
    [12, 5],
    ["Jupiter", "Ketu"],
    20,
    "Regular meditation and mantra practice suit your chart.",
  );

const buildMangal: Builder = (c) => {
  const m = c.kundli.mangal;
  const lines: string[] = [];
  lines.push(
    `Mars is in your ${ORD[m.fromLagna.house]} house from Lagna, ${ORD[m.fromMoon.house]} from the Moon and ${ORD[m.fromVenus.house]} from Venus (dosha houses are 1, 2, 4, 7, 8, 12).`,
  );
  if (c.kundli.manglik) {
    lines.push(
      `Result: you ARE Manglik (${m.severity} intensity). It mainly affects marriage timing and harmony and is best handled by matching with another Manglik chart or by traditional remedies.`,
    );
  } else if (m.doshaBeforeCancellation) {
    lines.push(
      `Result: Mangal Dosha is formed but is CANCELLED — ${m.cancellations.join("; ")}. You are considered Non-Manglik for practical purposes.`,
    );
  } else {
    lines.push(
      "Result: you are NOT Manglik; Mars does not occupy a dosha-forming house from Lagna or the Moon.",
    );
  }
  return {
    intent: "mangal",
    text: lines.join("\n\n"),
    suggestExpert: c.kundli.manglik,
  };
};

const buildDasha: Builder = (c) => {
  const { maha, antar, mahaEnd } = currentPeriod(c);
  const lines: string[] = [];
  const mp = planet(c.kundli, maha);
  const ms = planetStrength(c, maha);
  lines.push(`You are in ${maha} Mahadasha until ${fmtDate(mahaEnd)}.`);
  lines.push(
    `${maha} is in ${mp.sign} (house ${mp.house}) in your chart${ms.notes.length ? `, ${ms.notes.join(", ")}` : ""}, so this long phase is ${verdict(ms.score)}. It colours life around house ${mp.house} matters and the houses ${maha} rules.`,
  );
  if (antar) {
    const ap = planet(c.kundli, antar.lord);
    const as = planetStrength(c, antar.lord);
    lines.push(
      `Current sub-period: ${antar.lord} Antardasha (${fmtDate(antar.start)} – ${fmtDate(antar.end)}). ${antar.lord} is in ${ap.sign} (house ${ap.house}) and is ${verdict(as.score)}.`,
    );
  }
  const next = c.antar
    .filter((a) => a.start.getTime() > c.now.getTime())
    .slice(0, 3);
  if (next.length) {
    lines.push(
      `Coming sub-periods: ${next.map((a) => `${a.lord} (${fmtDate(a.start)})`).join(", ")}.`,
    );
  }
  return { intent: "dasha", text: lines.join("\n\n"), suggestExpert: false };
};

const buildTransit: Builder = (c) => {
  const k = c.kundli;
  const moon = planet(k, "Moon");
  const t = c.transit;
  const get = (n: string) => t.planets.find((p) => p.planet === n)!;
  const fromMoon = (n: string) => t.fromMoon.find((x) => x.planet === n)!.house;
  const lines: string[] = [];
  lines.push(
    `Current transits (as of ${c.now.toISOString().slice(0, 10)}), counted from your natal Moon in ${moon.sign}:`,
  );
  for (const n of ["Jupiter", "Saturn", "Rahu", "Ketu", "Mars"]) {
    const p = get(n);
    lines.push(
      `• ${n} is in ${p.sign} — house ${p.house} from your Lagna, house ${fromMoon(n)} from your Moon.`,
    );
  }
  const jup = fromMoon("Jupiter");
  lines.push(
    [2, 5, 7, 9, 11].includes(jup)
      ? "Transit Jupiter is in a supportive position from your Moon — a good time for growth, learning and new beginnings."
      : "Transit Jupiter is not in its most favourable position from your Moon, so be patient with big expansions.",
  );
  const sat = fromMoon("Saturn");
  if ([12, 1, 2].includes(sat)) {
    lines.push(
      "Saturn is passing through the 12th/1st/2nd from your Moon — the Sade Sati phase. Discipline, patience and service bring good results.",
    );
  } else if ([4, 8].includes(sat)) {
    lines.push(
      "Saturn is in the 4th/8th from your Moon (Dhaiya). Go slowly with major decisions and look after health and home.",
    );
  }
  return { intent: "transit", text: lines.join("\n"), suggestExpert: false };
};

const buildSadeSati: Builder = (c) => {
  const k = c.kundli;
  const moon = planet(k, "Moon");
  const sat = c.transit.planets.find((p) => p.planet === "Saturn")!;
  const diff = (sat.signIndex - moon.signIndex + 12) % 12; // 11 = 12th from moon, 0 = on moon, 1 = 2nd
  const phase =
    diff === 11
      ? "first phase (Saturn in the 12th from your Moon)"
      : diff === 0
        ? "peak phase (Saturn over your Moon)"
        : diff === 1
          ? "last phase (Saturn in the 2nd from your Moon)"
          : null;
  const lines: string[] = [];
  if (phase) {
    lines.push(
      `Yes — you are currently in Sade Sati, in the ${phase}. Saturn is transiting ${sat.sign}; your Moon is in ${moon.sign}.`,
    );
    lines.push(
      "This 7.5-year phase teaches discipline and responsibility. Results depend on Saturn's strength in your chart: Saturn is " +
        verdict(planetStrength(c, "Saturn").score) +
        " for you.",
    );
    lines.push(
      "Helpful steps: Saturday lamp offering, Hanuman Chalisa, service to elders and the needy, and avoiding shortcuts.",
    );
  } else {
    const nextSigns = [(moon.signIndex + 11) % 12];
    lines.push(
      `No — you are not in Sade Sati right now. Saturn is in ${sat.sign} and your Moon is in ${moon.sign}. Sade Sati begins when Saturn enters ${RASHIS[nextSigns[0]].en}.`,
    );
  }
  return { intent: "sadesati", text: lines.join("\n\n"), suggestExpert: false };
};

const buildYearly: Builder = (c) => {
  const v = c.varsha;
  const munthaHouse =
    ((v.munthaSignIndex - c.kundli.lagna.signIndex + 12) % 12) + 1;
  const lines: string[] = [];
  lines.push(
    `Varshaphal ${v.year} (age ${v.age}): your solar return falls on ${v.returnDate.toISOString().slice(0, 10)}. Varsha Lagna is ${v.kundli.lagna.sign}; Muntha is in ${RASHIS[v.munthaSignIndex].en} (house ${munthaHouse} of your birth chart); the year lord is ${v.yearLord}.`,
  );
  const notes = [
    `Muntha in house ${munthaHouse} emphasises ${houseTheme(munthaHouse)}.`,
    `Jupiter in house ${v.kundli.planets.find((p) => p.planet === "Jupiter")!.house} of the annual chart ${[1, 2, 4, 5, 7, 9, 10, 11].includes(v.kundli.planets.find((p) => p.planet === "Jupiter")!.house) ? "brings grace and growth" : "asks for patience"}.`,
    `Saturn in house ${v.kundli.planets.find((p) => p.planet === "Saturn")!.house} of the annual chart ${[3, 6, 10, 11].includes(v.kundli.planets.find((p) => p.planet === "Saturn")!.house) ? "rewards hard work" : "calls for caution with commitments"}.`,
  ];
  lines.push(notes.join(" "));
  return { intent: "yearly", text: lines.join("\n\n"), suggestExpert: false };
};

function houseTheme(h: number): string {
  return [
    "",
    "self and vitality",
    "family and finances",
    "courage and communication",
    "home and peace",
    "creativity, children and learning",
    "service, health and competition",
    "partnerships and marriage",
    "transformation and research",
    "fortune and higher learning",
    "career and status",
    "gains and networks",
    "expenses, retreat and foreign links",
  ][h];
}

const buildRemedy: Builder = (c) => {
  const k = c.kundli;
  const lines: string[] = ["Simple, safe remedies based on your chart:"];
  const { maha, antar } = currentPeriod(c);
  const mantra: Record<string, string> = {
    Sun: "Om Suryaya Namah (Sundays, at sunrise)",
    Moon: "Om Chandraya Namah (Mondays)",
    Mars: "Om Angarakaya Namah (Tuesdays); Hanuman Chalisa",
    Mercury: "Om Budhaya Namah (Wednesdays)",
    Jupiter: "Om Gurave Namah (Thursdays); respect teachers",
    Venus: "Om Shukraya Namah (Fridays)",
    Saturn: "Om Shanaye Namah (Saturdays); serve the needy",
    Rahu: "Om Rahave Namah (Saturdays)",
    Ketu: "Om Ketave Namah (Tuesdays/Saturdays)",
  };
  lines.push(`• For your running ${maha} Mahadasha: ${mantra[maha]}.`);
  if (antar && antar.lord !== maha)
    lines.push(`• For ${antar.lord} Antardasha: ${mantra[antar.lord]}.`);
  const weak = k.planets
    .filter((p) => p.planet !== "Rahu" && p.planet !== "Ketu")
    .map((p) => ({ p, s: planetStrength(c, p.planet).score }))
    .sort((a, b) => a.s - b.s)[0];
  if (weak && weak.s < 0)
    lines.push(
      `• Your weakest planet is ${weak.p.planet} (${weak.p.sign}, house ${weak.p.house}): ${mantra[weak.p.planet]}.`,
    );
  if (k.manglik)
    lines.push(
      "• For Mangal Dosha: Tuesday fasting, Hanuman Chalisa, and donating red lentils.",
    );
  lines.push(
    "• General: daily gratitude, charity on your ruling weekday, and meditation. Wear gemstones only after consulting an expert — a wrong stone can do harm.",
  );
  return { intent: "remedy", text: lines.join("\n"), suggestExpert: true };
};

// ------------------------------------------------------------------ shortfalls, gemstones, numerology

/** Houses a planet rules in this chart (1-12, by whole-sign lordship). */
function housesRuledBy(c: GuruContext, planetName: string): number[] {
  const out: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (RASHIS[houseSign(c.kundli, h)].lord === planetName) out.push(h);
  }
  return out;
}

interface Shortfall {
  planet: string;
  score: number;
  reasons: string[];
}

/** Planets ordered weakest-first, with plain reasons. Rahu/Ketu are judged by house only. */
function findShortfalls(c: GuruContext): Shortfall[] {
  return c.kundli.planets
    .filter((p) => p.planet !== "Rahu" && p.planet !== "Ketu")
    .map((p) => {
      const s = planetStrength(c, p.planet);
      return { planet: p.planet, score: s.score, reasons: s.notes };
    })
    .sort((a, b) => a.score - b.score);
}

const buildShortfall: Builder = (c) => {
  const k = c.kundli;
  const weak = findShortfalls(c)
    .filter((s) => s.score < 0)
    .slice(0, 3);
  const lines: string[] = [];
  const simple: string[] = [];
  const hello = c.name ? `${c.name.split(" ")[0]}, ` : "";

  if (!weak.length) {
    lines.push(
      "No planet in your chart is notably weak. Your chart is fairly balanced; use the remedies of your running dasha lord to stay supported.",
    );
    simple.push(
      `${hello}good news: no planet in your chart is badly weak. Your chart is fairly balanced, so focus on the remedies of your running dasha lord.`,
    );
  } else {
    simple.push(
      `${hello}the planets that need the most support in your chart are ${weak.map((w) => w.planet).join(", ")}.`,
    );
    for (const w of weak) {
      const p = planet(k, w.planet);
      const r = PLANET_REMEDIES[w.planet];
      const ruled = housesRuledBy(c, w.planet);
      lines.push(
        `${w.planet} (${p.sign}, house ${p.house}) is under pressure: ${w.reasons.join(", ")}. It rules your house${ruled.length > 1 ? "s" : ""} ${ruled.join(" and ")}, so it can show up as ${r.weakSigns[0]}.`,
      );
      lines.push(
        `Remedy for ${w.planet}: chant "${r.mantra}" ${r.japa}; donate ${r.charity[0]} on ${r.day}; ${r.lifestyle[0]}.`,
      );
      simple.push(
        `${w.planet} is in house ${p.house} (${p.sign}) and ${w.reasons[0] ?? "is weak"}. This can show up as ${r.weakSigns[0]}. To support it, chant "${r.mantra}" on ${r.day}, donate ${r.charity[0]}, and ${r.lifestyle[0]}.`,
      );
    }
  }
  if (k.manglik) {
    lines.push(
      "Mangal Dosha is active: Tuesday fasting, Hanuman Chalisa, and matching with a partner's chart help.",
    );
    simple.push(
      "Mangal Dosha is also active in your chart, so pay attention to Hanuman Chalisa on Tuesdays and match your chart before marriage.",
    );
  }
  lines.push(
    "Remedies work as support, not as a replacement for effort, health care or good decisions.",
  );
  return {
    intent: "shortfall",
    text: lines.join("\n\n"),
    simple: simple.join(" "),
    suggestExpert: true,
  };
};

const GEM_QUERY: [RegExp, string][] = [
  [/ruby|manik|माणिक/i, "Sun"],
  [/pearl|moti|मोती|moonstone/i, "Moon"],
  [/coral|moonga|मूंगा/i, "Mars"],
  [/emerald|panna|पन्ना/i, "Mercury"],
  [/yellow sapphire|pukhraj|पुखराज|topaz/i, "Jupiter"],
  [/diamond|heera|opal/i, "Venus"],
  [/blue sapphire|neelam|नीलम|amethyst/i, "Saturn"],
  [/hessonite|gomed/i, "Rahu"],
  [/cat'?s eye|lehsunia/i, "Ketu"],
];

function gemAdvice(c: GuruContext, name: string, asked?: string): string {
  const r = PLANET_REMEDIES[name];
  const p = planet(c.kundli, name);
  const safety = gemSafetyNote(name, housesRuledBy(c, name));
  const strength = planetStrength(c, name);
  const status =
    strength.score >= 1
      ? `${name} is already strong in your chart`
      : strength.score <= -1
        ? `${name} is under pressure in your chart`
        : `${name} is average in your chart`;
  const gem = r.gem;
  const lead = asked ? `For ${asked}: ` : "";
  if (safety.safe && strength.score <= 0) {
    return `${lead}${status}, and ${safety.reason}. Suggested stone: ${gem.primary} (or ${gem.alternate}), set in ${gem.metal}, worn on the ${gem.finger}, ${gem.weight}, on ${r.day} morning after chanting "${r.mantra}". Test-wear it for 3 days first.`;
  }
  if (safety.safe) {
    return `${lead}${status}, so a stone is not needed for it. If you still like it, ${gem.primary} is the traditional stone. Mantra and charity on ${r.day} are enough.`;
  }
  return `${lead}${status}, but a stone is not advised: ${safety.reason}. Safer options for ${name} (house ${p.house}): chant "${r.mantra}", donate ${r.charity[0]} on ${r.day}, and ${r.lifestyle[0]}.`;
}

const buildGemstone: Builder = (c) => {
  const k = c.kundli;
  const hello = c.name ? `${c.name.split(" ")[0]}, ` : "";
  const lagnaLord = RASHIS[k.lagna.signIndex].lord;
  const { maha } = currentPeriod(c);
  const parts: string[] = [];
  const simple: string[] = [];

  const mine = [
    lagnaLord,
    maha,
    ...[5, 9].map((h) => RASHIS[houseSign(k, h)].lord),
  ];
  const seen = new Set<string>();
  for (const name of mine) {
    if (seen.has(name)) continue;
    seen.add(name);
    const r = PLANET_REMEDIES[name];
    const advice = gemAdvice(c, name, `${name} (${r.gem.primary})`);
    parts.push(advice);
    if (simple.length < 2) simple.push(advice);
  }
  parts.push(GEM_CAUTIONS.join(" "));
  return {
    intent: "gemstone",
    text: `Gemstone guidance from your chart (Lagna lord ${lagnaLord}, running ${maha} Mahadasha, trine lords):\n\n${parts.join("\n\n")}`,
    simple: `${hello}${simple.join(" ")} ${GEM_CAUTIONS[0]}`,
    suggestExpert: true,
  };
};

const buildNumerology: Builder = (c) => {
  const year = c.now.getUTCFullYear();
  const n = computeNumerology(c.input.date, c.name, year);
  const m = NUMBER_READING[n.mulank];
  const b = NUMBER_READING[n.bhagyank];
  const hello = c.name ? `${c.name.split(" ")[0]}, ` : "";
  const nameLine =
    n.nameNumber !== null
      ? ` Your name vibrates to ${n.nameNumber} (${NUMBER_READING[n.nameNumber].title.toLowerCase()}), which ${n.nameNumber === n.mulank || n.nameNumber === n.bhagyank ? "supports" : "adds a different flavour to"} your birth numbers.`
      : "";
  const text = [
    `Mulank (birth number) ${n.mulank} — ${m.title}: ${m.nature}. Strengths: ${m.strengths}. Watch out for: ${m.watchOut}.`,
    `Bhagyank (destiny number) ${n.bhagyank} — ${b.title}: ${b.nature}. Suited careers: ${b.career}.`,
    `Lucky day: ${m.luckyDay}. Lucky colours: ${m.luckyColours}. Lucky numbers: ${m.luckyNumbers}. Friendly numbers: ${m.friendly.join(", ")}.`,
    `Love and relationships: ${m.love}.`,
    `Personal year ${year}: number ${n.personalYear} — ${PERSONAL_YEAR_THEME[n.personalYear]}.`,
    n.nameNumber !== null
      ? `Name number: ${n.nameNumber} (${NUMBER_READING[n.nameNumber].title}).`
      : "",
    `Guidance: ${m.tip}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    intent: "numerology",
    text,
    simple: `${hello}your birth number is ${n.mulank} (${m.title}) and your destiny number is ${n.bhagyank} (${b.title}). You are ${m.nature}. Your strengths are ${m.strengths}, and you should watch out for ${m.watchOut}.${nameLine} In ${year} you are in a personal year ${n.personalYear}, ${PERSONAL_YEAR_THEME[n.personalYear]}. Your lucky day is ${m.luckyDay} and your lucky colours are ${m.luckyColours}.`,
    suggestExpert: false,
  };
};

const buildLucky: Builder = (c) => {
  const k = c.kundli;
  const lordName = RASHIS[k.moonSignIndex].lord;
  const colours: Record<string, string> = {
    Sun: "saffron, gold and orange",
    Moon: "white and cream",
    Mars: "red and coral",
    Mercury: "green",
    Jupiter: "yellow",
    Venus: "white, pink and light blue",
    Saturn: "dark blue and black",
  };
  const days: Record<string, string> = {
    Sun: "Sunday",
    Moon: "Monday",
    Mars: "Tuesday",
    Mercury: "Wednesday",
    Jupiter: "Thursday",
    Venus: "Friday",
    Saturn: "Saturday",
  };
  const nums: Record<string, string> = {
    Sun: "1",
    Moon: "2",
    Jupiter: "3",
    Rahu: "4",
    Mercury: "5",
    Venus: "6",
    Ketu: "7",
    Saturn: "8",
    Mars: "9",
  };
  return {
    intent: "lucky",
    text: [
      `Your Moon sign is ${k.moonSign}, ruled by ${lordName}.`,
      `• Lucky colours: ${colours[lordName] ?? "warm gold"}.`,
      `• Favourable day: ${days[lordName] ?? "Thursday"}.`,
      `• Lucky number: ${nums[lordName] ?? "3"}.`,
      `• Your Janma Nakshatra is ${k.moonNakshatra.en} (lord ${k.moonNakshatra.lord}).`,
      "These are traditional indications meant for encouragement, not guarantees.",
    ].join("\n"),
    suggestExpert: false,
  };
};

const buildPersonality: Builder = (c) => {
  const k = c.kundli;
  const sun = planet(k, "Sun");
  const moon = planet(k, "Moon");
  const lagnaLord = lordOfHouse(k, 1);
  const lines: string[] = [];
  lines.push(
    `Lagna (outer personality): ${k.lagna.sign}, ruled by ${lagnaLord.planet} in ${lagnaLord.sign} (house ${lagnaLord.house}).`,
  );
  lines.push(
    `Moon (mind and emotions): ${moon.sign} in ${moon.nakshatra.en} nakshatra — ${k.avakahada.gana} gana, ${k.avakahada.varna} varna.`,
  );
  lines.push(`Sun (soul and purpose): ${sun.sign} in house ${sun.house}.`);
  const strong = k.planets
    .filter((p) => ["Exalted", "Own Sign"].includes(p.dignity))
    .map((p) => `${p.planet} (${p.dignity.toLowerCase()})`);
  const weak = k.planets
    .filter((p) => p.dignity === "Debilitated")
    .map((p) => p.planet);
  if (strong.length) lines.push(`Strengths: ${strong.join(", ")}.`);
  if (weak.length)
    lines.push(
      `Areas to nurture: ${weak.join(", ")} (debilitated) — growth comes through conscious effort here.`,
    );
  return {
    intent: "personality",
    text: lines.join("\n\n"),
    suggestExpert: false,
  };
};

const buildChart: Builder = (c) => {
  const k = c.kundli;
  return {
    intent: "chart",
    text: [
      `Lagna: ${k.lagna.sign} ${formatDegree(k.lagna.degreeInSign)}. Moon sign: ${k.moonSign}. Nakshatra: ${k.moonNakshatra.en} pada ${k.moonPada}. Sun sign: ${k.sunSign}.`,
      `Planets: ${k.planets.map((p) => `${p.planet} ${p.sign} (H${p.house})`).join(", ")}.`,
      `Special points: Gulika in ${c.special.gulika.sign}, Mandi in ${c.special.mandi.sign}, Arudha Lagna in ${c.special.arudhaLagna.sign}, Bhrigu Bindu in ${c.special.bhriguBindu.sign}.`,
      `Mangal Dosha: ${k.manglik ? "present" : "not present"}. Birth Mahadasha: ${k.currentDashaAtBirth}.`,
      "Download the Royal Kundli PDF for all 16 divisional charts, Ashtakavarga and Varshaphal.",
    ].join("\n\n"),
    suggestExpert: false,
  };
};

const BUILDERS: Partial<Record<GuruIntent, Builder>> = {
  career: buildCareer,
  marriage: buildMarriage,
  children: buildChildren,
  wealth: buildWealth,
  health: buildHealth,
  education: buildEducation,
  property: buildProperty,
  foreign: buildForeign,
  spiritual: buildSpiritual,
  mangal: buildMangal,
  dasha: buildDasha,
  transit: buildTransit,
  sadesati: buildSadeSati,
  yearly: buildYearly,
  remedy: buildRemedy,
  gemstone: buildGemstone,
  numerology: buildNumerology,
  shortfall: buildShortfall,
  lucky: buildLucky,
  personality: buildPersonality,
  chart: buildChart,
};

const SENSITIVE =
  /death|die\b|dying|suicide|kill|cancer|accident|divorce|court|lawsuit|legal|jail|pregnan|abortion|मृत्यु|आत्महत्या|तलाक/i;

const EXPERT_ASK =
  /expert|astrologer|human|appointment|consult|speak to|talk to someone|पंडित|ज्योतिषी/i;

export const GURU_SUGGESTIONS = [
  "How is my career?",
  "Which dasha am I running?",
  "Am I Manglik?",
  "When will I get married?",
  "Which gemstone suits me?",
  "What are my weak planets and remedies?",
  "Tell me my numerology",
  "Am I in Sade Sati?",
];

/**
 * Answers a question from the kundli with no network. Returns text in English;
 * Hindi users get the same answer prefixed with a short Hindi note (full Hindi
 * generation requires the AI provider).
 */
export function answerQuestion(
  question: string,
  ctx: GuruContext | null,
  lang: GuruLanguage = "en",
): GuruAnswer {
  const name = ctx?.name?.split(" ")[0];
  const hello = name ? `${name}, ` : "";

  if (SENSITIVE.test(question)) {
    return {
      intent: "unknown",
      text: "This is a sensitive matter, and I do not make predictions about it. Astrology can only offer general guidance, and your wellbeing, safety and decisions deserve a real conversation. Please speak with a qualified professional (doctor, counsellor or lawyer) and, if you wish, one of our expert astrologers.",
      suggestExpert: true,
    };
  }
  if (EXPERT_ASK.test(question)) {
    return {
      intent: "unknown",
      text: "Of course — our expert astrologers can study your chart in depth and answer personally. You can book a video consultation below.",
      suggestExpert: true,
    };
  }

  const intent = detectIntent(question);

  if (intent === "greeting") {
    return {
      intent,
      text: `Namaste ${hello}I am Nakshtra Guru. ${ctx ? "I have studied your kundli." : "Add your birth details in Profile so I can read your kundli."} Ask me about career, marriage, wealth, health, your dasha, Mangal Dosha, remedies and more.`,
      suggestExpert: false,
    };
  }

  if (!ctx) {
    return {
      intent,
      text: "I need your birth details to answer personally. Please add your date, time and place of birth in Profile, and I will read your kundli. Meanwhile, you can book an expert for a full reading.",
      suggestExpert: true,
    };
  }

  const builder = BUILDERS[intent];
  if (!builder) {
    return {
      intent: "unknown",
      text: `${hello}I can answer questions on career, marriage, children, wealth, health, education, property, foreign travel, spirituality, Mangal Dosha, your dasha, current transits, Sade Sati, this year's forecast, remedies, gemstones, numerology, your weak planets, lucky colours and your personality. Try asking, for example, "How is my career?" or "Which gemstone suits me?" For anything deeper, an expert astrologer can help.`,
      suggestExpert: true,
    };
  }

  // A named gemstone ("is ruby good for me?") gets an answer for that stone.
  if (intent === "gemstone") {
    for (const [re, planetName] of GEM_QUERY) {
      const m = question.match(re);
      if (m) {
        const text = gemAdvice(ctx, planetName, m[0]);
        const full = buildGemstone(ctx);
        return {
          intent,
          text: `${text}\n\n${full.text}`,
          simple: `${hello}${text} ${GEM_CAUTIONS[0]}`,
          suggestExpert: true,
        };
      }
    }
  }

  const answer = builder(ctx);
  const prefix =
    lang === "hi"
      ? "(उत्तर अंग्रेज़ी में — पूर्ण हिंदी उत्तरों के लिए AI मोड चालू करें)\n\n"
      : "";
  return {
    ...answer,
    simple: answer.simple ?? simplifyAnswer(answer, hello, ctx),
    text: `${prefix}${answer.text}`,
  };
}

// ------------------------------------------------------------------ simple answers

const VERDICT_PLAIN: Record<string, string> = {
  "very supportive": "very good",
  supportive: "good",
  mixed: "mixed — some ups and downs",
  "needs care": "needs some care",
  challenging: "a little challenging right now",
};

/** The first sentence of the "Overall indication: X. closing" line, in plain words. */
function plainOverall(
  text: string,
): { verdict: string; closing: string } | null {
  const m = text.match(/Overall indication: ([a-z ]+)\.\s*([^\n]*)/);
  if (!m) return null;
  return { verdict: VERDICT_PLAIN[m[1]] ?? m[1], closing: m[2].trim() };
}

const TOPIC_PLAIN: Partial<Record<GuruIntent, string>> = {
  career: "career",
  marriage: "marriage and relationships",
  children: "children",
  wealth: "money and finances",
  health: "health",
  education: "education",
  property: "property and home",
  foreign: "foreign travel",
  spiritual: "spiritual growth",
};

/**
 * Turns a detailed, jargon-heavy answer into 2-4 short sentences a non-astrologer
 * can follow (and that sound natural when read aloud).
 */
function simplifyAnswer(
  answer: GuruAnswer,
  hello: string,
  c: GuruContext,
): string {
  const t = answer.text;
  const topic = TOPIC_PLAIN[answer.intent];
  if (topic) {
    const o = plainOverall(t);
    const phase = t.match(/You are running ([A-Za-z]+) Mahadasha/);
    const tied = t.includes("this is an active, important phase");
    const good = t.match(/Favourable windows ahead: ([^\n]*?)\./);
    const parts = [
      `${hello}for your ${topic}, your chart looks ${o?.verdict ?? "mixed"}.`,
    ];
    if (phase) {
      parts.push(
        tied
          ? "The phase of life you are in right now is directly connected to this, so it is an important time for it."
          : "Things here move slowly and steadily rather than suddenly.",
      );
    }
    if (good)
      parts.push(
        `A better period is coming around ${good[1].split(" from ").pop()?.split(",")[0]}.`,
      );
    if (o?.closing) parts.push(o.closing);
    return parts.join(" ");
  }
  switch (answer.intent) {
    case "mangal": {
      const m = c.kundli.mangal;
      const mp = planet(c.kundli, "Mars");
      const where = `Mars is in your ${ORD[mp.house]} house (${mp.sign})`;
      const mars = PLANET_IN_HOUSE.Mars[mp.house];
      if (c.kundli.manglik)
        return `${hello}yes, you have Mangal Dosha (${m.severity.toLowerCase()} strength). ${where}, which ${mars}. It mainly affects the timing and harmony of marriage, so match your chart with your partner's and consider simple remedies like the Hanuman Chalisa on Tuesdays.`;
      if (m.doshaBeforeCancellation)
        return `${hello}${where}, which normally forms Mangal Dosha, but it is cancelled in your chart (${m.cancellations[0] ?? "by a protective factor"}). So you can treat yourself as not Manglik, and it should not block your marriage.`;
      return `${hello}good news: you do not have Mangal Dosha. ${where}, which ${mars}.`;
    }
    case "dasha": {
      const { maha, antar, mahaEnd } = currentPeriod(c);
      const th = DASHA_THEME[maha];
      const mp = planet(c.kundli, maha);
      const strength = verdict(planetStrength(c, maha).score);
      const sub = antar
        ? ` Inside it, the ${antar.lord} sub-period runs until ${fmtDate(antar.end)}.`
        : "";
      const nxt = c.antar
        .filter((a) => a.start.getTime() > c.now.getTime())
        .slice(0, 1)[0];
      return `${hello}you are in the ${maha} Mahadasha until ${fmtDate(mahaEnd)}: ${th.feels}. In your chart ${maha} sits in house ${mp.house} (${HOUSE_MEANING[mp.house]}), and it ${PLANET_IN_HOUSE[maha]?.[mp.house] ?? "shapes this phase"}, so this phase is ${VERDICT_PLAIN[strength] ?? strength}.${sub}${nxt ? ` Next comes the ${nxt.lord} sub-period from ${fmtDate(nxt.start)}.` : ""} ${th.advice}`;
    }
    case "sadesati": {
      const moon = planet(c.kundli, "Moon");
      const sat = planet(c.kundli, "Saturn");
      const satNow = c.transit.planets.find((p) => p.planet === "Saturn")!;
      if (t.startsWith("Yes"))
        return `${hello}yes. Saturn is now in ${satNow.sign} while your Moon is in ${moon.sign}, so you are in Sade Sati, a 7.5 year phase that asks for patience and hard work. In your birth chart Saturn is in house ${sat.house}, so it ${PLANET_IN_HOUSE.Saturn[sat.house]}. To ease it, ${PLANET_REMEDY.Saturn}.`;
      return `${hello}no, you are not in Sade Sati right now: Saturn is in ${satNow.sign} and your Moon is in ${moon.sign}. Nothing to worry about on that front.`;
    }
    case "transit": {
      const jup = c.transit.fromMoon.find((x) => x.planet === "Jupiter")!.house;
      const satH = c.transit.fromMoon.find((x) => x.planet === "Saturn")!.house;
      const jp = c.transit.planets.find((p) => p.planet === "Jupiter")!;
      const sp = c.transit.planets.find((p) => p.planet === "Saturn")!;
      const j = [2, 5, 7, 9, 11].includes(jup)
        ? `Jupiter is moving through ${jp.sign}, a favourable place for you (house ${jup} from your Moon), so it is a good time for growth, learning and new beginnings.`
        : `Jupiter is moving through ${jp.sign} (house ${jup} from your Moon), which is not its best place for you, so be patient with big plans.`;
      const s = [12, 1, 2].includes(satH)
        ? ` Saturn in ${sp.sign} is in your Sade Sati zone, so patience and discipline will pay off.`
        : [4, 8].includes(satH)
          ? ` Saturn in ${sp.sign} is in a Dhaiya position, so go slowly with big decisions and look after your health.`
          : ` Saturn in ${sp.sign} is not troubling your Moon, so steady work gives steady results.`;
      return `${hello}${j}${s}`;
    }
    case "yearly": {
      const v = c.varsha;
      const munthaHouse =
        ((v.munthaSignIndex - c.kundli.lagna.signIndex + 12) % 12) + 1;
      const vj = v.kundli.planets.find((p) => p.planet === "Jupiter")!.house;
      const vs = v.kundli.planets.find((p) => p.planet === "Saturn")!.house;
      return `${hello}your year (age ${v.age}) focuses on ${houseTheme(munthaHouse)}, because your yearly Muntha falls in house ${munthaHouse}. The year lord is ${v.yearLord}, so expect ${PLANET_NATURE[v.yearLord]} to play a big part. ${[1, 2, 4, 5, 7, 9, 10, 11].includes(vj) ? "Jupiter supports you with growth and blessings." : "Jupiter asks for patience this year."} ${[3, 6, 10, 11].includes(vs) ? "Saturn rewards hard work." : "Saturn asks for caution with long commitments."}`;
    }
    case "remedy": {
      const { maha, antar } = currentPeriod(c);
      const weak = c.kundli.planets
        .filter((p) => p.planet !== "Rahu" && p.planet !== "Ketu")
        .map((p) => ({ p, s: planetStrength(c, p.planet).score }))
        .sort((a, b) => a.s - b.s)[0];
      const rm = PLANET_REMEDIES[maha];
      const parts = [
        `${hello}for your current ${maha} period, ${PLANET_REMEDY[maha]}. Donate ${rm.charity[0]} on ${rm.day} and keep a fast on ${rm.fasting.toLowerCase()}.`,
      ];
      if (antar && antar.lord !== maha)
        parts.push(
          `For the ${antar.lord} sub-period, ${PLANET_REMEDY[antar.lord]}.`,
        );
      if (weak && weak.s < 0 && weak.p.planet !== maha)
        parts.push(
          `Your most stressed planet is ${weak.p.planet}, so ${PLANET_REMEDY[weak.p.planet]}.`,
        );
      if (c.kundli.manglik)
        parts.push(
          "For Mangal Dosha, recite the Hanuman Chalisa on Tuesdays and donate red lentils.",
        );
      parts.push(
        "Ask me about 'gemstone' or 'my weak planets' for stone and shortfall-specific guidance.",
      );
      return parts.join(" ");
    }
    case "lucky": {
      const colours = t.match(/Lucky colours: ([^\n]*)\./)?.[1];
      const day = t.match(/Favourable day: ([^\n]*)\./)?.[1];
      const num = t.match(/Lucky number: ([^\n]*)\./)?.[1];
      return `${hello}your lucky colours are ${colours}, your lucky day is ${day} and your lucky number is ${num}.`;
    }
    case "personality": {
      const k = c.kundli;
      const sun = planet(k, "Sun");
      const strong = k.planets.filter((p) =>
        ["Exalted", "Own Sign"].includes(p.dignity),
      );
      return `${hello}you come across as ${LAGNA_TRAITS[k.lagna.signIndex]} (rising sign ${k.lagna.sign}). Inside, ${MOON_TRAITS[k.moonSignIndex].toLowerCase()} (Moon in ${k.moonSign}). Your Moon star ${k.moonNakshatra.en} makes you ${NAKSHATRA_NATURE[planet(k, "Moon").nakshatraIndex]}. Your Sun in house ${sun.house} ${PLANET_IN_HOUSE.Sun[sun.house]}.${strong.length ? ` Your strongest planets are ${strong.map((p) => p.planet).join(" and ")}.` : ""}`;
    }
    case "chart": {
      const k = c.kundli;
      return `${hello}your rising sign is ${k.lagna.sign} (${LAGNA_TRAITS[k.lagna.signIndex]}) and your Moon sign is ${k.moonSign} in ${k.moonNakshatra.en} nakshatra. You were born on a ${k.panchang.vara} in ${k.panchang.paksha} paksha, tithi ${k.panchang.tithi}. Download the Royal Kundli PDF to see all your charts.`;
    }
    default:
      return t;
  }
}
