// Static Vedic astrology reference data used by the kundli engine.

export const RASHIS = [
  { key: 'aries', en: 'Aries', hi: 'मेष', lord: 'Mars' },
  { key: 'taurus', en: 'Taurus', hi: 'वृषभ', lord: 'Venus' },
  { key: 'gemini', en: 'Gemini', hi: 'मिथुन', lord: 'Mercury' },
  { key: 'cancer', en: 'Cancer', hi: 'कर्क', lord: 'Moon' },
  { key: 'leo', en: 'Leo', hi: 'सिंह', lord: 'Sun' },
  { key: 'virgo', en: 'Virgo', hi: 'कन्या', lord: 'Mercury' },
  { key: 'libra', en: 'Libra', hi: 'तुला', lord: 'Venus' },
  { key: 'scorpio', en: 'Scorpio', hi: 'वृश्चिक', lord: 'Mars' },
  { key: 'sagittarius', en: 'Sagittarius', hi: 'धनु', lord: 'Jupiter' },
  { key: 'capricorn', en: 'Capricorn', hi: 'मकर', lord: 'Saturn' },
  { key: 'aquarius', en: 'Aquarius', hi: 'कुंभ', lord: 'Saturn' },
  { key: 'pisces', en: 'Pisces', hi: 'मीन', lord: 'Jupiter' },
] as const;

export interface NakshatraInfo {
  en: string;
  hi: string;
  lord: string;
  gana: 'Deva' | 'Manushya' | 'Rakshasa';
  yoni: string;
  nadi: 'Adya' | 'Madhya' | 'Antya';
}

export const NAKSHATRAS: NakshatraInfo[] = [
  { en: 'Ashwini', hi: 'अश्विनी', lord: 'Ketu', gana: 'Deva', yoni: 'Horse', nadi: 'Adya' },
  { en: 'Bharani', hi: 'भरणी', lord: 'Venus', gana: 'Manushya', yoni: 'Elephant', nadi: 'Madhya' },
  { en: 'Krittika', hi: 'कृत्तिका', lord: 'Sun', gana: 'Rakshasa', yoni: 'Sheep', nadi: 'Antya' },
  { en: 'Rohini', hi: 'रोहिणी', lord: 'Moon', gana: 'Manushya', yoni: 'Serpent', nadi: 'Antya' },
  { en: 'Mrigashira', hi: 'मृगशिरा', lord: 'Mars', gana: 'Deva', yoni: 'Serpent', nadi: 'Madhya' },
  { en: 'Ardra', hi: 'आर्द्रा', lord: 'Rahu', gana: 'Manushya', yoni: 'Dog', nadi: 'Adya' },
  { en: 'Punarvasu', hi: 'पुनर्वसु', lord: 'Jupiter', gana: 'Deva', yoni: 'Cat', nadi: 'Adya' },
  { en: 'Pushya', hi: 'पुष्य', lord: 'Saturn', gana: 'Deva', yoni: 'Goat', nadi: 'Madhya' },
  { en: 'Ashlesha', hi: 'आश्लेषा', lord: 'Mercury', gana: 'Rakshasa', yoni: 'Cat', nadi: 'Antya' },
  { en: 'Magha', hi: 'मघा', lord: 'Ketu', gana: 'Rakshasa', yoni: 'Rat', nadi: 'Antya' },
  { en: 'Purva Phalguni', hi: 'पूर्वा फाल्गुनी', lord: 'Venus', gana: 'Manushya', yoni: 'Rat', nadi: 'Madhya' },
  { en: 'Uttara Phalguni', hi: 'उत्तरा फाल्गुनी', lord: 'Sun', gana: 'Manushya', yoni: 'Cow', nadi: 'Adya' },
  { en: 'Hasta', hi: 'हस्त', lord: 'Moon', gana: 'Deva', yoni: 'Buffalo', nadi: 'Adya' },
  { en: 'Chitra', hi: 'चित्रा', lord: 'Mars', gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Madhya' },
  { en: 'Swati', hi: 'स्वाति', lord: 'Rahu', gana: 'Deva', yoni: 'Buffalo', nadi: 'Antya' },
  { en: 'Vishakha', hi: 'विशाखा', lord: 'Jupiter', gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Antya' },
  { en: 'Anuradha', hi: 'अनुराधा', lord: 'Saturn', gana: 'Deva', yoni: 'Deer', nadi: 'Madhya' },
  { en: 'Jyeshtha', hi: 'ज्येष्ठा', lord: 'Mercury', gana: 'Rakshasa', yoni: 'Deer', nadi: 'Adya' },
  { en: 'Mula', hi: 'मूल', lord: 'Ketu', gana: 'Rakshasa', yoni: 'Dog', nadi: 'Adya' },
  { en: 'Purva Ashadha', hi: 'पूर्वाषाढ़ा', lord: 'Venus', gana: 'Manushya', yoni: 'Monkey', nadi: 'Madhya' },
  { en: 'Uttara Ashadha', hi: 'उत्तराषाढ़ा', lord: 'Sun', gana: 'Manushya', yoni: 'Mongoose', nadi: 'Antya' },
  { en: 'Shravana', hi: 'श्रवण', lord: 'Moon', gana: 'Deva', yoni: 'Monkey', nadi: 'Antya' },
  { en: 'Dhanishta', hi: 'धनिष्ठा', lord: 'Mars', gana: 'Rakshasa', yoni: 'Lion', nadi: 'Madhya' },
  { en: 'Shatabhisha', hi: 'शतभिषा', lord: 'Rahu', gana: 'Rakshasa', yoni: 'Horse', nadi: 'Adya' },
  { en: 'Purva Bhadrapada', hi: 'पूर्व भाद्रपद', lord: 'Jupiter', gana: 'Manushya', yoni: 'Lion', nadi: 'Madhya' },
  { en: 'Uttara Bhadrapada', hi: 'उत्तर भाद्रपद', lord: 'Saturn', gana: 'Manushya', yoni: 'Cow', nadi: 'Adya' },
  { en: 'Revati', hi: 'रेवती', lord: 'Mercury', gana: 'Deva', yoni: 'Elephant', nadi: 'Antya' },
];

/** Varna by moon sign element: water=Brahmin, fire=Kshatriya, earth=Vaishya, air=Shudra */
export const VARNA_BY_SIGN = [
  'Kshatriya', 'Vaishya', 'Shudra', 'Brahmin', 'Kshatriya', 'Vaishya',
  'Shudra', 'Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Brahmin',
];

export const VASHYA_BY_SIGN = [
  'Chatushpada', 'Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Manava',
  'Manava', 'Keeta', 'Manava', 'Jalachara', 'Manava', 'Jalachara',
];

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];

export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma',
  'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha',
  'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

export const KARANA_NAMES = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
];

export const VARA_NAMES = [
  'Ravivar (Sunday)', 'Somvar (Monday)', 'Mangalvar (Tuesday)', 'Budhvar (Wednesday)',
  'Guruvar (Thursday)', 'Shukravar (Friday)', 'Shanivar (Saturday)',
];

/** Vimshottari dasha lords in order starting from Ashwini, with period years. */
export const DASHA_SEQUENCE: { lord: string; years: number }[] = [
  { lord: 'Ketu', years: 7 },
  { lord: 'Venus', years: 20 },
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 10 },
  { lord: 'Mars', years: 7 },
  { lord: 'Rahu', years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn', years: 19 },
  { lord: 'Mercury', years: 17 },
];

export const PLANET_HI: Record<string, string> = {
  Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु',
  Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
};

/** Exaltation sign index per planet (debilitation is 7 signs away). */
export const EXALTATION: Record<string, number> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};

/** Signs owned by each planet (indices). */
export const OWN_SIGNS: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11],
  Venus: [1, 6], Saturn: [9, 10], Rahu: [], Ketu: [],
};
