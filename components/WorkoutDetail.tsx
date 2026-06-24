import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MUSCLE_COLORS } from "../constants/exercises";
import { SET_TYPE_META } from "../constants/setTypes";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { computeExerciseStats } from "../utils/exerciseStats";
import { deleteWorkout, SavedWorkout, updateWorkout } from "../utils/workouts";

// View one finished workout: summary stats, every exercise's sets (set-type
// badges + RPE + notes), and 🏆 badges on exercises whose session holds an
// all-time PR. Also supports edit / delete / repeat from a "…" menu.

const num = (s: string) => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

// Stable accent color for a superset group (mirrors the logger's mapping).
const SUPERSET_COLORS = [COLORS.secondary, "#00C9A7", COLORS.warning, "#54A0FF", "#F368E0"];
const supersetColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return SUPERSET_COLORS[Math.abs(h) % SUPERSET_COLORS.length];
};

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const formatDate = (date: number) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

// This workout's aggregates for one exercise, for comparing against all-time PRs.
const sessionAggregates = (sets: { weight: string; reps: string }[]) => {
  let heaviestWeight = 0;
  let best1RM = 0;
  let volume = 0;
  for (const s of sets) {
    const weight = num(s.weight);
    const reps = num(s.reps);
    if (weight <= 0 && reps <= 0) continue;
    heaviestWeight = Math.max(heaviestWeight, weight);
    volume += weight * reps;
    if (weight > 0 && reps > 0) best1RM = Math.max(best1RM, weight * (1 + reps / 30));
  }
  return { heaviestWeight, best1RM: Math.round(best1RM), volume: Math.round(volume) };
};

export const WorkoutDetail = ({
  workout,
  allWorkouts,
  onClose,
  onDeleted,
  onUpdated,
  onRepeat,
}: {
  workout: SavedWorkout;
  allWorkouts: SavedWorkout[];
  onClose: () => void;
  onDeleted?: (id: string) => void;
  onUpdated?: (w: SavedWorkout) => void;
  onRepeat?: (w: SavedWorkout) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SavedWorkout>(workout);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    // Deep-ish clone so edits don't mutate the read-only copy until saved.
    setDraft({
      ...workout,
      exercises: workout.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) })),
    });
    setEditing(true);
    setMenuOpen(false);
    setError("");
  };

  const editSet = (ei: number, si: number, field: "weight" | "reps", val: string) =>
    setDraft((d) => {
      const exercises = d.exercises.map((ex, i) =>
        i === ei ? { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, [field]: val } : s)) } : ex
      );
      return { ...d, exercises };
    });

  const addSet = (ei: number) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) =>
        i === ei ? { ...ex, sets: [...ex.sets, { weight: "", reps: "" }] } : ex
      ),
    }));

  const removeSet = (ei: number, si: number) =>
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) =>
        i === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex
      ),
    }));

  const removeExercise = (ei: number) =>
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== ei) }));

  const saveEdit = async () => {
    if (!workout.id) return;
    setSaving(true);
    setError("");
    try {
      const { id, ...rest } = draft;
      await updateWorkout(workout.id, rest);
      onUpdated?.({ ...draft, id: workout.id });
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!workout.id) return;
    setSaving(true);
    try {
      await deleteWorkout(workout.id);
      setConfirmDelete(false);
      onDeleted?.(workout.id);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Couldn't delete.");
      setSaving(false);
    }
  };

  // ─── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Edit Workout</Text>
          <TouchableOpacity onPress={saveEdit} disabled={saving}>
            <Text style={[styles.headerAction, { color: COLORS.primary }]}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.nameInput}
            value={draft.name}
            onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
            placeholder="Workout name"
            placeholderTextColor={COLORS.textDim}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {draft.exercises.map((ex, ei) => (
            <LinearGradient key={ei} colors={[COLORS.surface1, "#161618"]} style={styles.exerciseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.exHeader}>
                <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[ex.primaryMuscle] || COLORS.primary }]} />
                <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                <TouchableOpacity onPress={() => removeExercise(ei)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
              {ex.sets.map((s, si) => (
                <View key={si} style={styles.editRow}>
                  <Text style={styles.editSetNum}>{si + 1}</Text>
                  <TextInput style={styles.editInput} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDim} value={s.weight} onChangeText={(v) => editSet(ei, si, "weight", v)} />
                  <Text style={styles.editX}>×</Text>
                  <TextInput style={styles.editInput} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDim} value={s.reps} onChangeText={(v) => editSet(ei, si, "reps", v)} />
                  <TouchableOpacity style={styles.editDel} onPress={() => removeSet(ei, si)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ei)}>
                <Text style={styles.addSetText}>+ Add Set</Text>
              </TouchableOpacity>
            </LinearGradient>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ─── Read view ──────────────────────────────────────────────────────────────
  let totalVolume = 0;
  let totalSets = 0;
  let prCount = 0;

  const exerciseRows = workout.exercises.map((ex) => {
    const prs = computeExerciseStats(allWorkouts, ex.name).prs;
    const agg = sessionAggregates(ex.sets);
    const prTypes: string[] = [];
    if (agg.heaviestWeight > 0 && agg.heaviestWeight >= prs.heaviestWeight) prTypes.push("Weight");
    if (agg.best1RM > 0 && agg.best1RM >= prs.best1RM) prTypes.push("1RM");
    if (agg.volume > 0 && agg.volume >= prs.bestVolume) prTypes.push("Volume");

    for (const s of ex.sets) {
      totalSets++;
      totalVolume += num(s.weight) * num(s.reps);
    }
    if (prTypes.length > 0) prCount++;

    return { ex, prTypes };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{workout.name}</Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>{formatDate(workout.date)}</Text>

        {/* Summary stats */}
        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(workout.durationSeconds)}</Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(totalVolume).toLocaleString()}</Text>
            <Text style={styles.statLabel}>VOLUME</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>SETS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, prCount > 0 && { color: COLORS.primary }]}>{prCount}</Text>
            <Text style={styles.statLabel}>PRs</Text>
          </View>
        </View>

        {/* Per-exercise breakdown */}
        {exerciseRows.map(({ ex, prTypes }, ei) => {
          const ssId = ex.supersetId;
          const ssColor = ssId ? supersetColor(ssId) : null;
          const firstOfGroup = !!ssId && (ei === 0 || workout.exercises[ei - 1].supersetId !== ssId);
          return (
          <LinearGradient
            key={ei}
            colors={[COLORS.surface1, "#161618"]}
            style={[styles.exerciseCard, ssColor ? { borderLeftWidth: 3, borderLeftColor: ssColor } : null]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {firstOfGroup && (
              <View style={[styles.supersetChip, { backgroundColor: `${ssColor}22` }]}>
                <Ionicons name="repeat" size={12} color={ssColor!} />
                <Text style={[styles.supersetChipText, { color: ssColor! }]}>SUPERSET</Text>
              </View>
            )}
            <View style={styles.exHeader}>
              <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[ex.primaryMuscle] || COLORS.primary }]} />
              <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
              {prTypes.length > 0 && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>🏆 {prTypes.join(" · ")}</Text>
                </View>
              )}
            </View>

            {ex.note ? <Text style={styles.exNote}>{ex.note}</Text> : null}

            {ex.sets.map((s, si) => {
              const meta = SET_TYPE_META[s.type ?? "normal"];
              return (
                <View key={si} style={styles.setRow}>
                  <View style={styles.setBadge}>
                    <Text style={[styles.setBadgeText, meta.label ? { color: meta.color } : null]}>
                      {meta.label || si + 1}
                    </Text>
                  </View>
                  <Text style={styles.setText}>
                    {s.weight || 0} <Text style={styles.setUnit}>lbs</Text> × {s.reps || 0} <Text style={styles.setUnit}>reps</Text>
                  </Text>
                  {s.rpe ? <Text style={styles.rpe}>RPE {s.rpe}</Text> : null}
                </View>
              );
            })}
          </LinearGradient>
          );
        })}
      </ScrollView>

      {/* "…" menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle} numberOfLines={1}>{workout.name}</Text>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuOpen(false); onRepeat?.(workout); }}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.menuOptionText}>Repeat workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={startEdit}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuOptionText}>Edit workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuOpen(false); setConfirmDelete(true); }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[styles.menuOptionText, { color: COLORS.error }]}>Delete workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm delete */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Delete workout?</Text>
            <Text style={styles.confirmMsg}>“{workout.name}” will be permanently deleted. This can’t be undone.</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDelete(false)} disabled={saving}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={doDelete} disabled={saving}>
                <Text style={styles.confirmDeleteText}>{saving ? "Deleting…" : "Delete"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 8,
  },
  headerTitle: { flex: 1, fontFamily: FONTS.heading, color: COLORS.text, fontSize: 20, textAlign: "center", marginHorizontal: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  headerAction: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 16 },
  date: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  nameInput: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 24, paddingHorizontal: SPACING.lg, paddingVertical: 16, letterSpacing: 0.3 },
  errorText: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, paddingHorizontal: SPACING.lg, marginBottom: 8 },

  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface1,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 16 },
  statLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 10, letterSpacing: 1, marginTop: 4, textTransform: "uppercase" },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: COLORS.border, marginVertical: 4 },

  exerciseCard: {
    marginHorizontal: SPACING.md,
    marginBottom: 12,
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supersetChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, marginBottom: 10 },
  supersetChipText: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 },
  exHeader: { flexDirection: "row", alignItems: "center" },
  exDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  exName: { flex: 1, fontFamily: FONTS.heading, color: COLORS.text, fontSize: 17, letterSpacing: 0.2 },
  prBadge: { backgroundColor: "rgba(204, 255, 0, 0.14)", borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  prBadgeText: { fontFamily: FONTS.mono, color: COLORS.primary, fontSize: 10, letterSpacing: 0.5 },
  exNote: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13, fontStyle: "italic", marginTop: 8, marginLeft: 20 },

  setRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  setBadge: { width: 26, height: 26, borderRadius: RADIUS.sm, backgroundColor: COLORS.base, alignItems: "center", justifyContent: "center", marginRight: 14 },
  setBadgeText: { fontFamily: FONTS.monoBold, color: COLORS.textMuted, fontSize: 13 },
  setText: { flex: 1, fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 15 },
  setUnit: { fontFamily: FONTS.mono, color: COLORS.textDim, fontSize: 11 },
  rpe: { fontFamily: FONTS.mono, color: COLORS.primary, fontSize: 13, marginLeft: 8 },

  // Edit mode
  editRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 8 },
  editSetNum: { fontFamily: FONTS.monoBold, color: COLORS.textMuted, fontSize: 14, width: 22, textAlign: "center" },
  editInput: { flex: 1, fontFamily: FONTS.monoBold, backgroundColor: COLORS.base, color: COLORS.text, borderRadius: RADIUS.md, padding: 10, fontSize: 15, textAlign: "center" },
  editX: { fontFamily: FONTS.mono, color: COLORS.textDim, fontSize: 14 },
  editDel: { width: 28, alignItems: "center" },
  addSetBtn: { marginTop: 10, alignItems: "center", padding: 8 },
  addSetText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 14 },

  // Menu / confirm
  menuOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  menuSheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: COLORS.borderStrong },
  menuTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 17, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  menuOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: COLORS.border },
  menuOptionText: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 16 },
  menuCancel: { marginTop: 16, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  menuCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  confirmTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  confirmMsg: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  confirmCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  confirmDeleteBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: "center" },
  confirmDeleteText: { fontFamily: FONTS.bodyBold, color: "#FFFFFF", fontSize: 15 },
});
