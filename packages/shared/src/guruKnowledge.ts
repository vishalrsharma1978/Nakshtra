// Classical Vedic-astrology reference text used by the built-in Guru.
// Every entry is a short, plain-language statement; the engine picks the entries
// that match the user's own chart (sign, nakshatra, house lord placement, running
// dasha ...) and weaves them together, so two different kundlis never get the
// same answer.

// ------------------------------------------------------------------ signs

/** How a person with this Lagna (rising sign) comes across, and their core nature. */
export const LAGNA_TRAITS: string[] = [
  "bold, energetic and quick to act. You like to lead and dislike waiting",
  "calm, practical and loyal. You value comfort, stability and good food",
  "curious, witty and talkative. You learn fast and love variety",
  "caring, sensitive and protective. Family and emotional security matter a lot to you",
  "confident, generous and proud. You naturally attract attention and respect",
  "careful, analytical and helpful. You notice details others miss",
  "charming, fair-minded and sociable. You dislike conflict and seek balance",
  "intense, determined and private. You feel deeply and rarely give up",
  "optimistic, honest and freedom-loving. You are drawn to learning and travel",
  "disciplined, patient and ambitious. You build slowly but build to last",
  "independent, original and humanitarian. You think differently from the crowd",
  "gentle, imaginative and compassionate. You are intuitive and easily moved by others' pain",
];

/** Moon sign: how the mind and emotions work. */
export const MOON_TRAITS: string[] = [
  "Your mind is restless and action-oriented; you get upset fast but recover fast",
  "Your mind seeks peace and security; you are steady, but stubborn once decided",
  "Your mind is always thinking and talking; you need mental stimulation",
  "Your mind is deeply emotional and caring; you feel everything strongly",
  "Your mind is proud and warm; you need appreciation and want to be respected",
  "Your mind is practical and detail-minded; you can worry too much",
  "Your mind wants harmony; you avoid fights and find decisions hard",
  "Your mind is intense and secretive; you remember hurts for a long time",
  "Your mind is hopeful and philosophical; you bounce back with faith",
  "Your mind is serious and responsible; you hide your feelings behind duty",
  "Your mind is detached and inventive; you value freedom and friendships",
  "Your mind is dreamy and sensitive; you are kind but can absorb others' moods",
];

/** What each sign tends to do in a house sense: the sign on a house shapes its style. */
export const SIGN_STYLE: string[] = [
  "in a direct, fast and independent way",
  "in a steady, patient and security-minded way",
  "in a flexible, communicative and curious way",
  "in a caring, emotional and protective way",
  "in a confident, generous and leader-like way",
  "in a careful, practical and service-minded way",
  "in a balanced, diplomatic and partnership-minded way",
  "in an intense, focused and transformative way",
  "in an optimistic, principled and expansive way",
  "in a disciplined, slow-and-sure and ambitious way",
  "in an unconventional, group-minded and forward-looking way",
  "in an intuitive, flowing and compassionate way",
];

// ------------------------------------------------------------------ nakshatras

/** One-line temperament of each of the 27 Janma Nakshatras (Moon's star). */
export const NAKSHATRA_NATURE: string[] = [
  "quick, healing and pioneering; you start things fast and help others recover",
  "strong-willed and responsible; you carry heavy duties and have great endurance",
  "sharp, truthful and purifying; you speak plainly and cut through confusion",
  "attractive, creative and fond of comfort; you grow whatever you nurture",
  "gentle, curious and searching; you are always looking for something new",
  "intense and emotional; storms in life make you wiser and stronger",
  "kind, forgiving and hopeful; you always find a way to start again",
  "nourishing, dutiful and wise; you are a natural caretaker and teacher",
  "perceptive, secretive and clever; you read people very well",
  "regal, traditional and proud; you respect ancestors and authority",
  "joyful, artistic and relaxed; you enjoy life, love and leisure",
  "helpful, dependable and generous; people rely on you",
  "skilful, witty and hands-on; you are good at crafts and practical work",
  "creative, striking and perfectionist; you love beauty and design",
  "independent, flexible and diplomatic; you do best with freedom",
  "goal-driven, determined and competitive; you pursue what you decide on",
  "friendly, devoted and balanced; you build lasting friendships across places",
  "protective, responsible and private; you earn trust and keep secrets",
  "fearless, truth-seeking and deep; you uproot what is false",
  "invincible, optimistic and persuasive; you inspire others to keep going",
  "honest, principled and victorious; you win through fairness and patience",
  "a good listener and learner; you gain through knowledge and connections",
  "rhythmic, generous and wealth-attracting; you do well in groups and music",
  "mystical, healing and independent; you think big and prefer privacy",
  "fiery, transformative and idealistic; you carry strong convictions",
  "calm, deep and wise; you are patient, generous and steady",
  "gentle, protective and caring; you guide others safely to their goals",
];

// ------------------------------------------------------------------ houses

/** What each house governs (used to explain WHY a placement matters). */
export const HOUSE_MEANING: string[] = [
  "",
  "yourself, body, personality and vitality",
  "money, family, speech and savings",
  "courage, efforts, siblings and communication",
  "home, mother, peace of mind and property",
  "children, intelligence, creativity and romance",
  "work routines, debts, health issues and competition",
  "marriage, partnerships and business dealings",
  "sudden change, research, inheritance and hidden matters",
  "luck, higher learning, father and long journeys",
  "career, status, reputation and public life",
  "income, gains, friends and fulfilment of wishes",
  "expenses, sleep, foreign lands and letting go",
];

/**
 * What it means when the LORD of house A sits in house B. 12 x 12 would be huge, so we
 * describe the destination house (where the energy flows) and combine it with the
 * source house meaning in the engine.
 */
export const LORD_IN_HOUSE: string[] = [
  "",
  "turns inward, so you build this through your own effort and personality",
  "ties this to money and family; support often comes from family or savings",
  "makes this depend on your own courage and effort; results follow initiative",
  "links this to home, comfort and peace of mind; you do best when settled",
  "links this to intelligence, creativity and good past merit; learning and luck help",
  "brings effort, service and obstacles to overcome; success comes from hard work and persistence",
  "connects this to partners and public dealings; other people play a big part",
  "brings sudden changes and depth; results come late but can be lasting",
  "is blessed by luck, teachers and dharma; good fortune supports it",
  "ties this to your profession and public image; it becomes visible in your career",
  "brings gains and support from friends and networks; wishes tend to be fulfilled",
  "sends this far away or into hidden expenses; foreign links or retreat are involved",
];

// ------------------------------------------------------------------ planets

/** The basic nature of each planet, as a plain-language phrase. */
export const PLANET_NATURE: Record<string, string> = {
  Sun: "authority, confidence and the soul",
  Moon: "mind, emotions and the public",
  Mars: "energy, courage and drive",
  Mercury: "intellect, speech and business",
  Jupiter: "wisdom, luck and growth",
  Venus: "love, comfort and the arts",
  Saturn: "discipline, delay and long-term results",
  Rahu: "ambition, foreign things and sudden rise",
  Ketu: "detachment, spirituality and past-life skills",
};

/** What a planet does when it sits in a given house of the chart (index 1-12). */
export const PLANET_IN_HOUSE: Record<string, string[]> = {
  Sun: [
    "",
    "gives confidence, leadership and a strong presence, but can bring pride",
    "puts focus on family name and speech; you earn through authority or government",
    "gives courage and success through your own efforts",
    "can disturb peace at home; you may live away from where you were born",
    "gives sharp intellect and a leader's mind; children bring pride",
    "is excellent for defeating rivals and overcoming debts and illness",
    "can make partnerships demanding; a strong-minded spouse is likely",
    "asks for care with health and ego; research or inheritance can bring change",
    "brings respect for teachers and father and a dharmic outlook",
    "is a classic position for success, status and authority in your career",
    "brings steady gains and influential friends",
    "turns energy towards foreign lands, spirituality or expenses",
  ],
  Moon: [
    "",
    "gives a sensitive, attractive and changeable personality",
    "brings love for family, food and a sweet voice; finances rise and fall",
    "gives imagination, writing and communication skills",
    "gives deep peace of mind, love for home and a close bond with mother",
    "gives a creative, emotional mind and love for children and learning",
    "can bring worry and stomach or sleep issues; good for service work",
    "gives a caring spouse and good public dealings",
    "makes emotions run deep; there may be sudden ups and downs",
    "gives faith, luck and love for travel and teachers",
    "brings a public-facing career and fame that rises and falls",
    "gives many friends and steady income from the public",
    "gives a dreamy mind; foreign travel or a quiet spiritual life is likely",
  ],
  Mars: [
    "",
    "gives courage and energy but also a hot temper; care for the head and accidents",
    "can make speech sharp; money comes through effort and may fluctuate",
    "gives great courage, stamina and success in competition",
    "can disturb domestic peace; property matters need care",
    "gives sharp tactical intelligence; children may be strong-willed",
    "is excellent: it defeats enemies and gives stamina and victory",
    "makes relationships passionate and sometimes tense; Mangal Dosha applies",
    "brings intensity, sudden events and a need for caution with health",
    "gives a bold, action-oriented view of religion and luck",
    "gives drive and success in engineering, defence, sport or management",
    "gives strong gains through effort and a fearless social circle",
    "can raise hidden expenses and conflicts; good for hospitals or foreign work",
  ],
  Mercury: [
    "",
    "gives a clever, youthful, talkative personality",
    "gives a pleasant voice and income from speaking, writing or trade",
    "gives excellent communication, writing and entrepreneurial skill",
    "gives a love of learning and a peaceful, well-furnished home",
    "gives an excellent memory, analytical skill and intelligent children",
    "helps with analysis, service and handling debts, though nerves may be stressed",
    "gives a youthful, witty partner and success in business partnerships",
    "gives research ability and interest in occult and hidden subjects",
    "gives interest in philosophy, teaching and writing",
    "brings success in business, accounting, media and communication",
    "brings gains through trade, networks and clever ideas",
    "can scatter the mind; works well for foreign trade or behind-the-scenes work",
  ],
  Jupiter: [
    "",
    "is a blessing: wisdom, optimism, good health and respect",
    "brings wealth, family support and a kind, wise way of speaking",
    "gives optimism in efforts; siblings and mentors support you",
    "brings a comfortable home, good education and inner peace",
    "is very auspicious for children, intellect, teaching and good fortune",
    "helps overcome enemies and illness, though weight and debts need care",
    "brings a wise, supportive spouse and good partnerships",
    "gives long life, inheritance and interest in deeper knowledge",
    "is a highly fortunate position: luck, teachers and dharma protect you",
    "gives success, honour and a respected career",
    "gives large gains and the fulfilment of wishes",
    "gives spiritual inclination, charity and foreign opportunities",
  ],
  Venus: [
    "",
    "gives charm, good looks and love for beauty and comfort",
    "brings wealth, a sweet voice and family happiness",
    "gives artistic talent and skill in design or communication",
    "gives luxury, vehicles, a beautiful home and happiness from mother",
    "gives romance, creativity and loving relationships with children",
    "can create trouble in relationships or health; works for service and art",
    "gives a loving, attractive spouse and success in partnership",
    "gives pleasure from hidden sources and sudden gains; guard against secrecy",
    "gives luck in love and a refined, dharmic outlook",
    "gives career in arts, beauty, hospitality, finance or luxury",
    "brings great gains, many friends and comforts",
    "brings enjoyment of bed pleasures, foreign comforts and spending on luxury",
  ],
  Saturn: [
    "",
    "makes you serious and mature early; success comes slowly but surely",
    "can make speech reserved and finances slow to build, but steady with time",
    "gives great perseverance and success through hard work",
    "asks for patience at home and with mother; property comes late",
    "can delay children or education but gives depth; discipline brings results",
    "is good for defeating competition through patience and hard work",
    "may delay marriage or bring a mature, older partner; commitment is serious",
    "gives long life and endurance, with hidden delays that pass",
    "can delay luck early, but later brings recognition for effort",
    "is a strong position for career: you rise steadily through discipline",
    "gives slow but sure gains and long-lasting friendships",
    "gives a taste for solitude, foreign lands and spiritual discipline",
  ],
  Rahu: [
    "",
    "gives a magnetic, unconventional personality and strong ambition",
    "can bring sudden money changes; speech may be unusual or persuasive",
    "gives bold courage and success in media, technology and daring ventures",
    "can create restlessness at home; you may live far from your birthplace",
    "gives unconventional thinking and sharp strategy; children need guidance",
    "is good: it helps you win against rivals in an unusual way",
    "brings an unconventional partner or foreign link in relationships",
    "brings sudden events, interest in mysteries and a need for care",
    "makes you question traditions and brings foreign or unusual guidance",
    "can bring sudden rise, fame and success in technology or politics",
    "is excellent for gains, networks and fulfilling big ambitions",
    "supports foreign settlement, big expenses and spiritual curiosity",
  ],
  Ketu: [
    "",
    "makes you detached, intuitive and a little mysterious",
    "can make you indifferent to money, but gives a distinct way of speaking",
    "gives courage with a spiritual undertone",
    "can bring detachment from home; inner peace comes through meditation",
    "gives spiritual intelligence and past-life merit; guidance helps with children",
    "helps overcome enemies and gives healing skills",
    "can make relationships karmic and non-attached; commitment needs conscious effort",
    "gives strong spiritual insight, research ability and a mystic's mind",
    "gives interest in deep spirituality, though conventional rituals may not attract you",
    "makes you work without attachment; success can come in an unusual field",
    "gives gains without much effort and a detached circle of friends",
    "is a classic position for moksha, meditation and a spiritual life",
  ],
};

// ------------------------------------------------------------------ dashas

/** What a period (Mahadasha/Antardasha) of each planet usually feels like. */
export const DASHA_THEME: Record<string, { feels: string; advice: string }> = {
  Sun: {
    feels:
      "a phase of identity, authority and recognition. You step into leadership and want respect",
    advice:
      "Stay humble with seniors, avoid ego clashes, and keep up your health and father's blessings.",
  },
  Moon: {
    feels:
      "a phase of emotions, home and the public. Moods are stronger and family life takes centre stage",
    advice:
      "Protect your peace of mind, keep a routine and spend time with your mother and family.",
  },
  Mars: {
    feels:
      "a phase of energy, action and courage. Property, competition and decisive moves are in focus",
    advice:
      "Channel energy into work and exercise, and avoid anger, arguments and risky shortcuts.",
  },
  Mercury: {
    feels:
      "a phase of learning, business and communication. Skills, contacts and ideas grow",
    advice:
      "Learn, network and write things down; avoid over-thinking and careless words.",
  },
  Jupiter: {
    feels:
      "a phase of growth, wisdom and blessings. Luck, teachers and opportunities open up",
    advice:
      "Say yes to learning and good people, be generous, and do not overspend or over-promise.",
  },
  Venus: {
    feels:
      "a phase of relationships, comfort and creativity. Love, money and luxuries are emphasised",
    advice:
      "Enjoy life wisely, nurture relationships, and avoid overindulgence.",
  },
  Saturn: {
    feels:
      "a phase of responsibility, hard work and lessons. Results come slowly but stay for life",
    advice:
      "Be disciplined, keep your promises, serve others, and avoid shortcuts. Patience pays off.",
  },
  Rahu: {
    feels:
      "a phase of ambition, change and the unfamiliar. Foreign links, technology and sudden turns are likely",
    advice:
      "Stay grounded, avoid get-rich-quick schemes, and verify before trusting.",
  },
  Ketu: {
    feels:
      "a phase of detachment, inner growth and endings. Old patterns fade and spirituality deepens",
    advice:
      "Simplify life, meditate, and accept that some things are meant to end.",
  },
};

// ------------------------------------------------------------------ remedies

/** Simple, safe, non-commercial remedies per planet. */
export const PLANET_REMEDY: Record<string, string> = {
  Sun: "offer water to the Sun at sunrise, respect your father and elders, and chant 'Om Suryaya Namah' on Sundays",
  Moon: "spend time near water, respect your mother, wear white on Mondays and chant 'Om Chandraya Namah'",
  Mars: "recite the Hanuman Chalisa on Tuesdays, exercise regularly and donate red lentils",
  Mercury:
    "feed green fodder to a cow on Wednesdays, study something new and chant 'Om Budhaya Namah'",
  Jupiter:
    "respect teachers, donate yellow items or food on Thursdays and chant 'Om Gurave Namah'",
  Venus:
    "be kind to your partner, keep your home clean and fragrant, and chant 'Om Shukraya Namah' on Fridays",
  Saturn:
    "serve the elderly and the needy, light a lamp on Saturdays and chant 'Om Shanaye Namah'",
  Rahu: "feed birds, do charity on Saturdays, avoid shortcuts and chant 'Om Rahave Namah'",
  Ketu: "meditate daily, feed street dogs and chant 'Om Ketave Namah'",
};

// ------------------------------------------------------------------ small helpers

/** Deterministic pick so the same chart always gets the same wording, different charts differ. */
export function pickBySeed<T>(items: T[], seed: number): T {
  return items[Math.abs(Math.floor(seed)) % items.length];
}
