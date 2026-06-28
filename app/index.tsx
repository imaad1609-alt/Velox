import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { MacroBar } from "../components/MacroBar";
import { enterDown } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { DEFAULT_GOALS, getGoals, NutritionGoals } from "../utils/goals";
import { dayKey, DiaryTotals, getDiaryForDay, sumTotals } from "../utils/nutrition";
import { getWorkouts, SavedWorkout } from "../utils/workouts";

const ZERO_TOTALS: DiaryTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

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

// Flag a macro the user is lagging on relative to how far through their calorie
// goal they are. Operates on the live day totals + the saved goals.
const getMacroWarning = (totals: DiaryTotals, goals: NutritionGoals) => {
  if (goals.calories <= 0) return null;
  const caloriePace = totals.calories / goals.calories;
  const macros = [
    { name: "Protein", current: totals.protein, goal: goals.protein },
    { name: "Carbs", current: totals.carbs, goal: goals.carbs },
    { name: "Fat", current: totals.fat, goal: goals.fat },
  ];
  const warnings = macros.filter((m) => m.goal > 0 && m.current / m.goal < caloriePace - 0.15);
  if (warnings.length === 0) return null;
  return `Low on ${warnings.map((w) => w.name).join(" & ")} for your calorie intake`;
};

export default function Dashboard() {
  const [lastWorkout, setLastWorkout] = useState<SavedWorkout | null>(null);
  const [totals, setTotals] = useState<DiaryTotals>(ZERO_TOTALS);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);

  // Show the most recent workout on the card. On any error just keep the empty
  // state — the dashboard should never block on history loading.
  useEffect(() => {
    let alive = true;
    getWorkouts()
      .then((ws) => { if (alive) setLastWorkout(ws[0] ?? null); })
      .catch(() => { if (alive) setLastWorkout(null); });
    return () => { alive = false; };
  }, []);

  // Today's nutrition totals + goals. Re-fetched whenever the tab regains focus
  // so a food logged on the nutrition tab shows up here. On any error keep the
  // zero totals / default goals — never crash the dashboard.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const today = dayKey(new Date());
      Promise.all([getDiaryForDay(today), getGoals()])
        .then(([entries, g]) => {
          if (!alive) return;
          setTotals(sumTotals(entries));
          setGoals(g);
        })
        .catch(() => {
          if (!alive) return;
          setTotals(ZERO_TOTALS);
          setGoals(DEFAULT_GOALS);
        });
      return () => { alive = false; };
    }, [])
  );

  const caloriesEaten = Math.round(totals.calories);
  const caloriePercent = goals.calories > 0 ? Math.round((caloriesEaten / goals.calories) * 100) : 0;
  const remaining = goals.calories - caloriesEaten;
  const macroWarning = getMacroWarning(totals, goals);
  const macros = [
    { name: "Protein", current: totals.protein, goal: goals.protein },
    { name: "Carbs", current: totals.carbs, goal: goals.carbs },
    { name: "Fat", current: totals.fat, goal: goals.fat },
  ];

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
                  <Text style={styles.ringNumber}>{caloriesEaten.toLocaleString()}</Text>
                  <Text style={styles.ringLabel}>KCAL EATEN</Text>
                </View>
              </View>
            </View>
            <View style={styles.calorieStatsRow}>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatNum}>{goals.calories.toLocaleString()}</Text>
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
            {macros.map((m, i) => (
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
  workoutCard: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  workoutIcon: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.base, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  workoutIconText: { fontSize: 22 },
  workoutName: { fontFamily: FONTS.heading, fontSize: 17, color: COLORS.text, letterSpacing: 0.2 },
  workoutSub: { fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  workoutBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  workoutBadgeText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 12, letterSpacing: 0.5 },
});
