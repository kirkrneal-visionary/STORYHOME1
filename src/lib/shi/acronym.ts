import { SHI_CAPS } from "@/lib/shi/caps";

/** Build a short acronym badge from a study/frame name. */
export function makeShiAcronym(name: string): string {
  const words = name
    .trim()
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "ARCH";
  if (words.length === 1) {
    return words[0].slice(0, SHI_CAPS.maxAcronymLength).toUpperCase();
  }
  return words
    .slice(0, SHI_CAPS.maxAcronymLength)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
