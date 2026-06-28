import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { COLORS, FONTS, RADIUS } from "../constants/theme";

// A single macro progress bar (Protein / Carbs / Fat) with an animated
// Cobalt → Lime "charging" fill. Shared by the dashboard and the nutrition diary
// so both render macros identically.
export const MacroBar = ({
  name,
  current,
  goal,
  delay = 0,
}: {
  name: string;
  current: number;
  goal: number;
  delay?: number;
}) => {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 700 }));
  }, []);
  const fillStyle = useAnimatedStyle(() => ({ width: `${pct * progress.value}%` }));
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.macroLabel}>{name}</Text>
        <Text style={styles.macroValue}>
          {Math.round(current)}g <Text style={styles.macroGoal}>/ {Math.round(goal)}g</Text>
        </Text>
      </View>
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

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  macroLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.text },
  macroValue: { fontFamily: FONTS.mono, fontSize: 13, color: COLORS.text },
  macroGoal: { fontFamily: FONTS.mono, color: COLORS.textMuted },
  barBg: { height: 8, backgroundColor: COLORS.base, borderRadius: RADIUS.sm, overflow: "hidden" },
  barFill: { flex: 1, borderRadius: RADIUS.sm },
});
