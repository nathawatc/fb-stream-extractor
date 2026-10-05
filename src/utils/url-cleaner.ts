/**
 * URL cleaning utilities for Facebook CDN video/audio streams.
 */

/**
 * Unescapes JSON-encoded URL strings found in Facebook inline scripts and payloads.
 * Decodes escaped slashes (\/) and Unicode sequences (e.g., \u0026 -> &).
 */
export function unescapeUrl(url: string): string {
	try {
		return JSON.parse(`"${url}"`);
	} catch {
		return url
			.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
				String.fromCharCode(parseInt(hex, 16)),
			)
			.replace(/\\\//g, "/")
			.replace(/\\/g, "");
	}
}

/**
 * Removes byte-range chunk parameters (bytestart and byteend) from CDN URLs
 * to convert chunked DASH stream requests into full unsegmented stream URLs.
 */
export function stripByteRange(urlStr: string): string {
	try {
		const parsed = new URL(urlStr);
		parsed.searchParams.delete("bytestart");
		parsed.searchParams.delete("byteend");
		return parsed.toString();
	} catch {
		try {
			const dummyBase = "https://fb-extractor.internal";
			const parsed = new URL(urlStr, dummyBase);
			parsed.searchParams.delete("bytestart");
			parsed.searchParams.delete("byteend");
			return parsed.toString().replace(dummyBase, "");
		} catch {
			return urlStr
				.replace(/([?&])bytestart=\d+(&|$)/g, (_m, p1, p2) =>
					p2 === "&" ? p1 : "",
				)
				.replace(/([?&])byteend=\d+(&|$)/g, (_m, p1, p2) =>
					p2 === "&" ? p1 : "",
				)
				.replace(/[?&]$/, "");
		}
	}
}
