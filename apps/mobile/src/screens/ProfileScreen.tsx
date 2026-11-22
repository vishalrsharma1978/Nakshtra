import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getSunSign, validateBirthDate, type Language } from "@nakshtra/shared";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { searchPlaces } from "../lib/geocode";
import { Button, Card, Chip, Input } from "../components/ui";
import {
  DatePickerField,
  PlaceAutocomplete,
  TimePickerField,
} from "../components/pickers";
import { colors, spacing } from "../theme";

function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Nakshtra", message);
}

export default function ProfileScreen() {
  const { session, profile, t, lang, setLanguage, refreshProfile, signOut } =
    useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [dob, setDob] = useState(profile?.dob ?? "");
  const [birthTime, setBirthTime] = useState(
    profile?.birth_time?.slice(0, 5) ?? "",
  );
  const [birthPlace, setBirthPlace] = useState(profile?.birth_place ?? "");
  const [placeConfirmed, setPlaceConfirmed] = useState(
    Boolean(profile?.birth_place),
  );
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{
    dob?: string;
    place?: string;
    phone?: string;
  }>({});

  // Profile may finish loading after the first render
  useEffect(() => {
    if (!profile) return;
    setFullName((v) => v || (profile.full_name ?? ""));
    setPhone((v) => v || (profile.phone ?? ""));
    setDob((v) => v || (profile.dob ?? ""));
    setBirthTime((v) => v || (profile.birth_time?.slice(0, 5) ?? ""));
    setBirthPlace((v) => {
      if (!v && profile.birth_place) setPlaceConfirmed(true);
      return v || (profile.birth_place ?? "");
    });
  }, [profile]);

  const save = async () => {
    if (!session) return;
    const next: typeof errors = {};

    if (dob) {
      const dobError = validateBirthDate(dob);
      if (dobError) next.dob = dobError;
    }
    const digits = phone.replace(/\D/g, "");
    if (phone && (digits.length < 10 || digits.length > 15)) {
      next.phone = "Enter a valid phone number (10–15 digits).";
    }
    // A typed-but-unconfirmed place cannot be used for the kundli: verify it resolves.
    if (birthPlace.trim() && !placeConfirmed) {
      try {
        const match = (await searchPlaces(birthPlace.trim()))[0];
        if (!match)
          next.place = "Place not found. Pick a city from the suggestions.";
        else setPlaceConfirmed(true);
      } catch {
        // Offline: keep the text; it will be geocoded again when the kundli is generated.
      }
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const sign = dob ? getSunSign(dob) : null;
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          dob: dob || null,
          birth_time: birthTime ? `${birthTime}:00` : null,
          birth_place: birthPlace.trim() || null,
          zodiac_sign: sign?.key ?? null,
        })
        .eq("id", session.user.id);
      if (error) throw error;
      await refreshProfile();
      notify("Profile saved!");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  const sunSign = dob && !errors.dob ? getSunSign(dob) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Text style={styles.email}>{profile?.email}</Text>
        <Input
          label={t("fullName")}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
        />
        <Input
          label={t("phone")}
          value={phone}
          onChangeText={(v) => {
            setPhone(v.replace(/[^\d+\-\s()]/g, ""));
            if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
          }}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="+91 98765 43210"
        />
        {errors.phone ? <Text style={styles.error}>{errors.phone}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("birthDetails")}</Text>
        <Text style={styles.hint}>
          Used to build your kundli and to let the guru answer personally. Pick
          the exact date, time and city of birth.
        </Text>

        <DatePickerField
          label={t("dob")}
          value={dob}
          onChange={(v) => {
            setDob(v);
            setErrors((e) => ({ ...e, dob: undefined }));
          }}
          placeholder="Select your date of birth"
          error={errors.dob}
        />
        {sunSign ? (
          <Text style={styles.sunSign}>
            {sunSign.symbol} Sun sign: {lang === "hi" ? sunSign.hi : sunSign.en}
          </Text>
        ) : null}

        <TimePickerField
          label={t("birthTime")}
          value={birthTime}
          onChange={setBirthTime}
          placeholder="Select your time of birth"
        />
        <Text style={styles.tip}>
          Not sure of the time? Check your birth certificate or ask family —
          even a few minutes can change the Lagna.
        </Text>

        <PlaceAutocomplete
          label={t("birthPlace")}
          value={birthPlace}
          onChangeText={(v) => {
            setBirthPlace(v);
            setPlaceConfirmed(false);
            if (errors.place) setErrors((e) => ({ ...e, place: undefined }));
          }}
          onSelect={() => setPlaceConfirmed(true)}
          error={errors.place}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("language")}</Text>
        <View style={styles.chips}>
          {(["en", "hi"] as Language[]).map((l) => (
            <Chip
              key={l}
              label={l === "en" ? "English" : "हिन्दी"}
              active={lang === l}
              onPress={() => void setLanguage(l)}
            />
          ))}
        </View>
      </Card>

      <Button title={t("save")} onPress={save} loading={busy} />
      <Button
        title={t("signOut")}
        variant="outline"
        onPress={() => void signOut()}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  email: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 13 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  tip: {
    color: colors.textMuted,
    fontSize: 11.5,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  sunSign: {
    color: colors.primaryDark,
    fontSize: 13,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
