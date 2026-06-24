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
// A folder groups routines on the routines home, like Hevy. Routines reference
// a folder by id (Routine.folderId); a routine whose folderId is missing or
// points at a deleted folder is shown under "Uncategorized".

export type RoutineFolder = {
  id: string;
  name: string;
  createdAt: number;
};

const foldersCollection = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return collection(db, "users", uid, "routineFolders");
};

const folderDoc = (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not logged in");
  return doc(db, "users", uid, "routineFolders", id);
};

// Live subscription — fires immediately, then on any change. Oldest-first so
// folder order is stable. Returns an unsubscribe function.
export const subscribeFolders = (
  onChange: (folders: RoutineFolder[]) => void,
  onError?: (e: Error) => void
) => {
  const q = query(foldersCollection(), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoutineFolder, "id">) })));
    },
    (e) => onError?.(e)
  );
};

export const createFolder = async (name = "New Folder"): Promise<string> => {
  const ref = await addDoc(foldersCollection(), { name, createdAt: Date.now() });
  return ref.id;
};

export const renameFolder = async (id: string, name: string): Promise<void> => {
  await updateDoc(folderDoc(id), { name });
};

export const deleteFolder = async (id: string): Promise<void> => {
  await deleteDoc(folderDoc(id));
};
