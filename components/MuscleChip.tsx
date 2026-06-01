import { StyleSheet, Text, View } from "react-native";
import { MUSCLE_COLORS } from "../constants/exercises";

// Small coloured pill for a muscle name. Shared by the exercise picker and the
// exercise detail view.
export const MuscleChip = ({ muscle }: { muscle: string }) => (
  <View style={[styles.chip, { backgroundColor: (MUSCLE_COLORS[muscle] || "#6C63FF") + "33", borderColor: MUSCLE_COLORS[muscle] || "#6C63FF" }]}>
    <Text style={[styles.chipText, { color: MUSCLE_COLORS[muscle] || "#6C63FF" }]}>{muscle}</Text>
  </View>
);

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "600" },
});
