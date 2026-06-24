import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { enterDown } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { getWorkouts, SavedWorkout } from "../utils/workouts";

const CALORIES_EATEN = 1840;
const CALORIES_GOAL = 2500;
const MACROS = [
  { name: "Protein", current: 120, goal: 180 },
  { name: "Carbs", current: 200, goal: 250 },
  { name: "Fat", current: 45, goal: 80 },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getDate = () => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
};

const MacroBar = ({ name, current, goal, delay }: any) => {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 700 }));
  }, []);
  const fillStyle = useAnimatedStyle(() => ({ width: `${pct * progress.value}%` }));
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
        <Text style={styles.macroLabel}>{name}</Text>
        <Text style={styles.macroValue}>
          {current}g <Text style={styles.macroGoal}>/ {goal}g</Text>
        </Text>
      </View>
      {/* Cobalt → Lime "charging" gradient fill (spec progress bars) */}
      <View style={styles.barBg}>
        <Animated.View style={[{ height: "100%" }, fillStyle]}>
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barFill}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const num = (s: string) => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// "Today", "Yesterday", or a short date — for the latest-workout card.
const relativeDay = (date: number) => {
  const d = new Date(date);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const workoutVolume = (w: SavedWorkout) => {
  let v = 0;
  for (const ex of w.exercises) for (const s of ex.sets) v += num(s.weight) * num(s.reps);
  return Math.round(v);
};

const getMacroWarning = () => {
  const caloriePace = CALORIES_EATEN / CALORIES_GOAL;
  const warnings = MACROS.filter(m => (m.current / m.goal) < caloriePace - 0.15);
  if (warnings.length === 0) return null;
  return `Low on ${warnings.map(w => w.name).join(" & ")} for your calorie intake`;
};

export default function Dashboard() {
  const [lastWorkout, setLastWorkout] = useState<SavedWorkout | null>(null);

  // Show the most recent workout on the card. On any error just keep the empty
  // state — the dashboard should never block on history loading.
  useEffect(() => {
    let alive = true;
    getWorkouts()
      .then((ws) => { if (alive) setLastWorkout(ws[0] ?? null); })
      .catch(() => { if (alive) setLastWorkout(null); });
    return () => { alive = false; };
  }, []);

  const caloriePercent = Math.round((CALORIES_EATEN / CALORIES_GOAL) * 100);
  const remaining = CALORIES_GOAL - CALORIES_EATEN;
  const macroWarning = getMacroWarning();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View>

        {/* Header */}
        <Animated.View style={styles.headerRow} entering={enterDown(0)}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{getDate()}</Text>
        </Animated.View>

        {/* Calorie Card */}
        <Animated.View entering={enterDown(1)}>
        <TouchableOpacity onPress={() => router.push("/nutrition")} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.surface1, "#161618"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.cardTitle}>Calories · Tap to log</Text>
            <View style={styles.calorieRingContainer}>
              <View style={styles.ringOuter}>
                <View style={styles.ringInner}>
                  <Text style={styles.ringNumber}>{CALORIES_EATEN.toLocaleString()}</Text>
                  <Text style={styles.ringLabel}>KCAL EATEN</Text>
                </View>
              </View>
            </View>
            <View style={styles.calorieStatsRow}>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatNum}>{CALORIES_GOAL.toLocaleString()}</Text>
                <Text style={styles.calorieStatLabel}>Goal</Text>
              </View>
              <View style={[styles.calorieStat, styles.calorieStatMiddle]}>
                <Text style={[styles.calorieStatNum, { color: COLORS.primary }]}>{caloriePercent}%</Text>
                <Text style={styles.calorieStatLabel}>Done</Text>
              </View>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatNum}>{remaining.toLocaleString()}</Text>
                <Text style={styles.calorieStatLabel}>Remaining</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        </Animated.View>

        {/* Macro Warning */}
        {macroWarning && (
          <Animated.View style={styles.warningCard} entering={enterDown(2)}>
            <Text style={styles.warningText}>⚠️  {macroWarning}</Text>
          </Animated.View>
        )}

        {/* Macros Card */}
        <Animated.View entering={enterDown(macroWarning ? 3 : 2)}>
        <TouchableOpacity onPress={() => router.push("/nutrition")} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.surface1, "#161618"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.cardTitle}>Macros · Tap to log</Text>
            {MACROS.map((m, i) => (
              <MacroBar key={m.name} {...m} delay={300 + i * 150} />
            ))}
          </LinearGradient>
        </TouchableOpacity>
        </Animated.View>

        {/* Workout Card */}
        <Animated.View entering={enterDown(macroWarning ? 4 : 3)}>
        <TouchableOpacity onPress={() => router.push("/workout")} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.surface1, "#161618"]} style={[styles.card, styles.workoutCard, { marginBottom: 32 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.cardTitle}>{lastWorkout ? "Latest Workout" : "Today's Workout"}</Text>
            <View style={styles.workoutRow}>
              <View style={styles.workoutIcon}>
                <Text style={styles.workoutIconText}>💪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutName} numberOfLines={1}>
                  {lastWorkout ? lastWorkout.name : "No workout logged yet"}
                </Text>
                <Text style={styles.workoutSub}>
                  {lastWorkout
                    ? `${relativeDay(lastWorkout.date)} · ${workoutVolume(lastWorkout).toLocaleString()} LBS`
                    : "Tap to get started"}
                </Text>
              </View>
              <View style={styles.workoutBadge}>
                <Text style={styles.workoutBadgeText}>{lastWorkout ? "VIEW" : "START"}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        </Animated.View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  headerRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  greeting: { fontFamily: FONTS.display, fontSize: 32, color: COLORS.text, textTransform: "uppercase", letterSpacing: -0.5 },
  date: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 6, letterSpacing: 1, textTransform: "uppercase" },
  card: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  calorieRingContainer: { alignItems: "center", marginBottom: 16 },
  ringOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 12, borderColor: COLORS.primary, justifyContent: "center", alignItems: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  ringInner: { alignItems: "center" },
  ringNumber: { fontFamily: FONTS.monoBold, fontSize: 28, color: COLORS.text },
  ringLabel: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, marginTop: 4, letterSpacing: 1 },
  calorieStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  calorieStat: { flex: 1, alignItems: "center" },
  calorieStatMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  calorieStatNum: { fontFamily: FONTS.monoBold, fontSize: 18, color: COLORS.text },
  calorieStatLabel: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  warningCard: { marginHorizontal: SPACING.md, marginBottom: 12, backgroundColor: "rgba(255, 204, 0, 0.08)", borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.warning },
  warningText: { fontFamily: FONTS.body, color: COLORS.warning, fontSize: 13 },
  barBg: { height: 8, backgroundColor: COLORS.base, borderRadius: RADIUS.sm, overflow: "hidden" },
  barFill: { flex: 1, borderRadius: RADIUS.sm },
  macroLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.text },
  macroValue: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.text },
  macroGoal: { fontFamily: FONTS.mono, color: COLORS.textMuted },
  workoutCard: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  workoutIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.base, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  workoutIconText: { fontSize: 22 },
  workoutName: { fontFamily: FONTS.heading, fontSize: 17, color: COLORS.text, letterSpacing: 0.2 },
  workoutSub: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  workoutBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  workoutBadgeText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 12, letterSpacing: 0.5 },
});
