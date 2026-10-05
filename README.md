# Facebook Stream Extractor

Extracts direct CDN stream URLs from Facebook directly within the browser context
and generates, ready-to-run FFmpeg direct stream-copy command to your clipboard.

## Features

- **Authenticated Private Content:** Runs directly inside your browser session.
- **Zero Re-encoding Loss**
- **Dual-Tier Extraction Strategy:**
  1. **Progressive MP4 Extractor:** Scans HTML payloads for high-bitrate MP4 streams.
  2. **DASH Resource Timing Extractor:** Inspects browser for chunked DASH streams.

## Prerequisites

- **FFmpeg:** Installed on your host system.
- **Node.js:** v22+ (v26+ recommended) to build and run test suites.

### Build from Source

Clone the repository and install dev dependencies:

```bash
npm install
```

Build the production IIFE bundle:

```bash
npm run build
```

The compiled script is written to:

```text
dist/console.min.js
```

### Usage Guide

1. Open Facebook in any modern browser (Chrome, Edge, Brave, Firefox).
2. Navigate to any video, Reel, or authenticated Private Group post.
3. Click **Play** and let the video play for 2–3 seconds.
4. Open Developer Tools (`F12`) and switch to the **Console** tab.
5. Copy the entire `dist/console.min.js`, paste it into the console, and press `Enter`.
6. The terminal FFmpeg command is automatically copied to your system clipboard.
7. Open your terminal and paste to download and mux the video losslessly:
