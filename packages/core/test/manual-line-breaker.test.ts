import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	type PackedLineBreakToken,
	calcPackedLineRanges,
} from "../src/lyric-player/dom/manual-line-break-algorithm.ts";

function fixedWidthTokens(
	count: number,
	width: number,
	breakPriority = 0,
): PackedLineBreakToken[] {
	return Array.from({ length: count }, () => ({ width, breakPriority }));
}

describe("calcPackedLineRanges", () => {
	it("fills CJK-like equal-width tokens up to the available width", () => {
		const ranges = calcPackedLineRanges(fixedWidthTokens(18, 10), 100, 0);

		expect(ranges[0]).toEqual([0, 9]);
	});

	it("prefers the last fitting space before punctuation and ordinary bounds", () => {
		const tokens: PackedLineBreakToken[] = [
			{ width: 20, breakPriority: 0 },
			{ width: 5, breakPriority: 3 },
			{ width: 20, breakPriority: 0 },
			{ width: 5, breakPriority: 2 },
			{ width: 20, breakPriority: 0 },
		];

		const ranges = calcPackedLineRanges(tokens, 50, 0);

		expect(ranges[0]).toEqual([0, 3]);
	});

	it("uses the last fitting punctuation when there is no fitting space", () => {
		const tokens: PackedLineBreakToken[] = [
			{ width: 20, breakPriority: 0 },
			{ width: 5, breakPriority: 3 },
			{ width: 20, breakPriority: 0 },
			{ width: 5, breakPriority: 3 },
			{ width: 20, breakPriority: 0 },
		];

		const ranges = calcPackedLineRanges(tokens, 50, 0);

		expect(ranges[0]).toEqual([0, 3]);
	});

	it("keeps an oversized unbreakable token on its own line", () => {
		const ranges = calcPackedLineRanges(
			[
				{ width: 120, breakPriority: 0 },
				{ width: 10, breakPriority: 0 },
				{ width: 10, breakPriority: 0 },
			],
			50,
			0,
		);

		expect(ranges).toEqual([
			[0, 0],
			[1, 2],
		]);
	});

	it("handles long lines in a single pass style without changing output shape", () => {
		const ranges = calcPackedLineRanges(fixedWidthTokens(500, 10), 100, 0);

		expect(ranges).toHaveLength(50);
		expect(ranges[0]).toEqual([0, 9]);
		expect(ranges[49]).toEqual([490, 499]);
	});
});

describe("manual line break CSS", () => {
	it("keeps manual line spans inline instead of block-stacking them", () => {
		const cssPath = fileURLToPath(
			new URL("../src/styles/lyric-player.module.css", import.meta.url),
		);
		const css = readFileSync(cssPath, "utf8");

		expect(css).toContain(".lyricManualLine");
		expect(css).toContain("white-space: nowrap");
		expect(css).not.toContain(".lyricManualLine > span");
	});
});
