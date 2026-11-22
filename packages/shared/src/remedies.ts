// Gemstones, mantras, charity, fasting and lifestyle remedies for the built-in Guru.
// Safe, traditional and low-cost options first. Gemstones are suggested ONLY for a
// planet that is helpful to the person (a functional benefic, or a weak benefic) and
// never for a planet that rules the dusthana houses 6/8/12 without cancellation:
// a wrong stone is believed to increase that planet's effects, so we say so.

export interface PlanetRemedy {
  planet: string;
  day: string;
  mantra: string;
  /** Beej mantra repetitions commonly recommended */
  japa: string;
  gem: {
    primary: string;
    alternate: string;
    metal: string;
    finger: string;
    weight: string;
  };
  charity: string[];
  fasting: string;
  deity: string;
  lifestyle: string[];
  /** What goes wrong when this planet is weak (used to explain "shortfalls") */
  weakSigns: string[];
  /** Body/organ areas linked with the planet (general wellbeing tendencies only) */
  wellbeing: string;
}

export const PLANET_REMEDIES: Record<string, PlanetRemedy> = {
  Sun: {
    planet: "Sun",
    day: "Sunday",
    mantra: "Om Suryaya Namah",
    japa: "108 times at sunrise (or 7,000 in total over a few weeks)",
    gem: {
      primary: "Ruby (Manik)",
      alternate: "Red garnet or red spinel",
      metal: "gold or copper",
      finger: "ring finger of the right hand",
      weight: "about 3-5 carats",
    },
    charity: ["wheat or jaggery", "copper items", "red cloth"],
    fasting: "Sundays (a light meal after sunset)",
    deity: "Surya, Lord Vishnu",
    lifestyle: [
      "wake up with the sun and offer water to the rising Sun",
      "respect your father and elders and avoid ego clashes",
      "spend some time outdoors in the morning light",
    ],
    weakSigns: [
      "low confidence or lack of recognition",
      "problems with authority or government work",
      "weak vitality, bones or eyesight",
    ],
    wellbeing: "heart, bones, eyesight and vitality",
  },
  Moon: {
    planet: "Moon",
    day: "Monday",
    mantra: "Om Chandraya Namah",
    japa: "108 times on Mondays, ideally in the evening",
    gem: {
      primary: "Pearl (Moti)",
      alternate: "Moonstone",
      metal: "silver",
      finger: "little finger of the right hand",
      weight: "about 4-6 carats",
    },
    charity: ["rice, milk or curd", "white clothes", "silver items"],
    fasting: "Mondays (milk and fruit)",
    deity: "Lord Shiva, Goddess Parvati",
    lifestyle: [
      "keep a regular sleep routine and drink enough water",
      "spend time near water or in calm surroundings",
      "stay close to your mother and care for the women in your family",
    ],
    weakSigns: [
      "mood swings, anxiety or sleep problems",
      "emotional insecurity",
      "trouble with peace of mind and the home",
    ],
    wellbeing: "mind, sleep, fluids and digestion",
  },
  Mars: {
    planet: "Mars",
    day: "Tuesday",
    mantra: "Om Angarakaya Namah",
    japa: "108 times on Tuesdays",
    gem: {
      primary: "Red Coral (Moonga)",
      alternate: "Carnelian or red jasper",
      metal: "copper or gold",
      finger: "ring finger of the right hand",
      weight: "about 5-7 carats",
    },
    charity: ["red lentils (masoor dal)", "jaggery", "red cloth"],
    fasting: "Tuesdays",
    deity: "Lord Hanuman, Kartikeya",
    lifestyle: [
      "exercise regularly to use up the energy",
      "recite the Hanuman Chalisa on Tuesdays and Saturdays",
      "avoid anger, arguments and driving fast",
    ],
    weakSigns: [
      "low courage or stamina",
      "delays in property and land matters",
      "arguments and accidents",
    ],
    wellbeing: "blood, muscles, energy and injuries",
  },
  Mercury: {
    planet: "Mercury",
    day: "Wednesday",
    mantra: "Om Budhaya Namah",
    japa: "108 times on Wednesdays",
    gem: {
      primary: "Emerald (Panna)",
      alternate: "Green tourmaline or peridot",
      metal: "gold or silver",
      finger: "little finger of the right hand",
      weight: "about 3-6 carats",
    },
    charity: ["green moong dal", "green cloth", "books or stationery"],
    fasting: "Wednesdays",
    deity: "Lord Vishnu, Lord Ganesha",
    lifestyle: [
      "read, write and learn something new every day",
      "keep your accounts and words honest and clear",
      "feed green fodder to a cow on Wednesdays",
    ],
    weakSigns: [
      "poor concentration, nervousness or speech issues",
      "trouble with business, exams and contracts",
      "skin or nerve sensitivity",
    ],
    wellbeing: "nerves, skin, speech and the thinking mind",
  },
  Jupiter: {
    planet: "Jupiter",
    day: "Thursday",
    mantra: "Om Gurave Namah",
    japa: "108 times on Thursdays",
    gem: {
      primary: "Yellow Sapphire (Pukhraj)",
      alternate: "Yellow topaz or citrine",
      metal: "gold",
      finger: "index finger of the right hand",
      weight: "about 3-6 carats",
    },
    charity: ["chana dal or yellow sweets", "turmeric", "books for students"],
    fasting: "Thursdays",
    deity: "Lord Brihaspati, Lord Vishnu",
    lifestyle: [
      "respect teachers, gurus and elders",
      "study, teach or share knowledge",
      "keep your promises and be generous within your means",
    ],
    weakSigns: [
      "delays in luck, marriage or children",
      "lack of guidance or confidence in beliefs",
      "weight, liver or sugar tendencies",
    ],
    wellbeing: "liver, fats, weight and overall growth",
  },
  Venus: {
    planet: "Venus",
    day: "Friday",
    mantra: "Om Shukraya Namah",
    japa: "108 times on Fridays",
    gem: {
      primary: "Diamond (Heera)",
      alternate: "White sapphire, white zircon or opal",
      metal: "silver or platinum",
      finger: "middle finger or little finger of the right hand",
      weight: "about 1 carat (or 5+ carats for the alternates)",
    },
    charity: ["white sweets or rice", "perfume", "white clothes"],
    fasting: "Fridays",
    deity: "Goddess Lakshmi",
    lifestyle: [
      "keep your home clean, bright and pleasantly fragrant",
      "respect your partner and the women around you",
      "enjoy art, music and nature in moderation",
    ],
    weakSigns: [
      "problems in love, marriage or comfort",
      "lack of charm or money for luxuries",
      "hormone or kidney-related tendencies",
    ],
    wellbeing: "reproductive system, kidneys and skin",
  },
  Saturn: {
    planet: "Saturn",
    day: "Saturday",
    mantra: "Om Shanaye Namah",
    japa: "108 times on Saturdays",
    gem: {
      primary: "Blue Sapphire (Neelam)",
      alternate: "Amethyst or lapis lazuli",
      metal: "iron or silver",
      finger: "middle finger of the right hand",
      weight: "about 4-7 carats",
    },
    charity: [
      "black sesame seeds",
      "mustard oil",
      "blankets or food for the needy",
    ],
    fasting: "Saturdays",
    deity: "Lord Shani, Lord Hanuman",
    lifestyle: [
      "serve the elderly, workers and the poor",
      "light a mustard-oil lamp under a peepal tree on Saturdays",
      "be punctual, disciplined and honest at work",
    ],
    weakSigns: [
      "delays and obstacles despite hard work",
      "lack of discipline or fear of failure",
      "joint, bone or chronic tiredness tendencies",
    ],
    wellbeing: "bones, joints, teeth and stamina",
  },
  Rahu: {
    planet: "Rahu",
    day: "Saturday",
    mantra: "Om Rahave Namah",
    japa: "108 times on Saturdays",
    gem: {
      primary: "Hessonite (Gomed)",
      alternate: "Orange zircon",
      metal: "silver or panchdhatu",
      finger: "middle finger of the right hand",
      weight: "about 5-8 carats",
    },
    charity: ["black or blue cloth", "mustard oil", "food for stray animals"],
    fasting: "Saturdays",
    deity: "Goddess Durga",
    lifestyle: [
      "avoid shortcuts, gambling and get-rich-quick schemes",
      "feed birds or stray animals regularly",
      "reduce screen time and keep a regular routine",
    ],
    weakSigns: [
      "confusion, anxiety or obsession",
      "sudden ups and downs in plans",
      "trouble with foreign matters or technology",
    ],
    wellbeing: "nervous system and unusual or hard-to-diagnose complaints",
  },
  Ketu: {
    planet: "Ketu",
    day: "Tuesday",
    mantra: "Om Ketave Namah",
    japa: "108 times on Tuesdays or Saturdays",
    gem: {
      primary: "Cat's Eye (Lehsunia)",
      alternate: "Tiger's eye",
      metal: "silver or panchdhatu",
      finger: "middle finger of the right hand",
      weight: "about 3-6 carats",
    },
    charity: ["blankets", "sesame seeds", "food for stray dogs"],
    fasting: "Tuesdays or Saturdays",
    deity: "Lord Ganesha, Lord Bhairava",
    lifestyle: [
      "meditate daily, even for 10 minutes",
      "feed stray dogs and visit a temple of Lord Ganesha",
      "simplify your surroundings and let go of what you no longer need",
    ],
    weakSigns: [
      "lack of direction or a feeling of detachment",
      "unexpected losses or sudden endings",
      "poor focus and unclear intuition",
    ],
    wellbeing: "immunity, digestion and the subtle mind",
  },
};

/** Natural benefics and malefics (used to decide whether a gem is safe to suggest). */
export const NATURAL_BENEFICS = ["Jupiter", "Venus", "Mercury", "Moon"];

/** Gem cautions that apply to everyone. */
export const GEM_CAUTIONS: string[] = [
  "Wear a gemstone only after a qualified astrologer has checked your full chart.",
  "Buy a natural, untreated stone with a lab certificate, and test-wear it for 3 days before fixing it.",
  "Never wear the stones of planets that are not friendly to each other, such as Ruby with Blue Sapphire.",
  "Stones are an aid, not a substitute for effort, health care or medical treatment.",
];

/** Reasons a gem is NOT advised, per house-lordship. Used to explain refusals honestly. */
export function gemSafetyNote(
  planet: string,
  lordOfHouses: number[],
): { safe: boolean; reason: string } {
  const bad = lordOfHouses.filter((h) => [6, 8, 12].includes(h));
  const good = lordOfHouses.filter((h) => [1, 4, 5, 7, 9, 10].includes(h));
  if (planet === "Rahu" || planet === "Ketu")
    return {
      safe: false,
      reason:
        "shadow-planet stones can be intense, so use mantra and charity first and ask an expert before any stone",
    };
  if (bad.length && !good.length)
    return {
      safe: false,
      reason: `${planet} rules your ${bad.join("th/")}th house, a difficult one, so a stone could strengthen the trouble. Prefer mantra and charity`,
    };
  if (good.length)
    return {
      safe: true,
      reason: `${planet} rules your ${good.join("th/")}th house, a supportive one, so its stone can help when ${planet} is weak`,
    };
  return {
    safe: true,
    reason: `${planet} has a neutral role in your chart; a stone is optional`,
  };
}

/** Practical remedies by life-area shortfall, in plain language. */
export const AREA_REMEDIES: Record<string, string[]> = {
  career: [
    "Offer water to the Sun at sunrise and keep a fixed daily work routine",
    "Respect your seniors and avoid ego clashes at work",
    "Chant 'Om Namo Bhagavate Vasudevaya' or the mantra of your 10th lord",
    "Strengthen skills: a new course or certificate helps more than waiting for luck",
  ],
  marriage: [
    "Worship Lord Shiva and Goddess Parvati on Mondays",
    "Chant 'Om Shukraya Namah' on Fridays and keep your home clean and fragrant",
    "For Mangal Dosha: Hanuman Chalisa on Tuesdays and donate red lentils",
    "Improve communication: settle misunderstandings quickly and kindly",
  ],
  children: [
    "Worship Lord Krishna (Santan Gopal) and chant 'Om Namo Bhagavate Vasudevaya'",
    "Respect teachers and donate yellow food or books on Thursdays",
    "Look after health and reduce stress; consult a doctor alongside any remedy",
  ],
  wealth: [
    "Worship Goddess Lakshmi on Fridays and keep your home clean",
    "Save a fixed small amount every month and avoid risky shortcuts",
    "Donate food or give to someone in need on Thursdays",
    "Pay your debts on time and keep honest accounts",
  ],
  health: [
    "Keep a regular sleep, food and exercise routine",
    "Chant the Mahamrityunjaya mantra for peace of mind (it is not a cure)",
    "Get regular medical check-ups and follow your doctor's advice first",
  ],
  education: [
    "Worship Goddess Saraswati and chant 'Om Aim Saraswatyai Namah' before studying",
    "Study at fixed times, early in the morning, in a clean and bright place",
    "Feed green fodder to a cow on Wednesdays and respect your teachers",
  ],
  property: [
    "Worship Lord Hanuman on Tuesdays and keep legal papers in order",
    "Do a simple Vastu check: clutter-free, bright, well-ventilated rooms",
    "Plan big purchases for a supportive dasha and check the documents carefully",
  ],
  foreign: [
    "Chant 'Om Rahave Namah' on Saturdays and keep your passport and documents ready",
    "Build skills and savings that are valued abroad, and apply consistently",
    "Feed birds and avoid agents who promise guaranteed visas",
  ],
  spiritual: [
    "Meditate daily at the same time and place, even if only for 10 minutes",
    "Chant your Ishta-devata's mantra and read the Bhagavad Gita slowly",
    "Visit a temple or a quiet place of nature once a week",
  ],
};
