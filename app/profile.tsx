import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { STORAGE_KEY, useWorkout } from "../contexts/WorkoutContext";
import { auth } from "../firebaseConfig";

export default function Profile() {
  const { active, endWorkout } = useWorkout();
  const [confirm, setConfirm] = useState(false);
  const email = auth.currentUser?.email ?? "Signed in";
  const initial = (email[0] ?? "V").toUpperCase();

  const logOut = async () => {
    setConfirm(false);
    // Drop the in-progress workout (in-memory + its restart snapshot) so it
    // never leaks into the next session/account, then sign out.
    try {
      endWorkout();
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // best-effort cleanup — don't block sign-out on it
    }
    try {
      await signOut(auth);
    } catch {
      // onAuthStateChanged stays put; nothing else to do client-side
    }
  };

  // Logging out mid-workout throws away the unsaved session — confirm first.
  const onLogoutPress = () => (active ? setConfirm(true) : logOut());

  return (
    <View style={styles.container}>
      {/* Account */}
      <View style={styles.accountCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountLabel}>Account</Text>
          <Text style={styles.accountEmail} numberOfLines={1}>{email}</Text>
        </View>
      </View>

      <Text style={styles.soon}>Athlete stats & settings coming soon</Text>

      <View style={{ flex: 1 }} />

      {/* Log out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogoutPress} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Log out?</Text>
            <Text style={styles.confirmMsg}>You have a workout in progress. Logging out will discard it without saving.</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmLogout} onPress={logOut}>
                <Text style={styles.confirmLogoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base, padding: SPACING.md, paddingTop: SPACING.lg },

  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: FONTS.display, color: COLORS.onPrimary, fontSize: 26 },
  accountLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  accountEmail: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 16 },

  soon: { fontFamily: FONTS.mono, color: COLORS.textDim, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: SPACING.lg, marginLeft: 4 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: { fontFamily: FONTS.bodyBold, color: COLORS.error, fontSize: 16 },

  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  confirmTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  confirmMsg: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  confirmCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  confirmLogout: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: "center" },
  confirmLogoutText: { fontFamily: FONTS.bodyBold, color: "#FFFFFF", fontSize: 15 },
});
