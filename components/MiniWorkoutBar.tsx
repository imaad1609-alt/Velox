import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

  // Hidden when no workout, or when the full logger is already showing
  // (active, not minimized, on the workout tab).
  const onWorkoutTab = pathname === "/workout";
  if (!active || (onWorkoutTab && !minimized)) return null;

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
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={open}
        style={[styles.bar, { bottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}
      >
        <View style={styles.expandIcon}>
          <Ionicons name="chevron-up" size={20} color="#FFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.liveDot} />
            <Text style={styles.barTitle} numberOfLines={1}>{name}</Text>
            <Text style={styles.barTime}>{formatDuration(elapsed)}</Text>
          </View>
          <Text style={styles.barSub}>{exerciseLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={() => setConfirmDiscard(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </TouchableOpacity>

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
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2A2A4A",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  expandIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2A2A4A", alignItems: "center", justifyContent: "center" },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00C9A7", marginRight: 8 },
  barTitle: { flex: 1, color: "#FFF", fontSize: 15, fontWeight: "bold" },
  barTime: { color: "#6C63FF", fontSize: 14, fontWeight: "600", marginLeft: 8, fontVariant: ["tabular-nums"] },
  barSub: { color: "#888", fontSize: 13, marginTop: 2, marginLeft: 16 },
  discardBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: "#1A1A2E", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: "#2A2A4A" },
  confirmTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  confirmMsg: { color: "#AAA", fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#2A2A4A", alignItems: "center" },
  confirmCancelText: { color: "#888", fontSize: 15, fontWeight: "600" },
  confirmDiscardBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#FF6B6B", alignItems: "center" },
  confirmDiscardText: { color: "#0D0D0D", fontSize: 15, fontWeight: "bold" },
});
