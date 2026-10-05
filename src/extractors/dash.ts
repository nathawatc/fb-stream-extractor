/**
 * DASH stream extractor for Facebook videos.
 * Extracts segmented audio and video streams from browser Network Resource Timing.
 */

import { stripByteRange } from "../utils/url-cleaner.ts";
import { detectMediaType } from "../utils/media-detector.ts";
import type { StreamResult } from "./progressive.ts";

/**
 * Extracts DASH stream URLs from PerformanceResourceTiming entries.
 */
export function extractDashStream(perf?: Performance): StreamResult | null {
	const targetPerf =
		perf ?? (typeof performance !== "undefined" ? performance : undefined);
	if (!targetPerf || typeof targetPerf.getEntriesByType !== "function") {
		return null;
	}

	const resources = targetPerf
		.getEntriesByType("resource")
		.map((e) => e.name)
		.filter(
			(url) =>
				url.includes("fbcdn.net") &&
				(url.includes(".mp4") || url.includes("bytestart")),
		)
		.reverse();

	const uniqueCleanUrls = [...new Set(resources.map(stripByteRange))];

	let foundVideo: string | null = null;
	let foundAudio: string | null = null;

	for (const url of uniqueCleanUrls) {
		const type = detectMediaType(url);
		if (type === "video" && !foundVideo) {
			foundVideo = url;
		} else if (type === "audio" && !foundAudio) {
			foundAudio = url;
		}
		if (foundVideo && foundAudio) break;
	}

	if (foundVideo) {
		return {
			videoUrl: foundVideo,
			audioUrl: foundAudio,
			method: foundAudio
				? "DASH Stream (Video + Audio)"
				: "DASH Stream (Video Only)",
		};
	}

	if (uniqueCleanUrls.length > 0) {
		return {
			videoUrl: uniqueCleanUrls[0],
			audioUrl: uniqueCleanUrls[1] ?? null,
			method: "DASH Stream (Fallback Detection)",
		};
	}

	return null;
}
