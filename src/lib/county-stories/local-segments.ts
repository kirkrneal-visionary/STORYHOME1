/** Temporary clip bytes on this phone. Not a County Story position. Not guaranteed by the browser. */

import { localEvictRank, mayReleaseLocalClips } from "@/lib/county-stories/composition-job";

const DB_NAME = "story-home-county-story";
const STORE = "segments";

export type LocalSegmentRecord = {
  ownerId: string;
  segmentId: string;
  position: number;
  durationMs: number;
  facing: "user" | "environment" | "upload";
  remoteStored: boolean;
  muxAccepted: boolean;
  blob: Blob;
};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "segmentId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function localSegmentsAvailable(): Promise<boolean> {
  return (await openDb()) != null;
}

export async function putLocalSegment(record: LocalSegmentRecord): Promise<"saved" | "unavailable" | "quota"> {
  const db = await openDb();
  if (!db) return "unavailable";
  const write = () =>
    new Promise<"saved" | "quota">((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve("saved");
      tx.onerror = () => resolve(tx.error?.name === "QuotaExceededError" ? "quota" : "quota");
      tx.onabort = () => resolve("quota");
    });
  const first = await write();
  if (first === "saved") return "saved";
  await evictReleasedLocalSegments(record.ownerId);
  return write();
}

export async function listLocalSegments(ownerId: string): Promise<LocalSegmentRecord[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => {
      const rows = (request.result as LocalSegmentRecord[]).filter((row) => row.ownerId === ownerId);
      rows.sort((a, b) => a.position - b.position);
      resolve(rows);
    };
    request.onerror = () => resolve([]);
  });
}

export async function deleteLocalSegment(segmentId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(segmentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function clearLocalSegments(ownerId: string): Promise<void> {
  const rows = await listLocalSegments(ownerId);
  await Promise.all(rows.map((row) => deleteLocalSegment(row.segmentId)));
}

async function evictReleasedLocalSegments(ownerId: string): Promise<void> {
  const rows = await listLocalSegments(ownerId);
  const ranked = [...rows].sort((a, b) => localEvictRank(a) - localEvictRank(b));
  for (const row of ranked) {
    if (localEvictRank(row) > 1) break;
    await deleteLocalSegment(row.segmentId);
  }
}

export async function releaseLocalSegmentsWhenAccepted(ownerId: string, accepted: boolean): Promise<void> {
  if (!mayReleaseLocalClips({ remoteStored: accepted, composed: accepted, validated: accepted, muxAccepted: accepted })) {
    return;
  }
  await clearLocalSegments(ownerId);
}
