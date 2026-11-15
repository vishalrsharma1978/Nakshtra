import React, { useEffect, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Expert } from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Chip, Input, Loading } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Nakshtra', message);
}

/** Next 7 days as selectable options */
function nextDays(count = 7): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), date: d });
  }
  return out;
}

const TIME_SLOTS = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function ExpertDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ExpertDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, settings, t } = useAuth();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const days = nextDays();

  useEffect(() => {
    void supabase
      .from('experts')
      .select('*')
      .eq('id', route.params.expertId)
      .single()
      .then(({ data }) => setExpert(data as Expert));
  }, [route.params.expertId]);

  if (!expert) return <Loading />;

  const book = async () => {
    if (!session || !slot) {
      notify(t('pickDateTime'));
      return;
    }
    setBusy(true);
    try {
      const [h, m] = slot.split(':').map(Number);
      const when = new Date(days[dayIdx].date);
      when.setHours(h, m, 0, 0);

      const { data, error } = await supabase
        .from('consultations')
        .insert({
          user_id: session.user.id,
          expert_id: expert.id,
          scheduled_at: when.toISOString(),
          duration_min: settings.default_consult_duration_min,
          amount_inr: expert.consult_rate_inr,
          notes: notes.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      await supabase.from('activity_log').insert({
        user_id: session.user.id,
        action: 'consultation_requested',
        metadata: { consultation_id: data.id, expert_id: expert.id },
      });

      navigation.replace('Payment', { purpose: 'consultation', refId: data.id });
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.header}>
        {expert.photo_url ? (
          <Image source={{ uri: expert.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{expert.display_name.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.name}>{expert.display_name}</Text>
        <Text style={styles.specialties}>{expert.specialties.join(' · ')}</Text>
        <Text style={styles.meta}>
          {expert.experience_years} {t('experienceYears')} · {expert.languages.join(', ')}
        </Text>
        {expert.bio ? <Text style={styles.bio}>{expert.bio}</Text> : null}
        <Text style={styles.price}>₹{expert.consult_rate_inr} {t('perSession')}</Text>
      </Card>

      <Text style={styles.sectionTitle}>{t('pickDateTime')}</Text>
      <View style={styles.chips}>
        {days.map((d, i) => (
          <Chip key={d.label} label={d.label} active={dayIdx === i} onPress={() => setDayIdx(i)} />
        ))}
      </View>
      <View style={styles.chips}>
        {TIME_SLOTS.map((s) => (
          <Chip key={s} label={s} active={slot === s} onPress={() => setSlot(s)} />
        ))}
      </View>

      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <Button title={`${t('bookConsult')} — ₹${expert.consult_rate_inr}`} onPress={book} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, maxWidth: 700, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: spacing.sm },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.primary },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  specialties: { color: colors.primary, marginTop: 4, textTransform: 'capitalize' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  bio: { color: colors.text, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },
  price: { marginTop: spacing.sm, fontSize: 18, fontWeight: '700', color: colors.accent },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
});
