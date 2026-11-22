// Hindi (Devanagari) names for the values printed in the Janma Kundli report.
// The shared engine keeps English keys; this maps them for display only.

import { PLANET_HI } from "@nakshtra/shared";

const map =
  (table: Record<string, string>) =>
  (key: string): string =>
    table[key] ?? key;

export const planetHi = (p: string): string => PLANET_HI[p] ?? p;

export const varnaHi = map({
  Brahmin: "ब्राह्मण",
  Kshatriya: "क्षत्रिय",
  Vaishya: "वैश्य",
  Shudra: "शूद्र",
});

export const vashyaHi = map({
  Chatushpada: "चतुष्पद",
  Manava: "मानव",
  Jalachara: "जलचर",
  Vanachara: "वनचर",
  Keeta: "कीट",
});

export const yoniHi = map({
  Horse: "अश्व",
  Elephant: "गज",
  Sheep: "मेष",
  Serpent: "सर्प",
  Dog: "श्वान",
  Cat: "मार्जार",
  Goat: "मेष",
  Rat: "मूषक",
  Cow: "गौ",
  Buffalo: "महिष",
  Tiger: "व्याघ्र",
  Deer: "मृग",
  Monkey: "वानर",
  Mongoose: "नकुल",
  Lion: "सिंह",
});

export const ganaHi = map({
  Deva: "देव",
  Manushya: "मनुष्य",
  Rakshasa: "राक्षस",
});

export const nadiHi = map({
  Adya: "आद्य",
  Madhya: "मध्य",
  Antya: "अंत्य",
});

export const pakshaHi = map({ Shukla: "शुक्ल पक्ष", Krishna: "कृष्ण पक्ष" });

export const tithiHi = map({
  Pratipada: "प्रतिपदा",
  Dwitiya: "द्वितीया",
  Tritiya: "तृतीया",
  Chaturthi: "चतुर्थी",
  Panchami: "पंचमी",
  Shashthi: "षष्ठी",
  Saptami: "सप्तमी",
  Ashtami: "अष्टमी",
  Navami: "नवमी",
  Dashami: "दशमी",
  Ekadashi: "एकादशी",
  Dwadashi: "द्वादशी",
  Trayodashi: "त्रयोदशी",
  Chaturdashi: "चतुर्दशी",
  Purnima: "पूर्णिमा",
  Amavasya: "अमावस्या",
});

export const yogaHi = map({
  Vishkambha: "विष्कम्भ",
  Priti: "प्रीति",
  Ayushman: "आयुष्मान",
  Saubhagya: "सौभाग्य",
  Shobhana: "शोभन",
  Atiganda: "अतिगण्ड",
  Sukarma: "सुकर्मा",
  Dhriti: "धृति",
  Shula: "शूल",
  Ganda: "गण्ड",
  Vriddhi: "वृद्धि",
  Dhruva: "ध्रुव",
  Vyaghata: "व्याघात",
  Harshana: "हर्षण",
  Vajra: "वज्र",
  Siddhi: "सिद्धि",
  Vyatipata: "व्यतीपात",
  Variyana: "वरीयान",
  Parigha: "परिघ",
  Shiva: "शिव",
  Siddha: "सिद्ध",
  Sadhya: "साध्य",
  Shubha: "शुभ",
  Shukla: "शुक्ल",
  Brahma: "ब्रह्म",
  Indra: "ऐन्द्र",
  Vaidhriti: "वैधृति",
});

export const karanaHi = map({
  Bava: "बव",
  Balava: "बालव",
  Kaulava: "कौलव",
  Taitila: "तैतिल",
  Garaja: "गर",
  Vanija: "वणिज",
  Vishti: "विष्टि (भद्रा)",
  Kimstughna: "किंस्तुघ्न",
  Shakuni: "शकुनि",
  Chatushpada: "चतुष्पाद",
  Naga: "नाग",
});

/** "Ravivar (Sunday)" -> "रविवार" */
export const varaHi = (v: string): string =>
  ({
    Ravivar: "रविवार",
    Somvar: "सोमवार",
    Mangalvar: "मंगलवार",
    Budhvar: "बुधवार",
    Guruvar: "गुरुवार",
    Shukravar: "शुक्रवार",
    Shanivar: "शनिवार",
  })[v.split(" ")[0]] ?? v;

export const severityHi = map({
  High: "तीव्र",
  Medium: "मध्यम",
  Low: "सामान्य",
  None: "नहीं",
});

export const genderHi = (male: boolean): string => (male ? "पुरुष" : "महिला");

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
/** 1992-10-25 stays numeric; only used where Devanagari digits read better. */
export const hiDigits = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)]);

const MONTHS_HI = [
  "जन",
  "फ़र",
  "मार्च",
  "अप्रै",
  "मई",
  "जून",
  "जुला",
  "अग",
  "सित",
  "अक्टू",
  "नव",
  "दिस",
];

/** 25 अक्टू 1992 */
export const fmtDateHi = (d: Date): string =>
  `${String(d.getDate()).padStart(2, "0")} ${MONTHS_HI[d.getMonth()]} ${d.getFullYear()}`;

/** Doshas with Hindi, used on the Mangal Dosha page. */
export const doshaHi = (dosha: boolean): string =>
  dosha ? "(दोष)" : "(दोष नहीं)";
