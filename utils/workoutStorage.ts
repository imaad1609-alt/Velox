import AsyncStorage from "@react-native-async-storage/async-storage";

const WORKOUTS_KEY = "velox_workouts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SavedSet = {
  weight: string;
  reps: string;
  type: string;
  done: boolean;
};

export type SavedExercise = {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: string;
  sets: SavedSet[];
  notes: string;
};

export type SavedWorkout = {
  id: string;
  name: string;
  date: string;         // ISO string
  durationSeconds: number;
  totalSets: number;
  exercises: SavedExercise[];
};

// ─── Save a completed workout ─────────────────────────────────────────────────

export const saveWorkout = async (workout: SavedWorkout): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(WORKOUTS_KEY);
    const workouts: SavedWorkout[] = raw ? JSON.parse(raw) : [];
    workouts.unshift(workout);
    // Keep last 100 workouts on device
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts.slice(0, 100)));
  } catch (e) {
    console.error("Failed to save workout:", e);
  }
};

// ─── Load all workouts (newest first) ────────────────────────────────────────

export const getWorkouts = async (): Promise<SavedWorkout[]> => {
  try {
    const raw = await AsyncStorage.getItem(WORKOUTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ─── Find the last logged sets for a given exercise ───────────────────────────
// Used to pre-fill weight/reps when you add an exercise you've done before

export const getLastSetsForExercise = async (exerciseId: string): Promise<SavedSet[] | null> => {
  try {
    const workouts = await getWorkouts();
    for (const w of workouts) {
      const found = w.exercises.find((e) => e.exerciseId === exerciseId);
      if (found) return found.sets;
    }
    return null;
  } catch {
    return null;
  }
};
