import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ExercisePicker } from "../components/ExercisePicker";
import { RoutineEditor } from "../components/RoutineEditor";
import { Exercise, MUSCLE_COLORS } from "../constants/exercises";
import { useExercises } from "../contexts/ExercisesProvider";
import { DEFAULT_REST, LoggedExercise, SetType, useWorkout } from "../contexts/WorkoutContext";
import { createRoutine, deleteRoutine, Routine, subscribeRoutines, updateRoutine } from "../utils/routines";
import { getPreviousPerformance, PreviousPerformance, saveWorkout } from "../utils/workouts";

// Visual treatment per set type (Hevy-style). Normal sets just show the number.
const SET_TYPE_ORDER: SetType[] = ["normal", "warmup", "drop", "failure"];
const SET_TYPE_META: Record<SetType, { label: string; color: string }> = {
  normal: { label: "", color: "#888" },
  warmup: { label: "W", color: "#FF9F43" },
  drop: { label: "D", color: "#54A0FF" },
  failure: { label: "F", color: "#FF6B6B" },
};
const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "Normal set",
  warmup: "Warm-up",
  drop: "Drop set",
  failure: "To failure",
};

// ─── Rest Timer ───────────────────────────────────────────────────────────────
// One interval for the life of the timer (remounted per rest via a `key`).
// +/- 15s adjusts the current countdown and remembers the new length for this
// exercise via onChangeSeconds. Skip / reaching zero both call onDone.
const RestTimer = ({
  seconds,
  onChangeSeconds,
  onDone,
}: {
  seconds: number;
  onChangeSeconds: (s: number) => void;
  onDone: () => void;
}) => {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDoneRef.current();
    }
  }, [remaining]);

  const adjust = (delta: number) => {
    const nextTotal = Math.max(15, total + delta);
    setTotal(nextTotal);
    setRemaining((r) => Math.max(0, r + delta));
    onChangeSeconds(nextTotal); // remember for this exercise's next rest
  };

  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <View style={styles.timerBox}>
      <Text style={styles.timerLabel}>REST TIMER</Text>
      <Text style={styles.timerCount}>{Math.max(0, remaining)}s</Text>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.timerControls}>
        <TouchableOpacity style={styles.timerAdjust} onPress={() => adjust(-15)}>
          <Text style={styles.timerAdjustText}>-15s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timerSkip} onPress={onDone}>
          <Text style={styles.timerSkipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.timerAdjust} onPress={() => adjust(15)}>
          <Text style={styles.timerAdjustText}>+15s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Routine Card ─────────────────────────────────────────────────────────────
const RoutineCard = ({
  routine,
  onStart,
  onMenu,
}: {
  routine: Routine;
  onStart: () => void;
  onMenu: () => void;
}) => {
  const preview =
    routine.exercises.length > 0
      ? routine.exercises.map((e) => e.name).join(", ")
      : "No exercises yet";
  return (
    <View style={styles.routineCard}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <TouchableOpacity style={styles.routineMenuBtn} onPress={onMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
        </TouchableOpacity>
      </View>
      <Text style={styles.routinePreview} numberOfLines={2}>{preview}</Text>
      <TouchableOpacity style={styles.startRoutineBtn} onPress={onStart}>
        <LinearGradient colors={["#6C63FF", "#4ECDC4"]} style={styles.startRoutineGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.startRoutineText}>Start Routine</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Workout() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  // Active workout lives in shared context so it survives tab switches.
  const workout = useWorkout();
  const catalog = useExercises();

  // Previous performance: last session's sets per exercise, for inline hints.
  const [prevPerf, setPrevPerf] = useState<PreviousPerformance>({});

  // Rest timer is keyed to the exercise that triggered it, so +/- remembers the
  // right per-exercise length. `timerNonce` forces a fresh countdown each rest.
  const [timerExercise, setTimerExercise] = useState<number | null>(null);
  const [timerNonce, setTimerNonce] = useState(0);

  // Logger view prefs (not workout data → safe as local state).
  const [showRpe, setShowRpe] = useState(false);
  const [typeMenu, setTypeMenu] = useState<{ ei: number; si: number } | null>(null);

  // Live totals across the session.
  const totals = useMemo(() => {
    let volume = 0;
    let doneSets = 0;
    let totalSets = 0;
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        totalSets++;
        if (s.done) {
          doneSets++;
          volume += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
        }
      }
    }
    return { volume, doneSets, totalSets };
  }, [workout.exercises]);

  // Routines (home)
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routinesError, setRoutinesError] = useState("");
  const [editing, setEditing] = useState<{ routine: Routine; isNew: boolean } | null>(null);
  const [menuRoutine, setMenuRoutine] = useState<Routine | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Routine | null>(null);

  // Logger-local UI state
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [routineSaveState, setRoutineSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // Live routines list — updates whenever a routine is created, edited, or deleted.
  useEffect(() => {
    const unsub = subscribeRoutines(
      (r) => { setRoutines(r); setRoutinesError(""); },
      (e) => setRoutinesError(e.message)
    );
    return unsub;
  }, []);

  // Load previous-performance hints once a workout becomes active. On any error
  // (offline, not logged in) we just show no hints — never block logging.
  useEffect(() => {
    if (!workout.active) return;
    let alive = true;
    getPreviousPerformance()
      .then((p) => { if (alive) setPrevPerf(p); })
      .catch(() => { if (alive) setPrevPerf({}); });
    return () => { alive = false; };
  }, [workout.active]);

  const formatDuration = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Routine actions ──────────────────────────────────────────────────────
  const newRoutine = async () => {
    try {
      const id = await createRoutine();
      setEditing({ routine: { id, name: "New Routine", exercises: [], createdAt: Date.now(), updatedAt: Date.now() }, isNew: true });
    } catch (e: any) {
      setRoutinesError(e.message);
    }
  };

  const editRoutine = (routine: Routine) => {
    setMenuRoutine(null);
    setEditing({ routine, isNew: false });
  };

  const askDeleteRoutine = (routine: Routine) => {
    setMenuRoutine(null);
    setConfirmDelete(routine);
  };

  const removeRoutine = async (routine: Routine) => {
    setConfirmDelete(null);
    try { await deleteRoutine(routine.id); } catch (e: any) { setRoutinesError(e.message); }
  };

  const startRoutine = (routine: Routine) => {
    // Don't clobber an in-progress workout — bring it back instead.
    if (workout.active) { workout.expand(); return; }
    // Pre-load the logger with the routine's exercises and planned sets.
    const loaded: LoggedExercise[] = routine.exercises.map((re) => {
      // Prefer the full catalog entry (intact secondary muscles, instructions,
      // media); fall back to the routine's stored summary if it's gone.
      const fromCatalog = catalog.find((e) => e.id === re.exerciseId);
      const exercise: Exercise = fromCatalog ?? {
        id: re.exerciseId,
        name: re.name,
        primaryMuscle: re.primaryMuscle as Exercise["primaryMuscle"],
        secondaryMuscles: [],
        tertiaryMuscles: [],
        equipment: re.equipment as Exercise["equipment"],
        difficulty: "Beginner",
        instructions: [],
      };
      return {
        exercise,
        sets: re.sets.map((s) => ({ weight: s.weight, reps: s.reps, done: false, type: "normal" as const })),
      };
    });
    workout.startWorkout(routine.name, loaded, routine.id);
  };

  const startEmptyWorkout = () => workout.startWorkout("My Workout", []);

  // ─── Logger UI wrappers ───────────────────────────────────────────────────
  const handleAddExercise = (e: Exercise) => {
    workout.addExercise(e);
    setShowPicker(false);
  };

  const handleToggleSet = (ei: number, si: number) => {
    const wasDone = workout.exercises[ei].sets[si].done;
    workout.toggleSet(ei, si);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Only kick off rest when completing a set — not when un-checking one.
    if (!wasDone) {
      setTimerExercise(ei);
      setTimerNonce((n) => n + 1);
      setShowTimer(true);
    }
  };

  // Reset the "Routine updated" indicator whenever the workout changes, so the
  // button re-invites a save after further edits.
  useEffect(() => { setRoutineSaveState("idle"); }, [workout.exercises]);

  // Push the current workout's structure back into the routine it came from —
  // e.g. you added an exercise mid-workout and want to keep it in the template.
  const saveToRoutine = async () => {
    if (!workout.sourceRoutineId) return;
    setRoutineSaveState("saving");
    try {
      await updateRoutine(workout.sourceRoutineId, {
        exercises: workout.exercises.map((item) => ({
          exerciseId: item.exercise.id,
          name: item.exercise.name,
          primaryMuscle: item.exercise.primaryMuscle,
          equipment: item.exercise.equipment,
          sets: item.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
      });
      setRoutineSaveState("saved");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setRoutineSaveState("error");
    }
  };

  const finishWorkout = () => {
    setSaveError("");
    setShowFinishConfirm(true);
  };

  const confirmFinish = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await saveWorkout({
        name: workout.name,
        durationSeconds: workout.elapsed,
        date: Date.now(),
        exercises: workout.exercises.map((item) => ({
          name: item.exercise.name,
          primaryMuscle: item.exercise.primaryMuscle,
          sets: item.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        })),
      });
      setShowFinishConfirm(false);
      workout.endWorkout();
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render: routine editor ─────────────────────────────────────────────────
  if (editing) {
    return (
      <RoutineEditor
        routineId={editing.routine.id}
        initialName={editing.routine.name}
        initialExercises={editing.routine.exercises}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
      />
    );
  }

  // ─── Render: exercise picker (inside a live workout) ─────────────────────────
  if (showPicker) return <ExercisePicker onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />;

  // ─── Render: workout home ─────────────────────────────────────────────────────
  if (!workout.active || workout.minimized) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Workout</Text>
                <Text style={styles.headerSub}>Ready to train?</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={startEmptyWorkout} disabled={workout.active}>
              <LinearGradient colors={workout.active ? ["#2A2A4A", "#2A2A4A"] : ["#6C63FF", "#4ECDC4"]} style={styles.startBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.startBtnText}>{workout.active ? "Workout in progress" : "+ Start Empty Workout"}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Routines */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Routines</Text>
            </View>
            <TouchableOpacity style={styles.newRoutineBtn} onPress={newRoutine}>
              <Ionicons name="clipboard-outline" size={18} color="#6C63FF" />
              <Text style={styles.newRoutineText}>New Routine</Text>
            </TouchableOpacity>

            {routinesError ? <Text style={styles.errorText}>{routinesError}</Text> : null}

            <Text style={styles.myRoutinesLabel}>My Routines ({routines.length})</Text>
            {routines.length === 0 && !routinesError ? (
              <Text style={styles.emptyRoutines}>No routines yet. Tap “New Routine” to build one — it saves automatically.</Text>
            ) : (
              routines.map((r) => (
                <RoutineCard
                  key={r.id}
                  routine={r}
                  onStart={() => startRoutine(r)}
                  onMenu={() => setMenuRoutine(r)}
                />
              ))
            )}

            <View style={{ height: 120 }} />
          </Animated.View>
        </ScrollView>

        {/* Routine "..." menu */}
        <Modal visible={!!menuRoutine} transparent animationType="fade" onRequestClose={() => setMenuRoutine(null)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuRoutine(null)}>
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle} numberOfLines={1}>{menuRoutine?.name}</Text>
              <TouchableOpacity style={styles.menuOption} onPress={() => menuRoutine && editRoutine(menuRoutine)}>
                <Ionicons name="create-outline" size={20} color="#6C63FF" />
                <Text style={styles.menuOptionText}>Edit routine</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => menuRoutine && askDeleteRoutine(menuRoutine)}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.menuOptionText, { color: "#FF6B6B" }]}>Delete routine</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuRoutine(null)}>
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Confirm delete routine */}
        <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Delete routine?</Text>
              <Text style={styles.confirmMsg}>
                “{confirmDelete?.name}” will be permanently deleted. This can’t be undone.
              </Text>
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDelete(null)}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmDeleteBtn} onPress={() => confirmDelete && removeRoutine(confirmDelete)}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─── Render: active workout logger ────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
      {showTimer && timerExercise !== null && workout.exercises[timerExercise] && (
        <RestTimer
          key={`${timerExercise}-${timerNonce}`}
          seconds={workout.exercises[timerExercise].restSeconds ?? DEFAULT_REST}
          onChangeSeconds={(s) => { if (timerExercise !== null) workout.setExerciseRest(timerExercise, s); }}
          onDone={() => setShowTimer(false)}
        />
      )}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.minimizeBtn} onPress={workout.minimize} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-down" size={24} color="#888" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <TextInput
              style={styles.workoutNameInput}
              value={workout.name}
              onChangeText={workout.setName}
              placeholder="Workout name"
              placeholderTextColor="#555"
            />
            <Text style={styles.durationText}>{formatDuration(workout.elapsed)}</Text>
          </View>
          <TouchableOpacity onPress={finishWorkout}>
            <Text style={styles.finishBtn}>Finish</Text>
          </TouchableOpacity>
        </View>

        {/* Live totals */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(totals.volume).toLocaleString()}</Text>
            <Text style={styles.statLabel}>VOLUME (LBS)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totals.doneSets}/{totals.totalSets}</Text>
            <Text style={styles.statLabel}>SETS DONE</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => setShowRpe((v) => !v)}>
            <Text style={[styles.statValue, { color: showRpe ? "#6C63FF" : "#555" }]}>RPE</Text>
            <Text style={styles.statLabel}>{showRpe ? "SHOWN" : "HIDDEN"}</Text>
          </TouchableOpacity>
        </View>
        {workout.exercises.map((item, ei) => (
          <LinearGradient key={ei} colors={["#1A1A2E", "#16213E"]} style={styles.exerciseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[item.exercise.primaryMuscle] || "#6C63FF" }]} />
              <Text style={styles.exerciseTitle}>{item.exercise.name}</Text>
              <TouchableOpacity style={styles.deleteExBtn} onPress={() => workout.deleteExercise(ei)}>
                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.exerciseSub}>{item.exercise.primaryMuscle} · {item.exercise.equipment}</Text>
            <View style={styles.setHeader}>
              <Text style={[styles.setCol, { flex: 0.6 }]}>Set</Text>
              <Text style={[styles.setCol, { flex: 1.2 }]}>Prev</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>lbs</Text>
              <Text style={[styles.setCol, { flex: 1 }]}>Reps</Text>
              {showRpe && <Text style={[styles.setCol, { flex: 0.9 }]}>RPE</Text>}
              <Text style={[styles.setCol, { flex: 0.5 }]}>✓</Text>
              <Text style={[styles.setCol, { flex: 0.5 }]}></Text>
            </View>
            {item.sets.map((set, si) => {
              const prev = prevPerf[item.exercise.name]?.[si];
              const meta = SET_TYPE_META[set.type];
              return (
                <View key={si} style={styles.setRow}>
                  <TouchableOpacity style={[styles.setTypeCell, { flex: 0.6 }]} onPress={() => setTypeMenu({ ei, si })}>
                    <Text style={[styles.setNum, meta.label ? { color: meta.color, fontWeight: "800" } : null]}>
                      {meta.label || si + 1}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.prevText, { flex: 1.2 }]} numberOfLines={1}>
                    {prev && (prev.weight || prev.reps) ? `${prev.weight || 0}×${prev.reps || 0}` : "—"}
                  </Text>
                  <TextInput style={[styles.setInput, { flex: 1 }, set.done && styles.setDone]} placeholder={prev?.weight || "0"} placeholderTextColor="#555" keyboardType="numeric" value={set.weight} onChangeText={(v) => workout.updateSet(ei, si, "weight", v)} editable={!set.done} />
                  <TextInput style={[styles.setInput, { flex: 1 }, set.done && styles.setDone]} placeholder={prev?.reps || "0"} placeholderTextColor="#555" keyboardType="numeric" value={set.reps} onChangeText={(v) => workout.updateSet(ei, si, "reps", v)} editable={!set.done} />
                  {showRpe && (
                    <TextInput style={[styles.setInput, { flex: 0.9 }, set.done && styles.setDone]} placeholder="–" placeholderTextColor="#555" keyboardType="numeric" value={set.rpe ?? ""} onChangeText={(v) => workout.setSetRpe(ei, si, v)} editable={!set.done} />
                  )}
                  <TouchableOpacity style={[styles.doneBtn, { flex: 0.5 }, set.done && styles.doneBtnActive]} onPress={() => handleToggleSet(ei, si)}>
                    <Text style={styles.doneBtnText}>{set.done ? "✓" : "○"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteSetBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      workout.deleteSet(ei, si);
                    }}
                  >
                    <Ionicons name="close" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity style={styles.addSetBtn} onPress={() => workout.addSet(ei)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </LinearGradient>
        ))}
        <TouchableOpacity style={styles.addExBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </TouchableOpacity>

        {workout.sourceRoutineId && (
          <TouchableOpacity
            style={styles.updateRoutineBtn}
            onPress={saveToRoutine}
            disabled={routineSaveState === "saving" || routineSaveState === "saved"}
          >
            <Ionicons
              name={routineSaveState === "saved" ? "checkmark-circle" : routineSaveState === "error" ? "alert-circle-outline" : "save-outline"}
              size={18}
              color={routineSaveState === "saved" ? "#00C9A7" : routineSaveState === "error" ? "#FF6B6B" : "#888"}
            />
            <Text
              style={[
                styles.updateRoutineText,
                routineSaveState === "saved" && { color: "#00C9A7" },
                routineSaveState === "error" && { color: "#FF6B6B" },
              ]}
            >
              {routineSaveState === "saving"
                ? "Updating routine…"
                : routineSaveState === "saved"
                ? "Routine updated"
                : routineSaveState === "error"
                ? "Couldn’t update — tap to retry"
                : "Save changes to routine"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Finish confirmation — works on both phone and web */}
      <Modal visible={showFinishConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Finish Workout?</Text>
            <Text style={styles.confirmMsg}>
              {workout.exercises.length} {workout.exercises.length === 1 ? "exercise" : "exercises"} logged in {formatDuration(workout.elapsed)}.
            </Text>
            {saveError ? <Text style={styles.confirmError}>{saveError}</Text> : null}
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setShowFinishConfirm(false)}
                disabled={saving}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmFinishBtn} onPress={confirmFinish} disabled={saving}>
                <Text style={styles.confirmFinishText}>{saving ? "Saving..." : "Finish"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set type picker */}
      <Modal visible={!!typeMenu} transparent animationType="fade" onRequestClose={() => setTypeMenu(null)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setTypeMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Set type</Text>
            {SET_TYPE_ORDER.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.menuOption}
                onPress={() => { if (typeMenu) workout.setSetType(typeMenu.ei, typeMenu.si, t); setTypeMenu(null); }}
              >
                <View style={[styles.typeBadge, { borderColor: SET_TYPE_META[t].color }]}>
                  <Text style={{ color: SET_TYPE_META[t].color, fontWeight: "800", fontSize: 12 }}>
                    {SET_TYPE_META[t].label || "#"}
                  </Text>
                </View>
                <Text style={styles.menuOptionText}>{SET_TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setTypeMenu(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#FFF" },
  headerSub: { fontSize: 14, color: "#888", marginTop: 2 },
  minimizeBtn: { padding: 2 },
  workoutNameInput: { fontSize: 24, fontWeight: "bold", color: "#FFF", padding: 0 },
  durationText: { fontSize: 15, color: "#6C63FF", fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
  finishBtn: { color: "#00C9A7", fontSize: 16, fontWeight: "600", marginLeft: 12 },

  // Live totals
  statsBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 16, backgroundColor: "#1A1A2E", borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#2A2A4A" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#FFF", fontSize: 18, fontWeight: "bold", fontVariant: ["tabular-nums"] },
  statLabel: { color: "#666", fontSize: 10, letterSpacing: 1, marginTop: 2, fontWeight: "700" },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: "#2A2A4A", marginVertical: 4 },

  // Workout home
  startBtn: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, overflow: "hidden" },
  startBtnGradient: { padding: 18, alignItems: "center" },
  startBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginTop: 20, marginBottom: 12 },
  sectionTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  newRoutineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#2A2A4A", backgroundColor: "#1A1A2E" },
  newRoutineText: { color: "#6C63FF", fontSize: 15, fontWeight: "600" },
  myRoutinesLabel: { color: "#888", fontSize: 14, fontWeight: "600", paddingHorizontal: 24, marginTop: 24, marginBottom: 12 },
  emptyRoutines: { color: "#666", fontSize: 14, lineHeight: 20, paddingHorizontal: 24 },
  errorText: { color: "#FF6B6B", fontSize: 13, paddingHorizontal: 24, marginTop: 12 },
  routineCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#2A2A4A", backgroundColor: "#1A1A2E" },
  routineName: { flex: 1, color: "#FFF", fontSize: 17, fontWeight: "bold" },
  routineMenuBtn: { paddingLeft: 12 },
  routinePreview: { color: "#888", fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  startRoutineBtn: { borderRadius: 12, overflow: "hidden" },
  startRoutineGradient: { padding: 14, alignItems: "center" },
  startRoutineText: { color: "#FFF", fontSize: 15, fontWeight: "bold" },

  // Routine menu
  menuOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  menuSheet: { backgroundColor: "#1A1A2E", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  menuTitle: { color: "#FFF", fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  menuOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#2A2A4A" },
  menuOptionText: { color: "#FFF", fontSize: 16 },
  menuCancel: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#2A2A4A", alignItems: "center" },
  menuCancelText: { color: "#888", fontSize: 15, fontWeight: "600" },

  // Finish confirm
  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: "#1A1A2E", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: "#2A2A4A" },
  confirmTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  confirmMsg: { color: "#AAA", fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmError: { color: "#FF6B6B", fontSize: 13, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#2A2A4A", alignItems: "center" },
  confirmCancelText: { color: "#888", fontSize: 15, fontWeight: "600" },
  confirmFinishBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#00C9A7", alignItems: "center" },
  confirmFinishText: { color: "#0D0D0D", fontSize: 15, fontWeight: "bold" },
  confirmDeleteBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: "#FF6B6B", alignItems: "center" },
  confirmDeleteText: { color: "#0D0D0D", fontSize: 15, fontWeight: "bold" },

  // Active workout / exercise cards
  exerciseCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#2A2A4A" },
  exDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  exerciseTitle: { fontSize: 17, fontWeight: "bold", color: "#FFF", flex: 1 },
  deleteExBtn: { padding: 4 },
  exerciseSub: { fontSize: 12, color: "#888", marginBottom: 14, marginLeft: 20 },
  setHeader: { flexDirection: "row", marginBottom: 8 },
  setCol: { fontSize: 11, color: "#666", fontWeight: "700", textTransform: "uppercase", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setTypeCell: { height: 38, alignItems: "center", justifyContent: "center" },
  setNum: { color: "#888", fontSize: 15, textAlign: "center" },
  prevText: { color: "#666", fontSize: 13, textAlign: "center", fontVariant: ["tabular-nums"] },
  setInput: { backgroundColor: "#0D0D0D", color: "#FFF", borderRadius: 8, padding: 10, marginHorizontal: 3, fontSize: 15, textAlign: "center" },
  setDone: { backgroundColor: "#00C9A720", color: "#00C9A7" },
  doneBtn: { height: 38, borderRadius: 8, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" },
  doneBtnActive: { backgroundColor: "#00C9A7" },
  doneBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  deleteSetBtn: { flex: 0.5, height: 38, alignItems: "center", justifyContent: "center" },
  addSetBtn: { marginTop: 8, alignItems: "center", padding: 8 },
  addSetText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
  addExBtn: { marginHorizontal: 16, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#2A2A4A", alignItems: "center" },
  addExText: { color: "#6C63FF", fontSize: 16, fontWeight: "600" },
  updateRoutineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, marginTop: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#2A2A4A" },
  updateRoutineText: { color: "#888", fontSize: 14, fontWeight: "600" },

  // Set type picker badge
  typeBadge: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 12 },

  // Rest timer
  timerBox: { backgroundColor: "#1A1A2E", margin: 16, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#6C63FF" },
  timerLabel: { color: "#888", fontSize: 11, letterSpacing: 1.5 },
  timerCount: { color: "#6C63FF", fontSize: 52, fontWeight: "bold", fontVariant: ["tabular-nums"] },
  timerTrack: { width: "100%", height: 4, borderRadius: 2, backgroundColor: "#0D0D0D", marginTop: 4, overflow: "hidden" },
  timerFill: { height: 4, borderRadius: 2, backgroundColor: "#6C63FF" },
  timerControls: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  timerAdjust: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#2A2A4A", backgroundColor: "#0D0D0D" },
  timerAdjustText: { color: "#AAA", fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  timerSkip: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#6C63FF" },
  timerSkipText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
});
