import test from "node:test";
import assert from "node:assert/strict";
import { buildFfmpegCommand, extractStream } from "../src/index.ts";
import { extractProgressiveStream } from "../src/extractors/progressive.ts";
import { extractDashStream } from "../src/extractors/dash.ts";

test("buildFfmpegCommand", async (t) => {
	await t.test("builds progressive single-stream command with escaped filename", () => {
		const videoUrl = "https://video.xx.fbcdn.net/file.mp4?sig=123";
		const cmd = buildFfmpegCommand(videoUrl, null, {
			filename: "my video (1).mp4",
			userAgent: "CustomUA/1.0",
		});

		assert.equal(
			cmd,
			"ffmpeg -user_agent 'CustomUA/1.0' -i 'https://video.xx.fbcdn.net/file.mp4?sig=123' -c copy -movflags +faststart 'my video (1).mp4'",
		);
	});

	await t.test(
		"builds dual-stream mux command with explicit stream mapping",
		() => {
			const videoUrl = "https://video.xx.fbcdn.net/v.mp4";
			const audioUrl = "https://video.xx.fbcdn.net/a.mp4";
			const cmd = buildFfmpegCommand(videoUrl, audioUrl, {
				filename: "output.mp4",
				userAgent: "CustomUA/1.0",
			});

			assert.equal(
				cmd,
				"ffmpeg -user_agent 'CustomUA/1.0' -i 'https://video.xx.fbcdn.net/v.mp4' -user_agent 'CustomUA/1.0' -i 'https://video.xx.fbcdn.net/a.mp4' -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart 'output.mp4'",
			);
		},
	);

	await t.test("escapes malicious filename to prevent shell injection", () => {
		const videoUrl = "https://video.xx.fbcdn.net/v.mp4";
		const maliciousFilename = "out.mp4; rm -rf /";
		const cmd = buildFfmpegCommand(videoUrl, null, {
			filename: maliciousFilename,
		});

		assert.match(cmd, /'out\.mp4; rm -rf \/'$/);
	});
});

test("extractProgressiveStream", async (t) => {
	await t.test("extracts stream from script tag textContent", () => {
		const mockDoc = {
			querySelectorAll(selector: string) {
				if (selector === "script") {
					return [
						{
							textContent:
								'{"other":"data"},"browser_native_hd_url":"https:\\/\\/video.xx.fbcdn.net\\/hd.mp4"',
						},
					];
				}
				return [];
			},
			querySelector() {
				return null;
			},
		} as unknown as Document;

		const result = extractProgressiveStream(mockDoc);
		assert.ok(result);
		assert.equal(result.videoUrl, "https://video.xx.fbcdn.net/hd.mp4");
		assert.equal(result.audioUrl, null);
		assert.equal(result.method, "Progressive MP4 (HD Native)");
	});

	await t.test("matches patterns with whitespace after colon", () => {
		const mockDoc = {
			querySelectorAll(selector: string) {
				if (selector === "script") {
					return [
						{
							textContent:
								'"playable_url": "https:\\/\\/video.xx.fbcdn.net\\/sd.mp4"',
						},
					];
				}
				return [];
			},
			querySelector() {
				return null;
			},
		} as unknown as Document;

		const result = extractProgressiveStream(mockDoc);
		assert.ok(result);
		assert.equal(result.videoUrl, "https://video.xx.fbcdn.net/sd.mp4");
		assert.equal(result.method, "Progressive MP4 (SD Playable)");
	});

	await t.test("falls back to HTML5 video element with direct http src", () => {
		const mockDoc = {
			querySelectorAll(selector: string) {
				if (selector === "script") return [];
				if (selector === "video") {
					return [
						{
							src: "https://video.xx.fbcdn.net/direct.mp4",
							paused: false,
							currentTime: 5,
						},
					];
				}
				return [];
			},
			querySelector() {
				return null;
			},
		} as unknown as Document;

		const result = extractProgressiveStream(mockDoc);
		assert.ok(result);
		assert.equal(result.videoUrl, "https://video.xx.fbcdn.net/direct.mp4");
		assert.equal(result.method, "DOM Video Tag");
	});

	await t.test("ignores blob src in video tags", () => {
		const mockDoc = {
			querySelectorAll(selector: string) {
				if (selector === "script") return [];
				if (selector === "video") {
					return [
						{
							src: "blob:https://facebook.com/uuid-1234",
							paused: false,
							currentTime: 5,
						},
					];
				}
				return [];
			},
			querySelector() {
				return null;
			},
		} as unknown as Document;

		const result = extractProgressiveStream(mockDoc);
		assert.equal(result, null);
	});
});

test("extractDashStream", async (t) => {
	await t.test(
		"extracts video and audio streams from Performance resource timing",
		() => {
			const videoUrl =
				"https://video.xx.fbcdn.net/v/stream_video.mp4?bytestart=0&byteend=500";
			const audioUrl =
				"https://video.xx.fbcdn.net/v/stream_audio.mp4?bytestart=0&byteend=200";

			const mockPerf = {
				getEntriesByType(type: string) {
					if (type === "resource") {
						return [{ name: audioUrl }, { name: videoUrl }];
					}
					return [];
				},
			} as unknown as Performance;

			const result = extractDashStream(mockPerf);
			assert.ok(result);
			assert.equal(
				result.videoUrl,
				"https://video.xx.fbcdn.net/v/stream_video.mp4",
			);
			assert.equal(
				result.audioUrl,
				"https://video.xx.fbcdn.net/v/stream_audio.mp4",
			);
			assert.equal(result.method, "DASH Stream (Video + Audio)");
		},
	);

	await t.test(
		"infers audio stream when audio metadata is unclassified",
		() => {
			const videoUrl =
				"https://video.xx.fbcdn.net/v/stream_video.mp4?bytestart=0&byteend=500";
			const unknownTrackUrl =
				"https://video.xx.fbcdn.net/v/t39.123/chunk.mp4?bytestart=0&byteend=200";

			const mockPerf = {
				getEntriesByType(type: string) {
					if (type === "resource") {
						return [{ name: unknownTrackUrl }, { name: videoUrl }];
					}
					return [];
				},
			} as unknown as Performance;

			const result = extractDashStream(mockPerf);
			assert.ok(result);
			assert.equal(
				result.videoUrl,
				"https://video.xx.fbcdn.net/v/stream_video.mp4",
			);
			assert.equal(
				result.audioUrl,
				"https://video.xx.fbcdn.net/v/t39.123/chunk.mp4",
			);
		},
	);

	await t.test("returns null when no fbcdn entries match", () => {
		const mockPerf = {
			getEntriesByType() {
				return [{ name: "https://example.com/asset.js" }];
			},
		} as unknown as Performance;

		assert.equal(extractDashStream(mockPerf), null);
	});
});

test("extractStream", async (t) => {
	await t.test("prefers progressive stream over DASH stream", () => {
		const mockDoc = {
			querySelectorAll(selector: string) {
				if (selector === "script") {
					return [
						{
							textContent:
								'"browser_native_hd_url":"https:\\/\\/video.xx.fbcdn.net\\/hd.mp4"',
						},
					];
				}
				return [];
			},
			querySelector() {
				return null;
			},
		} as unknown as Document;

		const mockPerf = {
			getEntriesByType() {
				return [
					{
						name: "https://video.xx.fbcdn.net/v/dash_video.mp4?bytestart=0",
					},
				];
			},
		} as unknown as Performance;

		const result = extractStream(mockDoc, mockPerf);
		assert.ok(result);
		assert.equal(result.videoUrl, "https://video.xx.fbcdn.net/hd.mp4");
		assert.equal(result.method, "Progressive MP4 (HD Native)");
	});
});
