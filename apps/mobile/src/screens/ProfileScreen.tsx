import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSunSign, type Language } from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Chip, Input } from '../components/ui';
import { colors, spacing } from '../theme';

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Nakshtra', message);
}

export default function ProfileScreen() {
  const { session, profile, t, lang, setLanguage, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [dob, setDob] = useState(profile?.dob ?? '');
  const [birthTime, setBirthTime] = useState(profile?.birth_time?.slice(0, 5) ?? '');
  const [birthPlace, setBirthPlace] = useState(profile?.birth_place ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!session) return;
    if (dob && Number.isNaN(new Date(`${dob}T00:00:00`).getTime())) {
      notify('Date of birth must be in YYYY-MM-DD format.');
      return;
    }
    setBusy(true);
    try {
      const sign = dob ? getSunSign(dob) : null;
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          dob: dob || null,
          birth_time: birthTime ? `${birthTime}:00` : null,
          birth_place: birthPlace.trim() || null,
          zodiac_sign: sign?.key ?? null,
        })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      notify('Profile saved!');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.email}>{profile?.email}</Text>
        <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />
        <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('birthDetails')}</Text>
        <Input label={t('dob')} value={dob} onChangeText={setDob} placeholder="1990-05-15" />
        <Input label={t('birthTime')} value={birthTime} onChangeText={setBirthTime} placeholder="14:30" />
        <Input label={t('birthPlace')} value={birthPlace} onChangeText={setBirthPlace} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.chips}>
          {(['en', 'hi'] as Language[]).map((l) => (
            <Chip
              key={l}
              label={l === 'en' ? 'English' : 'हिन्दी'}
              active={lang === l}
              onPress={() => void setLanguage(l)}
            />
          ))}
        </View>
      </Card>

      <Button title={t('save')} onPress={save} loading={busy} />
      <Button title={t('signOut')} variant="outline" onPress={() => void signOut()} style={{ marginTop: spacing.sm }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  email: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
