import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = join(process.cwd(), "src", specifier.slice(2));
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      join(base, "index.ts"),
    ]) {
      if (existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
  }
  return nextResolve(specifier, context);
}
