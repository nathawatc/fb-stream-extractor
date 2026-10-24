/**
 * Main entrypoint for fb-stream-extractor.
 * Integrates stream extractors, FFmpeg command formatting, and clipboard copying.
 */

import { shellEscape } from "./utils/shell-escape.ts";
import {
	extractProgressiveStream,
	type StreamResult,
} from "./extractors/progressive.ts";
import { extractDashStream } from "./extractors/dash.ts";

declare const copy: ((text: string) => void) | undefined;

const DEFAULT_USER_AGENT =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Builds an optimized FFmpeg direct stream-copy command.
 */
export function buildFfmpegCommand(
	videoUrl: string,
	audioUrl?: string | null,
	options?: { userAgent?: string; filename?: string },
): string {
	const userAgent =
		options?.userAgent ??
		(typeof navigator !== "undefined" && navigator.userAgent
			? navigator.userAgent
			: DEFAULT_USER_AGENT);
	const filename = options?.filename ?? `fb_video_${Date.now()}.mp4`;

	const escapedUA = shellEscape(userAgent);
	const escapedVideo = shellEscape(videoUrl);
	const escapedFilename = shellEscape(filename);

	if (audioUrl) {
		const escapedAudio = shellEscape(audioUrl);
		return `ffmpeg -user_agent ${escapedUA} -i ${escapedVideo} -user_agent ${escapedUA} -i ${escapedAudio} -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart ${escapedFilename}`;
	}

	return `ffmpeg -user_agent ${escapedUA} -i ${escapedVideo} -c copy -movflags +faststart ${escapedFilename}`;
}

/**
 * Multi-tier clipboard copy helper.
 * Tiers: DevTools copy() -> navigator.clipboard -> textarea execCommand
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	const devToolsCopy =
		typeof copy === "function"
			? copy
			: (globalThis as unknown as { copy?: (text: string) => void }).copy;

	if (typeof devToolsCopy === "function") {
		try {
			devToolsCopy(text);
			return true;
		} catch {
			// Fall through to standard APIs
		}
	}

	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Fall through to DOM fallback
		}
	}

	if (
		typeof document !== "undefined" &&
		typeof document.createElement === "function"
	) {
		try {
			const textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			textarea.style.pointerEvents = "none";
			document.body.appendChild(textarea);
			textarea.select();
			const success = document.execCommand("copy");
			document.body.removeChild(textarea);
			return success;
		} catch {
			return false;
		}
	}

	return false;
}

/**
 * Attempts stream extraction via progressive MP4 first, then DASH network timing.
 */
export function extractStream(
	doc?: Document,
	perf?: Performance,
): StreamResult | null {
	return extractProgressiveStream(doc) ?? extractDashStream(perf);
}

/**
 * Executes full extraction lifecycle in the browser context.
 */
export async function runExtractor(): Promise<string | null> {
	console.log(
		"%c🔍 Searching for Facebook video CDN stream URLs...",
		"color: #3b82f6; font-weight: bold;",
	);

	const stream = extractStream();

	if (!stream) {
		console.warn(
			"%c⚠️ No Facebook video streams detected.",
			"color: #f59e0b; font-weight: bold;",
		);
		console.warn(
			"Tip: Play video for 2-3 seconds so browser starts buffering CDN chunks, then re-run.",
		);
		return null;
	}

	const ffmpegCmd = buildFfmpegCommand(stream.videoUrl, stream.audioUrl);
	const copied = await copyToClipboard(ffmpegCmd);

	console.log(
		`%c✅ [${stream.method}] CDN Stream URL extracted!`,
		"color: #10b981; font-weight: bold;",
	);

	if (copied) {
		console.log(
			"%c📋 FFmpeg command copied to clipboard! (Paste with Ctrl+V / Cmd+V in terminal)",
			"color: #06b6d4; font-weight: bold;",
		);
	} else {
		console.log(
			"%c📋 Copy the FFmpeg command below to use:",
			"color: #f59e0b; font-weight: bold;",
		);
	}

	console.log(ffmpegCmd);
	return ffmpegCmd;
}

// Auto-run if executed inside a browser window environment
if (typeof window !== "undefined") {
	void runExtractor();
}
