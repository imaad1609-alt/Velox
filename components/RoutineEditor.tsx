import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Exercise, MUSCLE_COLORS } from "../constants/exercises";
import { deleteRoutine, RoutineExercise, updateRoutine } from "../utils/routines";
import { ExercisePicker } from "./ExercisePicker";

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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  // ─── Auto-save ──────────────────────────────────────────────────────────────
  // Debounce 600ms after the last edit, then patch Firestore. The initial mount
  // carries the values we loaded, so we skip saving on that first run.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateRoutine(routineId, { name: name.trim() || "Untitled Routine", exercises });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [name, exercises, routineId]);

  // ─── Close ────────────────────────────────────────────────────────────────
  const handleClose = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Drop an empty just-created routine instead of leaving clutter behind.
    if (isNew && exercises.length === 0) {
      try { await deleteRoutine(routineId); } catch {}
      onClose();
      return;
    }
    // Flush any pending edit so nothing is lost on the way out.
    try { await updateRoutine(routineId, { name: name.trim() || "Untitled Routine", exercises }); } catch {}
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
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.headerAction}>Done</Text>
        </TouchableOpacity>
        <Text style={styles.saveStatus}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : ""}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Routine name */}
        <TextInput
          style={styles.nameInput}
          placeholder="Routine name"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
        />

        {exercises.length === 0 && (
          <Text style={styles.emptyHint}>Add exercises to build your routine. Your changes save automatically.</Text>
        )}

        {exercises.map((item, ei) => (
          <LinearGradient key={ei} colors={["#1A1A2E", "#16213E"]} style={styles.exerciseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[item.primaryMuscle] || "#6C63FF" }]} />
              <Text style={styles.exerciseTitle}>{item.name}</Text>
              <TouchableOpacity style={styles.deleteExBtn} onPress={() => deleteExercise(ei)}>
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
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
              <View key={si} style={styles.setRow}>
                <Text style={[styles.setNum, { flex: 0.5 }]}>{si + 1}</Text>
                <TextInput style={[styles.setInput, { flex: 1 }]} placeholder="—" placeholderTextColor="#555" keyboardType="numeric" value={set.weight} onChangeText={(v) => updateSet(ei, si, "weight", v)} />
                <TextInput style={[styles.setInput, { flex: 1 }]} placeholder="—" placeholderTextColor="#555" keyboardType="numeric" value={set.reps} onChangeText={(v) => updateSet(ei, si, "reps", v)} />
                <TouchableOpacity style={styles.deleteSetBtn} onPress={() => deleteSet(ei, si)}>
                  <Ionicons name="close" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ei)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </LinearGradient>
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderColor: "#1A1A2E" },
  headerAction: { color: "#00C9A7", fontSize: 16, fontWeight: "600" },
  saveStatus: { color: "#888", fontSize: 13, fontVariant: ["tabular-nums"] },
  nameInput: { color: "#FFF", fontSize: 22, fontWeight: "bold", paddingHorizontal: 20, paddingVertical: 16 },
  emptyHint: { color: "#666", fontSize: 14, lineHeight: 20, paddingHorizontal: 20, marginBottom: 8 },
  exerciseCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#2A2A4A" },
  exDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  exerciseTitle: { fontSize: 17, fontWeight: "bold", color: "#FFF", flex: 1 },
  deleteExBtn: { padding: 4 },
  exerciseSub: { fontSize: 12, color: "#888", marginBottom: 14, marginLeft: 20 },
  setHeader: { flexDirection: "row", marginBottom: 8 },
  setCol: { fontSize: 11, color: "#666", fontWeight: "700", textTransform: "uppercase", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setNum: { color: "#888", fontSize: 15, textAlign: "center" },
  setInput: { backgroundColor: "#0D0D0D", color: "#FFF", borderRadius: 8, padding: 10, marginHorizontal: 3, fontSize: 15, textAlign: "center" },
  deleteSetBtn: { flex: 0.5, height: 38, alignItems: "center", justifyContent: "center" },
  addSetBtn: { marginTop: 8, alignItems: "center", padding: 8 },
  addSetText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
  addExBtn: { marginHorizontal: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#2A2A4A", alignItems: "center" },
  addExText: { color: "#6C63FF", fontSize: 16, fontWeight: "600" },
});
