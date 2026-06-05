import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CALORIES_EATEN = 1840;
const CALORIES_GOAL = 2500;
const MACROS = [
  { name: "Protein", current: 120, goal: 180, color: "#6C63FF" },
  { name: "Carbs", current: 200, goal: 250, color: "#00C9A7" },
  { name: "Fat", current: 45, goal: 80, color: "#FF6B6B" },
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

const MacroBar = ({ name, current, goal, color, delay }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 900, delay, useNativeDriver: false,
    }).start();
  }, []);
  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${Math.round((current / goal) * 100)}%`],
  });
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }}>
        <Text style={styles.macroLabel}>{name}</Text>
        <Text style={styles.macroValue}>
          {current}g <Text style={styles.macroGoal}>/ {goal}g</Text>
        </Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const getMacroWarning = () => {
  const caloriePace = CALORIES_EATEN / CALORIES_GOAL;
  const warnings = MACROS.filter(m => (m.current / m.goal) < caloriePace - 0.15);
  if (warnings.length === 0) return null;
  return `Low on ${warnings.map(w => w.name).join(" & ")} for your calorie intake`;
};

export default function Dashboard() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const caloriePercent = Math.round((CALORIES_EATEN / CALORIES_GOAL) * 100);
  const remaining = CALORIES_GOAL - CALORIES_EATEN;
  const macroWarning = getMacroWarning();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{getDate()}</Text>
        </View>

        {/* Calorie Card */}
        <TouchableOpacity onPress={() => router.push("/nutrition")} activeOpacity={0.85}>
          <LinearGradient colors={["#1A1A2E", "#16213E"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.cardTitle}>Calories · Tap to log</Text>
            <View style={styles.calorieRingContainer}>
              <View style={styles.ringOuter}>
                <View style={styles.ringInner}>
                  <Text style={styles.ringNumber}>{CALORIES_EATEN.toLocaleString()}</Text>
                  <Text style={styles.ringLabel}>kcal eaten</Text>
                </View>
              </View>
            </View>
            <View style={styles.calorieStatsRow}>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatNum}>{CALORIES_GOAL.toLocaleString()}</Text>
                <Text style={styles.calorieStatLabel}>Goal</Text>
              </View>
              <View style={[styles.calorieStat, styles.calorieStatMiddle]}>
                <Text style={[styles.calorieStatNum, { color: "#00C9A7" }]}>{caloriePercent}%</Text>
                <Text style={styles.calorieStatLabel}>Done</Text>
              </View>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatNum}>{remaining.toLocaleString()}</Text>
                <Text style={styles.calorieStatLabel}>Remaining</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Macro Warning */}
        {macroWarning && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>⚠️  {macroWarning}</Text>
          </View>
        )}

        {/* Macros Card */}
        <TouchableOpacity onPress={() => router.push("/nutrition")} activeOpacity={0.85}>
          <LinearGradient colors={["#1A1A2E", "#16213E"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.cardTitle}>Macros · Tap to log</Text>
            {MACROS.map((m, i) => (
              <MacroBar key={m.name} {...m} delay={300 + i * 150} />
            ))}
          </LinearGradient>
        </TouchableOpacity>

        {/* Workout Card */}
        <TouchableOpacity onPress={() => router.push("/workout")} activeOpacity={0.85}>
          <LinearGradient colors={["#1A1A2E", "#16213E"]} style={[styles.card, { marginBottom: 32 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.cardTitle}>Today&apos;s Workout</Text>
            <View style={styles.workoutRow}>
              <View style={styles.workoutIcon}>
                <Text style={styles.workoutIconText}>💪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workoutName}>No workout logged yet</Text>
                <Text style={styles.workoutSub}>Tap to get started</Text>
              </View>
              <View style={styles.workoutBadge}>
                <Text style={styles.workoutBadgeText}>Start</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  headerRow: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 26, fontWeight: "bold", color: "#FFFFFF" },
  date: { fontSize: 14, color: "#888888", marginTop: 4 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#2A2A4A" },
  cardTitle: { fontSize: 13, fontWeight: "600", color: "#888888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  calorieRingContainer: { alignItems: "center", marginBottom: 16 },
  ringOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 12, borderColor: "#6C63FF", justifyContent: "center", alignItems: "center", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 16 },
  ringInner: { alignItems: "center" },
  ringNumber: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF" },
  ringLabel: { fontSize: 12, color: "#888888", marginTop: 2 },
  calorieStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  calorieStat: { flex: 1, alignItems: "center" },
  calorieStatMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#2A2A4A" },
  calorieStatNum: { fontSize: 18, fontWeight: "bold", color: "#FFFFFF" },
  calorieStatLabel: { fontSize: 12, color: "#888888", marginTop: 2 },
  warningCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#2A1A0E", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#FF9500" },
  warningText: { color: "#FF9500", fontSize: 13, fontWeight: "500" },
  barBg: { height: 8, backgroundColor: "#0D0D0D", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  macroLabel: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  macroValue: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" },
  macroGoal: { color: "#888888", fontWeight: "400" },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  workoutIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#0D0D0D", justifyContent: "center", alignItems: "center" },
  workoutIconText: { fontSize: 22 },
  workoutName: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  workoutSub: { fontSize: 13, color: "#888888", marginTop: 2 },
  workoutBadge: { backgroundColor: "#6C63FF", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  workoutBadgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
});
