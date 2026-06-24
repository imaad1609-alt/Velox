import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { Exercise, MUSCLE_COLORS } from "../constants/exercises";
import { enterDown, layout } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { deleteRoutine, RoutineExercise, updateRoutine } from "../utils/routines";
import { ExercisePicker } from "./ExercisePicker";
import { PressableScale } from "./PressableScale";
import { ReorderList } from "./ReorderList";

type Props = {
  routineId: string;
  initialName: string;
  initialExercises: RoutineExercise[];
  // True when the parent just created this routine for the editor. If the user
  // backs out without adding anything, we delete the empty shell.
  isNew: boolean;
  onClose: () => void;
};

export const RoutineEditor = ({ routineId, initialName, initialExercises, isNew, onClose }: Props) => {
  const [name, setName] = useState(initialName);
  const [exercises, setExercises] = useState<RoutineExercise[]>(initialExercises);
  const [showPicker, setShowPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuExercise, setMenuExercise] = useState<number | null>(null);
  const [showReorder, setShowReorder] = useState(false);

  // Baseline to diff against — captured once on mount.
  const initial = useRef({ name: initialName, exercises: initialExercises });

  const hasChanges =
    JSON.stringify({ name, exercises }) !== JSON.stringify(initial.current);

  // Human-readable summary of what changed, for the save prompt.
  const buildSummary = (): string => {
    const initSets = initial.current.exercises.reduce((a, e) => a + e.sets.length, 0);
    const curSets = exercises.reduce((a, e) => a + e.sets.length, 0);
    const exDelta = exercises.length - initial.current.exercises.length;
    const setDelta = curSets - initSets;
    const parts: string[] = [];
    if (exDelta > 0) parts.push(`added ${exDelta} exercise${exDelta > 1 ? "s" : ""}`);
    if (exDelta < 0) parts.push(`removed ${-exDelta} exercise${-exDelta > 1 ? "s" : ""}`);
    if (setDelta > 0) parts.push(`added ${setDelta} set${setDelta > 1 ? "s" : ""}`);
    if (setDelta < 0) parts.push(`removed ${-setDelta} set${-setDelta > 1 ? "s" : ""}`);
    if (name.trim() !== initial.current.name.trim()) parts.push("renamed it");
    if (parts.length === 0) parts.push("edited the sets");
    return parts.join(", ");
  };

  // ─── Close / save ───────────────────────────────────────────────────────────
  const handleDone = () => {
    // A brand-new routine with nothing in it: just drop the empty shell.
    if (isNew && exercises.length === 0) {
      deleteRoutine(routineId).catch(() => {});
      onClose();
      return;
    }
    // Nothing changed → leave without prompting.
    if (!hasChanges) {
      onClose();
      return;
    }
    setShowConfirm(true);
  };

  const saveAndClose = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await updateRoutine(routineId, { name: name.trim() || "Untitled Routine", exercises });
      setShowConfirm(false);
      onClose();
    } catch (e: any) {
      // Don't close as if it saved — keep the prompt open and tell the user.
      setSaveError(e?.message || "Couldn't save the routine. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const discardAndClose = async () => {
    setShowConfirm(false);
    // A just-created routine that's being discarded shouldn't linger. This is
    // best-effort cleanup of an abandoned empty shell, so failure is non-fatal.
    if (isNew) {
      try { await deleteRoutine(routineId); } catch {}
    }
    onClose();
  };

  // ─── Exercise / set editing ──────────────────────────────────────────────────
  const addExercise = (e: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: e.id,
        name: e.name,
        primaryMuscle: e.primaryMuscle,
        equipment: e.equipment,
        sets: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }],
      },
    ]);
    setShowPicker(false);
  };

  const deleteExercise = (ei: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== ei));
  };

  const moveExercise = (ei: number, dir: -1 | 1) => {
    setExercises((prev) => {
      const to = ei + dir;
      if (to < 0 || to >= prev.length) return prev;
      const u = [...prev];
      const [m] = u.splice(ei, 1);
      u.splice(to, 0, m);
      return u;
    });
    setMenuExercise(null);
  };

  const applyOrder = (order: number[]) => {
    setExercises((prev) => (order.length === prev.length ? order.map((i) => prev[i]) : prev));
    setShowReorder(false);
  };

  const addSet = (ei: number) => {
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: [...ex.sets] }));
      u[ei].sets.push({ weight: "", reps: "" });
      return u;
    });
  };

  const deleteSet = (ei: number, si: number) => {
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: [...ex.sets] }));
      u[ei].sets = u[ei].sets.filter((_, i) => i !== si);
      return u;
    });
  };

  const updateSet = (ei: number, si: number, field: "weight" | "reps", val: string) => {
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
      u[ei].sets[si][field] = val;
      return u;
    });
  };

  if (showPicker) return <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isNew ? "New Routine" : "Edit Routine"}</Text>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.headerAction}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Routine name */}
        <TextInput
          style={styles.nameInput}
          placeholder="Routine name"
          placeholderTextColor={COLORS.textDim}
          value={name}
          onChangeText={setName}
        />

        {exercises.length === 0 && (
          <Text style={styles.emptyHint}>Add exercises to build your routine. You’ll be asked to save when you tap Done.</Text>
        )}

        {exercises.map((item, ei) => (
          <Animated.View key={ei} layout={layout} entering={enterDown()}>
          <LinearGradient colors={[COLORS.surface1, "#161618"]} style={styles.exerciseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[item.primaryMuscle] || COLORS.primary }]} />
              <Text style={styles.exerciseTitle}>{item.name}</Text>
              <TouchableOpacity style={styles.deleteExBtn} onPress={() => setMenuExercise(ei)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.exerciseSub}>{item.primaryMuscle} · {item.equipment}</Text>
            <View style={styles.setHeader}>
              <Text style={[styles.setCol, { flex: 0.5 }]}>Set</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>lbs</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.setCol, { flex: 0.5 }]}></Text>
            </View>
            {item.sets.map((set, si) => (
              <Animated.View key={si} layout={layout} style={styles.setRow}>
                <Text style={[styles.setNum, { flex: 0.5 }]}>{si + 1}</Text>
                <TextInput style={[styles.setInput, { flex: 1 }]} placeholder="—" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={set.weight} onChangeText={(v) => updateSet(ei, si, "weight", v)} />
                <TextInput style={[styles.setInput, { flex: 1 }]} placeholder="—" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={set.reps} onChangeText={(v) => updateSet(ei, si, "reps", v)} />
                <TouchableOpacity style={styles.deleteSetBtn} onPress={() => deleteSet(ei, si)}>
                  <Ionicons name="close" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </Animated.View>
            ))}
            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ei)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </LinearGradient>
          </Animated.View>
        ))}

        <PressableScale style={styles.addExBtn} onPress={() => setShowPicker(true)} haptic>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </PressableScale>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Per-exercise options */}
      <Modal visible={menuExercise !== null} transparent animationType="fade" onRequestClose={() => setMenuExercise(null)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuExercise(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuExercise !== null ? exercises[menuExercise]?.name : ""}
            </Text>
            <TouchableOpacity style={[styles.menuOption, menuExercise === 0 && styles.menuOptionDisabled]} disabled={menuExercise === 0} onPress={() => menuExercise !== null && moveExercise(menuExercise, -1)}>
              <Ionicons name="arrow-up" size={20} color={COLORS.textMuted} />
              <Text style={styles.menuOptionText}>Move up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuOption, menuExercise === exercises.length - 1 && styles.menuOptionDisabled]} disabled={menuExercise === exercises.length - 1} onPress={() => menuExercise !== null && moveExercise(menuExercise, 1)}>
              <Ionicons name="arrow-down" size={20} color={COLORS.textMuted} />
              <Text style={styles.menuOptionText}>Move down</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuExercise(null); setShowReorder(true); }} disabled={exercises.length < 2}>
              <Ionicons name="reorder-three" size={20} color={COLORS.textMuted} />
              <Text style={styles.menuOptionText}>Reorder all…</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { const ei = menuExercise; setMenuExercise(null); if (ei !== null) deleteExercise(ei); }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.menuOptionText, { color: COLORS.error }]}>Remove exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuExercise(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {showReorder && (
        <ReorderList
          items={exercises.map((e) => ({ label: e.name, color: MUSCLE_COLORS[e.primaryMuscle] || COLORS.primary }))}
          onDone={applyOrder}
          onClose={() => setShowReorder(false)}
        />
      )}

      {/* Save changes confirmation */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Save changes?</Text>
            <Text style={styles.confirmMsg}>You {buildSummary()}. Save this routine?</Text>
            {saveError ? <Text style={styles.confirmError}>{saveError}</Text> : null}
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmDiscard} onPress={discardAndClose} disabled={saving}>
                <Text style={styles.confirmDiscardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmSave} onPress={saveAndClose} disabled={saving}>
                <Text style={styles.confirmSaveText}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowConfirm(false)}>
              <Text style={styles.confirmCancelText}>Keep editing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 20, textTransform: "uppercase", letterSpacing: 0.4 },
  headerAction: { fontFamily: FONTS.bodyBold, color: COLORS.primary, fontSize: 16 },
  nameInput: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 24, paddingHorizontal: SPACING.lg, paddingVertical: 16, letterSpacing: 0.3 },
  emptyHint: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, lineHeight: 20, paddingHorizontal: SPACING.lg, marginBottom: 8 },
  exerciseCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: COLORS.secondary },
  exDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  exerciseTitle: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.text, flex: 1, letterSpacing: 0.2 },
  deleteExBtn: { padding: 4 },
  exerciseSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginBottom: 14, marginLeft: 20 },
  setHeader: { flexDirection: "row", marginBottom: 8 },
  setCol: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setNum: { fontFamily: FONTS.monoBold, color: COLORS.textMuted, fontSize: 15, textAlign: "center" },
  setInput: { fontFamily: FONTS.monoBold, backgroundColor: COLORS.base, color: COLORS.text, borderRadius: RADIUS.md, padding: 10, marginHorizontal: 3, fontSize: 15, textAlign: "center" },
  deleteSetBtn: { flex: 0.5, height: 38, alignItems: "center", justifyContent: "center" },
  addSetBtn: { marginTop: 8, alignItems: "center", padding: 8 },
  addSetText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 14 },
  addExBtn: { marginHorizontal: SPACING.md, padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  addExText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 16 },

  menuOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  menuSheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: COLORS.borderStrong },
  menuTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 17, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  menuOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: COLORS.border },
  menuOptionText: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 16, flexShrink: 1 },
  menuOptionDisabled: { opacity: 0.35 },
  menuCancel: { marginTop: 16, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  menuCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },

  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  confirmTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  confirmMsg: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmError: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmDiscard: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  confirmDiscardText: { fontFamily: FONTS.bodySemiBold, color: COLORS.error, fontSize: 15 },
  confirmSave: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center" },
  confirmSaveText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 15 },
  confirmCancel: { marginTop: 12, padding: 12, alignItems: "center" },
  confirmCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 14 },
});
