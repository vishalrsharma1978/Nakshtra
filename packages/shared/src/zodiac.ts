import { ZODIAC_SIGNS, type ZodiacSign } from './constants';

/** Returns the sun sign for a date of birth (YYYY-MM-DD or Date). */
export function getSunSign(dob: string | Date): ZodiacSign | null {
  const d = typeof dob === 'string' ? new Date(`${dob}T00:00:00`) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const sign of ZODIAC_SIGNS) {
    const [sm, sd] = sign.start;
    const [em, ed] = sign.end;
    if (sm <= em) {
      if ((month === sm && day >= sd) || (month === em && day <= ed) || (month > sm && month < em)) {
        return sign;
      }
    } else {
      // wraps year end (capricorn)
      if ((month === sm && day >= sd) || (month === em && day <= ed)) {
        return sign;
      }
    }
  }
  return null;
}

export function getSignByKey(key: string): ZodiacSign | null {
  return ZODIAC_SIGNS.find((s) => s.key === key) ?? null;
}
