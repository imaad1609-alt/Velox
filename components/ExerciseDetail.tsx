import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Exercise, MUSCLE_COLORS } from "../constants/exercises";
import { COLORS, FONTS, RADIUS } from "../constants/theme";
import {
  computeExerciseStats,
  EMPTY_STATS,
  ExerciseSession,
  ExerciseStats,
} from "../utils/exerciseStats";
import { getWorkouts } from "../utils/workouts";
import { LineChart } from "./LineChart";
import { MuscleChip } from "./MuscleChip";
import { MuscleMap } from "./MuscleMap";

type Tab = "summary" | "history" | "howto";

type MetricKey = "heaviestWeight" | "best1RM" | "volume" | "mostReps";
const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "heaviestWeight", label: "Heaviest Weight", unit: "lbs" },
  { key: "best1RM", label: "Est. 1RM", unit: "lbs" },
  { key: "volume", label: "Session Volume", unit: "lbs" },
  { key: "mostReps", label: "Most Reps (Set)", unit: "reps" },
];

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const ExerciseDetail = ({
  exercise,
  onAdd,
  onClose,
  browseMode = false,
}: {
  exercise: Exercise;
  onAdd?: () => void;
  onClose: () => void;
  // Browse mode (from Explore): view-only, no "Add to Workout" CTA.
  browseMode?: boolean;
}) => {
  const [tab, setTab] = useState<Tab>("summary");
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [metric, setMetric] = useState<MetricKey>("heaviestWeight");

  useEffect(() => {
    let alive = true;
    getWorkouts()
      .then((ws) => alive && setStats(computeExerciseStats(ws, exercise.name)))
      .catch(() => alive && setStats(EMPTY_STATS));
    return () => { alive = false; };
  }, [exercise.name]);

  const s = stats ?? EMPTY_STATS;
  const chartWidth = Dimensions.get("window").width - 48 - 32; // sheet padding + card padding
  const chartData = useMemo(() => s.sessions.map((sess) => sess[metric]), [s.sessions, metric]);
  const activeMetric = METRICS.find((m) => m.key === metric)!;

  const accent = MUSCLE_COLORS[exercise.primaryMuscle] || COLORS.primary;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exercise.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["summary", "history", "howto"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "summary" ? "Summary" : t === "history" ? "History" : "How to"}
            </Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {/* ── Summary ── */}
        {tab === "summary" && (
          <View>
            {exercise.imageUrl ? (
              <View style={styles.mediaBox}>
                <Image source={{ uri: exercise.imageUrl }} style={styles.media} contentFit="contain" />
              </View>
            ) : (
              <View style={styles.muscleMapBox}>
                <MuscleMap primary={exercise.primaryMuscle} secondary={exercise.secondaryMuscles} tertiary={exercise.tertiaryMuscles} />
              </View>
            )}

            <Text style={styles.metaLine}><Text style={styles.metaKey}>Primary: </Text>{exercise.primaryMuscle}</Text>
            {exercise.secondaryMuscles.length > 0 && (
              <Text style={styles.metaLine}><Text style={styles.metaKey}>Secondary: </Text>{exercise.secondaryMuscles.join(", ")}</Text>
            )}
            <Text style={styles.metaLine}><Text style={styles.metaKey}>Equipment: </Text>{exercise.equipment}</Text>

            {/* Progress chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{activeMetric.label}</Text>
              {stats === null ? (
                <Text style={styles.loading}>Loading…</Text>
              ) : (
                <LineChart data={chartData} width={chartWidth} color={accent} unit={activeMetric.unit} />
              )}
              {s.sessions.length > 0 && (
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>{fmtDate(s.sessions[0].date)}</Text>
                  <Text style={styles.dateLabel}>{fmtDate(s.sessions[s.sessions.length - 1].date)}</Text>
                </View>
              )}
              <View style={styles.metricRow}>
                {METRICS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.metricChip, metric === m.key && { backgroundColor: accent + "22", borderColor: accent }]}
                    onPress={() => setMetric(m.key)}
                  >
                    <Text style={[styles.metricChipText, metric === m.key && { color: accent }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Personal records */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏅 Personal Records</Text>
              {s.sessions.length === 0 ? (
                <Text style={styles.loading}>No records yet.</Text>
              ) : (
                <>
                  <PR label="Heaviest weight" value={`${s.prs.heaviestWeight} lbs`} />
                  <PR label="Best est. 1RM" value={`${s.prs.best1RM} lbs`} />
                  <PR label="Best session volume" value={`${s.prs.bestVolume} lbs`} />
                  <PR label="Most reps (set)" value={`${s.prs.mostReps}`} />
                </>
              )}
            </View>
          </View>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <View>
            {stats === null ? (
              <Text style={styles.loading}>Loading…</Text>
            ) : s.sessions.length === 0 ? (
              <Text style={styles.empty}>No history yet. Log this exercise in a workout and it’ll show up here.</Text>
            ) : (
              [...s.sessions].reverse().map((sess, i) => <HistoryRow key={i} session={sess} accent={accent} />)
            )}
          </View>
        )}

        {/* ── How to ── */}
        {tab === "howto" && (
          <View>
            <View style={styles.metaRow}>
              <View>
                <Text style={styles.detailLabel}>EQUIPMENT</Text>
                <Text style={styles.metaValue}>{exercise.equipment}</Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>DIFFICULTY</Text>
                <Text style={[styles.metaValue, { color: exercise.difficulty === "Beginner" ? COLORS.primary : exercise.difficulty === "Intermediate" ? COLORS.warning : COLORS.error }]}>{exercise.difficulty}</Text>
              </View>
            </View>

            {exercise.secondaryMuscles.length > 0 && (
              <>
                <Text style={[styles.detailLabel, { marginTop: 16 }]}>SECONDARY</Text>
                <View style={styles.chipRow}>{exercise.secondaryMuscles.map((m) => <MuscleChip key={m} muscle={m} />)}</View>
              </>
            )}

            <Text style={[styles.detailLabel, { marginTop: 16 }]}>HOW TO PERFORM</Text>
            {exercise.instructions.length === 0 ? (
              <Text style={styles.empty}>No instructions available.</Text>
            ) : (
              exercise.instructions.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: accent }]}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add to workout (hidden when just browsing the library) */}
      {!browseMode && (
        <TouchableOpacity style={styles.addConfirmBtn} onPress={onAdd}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDim]} style={styles.addConfirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.addConfirmText}>+ Add to Workout</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const PR = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.prRow}>
    <Text style={styles.prLabel}>{label}</Text>
    <Text style={styles.prValue}>{value}</Text>
  </View>
);

const HistoryRow = ({ session, accent }: { session: ExerciseSession; accent: string }) => (
  <View style={styles.historyRow}>
    <View style={[styles.historyDot, { backgroundColor: accent }]} />
    <View style={{ flex: 1 }}>
      <Text style={styles.historyDate}>{new Date(session.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</Text>
      <Text style={styles.historySets}>
        {session.sets.map((set, i) => `${set.weight > 0 ? `${set.weight} × ` : ""}${set.reps}`).join("   ·   ")}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  back: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 16, width: 60 },
  headerTitle: { flex: 1, fontFamily: FONTS.heading, color: COLORS.text, fontSize: 20, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  tabTextActive: { color: COLORS.primary },
  tabUnderline: { position: "absolute", bottom: -1, height: 2, width: "60%", backgroundColor: COLORS.primary, borderRadius: 1 },

  mediaBox: { backgroundColor: "#FFF", borderRadius: RADIUS.lg, marginBottom: 16, overflow: "hidden" },
  media: { width: "100%", height: 220 },
  muscleMapBox: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, paddingVertical: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },

  metaLine: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 14, marginBottom: 4 },
  metaKey: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12 },

  card: { backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 17, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.3 },
  loading: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, paddingVertical: 12 },
  empty: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, lineHeight: 20, paddingVertical: 12 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 44, paddingRight: 12, marginTop: 2 },
  dateLabel: { fontFamily: FONTS.mono, color: COLORS.textDim, fontSize: 10 },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metricChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  metricChipText: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3 },

  prRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderColor: COLORS.border },
  prLabel: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 14 },
  prValue: { fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 14 },

  historyRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  historyDate: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 14, marginBottom: 4 },
  historySets: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, lineHeight: 19 },

  metaRow: { flexDirection: "row", gap: 32, padding: 16, backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  detailLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  metaValue: { fontFamily: FONTS.bodyBold, color: COLORS.text, fontSize: 15, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: RADIUS.sm, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 },
  stepNumText: { fontFamily: FONTS.monoBold, color: COLORS.onPrimary, fontSize: 12 },
  stepText: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 14, flex: 1, lineHeight: 20 },

  addConfirmBtn: { marginTop: 12, borderRadius: RADIUS.md, overflow: "hidden" },
  addConfirmGradient: { padding: 16, alignItems: "center" },
  addConfirmText: { fontFamily: FONTS.display, color: COLORS.onPrimary, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.5 },
});
