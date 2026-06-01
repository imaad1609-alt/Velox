import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Exercise, MUSCLE_COLORS } from "../constants/exercises";
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
}: {
  exercise: Exercise;
  onAdd: () => void;
  onClose: () => void;
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

  const accent = MUSCLE_COLORS[exercise.primaryMuscle] || "#6C63FF";

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
                <Text style={[styles.metaValue, { color: exercise.difficulty === "Beginner" ? "#00C9A7" : exercise.difficulty === "Intermediate" ? "#FF9F43" : "#FF6B6B" }]}>{exercise.difficulty}</Text>
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

      {/* Add to workout */}
      <TouchableOpacity style={styles.addConfirmBtn} onPress={onAdd}>
        <LinearGradient colors={["#6C63FF", "#4ECDC4"]} style={styles.addConfirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.addConfirmText}>+ Add to Workout</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  back: { color: "#6C63FF", fontSize: 16, width: 60 },
  headerTitle: { flex: 1, color: "#FFF", fontSize: 18, fontWeight: "bold", textAlign: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#1A1A2E", marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { color: "#888", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#6C63FF" },
  tabUnderline: { position: "absolute", bottom: -1, height: 2, width: "60%", backgroundColor: "#6C63FF", borderRadius: 1 },

  mediaBox: { backgroundColor: "#FFF", borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  media: { width: "100%", height: 220 },
  muscleMapBox: { backgroundColor: "#1A1A2E", borderRadius: 12, paddingVertical: 16, marginBottom: 16 },

  metaLine: { color: "#CCC", fontSize: 14, marginBottom: 4 },
  metaKey: { color: "#888" },

  card: { backgroundColor: "#1A1A2E", borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "#2A2A4A" },
  cardTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  loading: { color: "#666", fontSize: 14, paddingVertical: 12 },
  empty: { color: "#666", fontSize: 14, lineHeight: 20, paddingVertical: 12 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 44, paddingRight: 12, marginTop: 2 },
  dateLabel: { color: "#666", fontSize: 11 },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metricChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: "#2A2A4A" },
  metricChipText: { color: "#888", fontSize: 12, fontWeight: "600" },

  prRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderColor: "#2A2A4A" },
  prLabel: { color: "#AAA", fontSize: 14 },
  prValue: { color: "#FFF", fontSize: 14, fontWeight: "bold" },

  historyRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#1A1A2E" },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  historyDate: { color: "#FFF", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  historySets: { color: "#888", fontSize: 13, lineHeight: 19 },

  metaRow: { flexDirection: "row", gap: 32, padding: 16, backgroundColor: "#1A1A2E", borderRadius: 12 },
  detailLabel: { color: "#888", fontSize: 11, letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 },
  metaValue: { color: "#FFF", fontSize: 15, fontWeight: "bold", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1 },
  stepNumText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  stepText: { color: "#CCC", fontSize: 14, flex: 1, lineHeight: 20 },

  addConfirmBtn: { marginTop: 12, borderRadius: 14, overflow: "hidden" },
  addConfirmGradient: { padding: 16, alignItems: "center" },
  addConfirmText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
