import { createContext, useContext, useEffect, useState } from "react";
import { Exercise } from "../constants/exercises";

// ─── Types ────────────────────────────────────────────────────────────────────
export type LoggedSet = { weight: string; reps: string; done: boolean };
export type LoggedExercise = { exercise: Exercise; sets: LoggedSet[] };

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
  addSet: (ei: number) => void;
  deleteSet: (ei: number, si: number) => void;
  updateSet: (ei: number, si: number, field: "weight" | "reps", val: string) => void;
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
    setExercises((prev) => [...prev, { exercise: e, sets: [{ weight: "", reps: "", done: false }] }]);

  const deleteExercise = (ei: number) =>
    setExercises((prev) => prev.filter((_, i) => i !== ei));

  const addSet = (ei: number) =>
    setExercises((prev) => {
      const u = prev.map((ex) => ({ ...ex, sets: [...ex.sets] }));
      u[ei].sets.push({ weight: "", reps: "", done: false });
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
        addSet,
        deleteSet,
        updateSet,
        toggleSet,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};
