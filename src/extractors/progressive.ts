/**
 * Progressive MP4 extractor for Facebook videos.
 * Extracts direct MP4 URLs from DOM script payloads or HTML5 video tags.
 */

import { unescapeUrl } from "../utils/url-cleaner.ts";

export interface StreamResult {
	videoUrl: string;
	audioUrl: string | null;
	method: string;
}

interface Pattern {
	name: string;
	regex: RegExp;
}

const PROGRESSIVE_PATTERNS: Pattern[] = [
	{ name: "HD Native", regex: /"browser_native_hd_url":\s*"(https:[^"]+)"/ },
	{ name: "HD Playable", regex: /"playable_url_quality_hd":\s*"(https:[^"]+)"/ },
	{ name: "SD Native", regex: /"browser_native_sd_url":\s*"(https:[^"]+)"/ },
	{ name: "SD Playable", regex: /"playable_url":\s*"(https:[^"]+)"/ },
];

/**
 * Extracts progressive MP4 streams from HTML scripts or active video elements.
 */
export function extractProgressiveStream(doc?: Document): StreamResult | null {
	const targetDoc =
		doc ?? (typeof document !== "undefined" ? document : undefined);
	if (!targetDoc) return null;

	// 1. Check script tags first to avoid serializing the full DOM tree
	const scripts = targetDoc.querySelectorAll?.("script");
	if (scripts && scripts.length > 0) {
		for (const { name, regex } of PROGRESSIVE_PATTERNS) {
			for (let i = 0; i < scripts.length; i++) {
				const scriptText = scripts[i]?.textContent;
				if (scriptText) {
					const match = scriptText.match(regex);
					if (match && match[1]) {
						return {
							videoUrl: unescapeUrl(match[1]),
							audioUrl: null,
							method: `Progressive MP4 (${name})`,
						};
					}
				}
			}
		}
	}

	// Fall back to scanning full HTML (for synthetic/server DOMs or inline payloads)
	const html =
		targetDoc.documentElement?.innerHTML ||
		(targetDoc as unknown as { innerHTML?: string }).innerHTML ||
		"";
	for (const { name, regex } of PROGRESSIVE_PATTERNS) {
		const match = html.match(regex);
		if (match && match[1]) {
			return {
				videoUrl: unescapeUrl(match[1]),
				audioUrl: null,
				method: `Progressive MP4 (${name})`,
			};
		}
	}

	// 2. Fall back to active or direct HTML5 <video> elements
	const videos = Array.from(targetDoc.querySelectorAll?.("video") ?? []);
	const activeVideo =
		videos.find((v) => !v.paused && v.currentTime > 0) ??
		targetDoc.querySelector?.<HTMLVideoElement>('video[src^="http"]');

	if (activeVideo?.src && !activeVideo.src.startsWith("blob:")) {
		return {
			videoUrl: activeVideo.src,
			audioUrl: null,
			method: "DOM Video Tag",
		};
	}

	return null;
}
