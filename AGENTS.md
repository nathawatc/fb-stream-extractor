# fb-stream-extractor

Browser-context stream extractor generating lossless FFmpeg copy commands
(`-c copy`) for Facebook videos, Reels, and authenticated private groups.

## Architecture Invariants

- **Pure utils boundary:** `src/utils/` contains deterministic,
  side-effect-free helpers. Keep them completely decoupled from DOM and
  browser globals (`window`, `document`, `navigator`, `performance`) so they
  execute in native Node.js.
- **Injected browser dependencies:** `src/extractors/` isolates browser APIs.
  Functions take optional `doc` / `perf` instances with browser-global
  defaults, keeping them unit-testable.
- **Progressive-first extraction:** Progressive MP4 payloads carry muxed
  audio/video at native bitrate. Extract progressive streams first; fall back
  to DASH network requests only when progressive extraction yields no match.
- **DASH stream unsegmentation:** Facebook fragments DASH streams via query
  chunks. Strip `bytestart` and `byteend` parameters to reconstruct full
  stream URLs from chunk requests. Prefer `efg` token inspection over
  heuristic URL matching for stream classification.
- **Standalone zero-dep distribution:** Production bundle
  (`dist/console.min.js`) must remain self-contained IIFE with zero external
  runtime dependencies. Dev dependencies remain limited to build tooling
  (`esbuild`, `typescript`).

## Verification Gate

Every change must satisfy:

1. `npm test` — all native `node:test` assertions pass.
2. `npx tsc --noEmit` — strict typecheck passes with zero errors.
3. `npm run build` — produces functional `dist/console.min.js` IIFE.
