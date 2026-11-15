import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getSunSign, type ZodiacSign } from '@nakshtra/shared';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input } from '../components/ui';
import { colors, spacing } from '../theme';

const SIGN_TRAITS: Record<string, { en: string; hi: string }> = {
  aries: {
    en: 'Bold, energetic and a natural leader. Mars rules your drive — channel it into focused action.',
    hi: 'साहसी, ऊर्जावान और स्वाभाविक नेता। मंगल आपकी ऊर्जा का स्वामी है — इसे केंद्रित कार्य में लगाएं।',
  },
  taurus: {
    en: 'Grounded, patient and loyal. Venus blesses you with appreciation for beauty and stability.',
    hi: 'स्थिर, धैर्यवान और वफादार। शुक्र आपको सुंदरता और स्थिरता की सराहना का आशीर्वाद देता है।',
  },
  gemini: {
    en: 'Curious, adaptable and communicative. Mercury sharpens your wit and versatility.',
    hi: 'जिज्ञासु, अनुकूलनीय और संवादप्रिय। बुध आपकी बुद्धि और बहुमुखी प्रतिभा को तेज करता है।',
  },
  cancer: {
    en: 'Nurturing, intuitive and protective. The Moon deepens your emotional intelligence.',
    hi: 'पालन-पोषण करने वाले, सहज और रक्षक। चंद्रमा आपकी भावनात्मक बुद्धिमत्ता को गहरा करता है।',
  },
  leo: {
    en: 'Confident, generous and charismatic. The Sun fuels your creative self-expression.',
    hi: 'आत्मविश्वासी, उदार और करिश्माई। सूर्य आपकी रचनात्मक आत्म-अभिव्यक्ति को ऊर्जा देता है।',
  },
  virgo: {
    en: 'Analytical, practical and service-oriented. Mercury grants precision and discernment.',
    hi: 'विश्लेषणात्मक, व्यावहारिक और सेवा-उन्मुख। बुध सटीकता और विवेक प्रदान करता है।',
  },
  libra: {
    en: 'Diplomatic, fair and harmony-seeking. Venus guides your refined aesthetic sense.',
    hi: 'कूटनीतिक, न्यायप्रिय और सामंजस्य चाहने वाले। शुक्र आपकी परिष्कृत सौंदर्य दृष्टि का मार्गदर्शन करता है।',
  },
  scorpio: {
    en: 'Intense, transformative and perceptive. Mars and Ketu energies give you depth and resilience.',
    hi: 'तीव्र, परिवर्तनकारी और अंतर्दृष्टिपूर्ण। मंगल और केतु की ऊर्जा आपको गहराई और दृढ़ता देती है।',
  },
  sagittarius: {
    en: 'Optimistic, philosophical and adventurous. Jupiter expands your horizons and wisdom.',
    hi: 'आशावादी, दार्शनिक और साहसी। बृहस्पति आपके क्षितिज और ज्ञान का विस्तार करता है।',
  },
  capricorn: {
    en: 'Disciplined, ambitious and responsible. Saturn rewards your persistent efforts.',
    hi: 'अनुशासित, महत्वाकांक्षी और जिम्मेदार। शनि आपके निरंतर प्रयासों का फल देता है।',
  },
  aquarius: {
    en: 'Innovative, humanitarian and independent. Saturn and Rahu give you visionary thinking.',
    hi: 'नवोन्मेषी, मानवतावादी और स्वतंत्र। शनि और राहु आपको दूरदर्शी सोच देते हैं।',
  },
  pisces: {
    en: 'Compassionate, artistic and spiritual. Jupiter deepens your intuition and empathy.',
    hi: 'दयालु, कलात्मक और आध्यात्मिक। बृहस्पति आपकी अंतर्ज्ञान और सहानुभूति को गहरा करता है।',
  },
};

export default function KundliScreen() {
  const { profile, t, lang } = useAuth();
  const [dob, setDob] = useState(profile?.dob ?? '');
  const [result, setResult] = useState<ZodiacSign | null>(profile?.dob ? getSunSign(profile.dob) : null);

  const compute = () => setResult(getSunSign(dob));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.sectionTitle}>{t('birthDetails')}</Text>
        <Input label={t('dob')} value={dob} onChangeText={setDob} placeholder="1990-05-15" />
        <Button title={t('kundli')} onPress={compute} />
      </Card>

      {result && (
        <Card style={styles.resultCard}>
          <Text style={styles.symbol}>{result.symbol}</Text>
          <Text style={styles.signName}>{lang === 'hi' ? result.hi : result.en}</Text>
          <Text style={styles.element}>{result.element}</Text>
          <Text style={styles.traits}>{SIGN_TRAITS[result.key]?.[lang] ?? ''}</Text>
          <Text style={styles.disclaimer}>
            {lang === 'hi'
              ? 'विस्तृत कुंडली विश्लेषण के लिए हमारे विशेषज्ञों से परामर्श बुक करें।'
              : 'For a detailed birth chart analysis, book a consultation with our experts.'}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, maxWidth: 700, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  resultCard: { alignItems: 'center' },
  symbol: { fontSize: 64 },
  signName: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
  element: { color: colors.accent, fontWeight: '600', marginTop: 4 },
  traits: { color: colors.text, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  disclaimer: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, fontSize: 13, fontStyle: 'italic' },
});
