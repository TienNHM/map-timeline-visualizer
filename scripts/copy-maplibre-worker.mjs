import { copyFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcDir = path.join(projectRoot, "node_modules", "maplibre-gl", "dist");
const destDir = path.join(projectRoot, "public", "maplibre");

mkdirSync(destDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}

console.log("Copied maplibre-gl worker files to public/maplibre");
