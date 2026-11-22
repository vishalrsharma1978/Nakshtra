import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ZODIAC_SIGNS,
  computeKundli,
  dailyHoroscopeFor,
  getSunSign,
  getSignByKey,
  localIsoDate,
  type Horoscope,
} from "@nakshtra/shared";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { searchPlaces, timezoneOffsetMinutes } from "../lib/geocode";
import { Card } from "../components/ui";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

export default function HomeScreen() {
  const { profile, t, lang } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Moon sign (Chandra Rashi) from the saved birth details, when available
  const [moonIndex, setMoonIndex] = useState<number | null>(null);

  const sunSign = profile?.dob
    ? getSunSign(profile.dob)
    : profile?.zodiac_sign
      ? getSignByKey(profile.zodiac_sign)
      : null;
  // Indian daily horoscopes are read from the Moon sign; fall back to the sun sign
  const sign = moonIndex !== null ? ZODIAC_SIGNS[moonIndex] : sunSign;

  // Work out the Moon sign once the full birth details are saved in Profile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.dob || !profile.birth_time || !profile.birth_place) {
        setMoonIndex(null);
        return;
      }
      try {
        const place = (await searchPlaces(profile.birth_place))[0];
        if (!place) throw new Error("place not found");
        const time = profile.birth_time.slice(0, 5);
        const k = computeKundli({
          date: profile.dob,
          time,
          utcOffsetMinutes: timezoneOffsetMinutes(
            place.timezone,
            new Date(`${profile.dob}T${time}:00`),
          ),
          latitude: place.latitude,
          longitude: place.longitude,
        });
        if (!cancelled) setMoonIndex(k.moonSignIndex);
      } catch {
        if (!cancelled) setMoonIndex(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.dob, profile?.birth_time, profile?.birth_place]);

  const today = localIsoDate();
  // Always available: generated from today's real planetary positions
  const daily = useMemo(
    () => (sign ? dailyHoroscopeFor(ZODIAC_SIGNS.indexOf(sign), today) : null),
    [sign, today],
  );

  // An editor-written horoscope (admin panel) for today overrides the generated one
  const loadHoroscope = useCallback(async () => {
    if (!sign) return;
    try {
      const { data } = await supabase
        .from("horoscopes")
        .select("*")
        .eq("sign", sign.key)
        .eq("for_date", today)
        .in("language", [lang, "en"]);
      setHoroscope(
        (data?.find((h) => h.language === lang) ??
          data?.[0] ??
          null) as Horoscope | null,
      );
    } catch {
      setHoroscope(null);
    }
  }, [sign?.key, lang, today]);

  useEffect(() => {
    void loadHoroscope();
  }, [loadHoroscope]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHoroscope();
    setRefreshing(false);
  }, [loadHoroscope]);

  const services: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
  }[] = [
    {
      icon: "🔮",
      title: "Ask Nakshtra Guru (AI)",
      subtitle: "Chat or speak — answers from your kundli",
      onPress: () => navigation.navigate("AstrologerChat"),
    },
    {
      icon: "💬",
      title: t("askExperts"),
      subtitle: "Free & fast-track answers",
      onPress: () =>
        navigation.navigate("Tabs", { screen: "Questions" } as never),
    },
    {
      icon: "📹",
      title: t("bookConsult"),
      subtitle: "1-to-1 video with experts",
      onPress: () =>
        navigation.navigate("Tabs", { screen: "Consult" } as never),
    },
    {
      icon: "🪔",
      title: t("kundli"),
      subtitle: t("kundliSubtitle"),
      onPress: () => navigation.navigate("Kundli"),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.brandRow}>
        <Image
          source={require("../../assets/branding/logo-small.png")}
          style={styles.brandLogo}
        />
        <Text style={styles.greeting}>
          🙏{" "}
          {profile?.full_name ? profile.full_name.split(" ")[0] : t("appName")}
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>{t("dailyHoroscope")}</Text>
        {sign ? (
          <>
            <View style={styles.signRow}>
              <Text style={styles.signSymbol}>{sign.symbol}</Text>
              <View>
                <Text style={styles.signName}>
                  {lang === "hi" ? sign.hi : sign.en}
                </Text>
                <Text style={styles.signMeta}>{sign.element}</Text>
              </View>
            </View>
            {horoscope?.content ? (
              <Text style={styles.horoscopeText}>{horoscope.content}</Text>
            ) : daily ? (
              <>
                <Text style={styles.dailyHeadline}>{daily.headline}</Text>
                <Text style={styles.horoscopeText}>{daily.text}</Text>
                <View style={styles.ratingGrid}>
                  {(
                    [
                      ["❤️ Love", daily.ratings.love],
                      ["💼 Career", daily.ratings.career],
                      ["💰 Money", daily.ratings.money],
                      ["🌿 Health", daily.ratings.health],
                    ] as [string, number][]
                  ).map(([label, n]) => (
                    <View key={label} style={styles.ratingItem}>
                      <Text style={styles.ratingLabel}>{label}</Text>
                      <Text style={styles.ratingStars}>
                        {"★".repeat(n)}
                        {"☆".repeat(5 - n)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.luckyLine}>
                  🎨 Lucky colour: {daily.luckyColour} · 🔢 Lucky number:{" "}
                  {daily.luckyNumber} · ⏰ Best time: {daily.luckyTime}
                </Text>
                <Text style={styles.luckyLine}>Mood: {daily.mood}</Text>
                <Text style={styles.basisNote}>
                  {moonIndex !== null
                    ? `Based on your Moon sign (${sign.en}) and today's planets.`
                    : `Based on your sun sign. Save your birth time and place in Profile for a Moon-sign forecast.`}
                </Text>
              </>
            ) : (
              <Text style={styles.horoscopeText}>{t("noHoroscopeToday")}</Text>
            )}
          </>
        ) : (
          <Text style={styles.horoscopeText}>{t("setDobPrompt")}</Text>
        )}
      </Card>

      <Text style={styles.sectionTitle}>{t("services")}</Text>
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
  content: {
    padding: spacing.md,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: "#fff",
  },
  greeting: { fontSize: 24, fontWeight: "700", color: colors.text },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  signRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  signSymbol: { fontSize: 40 },
  signName: { fontSize: 18, fontWeight: "600", color: colors.primary },
  signMeta: { color: colors.textMuted, fontSize: 13 },
  horoscopeText: { color: colors.text, lineHeight: 22 },
  dailyHeadline: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  ratingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  ratingItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.chipBg,
  },
  ratingLabel: { color: colors.textMuted, fontSize: 12 },
  ratingStars: { color: colors.primary, fontSize: 16, letterSpacing: 1 },
  luckyLine: { color: colors.text, fontSize: 13, marginTop: spacing.sm },
  basisNote: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  serviceCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  serviceIcon: { fontSize: 28 },
  serviceTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  serviceSubtitle: { color: colors.textMuted, fontSize: 13 },
  serviceArrow: { fontSize: 28, color: colors.textMuted },
});
