/**
 * Media detection utility to classify Facebook CDN streams as video or audio.
 */

export type MediaType = "video" | "audio" | "unknown";

function decodeBase64Safe(str: string): string {
	const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
	const padded = normalized.padEnd(
		normalized.length + ((4 - (normalized.length % 4)) % 4),
		"=",
	);

	if (typeof atob === "function") {
		return atob(padded);
	}
	if (typeof Buffer !== "undefined") {
		return Buffer.from(padded, "base64").toString("utf-8");
	}
	return "";
}

/**
 * Classifies a CDN stream URL as 'video', 'audio', or 'unknown'.
 * Inspects Facebook's `efg` metadata query param first, then falls back to URL heuristics.
 */
export function detectMediaType(urlStr: string): MediaType {
	let pathAndSearch = urlStr;
	try {
		const parsed = new URL(
			urlStr,
			urlStr.startsWith("http") ? undefined : "https://fb-extractor.internal",
		);
		pathAndSearch = parsed.pathname + parsed.search;
		const efg = parsed.searchParams.get("efg");

		if (efg) {
			try {
				const decoded = decodeBase64Safe(efg).toLowerCase();
				if (decoded.includes("audio")) return "audio";
				if (decoded.includes("video")) return "video";
			} catch {
				// efg decode error - fall through to heuristics
			}
		}
	} catch {
		// URL parsing error - fall through to heuristics
	}

	const lower = pathAndSearch.toLowerCase();
	if (lower.includes("audio") || lower.includes("yxvkawo")) {
		return "audio";
	}
	if (lower.includes("video") || lower.includes("dmlkzw8")) {
		return "video";
	}

	return "unknown";
}
