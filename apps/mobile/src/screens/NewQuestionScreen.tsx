import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CATEGORY_LABELS,
  QUESTION_CATEGORIES,
  computeSlaDueAt,
  type QuestionCategory,
  type QuestionTier,
} from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Chip, Input } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Nakshtra', message);
}

export default function NewQuestionScreen() {
  const { session, settings, t, lang } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('career');
  const [tier, setTier] = useState<QuestionTier>('free');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!session) return;
    if (title.trim().length < 3 || body.trim().length < 10) {
      notify('Please provide a title (3+ chars) and describe your issue (10+ chars).');
      return;
    }
    setBusy(true);
    try {
      // Question is created with the free SLA; a successful fast-track payment
      // upgrades tier + SLA server-side via the Razorpay webhook.
      const slaDue = computeSlaDueAt(new Date(), settings.free_sla_hours);
      const { data, error } = await supabase
        .from('questions')
        .insert({
          user_id: session.user.id,
          title: title.trim(),
          body: body.trim(),
          category,
          tier: 'free',
          sla_due_at: slaDue.toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      await supabase.from('activity_log').insert({
        user_id: session.user.id,
        action: 'question_created',
        metadata: { question_id: data.id, category, requested_tier: tier },
      });

      if (tier === 'paid') {
        navigation.replace('Payment', { purpose: 'question_fast_track', refId: data.id });
      } else {
        navigation.replace('QuestionDetail', { questionId: data.id });
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to submit question');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input label={t('questionTitle')} value={title} onChangeText={setTitle} maxLength={200} />
      <Input
        label={t('questionBody')}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={5}
        style={styles.bodyInput}
        maxLength={5000}
      />

      <Text style={styles.label}>{t('category')}</Text>
      <View style={styles.chips}>
        {QUESTION_CATEGORIES.map((c) => (
          <Chip key={c} label={CATEGORY_LABELS[c][lang]} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <Text style={styles.label}>SLA</Text>
      <Card style={tier === 'free' ? styles.tierCardActive : styles.tierCard}>
        <Text style={styles.tierTitle} onPress={() => setTier('free')}>
          🆓 {t('freeTier')} — {t('freeTierDesc')} {settings.free_sla_hours}h
        </Text>
      </Card>
      <Card style={tier === 'paid' ? styles.tierCardActive : styles.tierCard}>
        <Text style={styles.tierTitle} onPress={() => setTier('paid')}>
          ⚡ {t('paidTier')} (₹{settings.fast_track_price_inr}) — {t('paidTierDesc')} {settings.paid_sla_hours}h
        </Text>
      </Card>

      <Button title={t('submit')} onPress={submit} loading={busy} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, maxWidth: 700, width: '100%', alignSelf: 'center' },
  bodyInput: { minHeight: 120, textAlignVertical: 'top' },
  label: { color: colors.textMuted, marginBottom: spacing.sm, fontSize: 13, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  tierCard: { opacity: 0.65 },
  tierCardActive: { borderColor: colors.primary, borderWidth: 2 },
  tierTitle: { fontSize: 15, fontWeight: '500', color: colors.text, lineHeight: 22 },
});
