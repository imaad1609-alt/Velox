import { collection, onSnapshot } from "firebase/firestore";
import { Exercise, EXERCISES } from "../constants/exercises";
import { db } from "../firebaseConfig";

// Live subscription to the Firestore exercise catalog, merged on top of the
// bundled list.
//
// Design (App-Store-safe): the bundled EXERCISES array is always the baseline,
// so the app works instantly, offline, and on first launch. Firestore docs —
// keyed by exercise id — override individual fields (notably `imageUrl`) and may
// add brand-new exercises. This lets you attach demo media or tweak the catalog
// from the Firestore console without shipping a new app build.
//
// On any error (offline, permission denied, empty collection) we fall back to
// the bundled list. Returns an unsubscribe function.
export const subscribeExercises = (onChange: (exercises: Exercise[]) => void) => {
  return onSnapshot(
    collection(db, "exercises"),
    (snap) => {
      if (snap.empty) {
        onChange(EXERCISES);
        return;
      }
      const overrides = new Map<string, Partial<Exercise>>();
      snap.forEach((d) => overrides.set(d.id, d.data() as Partial<Exercise>));

      // Start from bundled, apply overrides field-by-field.
      const merged: Exercise[] = EXERCISES.map((e) => ({ ...e, ...overrides.get(e.id) }));

      // Append any Firestore-only exercises not present in the bundle.
      const bundledIds = new Set(EXERCISES.map((e) => e.id));
      overrides.forEach((data, id) => {
        if (!bundledIds.has(id)) merged.push({ id, ...(data as Omit<Exercise, "id">) });
      });

      onChange(merged);
    },
    () => onChange(EXERCISES)
  );
};
