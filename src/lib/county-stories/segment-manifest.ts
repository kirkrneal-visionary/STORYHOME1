import { createHash } from "node:crypto";

export type ManifestSegment = {
  id: string;
  position: number;
  storagePath: string;
  byteSize: number;
};

export function manifestFingerprint(segments: readonly ManifestSegment[]): string {
  const ordered = [...segments].sort((a, b) => a.position - b.position);
  const canonical = JSON.stringify(
    ordered.map((segment) => ({
      id: segment.id,
      position: segment.position,
      storagePath: segment.storagePath,
      byteSize: segment.byteSize,
    })),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

export function composedObjectPath(ownerId: string, mediaId: string, revision: number, fingerprint: string): string {
  return `${ownerId}/${mediaId}/composed/r${revision}-${fingerprint.slice(0, 16)}.mp4`;
}
