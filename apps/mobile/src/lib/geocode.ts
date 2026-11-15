// Free birth-place geocoding via the Open-Meteo API (no key required).

export interface GeoPlace {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone: string;
}

export async function searchPlaces(query: string): Promise<GeoPlace[]> {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Place lookup failed');
  const data = (await res.json()) as { results?: GeoPlace[] };
  return data.results ?? [];
}

/** UTC offset minutes for an IANA timezone at a given date (historic DST aware). */
export function timezoneOffsetMinutes(timeZone: string, date: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' });
    const part = fmt.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+05:30';
    const m = part.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!m) return 330;
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
  } catch {
    return 330; // IST fallback
  }
}
