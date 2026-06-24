import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// ─── Types ────────────────────────────────────────────────────────────────────
// A routine is a reusable workout template. You build it once, then start it
// over and over. Each exercise carries its planned sets (target weight/reps).

export type RoutineSet = { weight: string; reps: string };

export type RoutineExercise = {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  sets: RoutineSet[];
};

export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
  // The folder this routine belongs to. Undefined / unknown → "Uncategorized".
  folderId?: string | null;
};

// Helper: the path to THIS user's routines folder in Firestore
// → users / {userId} / routines
const routinesCollection = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return collection(db, "users", uid, "routines");
};

const routineDoc = (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return doc(db, "users", uid, "routines", id);
};

// Live subscription — fires immediately with the current list, then again
// whenever a routine is added, edited, or deleted (on any device).
// Returns an unsubscribe function.
export const subscribeRoutines = (
  onChange: (routines: Routine[]) => void,
  onError?: (e: Error) => void
) => {
  const q = query(routinesCollection(), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(
        snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Routine, "id">) }))
      );
    },
    (e) => onError?.(e)
  );
};

// Create a fresh empty routine and return its new id so the editor can
// start auto-saving into it.
export const createRoutine = async (name = "New Routine"): Promise<string> => {
  const now = Date.now();
  const ref = await addDoc(routinesCollection(), {
    name,
    exercises: [],
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
};

// Patch a routine. Always bumps updatedAt so the list re-sorts to the top.
export const updateRoutine = async (
  id: string,
  data: Partial<Pick<Routine, "name" | "exercises" | "folderId">>
): Promise<void> => {
  await updateDoc(routineDoc(id), { ...data, updatedAt: Date.now() });
};

export const deleteRoutine = async (id: string): Promise<void> => {
  await deleteDoc(routineDoc(id));
};

// Create a copy of an existing routine (same exercises/folder, name + " (copy)").
export const duplicateRoutine = async (routine: Routine): Promise<string> => {
  const now = Date.now();
  const ref = await addDoc(routinesCollection(), {
    name: `${routine.name} (copy)`,
    exercises: routine.exercises,
    createdAt: now,
    updatedAt: now,
    ...(routine.folderId ? { folderId: routine.folderId } : {}),
  });
  return ref.id;
};
