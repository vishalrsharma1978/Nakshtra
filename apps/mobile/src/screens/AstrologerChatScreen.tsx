import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  computeKundli,
  summarizeKundliForAi,
  type BirthInput,
} from "@nakshtra/shared";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
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

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestExpert?: boolean;
}

const SUGGESTIONS = [
  "What does my kundli say about my career?",
  "How is my current dasha period?",
  "When is a good time for marriage?",
  "What remedies should I follow?",
];

export default function AstrologerChatScreen() {
  const { profile, session, lang } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [kundliText, setKundliText] = useState<string | null>(null);
  const [kundliStatus, setKundliStatus] = useState<
    "loading" | "ready" | "missing"
  >("loading");
  const listRef = useRef<FlatList<Msg>>(null);
  const listener = useRef<Listener | null>(null);

  // Build the AI's kundli context from the saved birth details on the profile.
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
        const offset = timezoneOffsetMinutes(
          place.timezone,
          new Date(`${profile.dob}T${time}:00`),
        );
        const birth: BirthInput = {
          date: profile.dob,
          time,
          utcOffsetMinutes: offset,
          latitude: place.latitude,
          longitude: place.longitude,
        };
        const k = computeKundli(birth);
        const text = summarizeKundliForAi(birth, k, {
          name: profile.full_name ?? undefined,
          place: profile.birth_place,
        });
        if (!cancelled) {
          setKundliText(text);
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

  // Load previous conversation
  useEffect(() => {
    if (!session) return;
    void supabase
      .from("ai_chat_messages")
      .select("id, role, content, suggest_expert")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(60)
      .then(({ data }) => {
        if (data?.length) {
          setMessages(
            data.map((m) => ({
              id: m.id as string,
              role: m.role as "user" | "assistant",
              content: m.content as string,
              suggestExpert: m.suggest_expert as boolean,
            })),
          );
        }
      });
  }, [session]);

  useEffect(
    () => () => {
      stopSpeaking();
      listener.current?.stop();
    },
    [],
  );

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);

  const send = useCallback(
    async (textRaw?: string) => {
      const text = (textRaw ?? input).trim();
      if (!text || busy) return;
      stopSpeaking();
      setSpeakingId(null);
      setInput("");
      const userMsg: Msg = {
        id: `u${Date.now()}`,
        role: "user",
        content: text,
      };
      const next = [...messages, userMsg];
      setMessages(next);
      setBusy(true);
      scrollToEnd();
      try {
        const { data, error } = await supabase.functions.invoke(
          "ai-astrologer",
          {
            body: {
              messages: next
                .slice(-14)
                .map((m) => ({ role: m.role, content: m.content })),
              kundli: kundliText ?? "",
              language: lang,
            },
          },
        );
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        const botMsg: Msg = {
          id: `a${Date.now()}`,
          role: "assistant",
          content: data.reply as string,
          suggestExpert: Boolean(data.suggestExpert),
        };
        setMessages((prev) => [...prev, botMsg]);
        if (voiceReplies) {
          setSpeakingId(botMsg.id);
          speak(botMsg.content, lang, () => setSpeakingId(null));
        }
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e${Date.now()}`,
            role: "assistant",
            content:
              e instanceof Error
                ? e.message
                : "Something went wrong. Please try again.",
          },
        ]);
      } finally {
        setBusy(false);
        scrollToEnd();
      }
    },
    [input, busy, messages, kundliText, lang, voiceReplies],
  );

  const toggleMic = () => {
    if (listening) {
      listener.current?.stop();
      return;
    }
    stopSpeaking();
    setSpeakingId(null);
    setListening(true);
    listener.current = startListening(lang, {
      onText: (text, isFinal) => {
        setInput(text);
        if (isFinal) {
          setListening(false);
          void send(text);
        }
      },
      onEnd: () => setListening(false),
      onError: (message) => {
        setListening(false);
        setMessages((prev) => [
          ...prev,
          { id: `e${Date.now()}`, role: "assistant", content: message },
        ]);
      },
    });
    if (!listener.current) setListening(false);
  };

  const toggleSpeak = (m: Msg) => {
    if (speakingId === m.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(m.id);
      speak(m.content, lang, () => setSpeakingId(null));
    }
  };

  const micAvailable = useMemo(() => canListen(), []);

  const header = (
    <View>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>🔮 Nakshtra Guru</Text>
        <Text style={styles.bannerText}>
          {kundliStatus === "loading"
            ? "Reading your kundli…"
            : kundliStatus === "ready"
              ? "I have studied your kundli — all divisional charts, dashas, ashtakavarga and transits. Ask me anything."
              : "Add your date, time and place of birth in Profile so I can read your kundli. You can still ask general questions."}
        </Text>
      </View>
      {messages.length === 0 && (
        <View style={styles.suggestWrap}>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              style={styles.suggestChip}
              onPress={() => void send(s)}
            >
              <Text style={styles.suggestText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={[styles.row, item.role === "user" && styles.rowUser]}>
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text
                style={[
                  styles.msgText,
                  item.role === "user" && styles.msgTextUser,
                ]}
              >
                {item.content}
              </Text>
              {item.role === "assistant" && (
                <Pressable
                  onPress={() => toggleSpeak(item)}
                  style={styles.speakBtn}
                >
                  <Text style={styles.speakText}>
                    {speakingId === item.id ? "⏹ Stop" : "🔊 Listen"}
                  </Text>
                </Pressable>
              )}
              {item.suggestExpert && (
                <Pressable
                  style={styles.expertBtn}
                  onPress={() =>
                    navigation.navigate("Tabs", { screen: "Consult" } as never)
                  }
                >
                  <Text style={styles.expertBtnText}>
                    📅 Book an appointment with our expert
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <View style={[styles.row]}>
              <View style={[styles.bubble, styles.bubbleBot]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            </View>
          ) : undefined
        }
      />

      <View style={styles.inputBar}>
        <Pressable
          onPress={() => {
            if (voiceReplies) stopSpeaking();
            setVoiceReplies((v) => !v);
          }}
          style={[styles.iconBtn, voiceReplies && styles.iconBtnActive]}
          accessibilityLabel="Toggle spoken replies"
        >
          <Text style={styles.iconText}>{voiceReplies ? "🔊" : "🔇"}</Text>
        </Pressable>
        {micAvailable && (
          <Pressable
            onPress={toggleMic}
            style={[styles.iconBtn, listening && styles.iconBtnActive]}
            accessibilityLabel="Speak your question"
          >
            <Text style={styles.iconText}>{listening ? "⏺" : "🎤"}</Text>
          </Pressable>
        )}
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={listening ? "Listening…" : "Ask about your kundli…"}
          placeholderTextColor={colors.textMuted}
          multiline
          onSubmitEditing={() => void send()}
          blurOnSubmit
        />
        <Pressable
          onPress={() => void send()}
          disabled={busy || !input.trim()}
          style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.4 }]}
        >
          <Text style={styles.sendText}>➤</Text>
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>
        AI guidance for reflection only — not medical, legal or financial
        advice.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: {
    padding: spacing.md,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  banner: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  bannerText: { color: colors.textMuted, lineHeight: 20 },
  suggestWrap: { marginBottom: spacing.md },
  suggestChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.chipBg,
  },
  suggestText: { color: colors.primaryDark },
  row: { flexDirection: "row", marginBottom: spacing.sm },
  rowUser: { justifyContent: "flex-end" },
  bubble: { maxWidth: "86%", borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleBot: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  msgText: { color: colors.text, lineHeight: 21, fontSize: 15 },
  msgTextUser: { color: colors.onPrimary },
  speakBtn: { marginTop: 8, alignSelf: "flex-start" },
  speakText: { color: colors.primaryDark, fontSize: 13 },
  expertBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  expertBtnText: {
    color: colors.onPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.card,
    fontSize: 15,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  iconBtnActive: { backgroundColor: colors.chipBg, borderWidth: 2 },
  iconText: { fontSize: 18 },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 10.5,
    textAlign: "center",
    paddingBottom: 6,
    backgroundColor: colors.bg,
  },
});
