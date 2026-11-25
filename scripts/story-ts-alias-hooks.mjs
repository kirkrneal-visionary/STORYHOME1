import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** `src/lib/geo.ts` and `src/lib/geo/` both exist; a folder is never a module. */
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function resolveCandidates(base) {
  return [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    join(base, "index.ts"),
  ];
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = join(process.cwd(), "src", specifier.slice(2));
    for (const candidate of resolveCandidates(base)) {
      if (isFile(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const base = join(parentDir, specifier);
    for (const candidate of resolveCandidates(base)) {
      if (isFile(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
  }
  return nextResolve(specifier, context);
}
