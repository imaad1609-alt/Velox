import { createContext, useContext, useEffect, useState } from "react";
import { Exercise } from "../constants/exercises";

// ─── Types ────────────────────────────────────────────────────────────────────
// A set's "type" mirrors Hevy: a normal working set, a warmup, a drop set, or a
// set taken to failure. It's visual/semantic only — it doesn't change the maths.
export type SetType = "normal" | "warmup" | "drop" | "failure";
export type LoggedSet = {
  weight: string;
  reps: string;
  done: boolean;
  type: SetType;
  rpe?: string;   // optional RPE/RIR, kept as a string so the input stays simple
  note?: string;  // optional per-set note
};
export type LoggedExercise = {
  exercise: Exercise;
  sets: LoggedSet[];
  note?: string;
  restSeconds?: number; // per-exercise rest timer length; defaults to DEFAULT_REST
};

export const DEFAULT_REST = 90;

// A fresh, empty working set.
const newSet = (): LoggedSet => ({ weight: "", reps: "", done: false, type: "normal" });

type WorkoutContextValue = {
  active: boolean;        // is a workout in progress?
  minimized: boolean;     // collapsed into the floating bar?
  name: string;
  exercises: LoggedExercise[];
  elapsed: number;        // seconds since start, ticks every second
  sourceRoutineId: string | null; // the routine this workout was started from, if any

  startWorkout: (name: string, exercises?: LoggedExercise[], routineId?: string | null) => void;
  endWorkout: () => void; // clear everything (used by finish + discard)
  minimize: () => void;
  expand: () => void;
  setName: (n: string) => void;

  addExercise: (e: Exercise) => void;
  deleteExercise: (ei: number) => void;
  reorderExercise: (from: number, to: number) => void;
  replaceExercise: (ei: number, e: Exercise) => void; // swap the exercise, keep its sets
  setExerciseNote: (ei: number, note: string) => void;
  setExerciseRest: (ei: number, seconds: number) => void;
  addSet: (ei: number) => void;
  deleteSet: (ei: number, si: number) => void;
  updateSet: (ei: number, si: number, field: "weight" | "reps", val: string) => void;
  setSetType: (ei: number, si: number, type: SetType) => void;
  setSetRpe: (ei: number, si: number, rpe: string) => void;
  setSetNote: (ei: number, si: number, note: string) => void;
  toggleSet: (ei: number, si: number) => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export const useWorkout = () => {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used inside <WorkoutProvider>");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
// Lives above the tab navigator so the active workout persists while the user
// moves between tabs.
export const WorkoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [name, setName] = useState("My Workout");
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sourceRoutineId, setSourceRoutineId] = useState<string | null>(null);

  // Tick the duration every second while a workout is active.
  useEffect(() => {
    if (!active || startTime === null) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active, startTime]);

  const startWorkout = (workoutName: string, initial: LoggedExercise[] = [], routineId: string | null = null) => {
    setName(workoutName);
    setExercises(initial);
    setStartTime(Date.now());
    setElapsed(0);
    setMinimized(false);
    setSourceRoutineId(routineId);
    setActive(true);
  };

  const endWorkout = () => {
    setActive(false);
    setMinimized(false);
    setExercises([]);
    setStartTime(null);
    setElapsed(0);
    setSourceRoutineId(null);
  };

  const addExercise = (e: Exercise) =>
    setExercises((prev) => [...prev, { exercise: e, sets: [newSet()] }]);

  const deleteExercise = (ei: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== ei));

  const reorderExercise = (from: number, to: number) =>
    setExercises((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const u = [...prev];
      const [moved] = u.splice(from, 1);
      u.splice(to, 0, moved);
      return u;
    });

  // Swap the exercise but keep the sets the user already logged.
  const replaceExercise = (ei: number, e: Exercise) =>
    setExercises((prev) => prev.map((ex, i) => (i === ei ? { ...ex, exercise: e } : ex)));

  const setExerciseNote = (ei: number, note: string) =>
    setExercises((prev) => prev.map((ex, i) => (i === ei ? { ...ex, note } : ex)));

  const setExerciseRest = (ei: number, seconds: number) =>
    setExercises((prev) => prev.map((ex, i) => (i === ei ? { ...ex, restSeconds: Math.max(0, seconds) } : ex)));

  const addSet = (ei: number) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: [...ex.sets] }));
      u[ei].sets.push(newSet());
      return u;
    });

  const deleteSet = (ei: number, si: number) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: [...ex.sets] }));
      u[ei].sets = u[ei].sets.filter((_, i) => i !== si);
      return u;
    });

  const updateSet = (ei: number, si: number, field: "weight" | "reps", val: string) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
      u[ei].sets[si][field] = val;
      return u;
    });

  const setSetType = (ei: number, si: number, type: SetType) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
      u[ei].sets[si].type = type;
      return u;
    });

  const setSetRpe = (ei: number, si: number, rpe: string) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
      u[ei].sets[si].rpe = rpe;
      return u;
    });

  const setSetNote = (ei: number, si: number, note: string) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
      u[ei].sets[si].note = note;
      return u;
    });

  const toggleSet = (ei: number, si: number) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }));
      u[ei].sets[si].done = !u[ei].sets[si].done;
      return u;
    });

  return (
    <WorkoutContext.Provider
      value={{
        active,
        minimized,
        name,
        exercises,
        elapsed,
        sourceRoutineId,
        startWorkout,
        endWorkout,
        minimize: () => setMinimized(true),
        expand: () => setMinimized(false),
        setName,
        addExercise,
        deleteExercise,
        reorderExercise,
        replaceExercise,
        setExerciseNote,
        setExerciseRest,
        addSet,
        deleteSet,
        updateSet,
        setSetType,
        setSetRpe,
        setSetNote,
        toggleSet,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};
