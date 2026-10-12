// MapLibre v6 runs its tile parsing in a web worker that bundlers don't emit; serve the
// package's prebuilt worker from public/ so it always matches the installed version.
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
copyFileSync(join(dist, "maplibre-gl-worker.mjs"), "public/maplibre-gl-worker.mjs");
