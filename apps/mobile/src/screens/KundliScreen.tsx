import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { computeKundli, formatDegree, type Kundli } from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { searchPlaces, timezoneOffsetMinutes, type GeoPlace } from '../lib/geocode';
import { loadBrandAssets } from '../lib/brandAssets';
import { buildKundliHtml, type KundliPerson } from '../lib/kundliReport';
import { Button, Card, Input, Loading } from '../components/ui';
import { colors, spacing } from '../theme';

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Nakshtra', message);
}

type Gender = 'male' | 'female';

export default function KundliScreen() {
  const { session, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [gender, setGender] = useState<Gender>('male');
  const [date, setDate] = useState(profile?.dob ?? '');
  const [time, setTime] = useState(profile?.birth_time?.slice(0, 5) ?? '');
  const [placeQuery, setPlaceQuery] = useState(profile?.birth_place ?? '');
  const [placeResults, setPlaceResults] = useState<GeoPlace[]>([]);
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kundli: Kundli; person: KundliPerson } | null>(null);

  const lookupPlace = async () => {
    setSearching(true);
    setPlace(null);
    try {
      const results = await searchPlaces(placeQuery);
      setPlaceResults(results);
      if (results.length === 0) notify('No matching place found. Try a nearby bigger city.');
    } catch {
      notify('Place lookup failed. Check your internet connection.');
    } finally {
      setSearching(false);
    }
  };

  const validate = (): string | null => {
    if (name.trim().length < 2) return 'Please enter the full name.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      return 'Date of birth must be YYYY-MM-DD.';
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return 'Time of birth must be HH:MM (24h).';
    if (!place) return 'Please search and select the place of birth.';
    return null;
  };

  const generate = async () => {
    const err = validate();
    if (err) {
      notify(err);
      return;
    }
    setBusy(true);
    try {
      const selected = place!;
      const birthLocal = new Date(`${date}T${time}:00`);
      const offset = timezoneOffsetMinutes(selected.timezone, birthLocal);
      const person: KundliPerson = {
        name: name.trim(),
        gender,
        date,
        time,
        place: `${selected.name}${selected.admin1 ? ', ' + selected.admin1 : ''}, ${selected.country}`,
        latitude: selected.latitude,
        longitude: selected.longitude,
        utcOffsetMinutes: offset,
      };
      const kundli = computeKundli({
        date,
        time,
        utcOffsetMinutes: offset,
        latitude: selected.latitude,
        longitude: selected.longitude,
      });
      setResult({ kundli, person });
      if (session) {
        void supabase.from('activity_log').insert({
          user_id: session.user.id,
          action: 'kundli_generated',
          metadata: { place: person.place, gender },
        });
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Kundli computation failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!result) return;
    // Open the window synchronously within the click gesture so browsers don't block it
    const win = Platform.OS === 'web' ? window.open('', '_blank') : null;
    if (Platform.OS === 'web' && !win) {
      notify('Please allow pop-ups to download the kundli PDF.');
      return;
    }
    setBusy(true);
    try {
      const brand = await loadBrandAssets();
      const html = buildKundliHtml(result.person, result.kundli, brand);
      if (Platform.OS === 'web') {
        win!.document.write(html);
        win!.document.close();
        setTimeout(() => win!.print(), 800); // user picks "Save as PDF"
      } else {
        const Print = await import('expo-print');
        const Sharing = await import('expo-sharing');
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save your Royal Kundli PDF',
            UTI: 'com.adobe.pdf',
          });
        } else {
          notify(`Kundli PDF saved: ${uri}`);
        }
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'PDF generation failed');
    } finally {
      setBusy(false);
    }
  };

  const k = result?.kundli;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={styles.sectionTitle}>👑 Royal Janma Kundli</Text>
        <Text style={styles.hint}>
          Fill the birth details below. Your kundli is computed with astronomical precision (Lahiri
          ayanamsa) and styled as a royal {gender === 'male' ? 'Maharaja' : 'Maharani'} edition PDF.
        </Text>

        <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" />

        <Text style={styles.label}>Kundli Style (by gender)</Text>
        <View style={styles.genderRow}>
          <Pressable
            style={[styles.genderCard, gender === 'male' && styles.genderCardActiveKing]}
            onPress={() => setGender('male')}
          >
            <Text style={styles.genderEmoji}>👑</Text>
            <Text style={styles.genderTitle}>Male</Text>
            <Text style={styles.genderSub}>Maharaja Edition</Text>
          </Pressable>
          <Pressable
            style={[styles.genderCard, gender === 'female' && styles.genderCardActiveQueen]}
            onPress={() => setGender('female')}
          >
            <Text style={styles.genderEmoji}>👸</Text>
            <Text style={styles.genderTitle}>Female</Text>
            <Text style={styles.genderSub}>Maharani Edition</Text>
          </Pressable>
        </View>

        <Input label="Date of Birth (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="1990-05-15" />
        <Input label="Time of Birth (HH:MM, 24h)" value={time} onChangeText={setTime} placeholder="14:30" />

        <Text style={styles.label}>Place of Birth</Text>
        <View style={styles.placeRow}>
          <View style={{ flex: 1 }}>
            <Input value={placeQuery} onChangeText={setPlaceQuery} placeholder="City name, e.g. Jaipur" />
          </View>
          <Button title="Search" onPress={lookupPlace} loading={searching} style={styles.searchBtn} />
        </View>
        {placeResults.map((p) => (
          <Pressable
            key={`${p.latitude}-${p.longitude}`}
            style={[styles.placeOption, place === p && styles.placeOptionActive]}
            onPress={() => {
              setPlace(p);
              setPlaceResults([p]);
            }}
          >
            <Text style={styles.placeText}>
              📍 {p.name}
              {p.admin1 ? `, ${p.admin1}` : ''} — {p.country} ({p.timezone})
            </Text>
          </Pressable>
        ))}

        <Button
          title="✨ Generate Kundli"
          onPress={generate}
          loading={busy && !result}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {k && (
        <>
          <Card style={styles.resultCard}>
            <Text style={styles.resultCrown}>{gender === 'male' ? '👑' : '👸'}</Text>
            <Text style={styles.resultName}>{result!.person.name}</Text>
            <Text style={styles.resultRow}>
              Lagna: <Text style={styles.strong}>{k.lagna.sign} {formatDegree(k.lagna.degreeInSign)}</Text>
            </Text>
            <Text style={styles.resultRow}>
              Rashi (Moon): <Text style={styles.strong}>{k.moonSign}</Text> · Nakshatra:{' '}
              <Text style={styles.strong}>{k.moonNakshatra.en} – {k.moonPada}</Text>
            </Text>
            <Text style={styles.resultRow}>
              Tithi: <Text style={styles.strong}>{k.panchang.paksha} {k.panchang.tithi}</Text> · Yoga:{' '}
              <Text style={styles.strong}>{k.panchang.yoga}</Text>
            </Text>
            <Text style={styles.resultRow}>
              Gana: <Text style={styles.strong}>{k.avakahada.gana}</Text> · Nadi:{' '}
              <Text style={styles.strong}>{k.avakahada.nadi}</Text> · Yoni:{' '}
              <Text style={styles.strong}>{k.avakahada.yoni}</Text>
            </Text>
            <Text style={styles.resultRow}>
              Mahadasha at birth: <Text style={styles.strong}>{k.currentDashaAtBirth}</Text>
            </Text>
            <Text style={[styles.resultRow, { color: k.manglik ? colors.danger : colors.success }]}>
              {k.manglik ? '⚠️ Manglik' : '✓ Non-Manglik'}
            </Text>
          </Card>

          <Button
            title="📜 Download Royal Kundli PDF"
            onPress={downloadPdf}
            loading={busy}
          />
          <Text style={styles.pdfHint}>
            3-page {gender === 'male' ? 'Maharaja' : 'Maharani'} edition with Lagna & Navamsa charts,
            planetary table, avakahada, panchang and vimshottari dasha — branded on every page.
          </Text>
        </>
      )}
      {busy && !k && <Loading />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  label: { color: colors.textMuted, marginBottom: spacing.sm, fontSize: 13, fontWeight: '500' },
  genderRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  genderCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  genderCardActiveKing: { borderColor: '#7a1f1f', backgroundColor: '#fdf3df' },
  genderCardActiveQueen: { borderColor: '#a81d5b', backgroundColor: '#fdeef5' },
  genderEmoji: { fontSize: 30 },
  genderTitle: { fontWeight: '700', color: colors.text, marginTop: 4 },
  genderSub: { fontSize: 11, color: colors.textMuted },
  placeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  searchBtn: { paddingVertical: 12, paddingHorizontal: spacing.md },
  placeOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  placeOptionActive: { borderColor: colors.primary, backgroundColor: colors.chipBg },
  placeText: { color: colors.text, fontSize: 13 },
  resultCard: { alignItems: 'center' },
  resultCrown: { fontSize: 40 },
  resultName: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  resultRow: { color: colors.text, marginTop: 4, fontSize: 14, textAlign: 'center' },
  strong: { fontWeight: '700', color: colors.primaryDark },
  pdfHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm, lineHeight: 17 },
});
