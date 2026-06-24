import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { enterDown } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { PressableScale } from "./PressableScale";

// Pre-auth landing screen. Distinct from the Stitch mockup (no stock photo) but
// uses the same Velox skin as the rest of the app: obsidian base with a layered
// lime/cobalt glow, Archivo Narrow display headline, mono sublabels, and the
// solid-lime CTA shared with the Login screen. Hands off to auth in either mode.
const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "barbell-outline", label: "Easy workout logging" },
  { icon: "nutrition-outline", label: "Simplified pro-grade nutrition" },
  { icon: "trending-up-outline", label: "Track PRs, volume & 1RM" },
];

export const Onboarding = ({
  onGetStarted,
  onLogin,
}: {
  onGetStarted: () => void;
  onLogin: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Layered ambient glow — stands in for the mockup's athlete photo */}
      <LinearGradient
        colors={["#11160A", COLORS.base, "#0A0E12"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} pointerEvents="none" />

      <View style={[styles.content, { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.lg }]}>
        {/* Brand */}
        <Animated.View entering={enterDown(0)}>
          <Text style={styles.wordmark}>VELOX</Text>
          <View style={styles.rule} />
        </Animated.View>

        {/* Headline + value props */}
        <View>
          <Animated.Text style={styles.headline} entering={enterDown(1)}>EVERY REP{"\n"}COUNTS.</Animated.Text>
          <Animated.Text style={styles.sub} entering={enterDown(2)}>Workout and nutrition, engineered into one precision system.</Animated.Text>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.label} style={styles.featureRow} entering={enterDown(3 + i)}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.featureText}>{f.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <Animated.View entering={enterDown(3 + FEATURES.length)}>
          <PressableScale style={styles.cta} onPress={onGetStarted} haptic>
            <Text style={styles.ctaText}>Get Started ⚡</Text>
          </PressableScale>
          <TouchableOpacity style={styles.secondary} onPress={onLogin} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.secondaryText}>I already have an account →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  glow: {
    position: "absolute",
    top: -120,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.margin,
    justifyContent: "space-between",
  },
  wordmark: { fontFamily: FONTS.display, fontSize: 44, color: COLORS.primary, letterSpacing: 1 },
  rule: { width: 40, height: 3, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, marginTop: 8 },

  headline: { fontFamily: FONTS.display, fontSize: 52, lineHeight: 50, color: COLORS.text, textTransform: "uppercase", letterSpacing: -1 },
  sub: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 24, color: COLORS.textMuted, marginTop: 16, maxWidth: 320 },

  features: { marginTop: SPACING.xl, gap: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface1,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.text },

  cta: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  ctaText: { fontFamily: FONTS.display, color: COLORS.onPrimary, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.5 },
  secondary: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
  secondaryText: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
});
