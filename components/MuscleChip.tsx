import { StyleSheet, Text, View } from "react-native";
import { MUSCLE_COLORS } from "../constants/exercises";
import { COLORS, FONTS, RADIUS } from "../constants/theme";

// Small coloured tag for a muscle name. Shared by the exercise picker and the
// exercise detail view. Rectangular + mono label per the design spec.
export const MuscleChip = ({ muscle }: { muscle: string }) => {
  const color = MUSCLE_COLORS[muscle] || COLORS.primary;
  return (
    <View style={[styles.chip, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{muscle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  chipText: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" },
});
