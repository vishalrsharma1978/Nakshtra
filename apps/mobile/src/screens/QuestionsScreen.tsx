import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isSlaBreached, slaRemainingLabel, type Question } from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, Loading } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const STATUS_COLORS: Record<Question['status'], string> = {
  open: colors.accent,
  assigned: colors.primary,
  answered: colors.success,
  closed: colors.textMuted,
};

export default function QuestionsScreen() {
  const { session, t } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setQuestions((data ?? []) as Question[]);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (questions === null) return <Loading />;

  return (
    <View style={styles.container}>
      <FlatList
        data={questions}
        keyExtractor={(q) => q.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.heading}>{t('myQuestions')}</Text>}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>No questions yet. Ask our experts about career, love, health and more.</Text>
          </Card>
        }
        renderItem={({ item }) => {
          const breached = isSlaBreached(item);
          return (
            <Pressable onPress={() => navigation.navigate('QuestionDetail', { questionId: item.id })}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                    {t(`status_${item.status}` as never)}
                  </Text>
                  <Text style={[styles.tier, item.tier === 'paid' && styles.tierPaid]}>
                    {item.tier === 'paid' ? `⚡ ${t('paidTier')}` : t('freeTier')}
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                {(item.status === 'open' || item.status === 'assigned') && (
                  <Text style={[styles.sla, breached && styles.slaBreached]}>
                    ⏱ {t('slaDue')}: {slaRemainingLabel(item.sla_due_at)}
                  </Text>
                )}
              </Card>
            </Pressable>
          );
        }}
      />
      <Pressable style={styles.fab} onPress={() => navigation.navigate('NewQuestion')}>
        <Text style={styles.fabText}>＋ {t('askQuestion')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, paddingBottom: 90, maxWidth: 700, width: '100%', alignSelf: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  empty: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  badge: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tier: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tierPaid: { color: colors.accent },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  body: { color: colors.textMuted, lineHeight: 19 },
  sla: { marginTop: spacing.sm, color: colors.primary, fontSize: 13, fontWeight: '500' },
  slaBreached: { color: colors.danger },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
