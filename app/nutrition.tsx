import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, FONTS, SPACING } from "../constants/theme";

export default function Nutrition() {
  return (
    <View style={styles.container}>
      <Ionicons name="nutrition-outline" size={48} color={COLORS.primary} />
      <Text style={styles.title}>Nutrition</Text>
      <Text style={styles.sub}>Fuel tracking lands here soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.base,
    gap: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.display,
    color: COLORS.text,
    fontSize: 32,
    textTransform: "uppercase",
    letterSpacing: -0.5,
    marginTop: SPACING.sm,
  },
  sub: {
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
