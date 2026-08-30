import { copyFile, mkdir, readdir, readFile, rm, stat, utimes } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const epoch = new Date("2026-01-01T00:00:00.000Z");
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "icons"), { recursive: true });

const build = spawnSync("pnpm", ["exec", "tsup", "panel.tsx", "--format", "iife", "--platform", "browser", "--target", "chrome120", "--minify", "--no-splitting", "--out-dir", "dist"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);
for (const file of ["manifest.json", "background.js", "content.js", "devtools.js", "devtools.html", "panel.html"]) {
  await copyFile(join(root, file), join(dist, file));
}
const iconSource = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#07111f"/><path d="M28 38h72v52H28z" fill="none" stroke="#408cff" stroke-width="8"/><circle cx="45" cy="55" r="8" fill="#7dd3fc"/><circle cx="83" cy="55" r="8" fill="#7dd3fc"/><circle cx="64" cy="78" r="8" fill="#fbbf24"/><path d="M51 59l9 13m17-13L68 72" stroke="#eaf2ff" stroke-width="5"/></svg>`);
for (const size of [16, 48, 128]) {
  const target = join(dist, "icons", `icon${size}.png`);
  await sharp(iconSource).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(target);
}
async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  }))).flat().sort();
}
const files = await filesBelow(dist);
for (const file of files) await utimes(file, epoch, epoch);
const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));
if (manifest.permissions || manifest.host_permissions) throw new Error("Manifest must not request runtime or host permissions");
for (const icon of Object.values(manifest.icons)) {
  if (!(await stat(join(dist, icon))).isFile()) throw new Error(`Missing manifest icon ${icon}`);
}
if (!(await stat(join(dist, "panel.global.js"))).isFile()) throw new Error("Missing compiled panel script");
if (process.argv.includes("--zip")) {
  const zip = join(root, `prometheus-entity-graph-devtools-${manifest.version}.zip`);
  await rm(zip, { force: true });
  const packed = spawnSync("zip", ["-X", "-q", zip, ...files.map((file) => relative(dist, file))], { cwd: dist, stdio: "inherit" });
  if (packed.status !== 0) process.exit(packed.status ?? 1);
}
