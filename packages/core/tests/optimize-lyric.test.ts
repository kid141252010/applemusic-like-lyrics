import { describe, expect, it } from "vitest";
import type { LyricLine } from "../src/interfaces.ts";
import { optimizeLyricLines } from "../src/utils/optimize-lyric.ts";

function line(
	startTime: number,
	endTime: number,
	word: string,
	options: Partial<LyricLine> = {},
): LyricLine {
	return {
		words: [{ startTime, endTime, word, romanWord: "" }],
		translatedLyric: "",
		romanLyric: "",
		startTime,
		endTime,
		isBG: false,
		isDuet: false,
		...options,
	};
}

describe("optimizeLyricLines", () => {
	it("keeps at least 300ms pre-entry time for the second consecutive prepositioned background group", () => {
		const lines: LyricLine[] = [
			line(1000, 1800, "main 0"),
			line(700, 900, "bg 0", { isBG: true }),
			line(1600, 2400, "main 1"),
			line(1300, 1500, "bg 1", { isBG: true }),
		];

		optimizeLyricLines(lines);

		const firstBgPreEntry = lines[1].words[0].startTime - lines[0].startTime;
		const secondBgPreEntry = lines[3].words[0].startTime - lines[2].startTime;

		expect(firstBgPreEntry).toBe(600);
		expect(secondBgPreEntry).toBeGreaterThanOrEqual(300);
	});
});
