/**
 * Build script: Bundles src/index.ts into a standalone, minified IIFE distribution.
 */

import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const outDir = resolve(rootDir, "dist");
const outFile = resolve(outDir, "console.min.js");

mkdirSync(outDir, { recursive: true });

await esbuild.build({
	entryPoints: [resolve(rootDir, "src/index.ts")],
	outfile: outFile,
	bundle: true,
	minify: true,
	format: "iife",
	target: ["es2020"],
	platform: "browser",
	legalComments: "none",
	sourcemap: false,
});

console.log(`Successfully built IIFE bundle: ${outFile}`);
