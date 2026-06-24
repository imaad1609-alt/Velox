import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { Exercise } from "../constants/exercises";
import { auth, db } from "../firebaseConfig";

// User-created exercises, stored per-user at users/{uid}/customExercises and
// merged into the catalog by ExercisesProvider. Each doc is an Exercise shape
// (minus id, which is the doc id) flagged isCustom: true.

export type CustomExerciseInput = Omit<Exercise, "id" | "isCustom">;

const customCollection = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return collection(db, "users", uid, "customExercises");
};

const customDoc = (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return doc(db, "users", uid, "customExercises", id);
};

// Live subscription. Returns an unsubscribe function. On error → empty list so
// the bundled catalog still works.
export const subscribeCustomExercises = (
  onChange: (exercises: Exercise[]) => void
) => {
  return onSnapshot(
    customCollection(),
    (snap) => {
      onChange(
        snap.docs.map((d) => ({ id: d.id, isCustom: true, ...(d.data() as CustomExerciseInput) }))
      );
    },
    () => onChange([])
  );
};

export const createCustomExercise = async (data: CustomExerciseInput): Promise<string> => {
  const ref = await addDoc(customCollection(), data);
  return ref.id;
};

export const updateCustomExercise = async (id: string, data: CustomExerciseInput): Promise<void> => {
  await updateDoc(customDoc(id), data as Record<string, unknown>);
};

export const deleteCustomExercise = async (id: string): Promise<void> => {
  await deleteDoc(customDoc(id));
};
