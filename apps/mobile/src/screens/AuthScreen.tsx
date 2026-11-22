import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Button, Input, Screen } from "../components/ui";
import { colors, spacing } from "../theme";

function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Nakshtra", message);
}

export default function AuthScreen() {
  const { t } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      notify("Please enter email and password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        notify(
          "Account created! If email confirmation is enabled, check your inbox.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.wrap}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../assets/branding/logo-small.png")}
            style={styles.logoImage}
          />
          <Text style={styles.logo}>{t("appName")}</Text>
          <Text style={styles.tagline}>
            Astrology · Remedies · Expert Guidance
          </Text>

          {mode === "signup" && (
            <Input
              label={t("fullName")}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          )}
          <Input
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label={t("password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title={mode === "signin" ? t("signIn") : t("signUp")}
            onPress={submit}
            loading={busy}
            style={{ marginTop: spacing.sm }}
          />

          <Pressable
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            accessibilityRole="link"
          >
            <Text style={styles.switchText}>
              {mode === "signin" ? t("noAccount") : t("haveAccount")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: "center" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  logoImage: {
    width: 110,
    height: 110,
    alignSelf: "center",
    marginBottom: spacing.sm,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: "#fff",
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
  },
  tagline: {
    textAlign: "center",
    color: colors.textMuted,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  switchText: {
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
