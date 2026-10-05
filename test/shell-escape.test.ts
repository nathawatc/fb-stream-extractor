import test from "node:test";
import assert from "node:assert/strict";
import { shellEscape } from "../src/utils/shell-escape.ts";

test("shellEscape", async (t) => {
	await t.test("wraps plain strings in single quotes", () => {
		assert.equal(shellEscape("hello"), "'hello'");
		assert.equal(shellEscape("simple_url_123"), "'simple_url_123'");
	});

	await t.test("escapes embedded single quotes safely", () => {
		assert.equal(shellEscape("don't"), "'don'\\''t'");
		assert.equal(shellEscape("it's a 'test'"), "'it'\\''s a '\\''test'\\'''");
	});

	await t.test(
		"neutralizes shell metacharacters and prevents command injection",
		() => {
			// Tests malicious payloads like $(rm -rf /), backticks, ampersands, semicolons
			const injection1 = "https://evil.com/video.mp4; rm -rf /";
			assert.equal(
				shellEscape(injection1),
				"'https://evil.com/video.mp4; rm -rf /'",
			);

			const injection2 = "https://evil.com/`reboot`?x=$(whoami)&y=$HOME";
			assert.equal(
				shellEscape(injection2),
				"'https://evil.com/`reboot`?x=$(whoami)&y=$HOME'",
			);

			const metachars = "foo & bar | baz && qux || quux > out < in * ? [] {}";
			assert.equal(shellEscape(metachars), `'${metachars}'`);
		},
	);

	await t.test("handles empty string", () => {
		assert.equal(shellEscape(""), "''");
	});

	await t.test(
		"handles complex CDN URLs with queries and special characters",
		() => {
			const url =
				"https://video.xx.fbcdn.net/v/t15.13418-10/file.mp4?_nc_cat=101&ccb=1-7&_nc_sid=55d0d3&efg=eyJ2aWQiOjEyM30%3D";
			assert.equal(shellEscape(url), `'${url}'`);
		},
	);
});
