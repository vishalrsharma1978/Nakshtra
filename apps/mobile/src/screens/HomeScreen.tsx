import React, { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSunSign, getSignByKey, type Horoscope } from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const { profile, t, lang } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sign = profile?.dob ? getSunSign(profile.dob) : profile?.zodiac_sign ? getSignByKey(profile.zodiac_sign) : null;

  const loadHoroscope = useCallback(async () => {
    if (!sign) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('horoscopes')
      .select('*')
      .eq('sign', sign.key)
      .eq('for_date', today)
      .in('language', [lang, 'en'])
      .order('language', { ascending: lang === 'en' });
    setHoroscope((data?.find((h) => h.language === lang) ?? data?.[0] ?? null) as Horoscope | null);
  }, [sign?.key, lang]);

  useEffect(() => {
    void loadHoroscope();
  }, [loadHoroscope]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHoroscope();
    setRefreshing(false);
  }, [loadHoroscope]);

  const services: { icon: string; title: string; subtitle: string; onPress: () => void }[] = [
    {
      icon: '💬',
      title: t('askExperts'),
      subtitle: 'Free & fast-track answers',
      onPress: () => navigation.navigate('Tabs', { screen: 'Questions' } as never),
    },
    {
      icon: '📹',
      title: t('bookConsult'),
      subtitle: '1-to-1 video with experts',
      onPress: () => navigation.navigate('Tabs', { screen: 'Consult' } as never),
    },
    {
      icon: '🪔',
      title: t('kundli'),
      subtitle: t('kundliSubtitle'),
      onPress: () => navigation.navigate('Kundli'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.brandRow}>
        <Image source={require('../../assets/branding/logo-small.png')} style={styles.brandLogo} />
        <Text style={styles.greeting}>
          🙏 {profile?.full_name ? profile.full_name.split(' ')[0] : t('appName')}
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>{t('dailyHoroscope')}</Text>
        {sign ? (
          <>
            <View style={styles.signRow}>
              <Text style={styles.signSymbol}>{sign.symbol}</Text>
              <View>
                <Text style={styles.signName}>{lang === 'hi' ? sign.hi : sign.en}</Text>
                <Text style={styles.signMeta}>{sign.element}</Text>
              </View>
            </View>
            <Text style={styles.horoscopeText}>
              {horoscope?.content ?? t('noHoroscopeToday')}
            </Text>
          </>
        ) : (
          <Text style={styles.horoscopeText}>{t('setDobPrompt')}</Text>
        )}
      </Card>

      <Text style={styles.sectionTitle}>{t('services')}</Text>
      {services.map((s) => (
        <Pressable key={s.title} onPress={s.onPress}>
          <Card style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>{s.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>{s.title}</Text>
              <Text style={styles.serviceSubtitle}>{s.subtitle}</Text>
            </View>
            <Text style={styles.serviceArrow}>›</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, maxWidth: 700, width: '100%', alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  brandLogo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: '#fff' },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  signRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  signSymbol: { fontSize: 40 },
  signName: { fontSize: 18, fontWeight: '600', color: colors.primary },
  signMeta: { color: colors.textMuted, fontSize: 13 },
  horoscopeText: { color: colors.text, lineHeight: 22 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  serviceIcon: { fontSize: 28 },
  serviceTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  serviceSubtitle: { color: colors.textMuted, fontSize: 13 },
  serviceArrow: { fontSize: 28, color: colors.textMuted },
});
