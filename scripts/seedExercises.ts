/**
 * Seeds the bundled exercise catalog into Firestore (collection: `exercises`),
 * one document per exercise keyed by its id. Run this once so you can later add
 * an `imageUrl` to any exercise from the Firestore console — the app picks it up
 * live without an app-store release.
 *
 * Setup (one time):
 *   1. Firebase console → Project settings → Service accounts → "Generate new
 *      private key". Save the file as `serviceAccountKey.json` in the project
 *      root. (It is gitignored — never commit it.)
 *   2. Install dev tooling:  npm install -D firebase-admin tsx
 *
 * Run:
 *   npx tsx scripts/seedExercises.ts
 *
 * Safe to re-run: it merges, so any `imageUrl` you've already set in Firestore
 * is preserved (the bundled catalog never overwrites it).
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EXERCISES } from "../constants/exercises";

const keyPath = path.resolve(process.cwd(), "serviceAccountKey.json");

let serviceAccount: Record<string, unknown>;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  console.error(
    `Could not read ${keyPath}.\n` +
      "Download a service-account key from the Firebase console and save it as " +
      "serviceAccountKey.json in the project root."
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount as any) });
const db = getFirestore();

async function seed() {
  let batch = db.batch();
  let pending = 0;
  let written = 0;

  for (const ex of EXERCISES) {
    const ref = db.collection("exercises").doc(ex.id);

    // Only write imageUrl if the bundled catalog actually defines one, so a
    // re-run never wipes a URL you've added in the console.
    const { imageUrl, ...rest } = ex;
    const payload = imageUrl !== undefined ? { ...rest, imageUrl } : rest;

    batch.set(ref, payload, { merge: true });
    pending++;
    written++;

    // Firestore batches cap at 500 ops.
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }

  if (pending > 0) await batch.commit();
  console.log(`Seeded ${written} exercises into Firestore collection "exercises".`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
