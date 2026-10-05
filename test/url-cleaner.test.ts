import test from "node:test";
import assert from "node:assert/strict";
import { unescapeUrl, stripByteRange } from "../src/utils/url-cleaner.ts";
import { detectMediaType } from "../src/utils/media-detector.ts";

test("unescapeUrl", async (t) => {
	await t.test(
		"decodes JSON-escaped forward slashes and unicode ampersand",
		() => {
			const input =
				"https:\\/\\/video.xx.fbcdn.net\\/v\\/t15.13418-10?bytestart=0\\u0026byteend=1000";
			const expected =
				"https://video.xx.fbcdn.net/v/t15.13418-10?bytestart=0&byteend=1000";
			assert.equal(unescapeUrl(input), expected);
		},
	);

	await t.test("decodes arbitrary unicode escapes (e.g. \\u003d -> =)", () => {
		const input =
			"https:\\/\\/video.xx.fbcdn.net\\/v?sig\\u003d12345\\u0026token\\u003dabc";
		const expected = "https://video.xx.fbcdn.net/v?sig=12345&token=abc";
		assert.equal(unescapeUrl(input), expected);
	});

	await t.test("handles already unescaped clean URLs without changes", () => {
		const input = "https://video.xx.fbcdn.net/v/t39.123/video.mp4?key=val";
		assert.equal(unescapeUrl(input), input);
	});

	await t.test("handles malformed JSON strings via fallback regex", () => {
		const input = 'https:\\/\\/video.xx.fbcdn.net\\/test"broken\\u0026foo=bar';
		const result = unescapeUrl(input);
		assert.equal(result.includes("\\/"), false);
		assert.equal(result.includes("\\u0026"), false);
		assert.equal(result.includes("&foo=bar"), true);
	});
});

test("stripByteRange", async (t) => {
	await t.test("removes bytestart and byteend from query parameters", () => {
		const input =
			"https://video.xx.fbcdn.net/video.mp4?bytestart=0&byteend=1048576&efg=token";
		const expected = "https://video.xx.fbcdn.net/video.mp4?efg=token";
		assert.equal(stripByteRange(input), expected);
	});

	await t.test(
		"cleans trailing query mark when only byte range params are present",
		() => {
			const input =
				"https://video.xx.fbcdn.net/video.mp4?bytestart=0&byteend=1048576";
			const expected = "https://video.xx.fbcdn.net/video.mp4";
			assert.equal(stripByteRange(input), expected);
		},
	);

	await t.test(
		"handles single byte range parameter (only bytestart or only byteend)",
		() => {
			const input1 =
				"https://video.xx.fbcdn.net/video.mp4?bytestart=5000&tag=1";
			assert.equal(
				stripByteRange(input1),
				"https://video.xx.fbcdn.net/video.mp4?tag=1",
			);

			const input2 = "https://video.xx.fbcdn.net/video.mp4?byteend=9000";
			assert.equal(
				stripByteRange(input2),
				"https://video.xx.fbcdn.net/video.mp4",
			);
		},
	);

	await t.test("preserves URLs with no byte range parameters", () => {
		const input = "https://video.xx.fbcdn.net/video.mp4?efg=abc&oe=123";
		assert.equal(stripByteRange(input), input);
	});

	await t.test("handles relative URLs cleanly", () => {
		const input = "/video.mp4?bytestart=100&byteend=200&other=ok";
		assert.equal(stripByteRange(input), "/video.mp4?other=ok");
	});
});

test("detectMediaType", async (t) => {
	await t.test("classifies video stream from decoded efg token", () => {
		const efgJson = JSON.stringify({
			video_id: 987654321,
			media_type: "video",
		});
		const efgBase64 = Buffer.from(efgJson).toString("base64");
		const url = `https://video.xx.fbcdn.net/v/t15.0/stream.mp4?efg=${encodeURIComponent(efgBase64)}`;

		assert.equal(detectMediaType(url), "video");
	});

	await t.test("classifies audio stream from decoded efg token", () => {
		const efgJson = JSON.stringify({
			audio_channel_configuration: "2",
			bitrate: 128000,
		});
		const efgBase64 = Buffer.from(efgJson).toString("base64");
		const url = `https://video.xx.fbcdn.net/v/t15.0/stream.mp4?efg=${encodeURIComponent(efgBase64)}`;

		assert.equal(detectMediaType(url), "audio");
	});

	await t.test(
		"handles base64url encoding in efg parameter (with - and _ without padding)",
		() => {
			const rawPayload = '{"stream_type":"audio_only"}';
			const base64url = Buffer.from(rawPayload)
				.toString("base64")
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=+$/, "");
			const url = `https://video.xx.fbcdn.net/stream?efg=${base64url}`;

			assert.equal(detectMediaType(url), "audio");
		},
	);

	await t.test("falls back to URL substring heuristics for audio", () => {
		const url1 = "https://video.xx.fbcdn.net/v/audio_live_12345.mp4";
		assert.equal(detectMediaType(url1), "audio");

		const url2 = "https://video.xx.fbcdn.net/v/segment_yxvkawo_chunk.mp4";
		assert.equal(detectMediaType(url2), "audio");
	});

	await t.test("falls back to URL substring heuristics for video", () => {
		const url1 = "https://video.xx.fbcdn.net/v/fb_video_high.mp4";
		assert.equal(detectMediaType(url1), "video");

		const url2 = "https://video.xx.fbcdn.net/v/segment_dmlkzw8_chunk.mp4";
		assert.equal(detectMediaType(url2), "video");
	});

	await t.test("returns unknown when no indicators match", () => {
		const url = "https://example.com/asset_12345.mp4";
		assert.equal(detectMediaType(url), "unknown");
	});
});
