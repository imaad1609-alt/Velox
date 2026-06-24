import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { MUSCLE_COLORS } from "../constants/exercises";
import { enterDown } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { getWorkouts, SavedWorkout } from "../utils/workouts";

// Browsable list of finished workouts (newest-first). Reuses getWorkouts().
// Selecting a workout hands the full object — plus the whole fetched list, so
// the detail view can compute all-time PRs without another Firestore read.

const num = (s: string) => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatDate = (date: number) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const summarize = (w: SavedWorkout) => {
  let volume = 0;
  let sets = 0;
  const muscles: string[] = [];
  for (const ex of w.exercises) {
    if (!muscles.includes(ex.primaryMuscle)) muscles.push(ex.primaryMuscle);
    for (const s of ex.sets) {
      sets++;
      volume += num(s.weight) * num(s.reps);
    }
  }
  return { volume: Math.round(volume), sets, muscles };
};

export const WorkoutHistory = ({
  onSelect,
  onClose,
}: {
  onSelect: (workout: SavedWorkout, all: SavedWorkout[]) => void;
  onClose: () => void;
}) => {
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getWorkouts()
      .then((ws) => {
        if (!alive) return;
        setWorkouts(ws);
        setLoading(false);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Couldn’t load your history.");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySub}>Finish a workout and it’ll show up here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {workouts.map((w, wi) => {
            const { volume, sets, muscles } = summarize(w);
            return (
              <Animated.View key={w.id} entering={enterDown(Math.min(wi, 8))}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => onSelect(w, workouts)}>
                <LinearGradient
                  colors={[COLORS.surface1, "#161618"]}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>{w.name}</Text>
                    <Text style={styles.cardDate}>{formatDate(w.date)}</Text>
                  </View>

                  <View style={styles.muscleRow}>
                    {muscles.slice(0, 6).map((m) => (
                      <View key={m} style={[styles.muscleDot, { backgroundColor: MUSCLE_COLORS[m] || COLORS.primary }]} />
                    ))}
                    <Text style={styles.exCount} numberOfLines={1}>
                      {w.exercises.length} {w.exercises.length === 1 ? "exercise" : "exercises"}
                    </Text>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatDuration(w.durationSeconds)}</Text>
                      <Text style={styles.statLabel}>TIME</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{volume.toLocaleString()}</Text>
                      <Text style={styles.statLabel}>VOLUME</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{sets}</Text>
                      <Text style={styles.statLabel}>SETS</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, textTransform: "uppercase", letterSpacing: 0.4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 14, textAlign: "center" },
  emptyTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 20, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  emptySub: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, textAlign: "center" },

  card: {
    marginHorizontal: SPACING.md,
    marginBottom: 12,
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: { flex: 1, fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, marginRight: 12, letterSpacing: 0.2 },
  cardDate: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12 },
  muscleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 14 },
  muscleDot: { width: 8, height: 8, borderRadius: 4 },
  exCount: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 11, marginLeft: 4, textTransform: "uppercase" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 16 },
  statLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 10, letterSpacing: 1, marginTop: 4, textTransform: "uppercase" },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: COLORS.border, marginVertical: 2 },
});
