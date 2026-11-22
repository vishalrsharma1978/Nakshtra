import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useRoute,
  type RouteProp,
  useNavigation,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  slaRemainingLabel,
  type Question,
  type QuestionMessage,
} from "@nakshtra/shared";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Loading } from "../components/ui";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

export default function QuestionDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "QuestionDetail">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { questionId } = route.params;
  const { session, t } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [messages, setMessages] = useState<QuestionMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const [{ data: q }, { data: msgs }] = await Promise.all([
      supabase.from("questions").select("*").eq("id", questionId).single(),
      supabase
        .from("question_messages")
        .select("*")
        .eq("question_id", questionId)
        .order("created_at", { ascending: true }),
    ]);
    if (q) setQuestion(q as Question);
    setMessages((msgs ?? []) as QuestionMessage[]);
  }, [questionId]);

  useEffect(() => {
    void load();
    // Realtime: new messages in this thread
    const channel = supabase
      .channel(`question-${questionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "question_messages",
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as QuestionMessage).id)
              ? prev
              : [...prev, payload.new as QuestionMessage],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "questions",
          filter: `id=eq.${questionId}`,
        },
        (payload) => setQuestion(payload.new as Question),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [questionId, load]);

  const send = async () => {
    if (!session || !draft.trim()) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { data, error } = await supabase
      .from("question_messages")
      .insert({ question_id: questionId, sender_id: session.user.id, body })
      .select("*")
      .single();
    if (!error && data) {
      setMessages((prev) =>
        prev.some((m) => m.id === data.id)
          ? prev
          : [...prev, data as QuestionMessage],
      );
    }
    setSending(false);
  };

  if (!question) return <Loading />;

  const isMine = (m: QuestionMessage) => m.sender_id === session?.user.id;
  const canUpgrade =
    question.tier === "free" &&
    (question.status === "open" || question.status === "assigned");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>{question.title}</Text>
        <Text style={styles.meta}>
          {question.tier === "paid" ? `⚡ ${t("paidTier")}` : t("freeTier")} ·{" "}
          {question.status === "answered" || question.status === "closed"
            ? t("replied")
            : `${t("slaDue")}: ${slaRemainingLabel(question.sla_due_at)}`}
        </Text>
        {canUpgrade && (
          <Pressable
            style={styles.upgradeBtn}
            onPress={() =>
              navigation.navigate("Payment", {
                purpose: "question_fast_track",
                refId: question.id,
              })
            }
          >
            <Text style={styles.upgradeText}>⚡ {t("paidTier")} →</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={[
          {
            id: "q",
            question_id: questionId,
            sender_id: question.user_id,
            body: question.body,
            created_at: question.created_at,
          } as QuestionMessage,
          ...messages,
        ]}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              isMine(item) ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text
              style={isMine(item) ? styles.bubbleTextMine : styles.bubbleText}
            >
              {item.body}
            </Text>
            <Text style={[styles.time, isMine(item) && styles.timeMine]}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder={t("typeMessage")}
          placeholderTextColor={colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={styles.sendBtn}
          onPress={send}
          disabled={sending || !draft.trim()}
        >
          <Text style={styles.sendText}>{t("send")}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  upgradeBtn: { marginTop: spacing.sm, alignSelf: "flex-start" },
  upgradeText: { color: colors.accent, fontWeight: "700" },
  messages: {
    padding: spacing.md,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  bubble: {
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    maxWidth: "85%",
  },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: "flex-end" },
  bubbleTheirs: {
    backgroundColor: colors.card,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { color: colors.text, lineHeight: 20 },
  bubbleTextMine: { color: colors.onPrimary, lineHeight: 20 },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  timeMine: { color: "#3a2a00" },
  composer: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxHeight: 120,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sendText: { color: colors.onPrimary, fontWeight: "600" },
});
