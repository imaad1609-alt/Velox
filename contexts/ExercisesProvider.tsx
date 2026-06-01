import { createContext, useContext, useEffect, useState } from "react";
import { Exercise, EXERCISES } from "../constants/exercises";
import { subscribeExercises } from "../utils/exercises";

// Provides the exercise catalog to the whole app. Initialised synchronously
// from the bundled list (no loading spinner, works offline), then kept in sync
// with Firestore overrides — so demo media added in the console appears live.
const ExercisesContext = createContext<Exercise[]>(EXERCISES);

export const useExercises = () => useContext(ExercisesContext);

export const ExercisesProvider = ({ children }: { children: React.ReactNode }) => {
  const [exercises, setExercises] = useState<Exercise[]>(EXERCISES);

  useEffect(() => {
    const unsub = subscribeExercises(setExercises);
    return unsub;
  }, []);

  return <ExercisesContext.Provider value={exercises}>{children}</ExercisesContext.Provider>;
};
