import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DURATION, enterDown } from "../constants/motion";
import { COLORS, FONTS, RADIUS } from "../constants/theme";
import { useWorkout } from "../contexts/WorkoutContext";

const TAB_BAR_HEIGHT = 49;

const formatDuration = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// A floating bar that appears whenever a workout is in progress but its full
// logger isn't on screen — either minimized, or the user has navigated to
// another tab. Tapping it jumps back into the logger.
export const MiniWorkoutBar = () => {
  const { active, minimized, name, elapsed, exercises, expand, endWorkout } = useWorkout();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Pulsing "live" indicator (ping-pongs forever; only visible while shown).
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.3, { duration: 850 }), -1, true);
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // Hidden when no workout, or when the full logger is already showing
  // (active, not minimized, on the workout tab). Kept mounted so the bar can
  // animate in/out via reanimated entering/exiting.
  const onWorkoutTab = pathname === "/workout";
  const show = active && !(onWorkoutTab && !minimized);

  const open = () => {
    expand();
    if (!onWorkoutTab) router.push("/workout");
  };

  const exerciseLabel =
    exercises.length === 0
      ? "No exercises"
      : `${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}`;

  return (
    <>
      {show && (
      <Animated.View
        entering={enterDown()}
        exiting={FadeOut.duration(DURATION.fast)}
        style={[styles.bar, { bottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={open} style={styles.barMain}>
          <View style={styles.expandIcon}>
            <Ionicons name="chevron-up" size={20} color={COLORS.onPrimary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Animated.View style={[styles.liveDot, dotStyle]} />
              <Text style={styles.barTitle} numberOfLines={1}>{name}</Text>
            </View>
            <Text style={styles.barSub}>{exerciseLabel}</Text>
          </View>
          <Text style={styles.barTime}>{formatDuration(elapsed)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={() => setConfirmDiscard(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </Animated.View>
      )}

      <Modal visible={confirmDiscard} transparent animationType="fade" onRequestClose={() => setConfirmDiscard(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Discard workout?</Text>
            <Text style={styles.confirmMsg}>This in-progress workout will be deleted without saving.</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDiscard(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDiscardBtn}
                onPress={() => { setConfirmDiscard(false); endWorkout(); }}
              >
                <Text style={styles.confirmDiscardText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface1,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  barMain: { flex: 1, flexDirection: "row", alignItems: "center" },
  expandIcon: { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 8 },
  barTitle: { flex: 1, fontFamily: FONTS.heading, color: COLORS.text, fontSize: 16, letterSpacing: 0.2 },
  barTime: { fontFamily: FONTS.monoBold, color: COLORS.primary, fontSize: 15, marginLeft: 10, marginRight: 4, textAlign: "center" },
  barSub: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, marginTop: 3, marginLeft: 16 },
  discardBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  confirmTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  confirmMsg: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  confirmCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  confirmDiscardBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: "center" },
  confirmDiscardText: { fontFamily: FONTS.bodyBold, color: "#FFFFFF", fontSize: 15 },
});
