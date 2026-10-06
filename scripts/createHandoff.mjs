import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, lstatSync } from "node:fs";
import { resolve, join, relative, dirname } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const release = join(root, "release");
mkdirSync(release, { recursive: true });
const target = mkdtempSync(join(release, "retro-idle-source-"));
const manifest = {};
function copy(path) {
  const info = lstatSync(path);
  if (info.isSymbolicLink()) throw new Error("Symlinks are not allowed in handoff packages.");
  if (info.isDirectory()) {
    for (const name of readdirSync(path).sort()) copy(join(path, name));
    return;
  }
  const name = relative(root, path).replaceAll("\\", "/");
  const data = readFileSync(path);
  const output = join(target, name);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, data);
  manifest[name] = createHash("sha256").update(data).digest("hex");
}
for (const name of [
  "src",
  "server",
  "tests",
  "scripts",
  "docs",
  ".github",
  "README.md",
  "HANDOFF.md",
  "package.json",
  "package-lock.json",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc.json",
  ".prettierignore",
  ".env.example",
])
  copy(join(root, name));
writeFileSync(join(target, "SHA256SUMS.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(target);
