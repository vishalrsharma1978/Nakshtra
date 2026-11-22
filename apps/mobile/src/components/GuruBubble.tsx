import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  buildGuruContext,
  computeKundli,
  GURU_SUGGESTIONS,
  type BirthInput,
  type GuruContext,
} from "@nakshtra/shared";
import { useAuth } from "../context/AuthContext";
import {
  askGuru,
  loadGuruMode,
  saveGuruMode,
  type GuruMode,
} from "../lib/guruClient";
import { searchPlaces, timezoneOffsetMinutes } from "../lib/geocode";
import {
  canListen,
  speak,
  startListening,
  stopSpeaking,
  type Listener,
} from "../lib/voice";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import GuruAvatar, { type GuruState } from "./GuruAvatar";

interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Short plain-language version (shown first; read aloud) */
  simple?: string;
  suggestExpert?: boolean;
}

/** First couple of sentences, used when an answer has no dedicated simple version. */
function shorten(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const sentences = flat.match(/[^.!?]+[.!?]+/g) ?? [flat];
  return sentences.slice(0, 2).join(" ").trim();
}

const QUICK_QUESTIONS = GURU_SUGGESTIONS;

/**
 * Floating bottom-right chat bubble. Tapping it opens the meditating-guru panel:
 * the user speaks (or types) a question and the guru answers aloud and in text,
 * grounded in the user's kundli.
 */
export default function GuruBubble() {
  const { profile, session, lang } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: winW, height: winH } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [guruCtx, setGuruCtx] = useState<GuruContext | null>(null);
  const [mode, setMode] = useState<GuruMode>("builtin");
  const [kundliStatus, setKundliStatus] = useState<
    "loading" | "ready" | "missing"
  >("loading");
  const listener = useRef<Listener | null>(null);
  const scroller = useRef<React.ElementRef<typeof ScrollView>>(null);
  const micAvailable = canListen();

  useEffect(() => {
    void loadGuruMode().then(setMode);
  }, []);

  const toggleMode = () => {
    const next: GuruMode = mode === "builtin" ? "ai" : "builtin";
    setMode(next);
    void saveGuruMode(next);
  };

  // Build kundli context from the saved birth details
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.dob || !profile.birth_time || !profile.birth_place) {
        setKundliStatus("missing");
        return;
      }
      try {
        const place = (await searchPlaces(profile.birth_place))[0];
        if (!place) throw new Error("place not found");
        const time = profile.birth_time.slice(0, 5);
        const birth: BirthInput = {
          date: profile.dob,
          time,
          utcOffsetMinutes: timezoneOffsetMinutes(
            place.timezone,
            new Date(`${profile.dob}T${time}:00`),
          ),
          latitude: place.latitude,
          longitude: place.longitude,
        };
        const ctx = buildGuruContext(birth, computeKundli(birth), {
          name: profile.full_name ?? undefined,
        });
        if (!cancelled) {
          setGuruCtx(ctx);
          setKundliStatus("ready");
        }
      } catch {
        if (!cancelled) setKundliStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    profile?.dob,
    profile?.birth_time,
    profile?.birth_place,
    profile?.full_name,
  ]);

  /** Back to the common-questions screen */
  const goBack = () => {
    stopSpeaking();
    listener.current?.stop();
    setSpeaking(false);
    setListening(false);
    setTurns([]);
    setExpanded({});
    setInput("");
  };

  const close = () => {
    stopSpeaking();
    listener.current?.stop();
    setSpeaking(false);
    setListening(false);
    setOpen(false);
  };

  useEffect(
    () => () => {
      stopSpeaking();
      listener.current?.stop();
    },
    [],
  );

  const ask = useCallback(
    async (textRaw: string) => {
      const text = textRaw.trim();
      if (!text || busy || !session) return;
      stopSpeaking();
      setSpeaking(false);
      setInput("");
      const next: Turn[] = [
        ...turns,
        { id: `u${Date.now()}`, role: "user", content: text },
      ];
      setTurns(next);
      setBusy(true);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
      try {
        const answer = await askGuru({
          question: text,
          history: next
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.content })),
          ctx: guruCtx,
          lang,
          mode,
        });
        const reply: Turn = {
          id: `a${Date.now()}`,
          role: "assistant",
          content: answer.text,
          simple: answer.simple ?? shorten(answer.text),
          suggestExpert: answer.suggestExpert,
        };
        setTurns((prev) => [...prev, reply]);
        if (!muted) {
          setSpeaking(true);
          // Speak only the short, simple version
          speak(reply.simple ?? reply.content, lang, () => setSpeaking(false));
        }
      } catch (e) {
        setTurns((prev) => [
          ...prev,
          {
            id: `e${Date.now()}`,
            role: "assistant",
            content:
              e instanceof Error
                ? e.message
                : "The guru is unavailable right now. Please try again.",
          },
        ]);
      } finally {
        setBusy(false);
        setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
      }
    },
    [turns, busy, session, guruCtx, lang, muted, mode],
  );

  const toggleMic = () => {
    if (listening) {
      listener.current?.stop();
      return;
    }
    stopSpeaking();
    setSpeaking(false);
    setListening(true);
    listener.current = startListening(lang, {
      onText: (text, isFinal) => {
        setInput(text);
        if (isFinal) {
          setListening(false);
          void ask(text);
        }
      },
      onEnd: () => setListening(false),
      onError: (message) => {
        setListening(false);
        setTurns((prev) => [
          ...prev,
          { id: `e${Date.now()}`, role: "assistant", content: message },
        ]);
      },
    });
    if (!listener.current) setListening(false);
  };

  const avatarState: GuruState = listening
    ? "listening"
    : busy
      ? "thinking"
      : speaking
        ? "speaking"
        : "idle";

  const statusText =
    avatarState === "listening"
      ? "Listening… speak your question"
      : avatarState === "thinking"
        ? "Meditating on your chart…"
        : avatarState === "speaking"
          ? "Speaking…"
          : kundliStatus === "ready"
            ? mode === "ai"
              ? "AI mode — ask me anything about your kundli"
              : "Ask me anything about your kundli"
            : kundliStatus === "loading"
              ? "Reading your kundli…"
              : "Add birth details in Profile for personal answers";

  // Hide the bubble when signed out
  if (!session) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {open && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.panel,
            {
              // Always fit inside the window (leave room for the bubble + tab bar)
              width: Math.min(360, winW - 24),
              height: Math.max(320, Math.min(560, winH - 200)),
            },
          ]}
        >
          <View style={styles.panelHeader}>
            {turns.length > 0 ? (
              <Pressable
                onPress={goBack}
                accessibilityLabel="Back to common questions"
                style={styles.backBtn}
              >
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
            ) : (
              <Text style={styles.panelTitle}>🕉️ Nakshtra Guru</Text>
            )}
            <View
              style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
            >
              <Pressable
                onPress={toggleMode}
                accessibilityLabel="Switch between built-in guru and AI mode"
                style={[styles.modePill, mode === "ai" && styles.modePillAi]}
              >
                <Text style={styles.modePillText}>
                  {mode === "ai" ? "AI" : "Built-in"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!muted) {
                    stopSpeaking();
                    setSpeaking(false);
                  }
                  setMuted((m) => !m);
                }}
                accessibilityLabel="Toggle guru voice"
              >
                <Text style={styles.headerIcon}>{muted ? "🔇" : "🔊"}</Text>
              </Pressable>
              <Pressable onPress={close} accessibilityLabel="Close guru">
                <Text style={styles.headerIcon}>✕</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.avatarWrap}>
            <GuruAvatar
              state={avatarState}
              size={turns.length === 0 ? 110 : 64}
            />
            <Text style={styles.status}>{statusText}</Text>
          </View>

          <ScrollView
            ref={scroller}
            style={styles.transcript}
            contentContainerStyle={{ padding: spacing.sm }}
          >
            {turns.length === 0 && (
              <View>
                {QUICK_QUESTIONS.map((q) => (
                  <Pressable
                    key={q}
                    style={styles.quick}
                    onPress={() => void ask(q)}
                  >
                    <Text style={styles.quickText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {turns.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.bubble,
                  t.role === "user" ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    t.role === "user" && { color: colors.onPrimary },
                  ]}
                >
                  {t.role === "assistant" && t.simple && !expanded[t.id]
                    ? t.simple
                    : t.content}
                </Text>
                {t.role === "assistant" &&
                  t.simple &&
                  t.simple !== t.content && (
                    <Pressable
                      onPress={() =>
                        setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))
                      }
                    >
                      <Text style={styles.moreText}>
                        {expanded[t.id] ? "Show less ▲" : "More detail ▼"}
                      </Text>
                    </Pressable>
                  )}
                {t.suggestExpert && (
                  <Pressable
                    style={styles.expertBtn}
                    onPress={() => {
                      close();
                      navigation.navigate("Tabs", {
                        screen: "Consult",
                      } as never);
                    }}
                  >
                    <Text style={styles.expertBtnText}>
                      📅 Book an appointment with our expert
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
            {busy && (
              <ActivityIndicator color={colors.primary} style={{ margin: 8 }} />
            )}
          </ScrollView>

          <View style={styles.inputBar}>
            {micAvailable && (
              <Pressable
                onPress={toggleMic}
                style={[styles.micBtn, listening && styles.micBtnActive]}
                accessibilityLabel="Speak your question"
              >
                <Text style={styles.micIcon}>{listening ? "⏺" : "🎤"}</Text>
              </Pressable>
            )}
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={listening ? "Listening…" : "Type or tap 🎤 to speak"}
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => void ask(input)}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => void ask(input)}
              disabled={busy || !input.trim()}
              style={[
                styles.sendBtn,
                (busy || !input.trim()) && { opacity: 0.4 },
              ]}
            >
              <Text style={styles.sendText}>➤</Text>
            </Pressable>
          </View>
          {!micAvailable && (
            <Text style={styles.hint}>
              Voice input works in Chrome/Edge. On phones, use the keyboard's
              mic key.
            </Text>
          )}
        </KeyboardAvoidingView>
      )}

      <Pressable
        onPress={() => (open ? close() : setOpen(true))}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
        accessibilityLabel="Open Nakshtra Guru chat"
      >
        {open ? (
          <Text style={styles.fabClose}>✕</Text>
        ) : (
          <>
            <Image
              source={require("../../assets/branding/guru-outline.png")}
              resizeMode="contain"
              style={styles.fabImage}
            />
            <Text style={styles.fabLabel}>Let's Talk</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    right: 16,
    bottom: 84,
    alignItems: "flex-end",
    zIndex: 1000,
  },
  // No circle or fill: the guru's outline itself is the button.
  fab: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    minHeight: 48,
  },
  fabImage: { width: 92, height: 168 },
  fabLabel: {
    marginTop: 2,
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "#000",
    textShadowRadius: 6,
  },
  fabClose: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: "700",
    textShadowColor: "#000",
    textShadowRadius: 6,
  },
  panel: {
    width: 340,
    maxWidth: "100%",
    backgroundColor: "#0b0b0b",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  panelTitle: { color: colors.primary, fontSize: 16, fontWeight: "700" },
  backBtn: { paddingVertical: 2, paddingRight: 8 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  moreText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  headerIcon: { color: colors.text, fontSize: 18 },
  modePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.chipBg,
  },
  modePillAi: { backgroundColor: "#311b4a", borderColor: "#ce93d8" },
  modePillText: { color: colors.primaryDark, fontSize: 11, fontWeight: "700" },
  avatarWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  status: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  transcript: { flex: 1 },
  quick: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: colors.chipBg,
  },
  quickText: { color: colors.primaryDark, fontSize: 13 },
  bubble: { maxWidth: "92%", borderRadius: 14, padding: 10, marginBottom: 6 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleBot: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  expertBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  expertBtnText: {
    color: colors.onPrimary,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 13,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: { backgroundColor: "#1b5e20", borderColor: "#4caf50" },
  micIcon: { fontSize: 20 },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  hint: {
    color: colors.textMuted,
    fontSize: 10.5,
    textAlign: "center",
    paddingBottom: 6,
  },
});
