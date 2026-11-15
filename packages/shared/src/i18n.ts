import type { Language } from './types';

const translations = {
  // General
  appName: { en: 'Nakshtra', hi: 'नक्षत्र' },
  loading: { en: 'Loading…', hi: 'लोड हो रहा है…' },
  save: { en: 'Save', hi: 'सहेजें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  submit: { en: 'Submit', hi: 'जमा करें' },
  error: { en: 'Something went wrong', hi: 'कुछ गलत हो गया' },
  retry: { en: 'Retry', hi: 'पुनः प्रयास करें' },
  // Auth
  signIn: { en: 'Sign In', hi: 'साइन इन करें' },
  signUp: { en: 'Create Account', hi: 'खाता बनाएं' },
  signOut: { en: 'Sign Out', hi: 'साइन आउट' },
  email: { en: 'Email', hi: 'ईमेल' },
  password: { en: 'Password', hi: 'पासवर्ड' },
  fullName: { en: 'Full Name', hi: 'पूरा नाम' },
  phone: { en: 'Phone', hi: 'फ़ोन' },
  noAccount: { en: "Don't have an account? Sign up", hi: 'खाता नहीं है? साइन अप करें' },
  haveAccount: { en: 'Already have an account? Sign in', hi: 'पहले से खाता है? साइन इन करें' },
  // Tabs
  home: { en: 'Home', hi: 'होम' },
  askExperts: { en: 'Ask Experts', hi: 'विशेषज्ञ से पूछें' },
  consult: { en: 'Consult', hi: 'परामर्श' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
  // Home
  dailyHoroscope: { en: 'Daily Horoscope', hi: 'दैनिक राशिफल' },
  yourSign: { en: 'Your Sign', hi: 'आपकी राशि' },
  services: { en: 'Services', hi: 'सेवाएं' },
  kundli: { en: 'Kundli', hi: 'कुंडली' },
  kundliSubtitle: { en: 'Your birth chart basics', hi: 'आपकी जन्म कुंडली की मूल बातें' },
  setDobPrompt: { en: 'Set your date of birth in Profile to see your horoscope', hi: 'अपना राशिफल देखने के लिए प्रोफ़ाइल में जन्म तिथि सेट करें' },
  noHoroscopeToday: { en: 'No horoscope published for today yet.', hi: 'आज का राशिफल अभी प्रकाशित नहीं हुआ है।' },
  // Forum
  myQuestions: { en: 'My Questions', hi: 'मेरे प्रश्न' },
  askQuestion: { en: 'Ask a Question', hi: 'प्रश्न पूछें' },
  questionTitle: { en: 'Title', hi: 'शीर्षक' },
  questionBody: { en: 'Describe your issue…', hi: 'अपनी समस्या बताएं…' },
  category: { en: 'Category', hi: 'श्रेणी' },
  freeTier: { en: 'Free', hi: 'नि:शुल्क' },
  paidTier: { en: 'Fast Track', hi: 'फास्ट ट्रैक' },
  freeTierDesc: { en: 'Expert replies within', hi: 'विशेषज्ञ उत्तर देंगे' },
  paidTierDesc: { en: 'Priority reply within', hi: 'प्राथमिकता उत्तर' },
  slaDue: { en: 'Reply due', hi: 'उत्तर देय' },
  replied: { en: 'Answered', hi: 'उत्तर दिया गया' },
  typeMessage: { en: 'Type a message…', hi: 'संदेश लिखें…' },
  send: { en: 'Send', hi: 'भेजें' },
  status_open: { en: 'Open', hi: 'खुला' },
  status_assigned: { en: 'Assigned', hi: 'सौंपा गया' },
  status_answered: { en: 'Answered', hi: 'उत्तरित' },
  status_closed: { en: 'Closed', hi: 'बंद' },
  // Consult
  ourExperts: { en: 'Our Experts', hi: 'हमारे विशेषज्ञ' },
  bookConsult: { en: 'Book Video Consultation', hi: 'वीडियो परामर्श बुक करें' },
  perSession: { en: 'per session', hi: 'प्रति सत्र' },
  pickDateTime: { en: 'Pick date & time', hi: 'दिनांक और समय चुनें' },
  myConsultations: { en: 'My Consultations', hi: 'मेरे परामर्श' },
  joinCall: { en: 'Join Video Call', hi: 'वीडियो कॉल में शामिल हों' },
  experienceYears: { en: 'yrs experience', hi: 'वर्ष अनुभव' },
  // Payment
  payNow: { en: 'Pay Now', hi: 'अभी भुगतान करें' },
  paymentSuccess: { en: 'Payment successful!', hi: 'भुगतान सफल!' },
  paymentFailed: { en: 'Payment failed. Please try again.', hi: 'भुगतान विफल। कृपया पुनः प्रयास करें।' },
  // Profile
  birthDetails: { en: 'Birth Details', hi: 'जन्म विवरण' },
  dob: { en: 'Date of Birth (YYYY-MM-DD)', hi: 'जन्म तिथि (YYYY-MM-DD)' },
  birthTime: { en: 'Birth Time (HH:MM)', hi: 'जन्म समय (HH:MM)' },
  birthPlace: { en: 'Birth Place', hi: 'जन्म स्थान' },
  language: { en: 'Language', hi: 'भाषा' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

export function makeT(lang: Language) {
  return (key: TranslationKey) => t(key, lang);
}
