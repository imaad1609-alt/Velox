import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { ExercisePicker } from "../components/ExercisePicker";
import { PressableScale } from "../components/PressableScale";
import { RoutineEditor } from "../components/RoutineEditor";
import { Exercise, MUSCLE_COLORS } from "../constants/exercises";
import { enterDown, layout } from "../constants/motion";
import { COLORS, FONTS, RADIUS, SPACING } from "../constants/theme";
import { SET_TYPE_LABELS, SET_TYPE_META, SET_TYPE_ORDER } from "../constants/setTypes";
import { useExercises } from "../contexts/ExercisesProvider";
import { DEFAULT_REST, LoggedExercise, useWorkout } from "../contexts/WorkoutContext";
import { createRoutine, deleteRoutine, duplicateRoutine, Routine, subscribeRoutines, updateRoutine } from "../utils/routines";
import { getPreviousPerformance, getWorkouts, PreviousPerformance, SavedSet, SavedWorkout, saveWorkout } from "../utils/workouts";
import { lastPerformedByRoutine } from "../utils/workoutAggregates";
import { createFolder, deleteFolder, renameFolder, RoutineFolder, subscribeFolders } from "../utils/routineFolders";
import { ReorderList } from "../components/ReorderList";
import { WorkoutDetail } from "../components/WorkoutDetail";
import { WorkoutHistory } from "../components/WorkoutHistory";

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

  // Subtle pulse on the countdown in the final seconds.
  const pulse = useSharedValue(1);
  const countStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDoneRef.current();
    } else if (remaining <= 10) {
      pulse.value = withSequence(withTiming(1.08, { duration: 150 }), withTiming(1, { duration: 250 }));
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
    <Animated.View style={styles.timerBox} entering={enterDown()}>
      <Text style={styles.timerLabel}>REST TIMER</Text>
      <Animated.Text style={[styles.timerCount, countStyle]}>{Math.max(0, remaining)}s</Animated.Text>
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
    </Animated.View>
  );
};

// ─── Set "done" button ──────────────────────────────────────────────────────
// Springs a quick scale-pop when a set is marked complete (the marquee
// micro-interaction); the caller still fires the haptic + rest timer.
const DoneButton = ({ done, onToggle }: { done: boolean; onToggle: () => void }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    scale.value = withSequence(withTiming(1.18, { duration: 110 }), withTiming(1, { duration: 140 }));
    onToggle();
  };
  return (
    <Animated.View style={[{ flex: 0.5 }, animStyle]}>
      <TouchableOpacity style={[styles.doneBtn, done && styles.doneBtnActive]} onPress={press}>
        <Text style={[styles.doneBtnText, done && { color: COLORS.onPrimary }]}>{done ? "✓" : "○"}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Routine Card ─────────────────────────────────────────────────────────────
// Relative "last performed" label. undefined → never done.
const lastPerformedLabel = (date?: number) => {
  if (!date) return "Never performed";
  const days = Math.round((Date.now() - date) / 86_400_000);
  if (days <= 0) return "Last performed today";
  if (days === 1) return "Last performed yesterday";
  if (days < 7) return `Last performed ${days}d ago`;
  return `Last performed ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

const RoutineCard = ({
  routine,
  lastPerformed,
  onStart,
  onMenu,
}: {
  routine: Routine;
  lastPerformed?: number;
  onStart: () => void;
  onMenu: () => void;
}) => {
  const preview =
    routine.exercises.length > 0
      ? routine.exercises.map((e) => e.name).join(", ")
      : "No exercises yet";
  const setCount = routine.exercises.reduce((a, e) => a + e.sets.length, 0);
  const meta =
    routine.exercises.length > 0
      ? `${routine.exercises.length} exercise${routine.exercises.length > 1 ? "s" : ""} · ${setCount} set${setCount !== 1 ? "s" : ""}`
      : null;
  return (
    <View style={styles.routineCard}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text style={styles.routineName}>{routine.name}</Text>
        <TouchableOpacity style={styles.routineMenuBtn} onPress={onMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
        </TouchableOpacity>
      </View>
      <Text style={styles.routinePreview} numberOfLines={2}>{preview}</Text>
      <View style={styles.routineMetaRow}>
        {meta && <Text style={styles.routineMeta}>{meta}</Text>}
        <Text style={styles.routineMeta}>{lastPerformedLabel(lastPerformed)}</Text>
      </View>
      <PressableScale style={styles.startRoutineBtn} onPress={onStart} haptic>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDim]} style={styles.startRoutineGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.startRoutineText}>Start Routine</Text>
        </LinearGradient>
      </PressableScale>
    </View>
  );
};

// Stable accent color for a superset group, hashed from its id so different
// groups in one workout get visually distinct bars.
const SUPERSET_COLORS = [COLORS.secondary, "#00C9A7", COLORS.warning, "#54A0FF", "#F368E0"];
const supersetColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return SUPERSET_COLORS[Math.abs(h) % SUPERSET_COLORS.length];
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Workout() {
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
  // Per-exercise "..." options sheet, target exercise being replaced, the
  // superset-partner chooser, exercises whose note input is revealed, and the
  // set whose note input is revealed.
  const [exerciseMenu, setExerciseMenu] = useState<number | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<number | null>(null);
  const [supersetPick, setSupersetPick] = useState<number | null>(null);
  const [showReorder, setShowReorder] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({});
  const [openSetNote, setOpenSetNote] = useState<Record<string, boolean>>({});

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
  const [lastPerformed, setLastPerformed] = useState<Record<string, number>>({});

  // Folders
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [folderMenu, setFolderMenu] = useState<RoutineFolder | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<RoutineFolder | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState<{ id: string | null; name: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<Routine | null>(null);
  const [myRoutinesCollapsed, setMyRoutinesCollapsed] = useState(false);
  const [showExplore, setShowExplore] = useState(false);

  // Workout history (home → History). historyList is the fetched list, threaded
  // into the detail view so it can compute PRs without re-reading Firestore.
  const [showHistory, setShowHistory] = useState(false);
  const [viewingWorkout, setViewingWorkout] = useState<SavedWorkout | null>(null);
  const [historyList, setHistoryList] = useState<SavedWorkout[]>([]);

  // Logger-local UI state
  const [showPicker, setShowPicker] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [routineSaveState, setRoutineSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Live routines list — updates whenever a routine is created, edited, or deleted.
  useEffect(() => {
    const unsub = subscribeRoutines(
      (r) => { setRoutines(r); setRoutinesError(""); },
      (e) => setRoutinesError(e.message)
    );
    return unsub;
  }, []);

  // "Last performed" per routine — refresh when no workout is active (e.g. after
  // finishing one). Failures just leave the labels empty.
  useEffect(() => {
    if (workout.active) return;
    let alive = true;
    getWorkouts()
      .then((ws) => { if (alive) setLastPerformed(lastPerformedByRoutine(ws)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [workout.active]);

  // Live folders list.
  useEffect(() => {
    const unsub = subscribeFolders((f) => setFolders(f), () => {});
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

  const handleDuplicate = async (routine: Routine) => {
    setMenuRoutine(null);
    try { await duplicateRoutine(routine); } catch (e: any) { setRoutinesError(e.message); }
  };

  // ─── Folder actions ──────────────────────────────────────────────────────
  const submitFolderName = async () => {
    if (!folderNameDraft) return;
    const name = folderNameDraft.name.trim() || "New Folder";
    const target = folderNameDraft;
    setFolderNameDraft(null);
    try {
      if (target.id) await renameFolder(target.id, name);
      else await createFolder(name);
    } catch (e: any) { setRoutinesError(e.message); }
  };

  const removeFolder = async (folder: RoutineFolder) => {
    setConfirmDeleteFolder(null);
    // Routines keep their (now-dangling) folderId and fall back to Uncategorized.
    try { await deleteFolder(folder.id); } catch (e: any) { setRoutinesError(e.message); }
  };

  const moveRoutineToFolder = async (routine: Routine, folderId: string | null) => {
    setMoveTarget(null);
    try { await updateRoutine(routine.id, { folderId }); } catch (e: any) { setRoutinesError(e.message); }
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

  // Repeat a past workout: rebuild the logger from a saved session (match
  // exercises by name against the catalog, mirroring startRoutine's fallback).
  const repeatWorkout = (w: SavedWorkout) => {
    if (workout.active) { workout.expand(); return; }
    const loaded: LoggedExercise[] = w.exercises.map((se) => {
      const fromCatalog = catalog.find((e) => e.name === se.name);
      const exercise: Exercise = fromCatalog ?? {
        id: se.name,
        name: se.name,
        primaryMuscle: se.primaryMuscle as Exercise["primaryMuscle"],
        secondaryMuscles: [],
        tertiaryMuscles: [],
        equipment: "Other",
        difficulty: "Beginner",
        instructions: [],
      };
      return {
        exercise,
        sets: se.sets.map((s) => ({ weight: s.weight, reps: s.reps, done: false, type: s.type ?? "normal" })),
        ...(se.supersetId ? { supersetId: se.supersetId } : {}),
      };
    });
    setViewingWorkout(null);
    workout.startWorkout(w.name, loaded);
  };

  // ─── Logger UI wrappers ───────────────────────────────────────────────────
  const handleAddExercise = (e: Exercise) => {
    workout.addExercise(e);
    setShowPicker(false);
  };

  const handleReplaceExercise = (e: Exercise) => {
    if (replaceTarget !== null) workout.replaceExercise(replaceTarget, e);
    setReplaceTarget(null);
  };

  // Move an exercise one slot up/down (the simple, reliable reorder path).
  const moveExercise = (ei: number, dir: -1 | 1) => {
    workout.reorderExercise(ei, ei + dir);
    setExerciseMenu(null);
  };

  const toggleNote = (ei: number) => {
    setOpenNotes((p) => ({ ...p, [ei]: !p[ei] }));
    setExerciseMenu(null);
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
        ...(workout.sourceRoutineId ? { routineId: workout.sourceRoutineId } : {}),
        exercises: workout.exercises.map((item) => ({
          name: item.exercise.name,
          primaryMuscle: item.exercise.primaryMuscle,
          // Keep set type / RPE / notes so history can show them. Firestore
          // rejects `undefined`, so only include optional fields when present.
          sets: item.sets.map((s): SavedSet => ({
            weight: s.weight,
            reps: s.reps,
            ...(s.type !== "normal" ? { type: s.type } : {}),
            ...(s.rpe ? { rpe: s.rpe } : {}),
            ...(s.note ? { note: s.note } : {}),
          })),
          ...(item.note ? { note: item.note } : {}),
          ...(item.supersetId ? { supersetId: item.supersetId } : {}),
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
  if (replaceTarget !== null)
    return <ExercisePicker onSelect={handleReplaceExercise} onClose={() => setReplaceTarget(null)} />;

  // ─── Render: workout history & per-workout detail ────────────────────────────
  if (viewingWorkout)
    return (
      <WorkoutDetail
        workout={viewingWorkout}
        allWorkouts={historyList}
        onClose={() => setViewingWorkout(null)}
        onDeleted={(id) => { setHistoryList((prev) => prev.filter((w) => w.id !== id)); }}
        onUpdated={(updated) => {
          setHistoryList((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
          setViewingWorkout(updated);
        }}
        onRepeat={repeatWorkout}
      />
    );
  if (showHistory)
    return (
      <WorkoutHistory
        onSelect={(w, all) => { setHistoryList(all); setViewingWorkout(w); }}
        onClose={() => setShowHistory(false)}
      />
    );
  if (showExplore) return <ExercisePicker browse onClose={() => setShowExplore(false)} />;

  // ─── Render: workout home ─────────────────────────────────────────────────────
  if (!workout.active || workout.minimized) {
    // Group routines by folder. Routines with no folder (or a deleted one) fall
    // into "Uncategorized", which only renders when it has routines.
    const folderIds = new Set(folders.map((f) => f.id));
    const routinesByFolder = (fid: string) => routines.filter((r) => r.folderId === fid);
    const uncategorized = routines.filter((r) => !r.folderId || !folderIds.has(r.folderId));

    const renderRoutine = (r: Routine) => (
      <RoutineCard
        key={r.id}
        routine={r}
        lastPerformed={lastPerformed[r.id]}
        onStart={() => startRoutine(r)}
        onMenu={() => setMenuRoutine(r)}
      />
    );

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.base }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Animated.View entering={enterDown(0)}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Workout</Text>
                <Text style={styles.headerSub}>Ready to train?</Text>
              </View>
            </View>

            <PressableScale style={styles.startBtn} onPress={startEmptyWorkout} disabled={workout.active} haptic>
              <LinearGradient colors={workout.active ? [COLORS.surface2, COLORS.surface2] : [COLORS.primary, COLORS.primaryDim]} style={styles.startBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={[styles.startBtnText, workout.active && { color: COLORS.textMuted }]}>{workout.active ? "Workout in progress" : "+ Start Empty Workout"}</Text>
              </LinearGradient>
            </PressableScale>

            <TouchableOpacity style={styles.historyBtn} onPress={() => setShowHistory(true)}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={styles.historyBtnText}>History</Text>
              <Ionicons name="chevron-forward" size={18} color="#666" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>

            {/* Routines */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Routines</Text>
              <TouchableOpacity onPress={() => setFolderNameDraft({ id: null, name: "" })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="folder-open-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.routineActionsRow}>
              <TouchableOpacity style={[styles.newRoutineBtn, { flex: 1, marginHorizontal: 0 }]} onPress={newRoutine}>
                <Ionicons name="clipboard-outline" size={18} color={COLORS.primary} />
                <Text style={styles.newRoutineText}>New Routine</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.newRoutineBtn, { flex: 1, marginHorizontal: 0 }]} onPress={() => setShowExplore(true)}>
                <Ionicons name="search" size={18} color={COLORS.primary} />
                <Text style={styles.newRoutineText}>Explore</Text>
              </TouchableOpacity>
            </View>

            {routinesError ? <Text style={styles.errorText}>{routinesError}</Text> : null}

            {routines.length === 0 && folders.length === 0 && !routinesError ? (
              <Text style={styles.emptyRoutines}>No routines yet. Tap “New Routine” to build one — it saves automatically.</Text>
            ) : null}

            {/* Folders */}
            {folders.map((folder) => {
              const items = routinesByFolder(folder.id);
              const collapsed = collapsedFolders[folder.id];
              return (
                <View key={folder.id}>
                  <View style={styles.folderHeader}>
                    <TouchableOpacity
                      style={styles.folderHeaderMain}
                      onPress={() => setCollapsedFolders((p) => ({ ...p, [folder.id]: !p[folder.id] }))}
                    >
                      <Ionicons name={collapsed ? "chevron-forward" : "chevron-down"} size={16} color="#888" />
                      <Ionicons name="folder" size={16} color={COLORS.primary} />
                      <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
                      <Text style={styles.folderCount}>{items.length}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFolderMenu(folder)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="ellipsis-horizontal" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                  {!collapsed && (items.length > 0
                    ? items.map(renderRoutine)
                    : <Text style={styles.folderEmpty}>Empty — move a routine here from its “…” menu.</Text>
                  )}
                </View>
              );
            })}

            {/* My Routines (uncategorized) — collapsible, Hevy-style */}
            {uncategorized.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.myRoutinesHeader}
                  onPress={() => setMyRoutinesCollapsed((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={myRoutinesCollapsed ? "chevron-forward" : "chevron-down"} size={16} color="#888" />
                  <Text style={styles.myRoutinesLabel}>My Routines ({uncategorized.length})</Text>
                </TouchableOpacity>
                {!myRoutinesCollapsed && uncategorized.map(renderRoutine)}
              </>
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
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={styles.menuOptionText}>Edit routine</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => menuRoutine && handleDuplicate(menuRoutine)}>
                <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                <Text style={styles.menuOptionText}>Duplicate routine</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => { const r = menuRoutine; setMenuRoutine(null); if (r) setMoveTarget(r); }}>
                <Ionicons name="folder-outline" size={20} color={COLORS.primary} />
                <Text style={styles.menuOptionText}>Move to folder</Text>
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

        {/* Folder "..." menu */}
        <Modal visible={!!folderMenu} transparent animationType="fade" onRequestClose={() => setFolderMenu(null)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setFolderMenu(null)}>
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle} numberOfLines={1}>{folderMenu?.name}</Text>
              <TouchableOpacity style={styles.menuOption} onPress={() => { const f = folderMenu; setFolderMenu(null); if (f) setFolderNameDraft({ id: f.id, name: f.name }); }}>
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={styles.menuOptionText}>Rename folder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOption} onPress={() => { const f = folderMenu; setFolderMenu(null); if (f) setConfirmDeleteFolder(f); }}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.menuOptionText, { color: "#FF6B6B" }]}>Delete folder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuCancel} onPress={() => setFolderMenu(null)}>
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Move routine to folder */}
        <Modal visible={!!moveTarget} transparent animationType="fade" onRequestClose={() => setMoveTarget(null)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMoveTarget(null)}>
            <View style={styles.menuSheet}>
              <Text style={styles.menuTitle}>Move to folder</Text>
              <TouchableOpacity style={styles.menuOption} onPress={() => moveTarget && moveRoutineToFolder(moveTarget, null)}>
                <Ionicons name="remove-circle-outline" size={20} color="#888" />
                <Text style={styles.menuOptionText}>Uncategorized</Text>
              </TouchableOpacity>
              {folders.map((f) => (
                <TouchableOpacity key={f.id} style={styles.menuOption} onPress={() => moveTarget && moveRoutineToFolder(moveTarget, f.id)}>
                  <Ionicons name="folder" size={20} color={COLORS.primary} />
                  <Text style={styles.menuOptionText} numberOfLines={1}>{f.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.menuCancel} onPress={() => setMoveTarget(null)}>
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* New / rename folder name input */}
        <Modal visible={!!folderNameDraft} transparent animationType="fade" onRequestClose={() => setFolderNameDraft(null)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>{folderNameDraft?.id ? "Rename folder" : "New folder"}</Text>
              <TextInput
                style={styles.folderNameInput}
                placeholder="Folder name"
                placeholderTextColor="#555"
                value={folderNameDraft?.name ?? ""}
                onChangeText={(v) => setFolderNameDraft((p) => (p ? { ...p, name: v } : p))}
                autoFocus
              />
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity style={styles.confirmCancel} onPress={() => setFolderNameDraft(null)}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmFinishBtn} onPress={submitFolderName}>
                  <Text style={styles.confirmFinishText}>{folderNameDraft?.id ? "Save" : "Create"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirm delete folder */}
        <Modal visible={!!confirmDeleteFolder} transparent animationType="fade" onRequestClose={() => setConfirmDeleteFolder(null)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>Delete folder?</Text>
              <Text style={styles.confirmMsg}>
                “{confirmDeleteFolder?.name}” will be deleted. Its routines aren’t deleted — they move to Uncategorized.
              </Text>
              <View style={styles.confirmBtnRow}>
                <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmDeleteFolder(null)}>
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmDeleteBtn} onPress={() => confirmDeleteFolder && removeFolder(confirmDeleteFolder)}>
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
    <View style={{ flex: 1, backgroundColor: COLORS.base }}>
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
          <PressableScale onPress={finishWorkout} haptic>
            <Text style={styles.finishBtn}>Finish</Text>
          </PressableScale>
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
            <Text style={[styles.statValue, { color: showRpe ? COLORS.primary : COLORS.textDim }]}>RPE</Text>
            <Text style={styles.statLabel}>{showRpe ? "SHOWN" : "HIDDEN"}</Text>
          </TouchableOpacity>
        </View>
        {workout.exercises.map((item, ei) => {
          const ssId = item.supersetId;
          const ssColor = ssId ? supersetColor(ssId) : null;
          const firstOfGroup = !!ssId && (ei === 0 || workout.exercises[ei - 1].supersetId !== ssId);
          const noteOpen = openNotes[ei] || !!item.note;
          // Left accent bar (Hevy/spec scannability): lime once every set is
          // done, cobalt while upcoming, superset hue when grouped.
          const allDone = item.sets.length > 0 && item.sets.every((s) => s.done);
          const accent = ssColor ?? (allDone ? COLORS.primary : COLORS.secondary);
          return (
          <Animated.View key={ei} layout={layout} entering={enterDown()}>
          <LinearGradient
            colors={[COLORS.surface1, "#161618"]}
            style={[styles.exerciseCard, { borderLeftWidth: 3, borderLeftColor: accent }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {firstOfGroup && (
              <View style={[styles.supersetChip, { backgroundColor: `${ssColor}22` }]}>
                <Ionicons name="repeat" size={12} color={ssColor!} />
                <Text style={[styles.supersetChipText, { color: ssColor! }]}>SUPERSET</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[item.exercise.primaryMuscle] || COLORS.primary }]} />
              <Text style={styles.exerciseTitle}>{item.exercise.name}</Text>
              <TouchableOpacity style={styles.deleteExBtn} onPress={() => setExerciseMenu(ei)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.exerciseSub}>{item.exercise.primaryMuscle} · {item.exercise.equipment}</Text>
            {noteOpen && (
              <TextInput
                style={styles.exNoteInput}
                placeholder="Add a note for this exercise…"
                placeholderTextColor="#555"
                value={item.note ?? ""}
                onChangeText={(v) => workout.setExerciseNote(ei, v)}
                multiline
              />
            )}
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
              const setNoteOpen = openSetNote[`${ei}-${si}`] || !!set.note;
              return (
                <Animated.View key={si} layout={layout}>
                  <View style={styles.setRow}>
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
                    <DoneButton done={set.done} onToggle={() => handleToggleSet(ei, si)} />
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
                  {setNoteOpen && (
                    <TextInput
                      style={styles.setNoteInput}
                      placeholder="Set note…"
                      placeholderTextColor="#555"
                      value={set.note ?? ""}
                      onChangeText={(v) => workout.setSetNote(ei, si, v)}
                    />
                  )}
                </Animated.View>
              );
            })}
            <PressableScale style={styles.addSetBtn} onPress={() => workout.addSet(ei)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </PressableScale>
          </LinearGradient>
          </Animated.View>
          );
        })}
        <PressableScale style={styles.addExBtn} onPress={() => setShowPicker(true)} haptic>
          <Text style={styles.addExText}>+ Add Exercise</Text>
        </PressableScale>

        {workout.sourceRoutineId && (
          <TouchableOpacity
            style={styles.updateRoutineBtn}
            onPress={saveToRoutine}
            disabled={routineSaveState === "saving" || routineSaveState === "saved"}
          >
            <Ionicons
              name={routineSaveState === "saved" ? "checkmark-circle" : routineSaveState === "error" ? "alert-circle-outline" : "save-outline"}
              size={18}
              color={routineSaveState === "saved" ? COLORS.primary : routineSaveState === "error" ? "#FF6B6B" : "#888"}
            />
            <Text
              style={[
                styles.updateRoutineText,
                routineSaveState === "saved" && { color: COLORS.primary },
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

      {/* Set options: type + note + reorder */}
      <Modal visible={!!typeMenu} transparent animationType="fade" onRequestClose={() => setTypeMenu(null)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setTypeMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Set options</Text>
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
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => { if (typeMenu) setOpenSetNote((p) => ({ ...p, [`${typeMenu.ei}-${typeMenu.si}`]: true })); setTypeMenu(null); }}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuOptionText}>Add note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, typeMenu?.si === 0 && styles.menuOptionDisabled]}
              disabled={typeMenu?.si === 0}
              onPress={() => { if (typeMenu) workout.reorderSet(typeMenu.ei, typeMenu.si, typeMenu.si - 1); setTypeMenu(null); }}
            >
              <Ionicons name="arrow-up" size={20} color="#888" />
              <Text style={styles.menuOptionText}>Move set up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuOption, typeMenu && typeMenu.si >= workout.exercises[typeMenu.ei].sets.length - 1 && styles.menuOptionDisabled]}
              disabled={!!typeMenu && typeMenu.si >= workout.exercises[typeMenu.ei].sets.length - 1}
              onPress={() => { if (typeMenu) workout.reorderSet(typeMenu.ei, typeMenu.si, typeMenu.si + 1); setTypeMenu(null); }}
            >
              <Ionicons name="arrow-down" size={20} color="#888" />
              <Text style={styles.menuOptionText}>Move set down</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setTypeMenu(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Per-exercise "..." options */}
      <Modal visible={exerciseMenu !== null} transparent animationType="fade" onRequestClose={() => setExerciseMenu(null)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setExerciseMenu(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {exerciseMenu !== null ? workout.exercises[exerciseMenu]?.exercise.name : ""}
            </Text>
            <TouchableOpacity style={styles.menuOption} onPress={() => { const ei = exerciseMenu; setExerciseMenu(null); if (ei !== null) setReplaceTarget(ei); }}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
              <Text style={styles.menuOptionText}>Replace exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => exerciseMenu !== null && toggleNote(exerciseMenu)}>
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuOptionText}>{exerciseMenu !== null && (openNotes[exerciseMenu] || workout.exercises[exerciseMenu]?.note) ? "Hide note" : "Add note"}</Text>
            </TouchableOpacity>
            {exerciseMenu !== null && workout.exercises[exerciseMenu]?.supersetId ? (
              <TouchableOpacity style={styles.menuOption} onPress={() => { const ei = exerciseMenu; setExerciseMenu(null); if (ei !== null) workout.removeFromSuperset(ei); }}>
                <Ionicons name="repeat" size={20} color="#FF9F43" />
                <Text style={styles.menuOptionText}>Remove from superset</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuOption} onPress={() => { const ei = exerciseMenu; setExerciseMenu(null); if (ei !== null) setSupersetPick(ei); }} disabled={workout.exercises.length < 2}>
                <Ionicons name="repeat" size={20} color={COLORS.primary} />
                <Text style={styles.menuOptionText}>Add to superset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.menuOption, exerciseMenu === 0 && styles.menuOptionDisabled]} disabled={exerciseMenu === 0} onPress={() => exerciseMenu !== null && moveExercise(exerciseMenu, -1)}>
              <Ionicons name="arrow-up" size={20} color="#888" />
              <Text style={styles.menuOptionText}>Move up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuOption, exerciseMenu === workout.exercises.length - 1 && styles.menuOptionDisabled]} disabled={exerciseMenu === workout.exercises.length - 1} onPress={() => exerciseMenu !== null && moveExercise(exerciseMenu, 1)}>
              <Ionicons name="arrow-down" size={20} color="#888" />
              <Text style={styles.menuOptionText}>Move down</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { setExerciseMenu(null); setShowReorder(true); }} disabled={workout.exercises.length < 2}>
              <Ionicons name="reorder-three" size={20} color="#888" />
              <Text style={styles.menuOptionText}>Reorder all…</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuOption} onPress={() => { const ei = exerciseMenu; setExerciseMenu(null); if (ei !== null) workout.deleteExercise(ei); }}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.menuOptionText, { color: "#FF6B6B" }]}>Remove exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCancel} onPress={() => setExerciseMenu(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Superset partner chooser */}
      <Modal visible={supersetPick !== null} transparent animationType="fade" onRequestClose={() => setSupersetPick(null)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setSupersetPick(null)}>
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>Superset with…</Text>
            {workout.exercises.map((ex, i) =>
              i === supersetPick ? null : (
                <TouchableOpacity
                  key={i}
                  style={styles.menuOption}
                  onPress={() => { const a = supersetPick; setSupersetPick(null); if (a !== null) workout.addToSuperset(a, i); }}
                >
                  <View style={[styles.exDot, { backgroundColor: MUSCLE_COLORS[ex.exercise.primaryMuscle] || COLORS.primary }]} />
                  <Text style={styles.menuOptionText} numberOfLines={1}>{ex.exercise.name}</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setSupersetPick(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Drag-to-reorder exercises */}
      {showReorder && (
        <ReorderList
          items={workout.exercises.map((ex) => ({
            label: ex.exercise.name,
            color: MUSCLE_COLORS[ex.exercise.primaryMuscle] || COLORS.primary,
          }))}
          onDone={(order) => { workout.reorderExercises(order); setShowReorder(false); }}
          onClose={() => setShowReorder(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  headerTitle: { fontFamily: FONTS.display, fontSize: 32, color: COLORS.text, textTransform: "uppercase", letterSpacing: -0.5 },
  headerSub: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  minimizeBtn: { padding: 2 },
  workoutNameInput: { fontFamily: FONTS.heading, fontSize: 24, color: COLORS.text, padding: 0, letterSpacing: 0.3 },
  durationText: { fontFamily: FONTS.mono, fontSize: 15, color: COLORS.primary, marginTop: 2 },
  finishBtn: { fontFamily: FONTS.bodyBold, color: COLORS.primary, fontSize: 16, marginLeft: 12 },

  // Live totals
  statsBar: { flexDirection: "row", alignItems: "center", marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.surface1, borderRadius: RADIUS.lg, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontFamily: FONTS.monoBold, color: COLORS.text, fontSize: 20 },
  statLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 10, letterSpacing: 1, marginTop: 4, textTransform: "uppercase" },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: COLORS.border, marginVertical: 4 },

  // Workout home
  startBtn: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.lg, overflow: "hidden" },
  startBtnGradient: { padding: 18, alignItems: "center" },
  startBtnText: { fontFamily: FONTS.display, color: COLORS.onPrimary, fontSize: 18, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: 12 },
  sectionTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, textTransform: "uppercase", letterSpacing: 0.5 },
  routineActionsRow: { flexDirection: "row", gap: 12, marginHorizontal: SPACING.md },
  newRoutineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: SPACING.md, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1 },
  newRoutineText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 15 },
  folderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.md, marginTop: 22, marginBottom: 10 },
  folderHeaderMain: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  folderName: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 16, flexShrink: 1 },
  folderCount: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 13 },
  folderEmpty: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 13, paddingHorizontal: SPACING.md, marginBottom: 8 },
  folderNameInput: { fontFamily: FONTS.body, backgroundColor: COLORS.base, color: COLORS.text, borderRadius: RADIUS.md, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  historyBtn: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: SPACING.md, marginTop: 12, paddingHorizontal: 18, paddingVertical: 16, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1 },
  historyBtnText: { fontFamily: FONTS.bodySemiBold, color: COLORS.text, fontSize: 15 },
  myRoutinesHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: SPACING.md, marginTop: 22, marginBottom: 10 },
  myRoutinesLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  emptyRoutines: { fontFamily: FONTS.body, color: COLORS.textDim, fontSize: 14, lineHeight: 20, paddingHorizontal: SPACING.md, marginTop: 8 },
  errorText: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, paddingHorizontal: SPACING.md, marginTop: 12 },
  routineCard: { marginHorizontal: SPACING.md, marginBottom: 12, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface1 },
  routineName: { flex: 1, fontFamily: FONTS.heading, color: COLORS.text, fontSize: 18, letterSpacing: 0.2 },
  routineMenuBtn: { paddingLeft: 12 },
  routinePreview: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 8 },
  routineMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 14 },
  routineMeta: { fontFamily: FONTS.mono, color: COLORS.primary, fontSize: 11 },
  startRoutineBtn: { borderRadius: RADIUS.md, overflow: "hidden" },
  startRoutineGradient: { padding: 14, alignItems: "center" },
  startRoutineText: { fontFamily: FONTS.displaySemiBold, color: COLORS.onPrimary, fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5 },

  // Routine menu
  menuOverlay: { flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" },
  menuSheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: COLORS.borderStrong },
  menuTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 17, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  menuOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: COLORS.border },
  menuOptionText: { fontFamily: FONTS.body, color: COLORS.text, fontSize: 16, flexShrink: 1 },
  menuOptionDisabled: { opacity: 0.35 },
  menuCancel: { marginTop: 16, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  menuCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },

  // Finish confirm
  confirmOverlay: { flex: 1, backgroundColor: "#000000CC", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: COLORS.borderStrong },
  confirmTitle: { fontFamily: FONTS.heading, color: COLORS.text, fontSize: 22, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  confirmMsg: { fontFamily: FONTS.body, color: COLORS.textMuted, fontSize: 15, lineHeight: 21, marginBottom: 8 },
  confirmError: { fontFamily: FONTS.body, color: COLORS.error, fontSize: 13, marginBottom: 8 },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  confirmCancel: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  confirmCancelText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 15 },
  confirmFinishBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: "center" },
  confirmFinishText: { fontFamily: FONTS.bodyBold, color: COLORS.onPrimary, fontSize: 15 },
  confirmDeleteBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.error, alignItems: "center" },
  confirmDeleteText: { fontFamily: FONTS.bodyBold, color: "#FFFFFF", fontSize: 15 },

  // Active workout / exercise cards
  exerciseCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.lg, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  supersetChip: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, marginBottom: 8 },
  supersetChipText: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 },
  exNoteInput: { fontFamily: FONTS.body, backgroundColor: COLORS.base, color: COLORS.text, borderRadius: RADIUS.md, padding: 10, fontSize: 14, marginBottom: 12, minHeight: 38 },
  setNoteInput: { fontFamily: FONTS.body, backgroundColor: COLORS.base, color: COLORS.text, borderRadius: RADIUS.md, padding: 8, fontSize: 13, marginBottom: 8, marginLeft: 4 },
  exDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  exerciseTitle: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.text, flex: 1, letterSpacing: 0.2 },
  deleteExBtn: { padding: 4 },
  exerciseSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginBottom: 14, marginLeft: 20 },
  setHeader: { flexDirection: "row", marginBottom: 8 },
  setCol: { fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textDim, letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" },
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setTypeCell: { height: 38, alignItems: "center", justifyContent: "center" },
  setNum: { fontFamily: FONTS.monoBold, color: COLORS.textMuted, fontSize: 15, textAlign: "center" },
  prevText: { fontFamily: FONTS.mono, color: COLORS.textDim, fontSize: 13, textAlign: "center" },
  setInput: { fontFamily: FONTS.monoBold, backgroundColor: COLORS.base, color: COLORS.text, borderRadius: RADIUS.md, padding: 10, marginHorizontal: 3, fontSize: 15, textAlign: "center" },
  setDone: { backgroundColor: "rgba(204, 255, 0, 0.12)", color: COLORS.primary },
  doneBtn: { height: 38, borderRadius: RADIUS.md, backgroundColor: COLORS.base, alignItems: "center", justifyContent: "center" },
  doneBtnActive: { backgroundColor: COLORS.primary },
  doneBtnText: { color: COLORS.text, fontSize: 16, fontWeight: "bold" },
  deleteSetBtn: { flex: 0.5, height: 38, alignItems: "center", justifyContent: "center" },
  addSetBtn: { marginTop: 8, alignItems: "center", padding: 8 },
  addSetText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 14 },
  addExBtn: { marginHorizontal: SPACING.md, padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  addExText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 16 },
  updateRoutineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: SPACING.md, marginTop: 10, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  updateRoutineText: { fontFamily: FONTS.bodySemiBold, color: COLORS.textMuted, fontSize: 14 },

  // Set type picker badge
  typeBadge: { width: 28, height: 28, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 12 },

  // Rest timer
  timerBox: { backgroundColor: COLORS.surface2, margin: SPACING.md, borderRadius: RADIUS.lg, padding: 20, alignItems: "center", borderWidth: 1, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  timerLabel: { fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  timerCount: { fontFamily: FONTS.display, color: COLORS.primary, fontSize: 52 },
  timerTrack: { width: "100%", height: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.base, marginTop: 8, overflow: "hidden" },
  timerFill: { height: 4, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary },
  timerControls: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  timerAdjust: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.base },
  timerAdjustText: { fontFamily: FONTS.mono, color: COLORS.text, fontSize: 14 },
  timerSkip: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  timerSkipText: { fontFamily: FONTS.bodySemiBold, color: COLORS.primary, fontSize: 14 },
});
