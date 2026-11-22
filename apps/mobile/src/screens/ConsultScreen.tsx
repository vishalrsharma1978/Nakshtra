import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Consultation, Expert } from "@nakshtra/shared";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Card, Chip, Loading } from "../components/ui";
import { colors, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type ConsultWithExpert = Consultation & {
  experts: { display_name: string } | null;
};

export default function ConsultScreen() {
  const { session, t } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [view, setView] = useState<"experts" | "bookings">("experts");
  const [experts, setExperts] = useState<Expert[] | null>(null);
  const [bookings, setBookings] = useState<ConsultWithExpert[] | null>(null);

  const load = useCallback(async () => {
    const [{ data: ex }, { data: bk }] = await Promise.all([
      supabase
        .from("experts")
        .select("*")
        .eq("is_active", true)
        .order("experience_years", { ascending: false }),
      session
        ? supabase
            .from("consultations")
            .select("*, experts(display_name)")
            .eq("user_id", session.user.id)
            .order("scheduled_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    setExperts((ex ?? []) as Expert[]);
    setBookings((bk ?? []) as ConsultWithExpert[]);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (experts === null) return <Loading />;

  const canJoin = (c: Consultation) => {
    if (c.status !== "booked") return false;
    const start = new Date(c.scheduled_at).getTime();
    const end = start + c.duration_min * 60_000;
    const now = Date.now();
    return now >= start - 10 * 60_000 && now <= end + 30 * 60_000;
  };

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <Chip
          label={t("ourExperts")}
          active={view === "experts"}
          onPress={() => setView("experts")}
        />
        <Chip
          label={t("myConsultations")}
          active={view === "bookings"}
          onPress={() => setView("bookings")}
        />
      </View>

      {view === "experts" ? (
        <FlatList
          data={experts}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Card>
              <Text style={styles.empty}>No experts available right now.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("ExpertDetail", { expertId: item.id })
              }
            >
              <Card style={styles.expertCard}>
                {item.photo_url ? (
                  <Image
                    source={{ uri: item.photo_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {item.display_name.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.display_name}</Text>
                  <Text style={styles.specialties}>
                    {item.specialties.join(" · ")}
                  </Text>
                  <Text style={styles.meta}>
                    {item.experience_years} {t("experienceYears")} · ₹
                    {item.consult_rate_inr} {t("perSession")}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Card>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={bookings ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Card>
              <Text style={styles.empty}>No consultations booked yet.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.name}>
                {item.experts?.display_name ?? "Expert"}
              </Text>
              <Text style={styles.meta}>
                {new Date(item.scheduled_at).toLocaleString()} ·{" "}
                {item.duration_min} min · ₹{item.amount_inr}
              </Text>
              <Text
                style={[
                  styles.status,
                  item.status === "booked" && { color: colors.success },
                ]}
              >
                {item.status.replace("_", " ")}
              </Text>
              {item.status === "pending_payment" && (
                <Pressable
                  style={styles.actionBtn}
                  onPress={() =>
                    navigation.navigate("Payment", {
                      purpose: "consultation",
                      refId: item.id,
                    })
                  }
                >
                  <Text style={styles.actionText}>{t("payNow")}</Text>
                </Pressable>
              )}
              {canJoin(item) && (
                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.success },
                  ]}
                  onPress={() =>
                    navigation.navigate("VideoCall", {
                      room: item.jitsi_room,
                      title: item.experts?.display_name,
                    })
                  }
                >
                  <Text style={styles.actionText}>📹 {t("joinCall")}</Text>
                </Pressable>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  segment: {
    flexDirection: "row",
    padding: spacing.md,
    paddingBottom: 0,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  list: {
    padding: spacing.md,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  empty: { color: colors.textMuted, textAlign: "center" },
  expertCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 24, fontWeight: "700", color: colors.primary },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  specialties: {
    color: colors.primary,
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  arrow: { fontSize: 28, color: colors.textMuted },
  status: {
    marginTop: spacing.sm,
    fontWeight: "600",
    color: colors.accent,
    textTransform: "capitalize",
  },
  actionBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionText: { color: colors.onPrimary, fontWeight: "600" },
});
