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
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Button, Input, Screen } from "../components/ui";
import { colors, spacing } from "../theme";

function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Nakshtra", message);
}

type Method = "email" | "phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Turns a phone entry into E.164 (+<country><number>). A bare 10-digit number
 * is treated as Indian (+91). Returns null when it cannot be a valid number.
 */
function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    const n = digits.slice(1).replace(/\D/g, "");
    return n.length >= 10 && n.length <= 15 ? `+${n}` : null;
  }
  const n = digits.replace(/\D/g, "");
  if (n.length === 10) return `+91${n}`;
  if (n.length === 12 && n.startsWith("91")) return `+${n}`;
  if (n.length >= 11 && n.length <= 15) return `+${n}`;
  return null;
}

/** Plain-language messages for the errors users actually hit. */
function friendlyAuthError(e: unknown, method: Method): string {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const m = msg.toLowerCase();
  if (
    m.includes("rate limit") ||
    m.includes("too many") ||
    m.includes("over_email_send_rate_limit")
  ) {
    return "Too many sign-up emails were sent just now. Please wait a few minutes and try again, or use your phone number instead.";
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user_already_exists")
  ) {
    return "This account already exists. Please sign in instead.";
  }
  if (m.includes("invalid login") || m.includes("invalid_credentials")) {
    return "Wrong email/phone or password. Please try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox (and spam folder) for the link.";
  }
  if (m.includes("password") && m.includes("least")) {
    return "Your password is too short. Please use at least 6 characters.";
  }
  if (
    m.includes("phone") &&
    (m.includes("provider") ||
      m.includes("unsupported") ||
      m.includes("disabled"))
  ) {
    return "Phone sign-up is not switched on yet. Please use your email for now.";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "New sign-ups are switched off right now. Please contact support.";
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Cannot reach the server. Please check your internet connection and try again.";
  }
  return (
    msg ||
    (method === "email"
      ? "Could not use that email."
      : "Could not use that phone number.")
  );
}

export default function AuthScreen() {
  const { t } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password) {
      notify("Please enter your password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      notify("Your password is too short. Please use at least 6 characters.");
      return;
    }

    let credentials: { email: string } | { phone: string };
    if (method === "email") {
      const e = email.trim().toLowerCase();
      if (!EMAIL_RE.test(e)) {
        notify("Please enter a valid email address.");
        return;
      }
      credentials = { email: e };
    } else {
      const p = toE164(phone);
      if (!p) {
        notify(
          "Please enter a valid phone number (10 digits, or with country code like +91...).",
        );
        return;
      }
      credentials = { phone: p };
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        // 1) Normal sign-up. With "Confirm email" switched off in Supabase this
        //    creates the account and signs the user in at once, with no email sent.
        const { data: su, error: suError } = await supabase.auth.signUp({
          ...credentials,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (!suError) {
          if (su.session) return; // signed in, done
          // Confirmation still required by the project: try the server-side route
        }

        // 2) Fallback: the register-user function creates an already-confirmed
        //    account on the server (used when sign-up email is rate limited or
        //    confirmation is required).
        const needsFallback =
          !!suError &&
          /rate limit|too many|confirm|captcha/i.test(suError.message);
        if (suError && !needsFallback) throw suError;

        const { data: reg, error: regError } = await supabase.functions.invoke(
          "register-user",
          { body: { ...credentials, password, full_name: fullName.trim() } },
        );
        if (regError) {
          let serverMsg: string | undefined;
          try {
            const ctx = (regError as { context?: Response }).context;
            serverMsg = ctx ? (await ctx.json()).error : undefined;
          } catch {
            /* fall through to the generic message */
          }
          throw new Error(serverMsg ?? regError.message);
        }
        if (reg?.error) throw new Error(reg.error);
        const { error: signInError } = await supabase.auth.signInWithPassword({
          ...credentials,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          ...credentials,
          password,
        });
        if (error) throw error;
      }
    } catch (e) {
      notify(friendlyAuthError(e, method));
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

          <View style={styles.methodRow}>
            {(["email", "phone"] as Method[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMethod(m)}
                style={[styles.methodTab, method === m && styles.methodTabOn]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.methodText,
                    method === m && styles.methodTextOn,
                  ]}
                >
                  {m === "email" ? "Email" : "Phone"}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === "signup" && (
            <Input
              label={t("fullName")}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          )}
          {method === "email" ? (
            <Input
              label={t("email")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          ) : (
            <Input
              label={t("phone")}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^\d+\-\s()]/g, ""))}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="e.g. 9876543210 or +91 9876543210"
            />
          )}
          <Input
            label={t("password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType={mode === "signin" ? "go" : "done"}
            onSubmitEditing={() => {
              if (!busy) void submit();
            }}
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
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  methodRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  methodTabOn: { backgroundColor: colors.primary },
  methodText: { color: colors.textMuted, fontWeight: "600" },
  methodTextOn: { color: colors.onPrimary },
  switchText: {
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
