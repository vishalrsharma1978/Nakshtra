// Smart birth-detail pickers built from plain React Native views, so they look and
// behave the same on web, iOS and Android with no native picker dependency.
//   - DatePickerField: tap -> modal with Day / Month / Year wheels. Day count adapts to
//     the month/year (leap years handled); future dates are blocked for birth dates.
//   - TimePickerField: tap -> modal with Hour / Minute / AM-PM wheels and a quick
//     "now"/"noon"/"midnight" shortcut; stores 24h "HH:MM".
//   - PlaceAutocomplete: type a city and pick from live suggestions (Open-Meteo).

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  MONTH_NAMES,
  clampDate,
  daysInMonth,
  displayDate,
  displayTime,
  formatDate,
  formatTime,
  from12h,
  parseDate,
  parseTime,
  to12h,
  yearRange,
  type DateParts,
  type Time12,
} from "@nakshtra/shared";
import { searchPlaces, type GeoPlace } from "../lib/geocode";
import { colors, spacing } from "../theme";

// ------------------------------------------------------------------ shared bits

function FieldShell({
  label,
  value,
  placeholder,
  icon,
  onPress,
  error,
}: {
  label?: string;
  value: string;
  placeholder: string;
  icon: string;
  onPress: () => void;
  error?: string | null;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={onPress}
        style={[styles.field, error ? styles.fieldError : null]}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
      >
        <Text style={value ? styles.fieldValue : styles.fieldPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.fieldIcon}>{icon}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const ITEM_H = 44;

/** A scrolling list of options with the selected one highlighted and auto-scrolled into view. */
function Wheel<T extends string | number>({
  items,
  selected,
  onSelect,
  format = String,
  disabled,
  width,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  format?: (v: T) => string;
  disabled?: (v: T) => boolean;
  width?: number;
}) {
  const ref = useRef<React.ElementRef<typeof ScrollView>>(null);
  useEffect(() => {
    const i = Math.max(0, items.indexOf(selected));
    const t = setTimeout(
      () =>
        ref.current?.scrollTo({
          y: Math.max(0, i - 2) * ITEM_H,
          animated: false,
        }),
      30,
    );
    return () => clearTimeout(t);
    // Only re-centre when the list itself changes (e.g. month length), not on every tap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <ScrollView
      ref={ref}
      style={[styles.wheel, width ? { width } : { flex: 1 }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {items.map((it) => {
        const active = it === selected;
        const off = disabled?.(it) ?? false;
        return (
          <Pressable
            key={String(it)}
            disabled={off}
            onPress={() => onSelect(it)}
            style={[styles.wheelItem, active && styles.wheelItemActive]}
          >
            <Text
              style={[
                styles.wheelText,
                active && styles.wheelTextActive,
                off && styles.wheelTextOff,
              ]}
            >
              {format(it)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  onDone,
  doneLabel = "Done",
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDone: () => void;
  doneLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
          <View style={styles.sheetActions}>
            <Pressable
              onPress={onClose}
              style={[styles.sheetBtn, styles.sheetBtnGhost]}
            >
              <Text style={styles.sheetBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onDone} style={styles.sheetBtn}>
              <Text style={styles.sheetBtnText}>{doneLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ------------------------------------------------------------------ date picker

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  blockFuture = true,
  error,
}: {
  label?: string;
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  blockFuture?: boolean;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const fallback: DateParts = useMemo(() => {
    const t = new Date();
    return {
      year: Math.min(maxYear, 1995),
      month: 1,
      day: 1,
      ...(blockFuture ? {} : { year: t.getFullYear() }),
    };
  }, [maxYear, blockFuture]);
  const [draft, setDraft] = useState<DateParts>(parseDate(value) ?? fallback);

  const openSheet = () => {
    setDraft(parseDate(value) ?? fallback);
    setOpen(true);
  };

  const today = new Date();
  const isFuture = (p: DateParts) =>
    blockFuture &&
    (p.year > today.getFullYear() ||
      (p.year === today.getFullYear() &&
        (p.month > today.getMonth() + 1 ||
          (p.month === today.getMonth() + 1 && p.day > today.getDate()))));

  const years = useMemo(() => yearRange(minYear, maxYear), [minYear, maxYear]);
  const dayCount = daysInMonth(draft.year, draft.month);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount],
  );
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const set = (patch: Partial<DateParts>) =>
    setDraft((d) => clampDate({ ...d, ...patch }));

  return (
    <>
      <FieldShell
        label={label}
        value={displayDate(value)}
        placeholder={placeholder}
        icon="📅"
        onPress={openSheet}
        error={error}
      />
      <Sheet
        visible={open}
        title={label ?? "Select date"}
        onClose={() => setOpen(false)}
        onDone={() => {
          if (isFuture(draft)) return;
          onChange(formatDate(draft));
          setOpen(false);
        }}
      >
        <Text style={styles.preview}>
          {displayDate(formatDate(draft))}
          {isFuture(draft) ? "  ·  future date not allowed" : ""}
        </Text>
        <View style={styles.wheels}>
          <Wheel
            items={days}
            selected={draft.day}
            onSelect={(day) => set({ day })}
            disabled={(day) => isFuture({ ...draft, day })}
            width={70}
          />
          <Wheel
            items={months}
            selected={draft.month}
            onSelect={(month) => set({ month })}
            format={(m) => MONTH_NAMES[m - 1]}
            disabled={(month) =>
              isFuture({ ...clampDate({ ...draft, month }) })
            }
          />
          <Wheel
            items={years}
            selected={draft.year}
            onSelect={(year) => set({ year })}
            width={90}
          />
        </View>
      </Sheet>
    </>
  );
}

// ------------------------------------------------------------------ time picker

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: ("AM" | "PM")[] = ["AM", "PM"];

export function TimePickerField({
  label,
  value,
  onChange,
  placeholder = "Select time",
  error,
}: {
  label?: string;
  /** 24h "HH:MM" or "" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const initial = (): Time12 =>
    to12h(parseTime(value) ?? { hour: 12, minute: 0 });
  const [draft, setDraft] = useState<Time12>(initial);

  const openSheet = () => {
    setDraft(initial());
    setOpen(true);
  };

  const preview = displayTime(formatTime(from12h(draft)));

  return (
    <>
      <FieldShell
        label={label}
        value={displayTime(value)}
        placeholder={placeholder}
        icon="🕑"
        onPress={openSheet}
        error={error}
      />
      <Sheet
        visible={open}
        title={label ?? "Select time"}
        onClose={() => setOpen(false)}
        onDone={() => {
          onChange(formatTime(from12h(draft)));
          setOpen(false);
        }}
      >
        <Text style={styles.preview}>{preview}</Text>
        <View style={styles.chipRow}>
          {[
            {
              t: "Sunrise 6:00 AM",
              v: { hour12: 6, minute: 0, period: "AM" as const },
            },
            { t: "Noon", v: { hour12: 12, minute: 0, period: "PM" as const } },
            {
              t: "Midnight",
              v: { hour12: 12, minute: 0, period: "AM" as const },
            },
          ].map((q) => (
            <Pressable
              key={q.t}
              style={styles.quickChip}
              onPress={() => setDraft(q.v)}
            >
              <Text style={styles.quickChipText}>{q.t}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.wheels}>
          <Wheel
            items={HOURS_12}
            selected={draft.hour12}
            onSelect={(hour12) => setDraft((d) => ({ ...d, hour12 }))}
          />
          <Wheel
            items={MINUTES}
            selected={draft.minute}
            onSelect={(minute) => setDraft((d) => ({ ...d, minute }))}
            format={(m) => String(m).padStart(2, "0")}
          />
          <Wheel
            items={PERIODS}
            selected={draft.period}
            onSelect={(period) => setDraft((d) => ({ ...d, period }))}
            width={80}
          />
        </View>
      </Sheet>
    </>
  );
}

// ------------------------------------------------------------------ place autocomplete

export function PlaceAutocomplete({
  label,
  value,
  onChangeText,
  onSelect,
  placeholder = "Start typing a city, e.g. Jaipur",
  error,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Called with the resolved place when the user picks a suggestion */
  onSelect: (place: GeoPlace, display: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const seq = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  const fmt = (p: GeoPlace) =>
    `${p.name}${p.admin1 ? ", " + p.admin1 : ""}, ${p.country}`;

  const choose = (p: GeoPlace) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    const text = fmt(p);
    setPicked(text);
    setResults([]);
    setFocused(false);
    onChangeText(text);
    onSelect(p, text);
  };

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3 || q === picked) {
      setResults([]);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q);
        if (mine === seq.current) setResults(r);
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 350); // debounce
    return () => clearTimeout(t);
  }, [value, picked]);

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <TextInput
          style={styles.placeInput}
          value={value}
          onChangeText={(t) => {
            setPicked(null);
            onChangeText(t);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so a tap on a suggestion is registered before hiding.
            if (blurTimer.current) clearTimeout(blurTimer.current);
            blurTimer.current = setTimeout(() => setFocused(false), 400);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.fieldIcon}>{picked ? "✅" : "📍"}</Text>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {focused && results.length > 0 && (
        <View style={styles.suggestions}>
          {results.map((p) => (
            <Pressable
              key={`${p.latitude}-${p.longitude}`}
              style={styles.suggestion}
              onPressIn={() => choose(p)}
            >
              <Text style={styles.suggestionMain}>
                📍 {p.name}
                {p.admin1 ? `, ${p.admin1}` : ""}
              </Text>
              <Text style={styles.suggestionSub}>
                {p.country} · {p.timezone}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {focused &&
        !loading &&
        value.trim().length >= 3 &&
        !picked &&
        results.length === 0 && (
          <Text style={styles.noResults}>
            No matching place — try a nearby bigger city.
          </Text>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: spacing.md },
  label: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: "500",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    backgroundColor: colors.card,
  },
  fieldError: { borderColor: colors.danger },
  fieldValue: { color: colors.text, fontSize: 16 },
  fieldPlaceholder: { color: colors.textMuted, fontSize: 16 },
  fieldIcon: { fontSize: 18, marginLeft: 8 },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  placeInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  suggestions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  suggestion: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2208",
  },
  suggestionMain: { color: colors.text, fontSize: 15 },
  suggestionSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  noResults: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0b0b0b",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sheetTitle: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  preview: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  wheels: { flexDirection: "row", gap: 8, height: ITEM_H * 5 },
  wheel: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2208",
  },
  wheelItem: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
  wheelItemActive: { backgroundColor: colors.primary, borderRadius: 10 },
  wheelText: { color: colors.text, fontSize: 16 },
  wheelTextActive: { color: colors.onPrimary, fontWeight: "700" },
  wheelTextOff: { color: "#555" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
    justifyContent: "center",
  },
  quickChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.chipBg,
  },
  quickChipText: { color: colors.primaryDark, fontSize: 12 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  sheetBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  sheetBtnText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  sheetBtnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sheetBtnGhostText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
});
