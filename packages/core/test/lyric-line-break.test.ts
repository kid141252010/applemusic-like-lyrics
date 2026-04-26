import { describe, expect, it } from "bun:test";
import {
	type ChildNodeInfo,
	calcPackedBreaks,
} from "../src/utils/lyric-line-break.ts";

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

function fixedWidthChars(text: string, width: number): ChildNodeInfo[] {
	return Array.from(text).map((char) => ({
		text: char,
		width,
		isSpace: char.trim().length === 0,
	}));
}

describe("calcPackedBreaks", () => {
	it("fills CJK lines up to the available width", () => {
		const text = "从来没有一句的怨言你丢多少";
		const children = fixedWidthChars(text, 10);

		const breaks = calcPackedBreaks(children, 100, text, segmenter);

		expect(breaks[0]).toBe(10);
	});

	it("prefers the last fitting space when a line must break", () => {
		const text = "从来没有 一句的怨言 你丢多少它都洗";
		const children = fixedWidthChars(text, 10).map((child) =>
			child.isSpace ? { ...child, width: 5 } : child,
		);

		const breaks = calcPackedBreaks(children, 100, text, segmenter);

		expect(breaks[0]).toBe("从来没有 一句的怨言 ".length);
	});

	it("keeps an oversized unbreakable node on its own line", () => {
		const children: ChildNodeInfo[] = [
			{ text: "unbreakable", width: 120, isSpace: false },
			{ text: "后", width: 10, isSpace: false },
			{ text: "续", width: 10, isSpace: false },
		];
		const text = children.map((child) => child.text).join("");

		const breaks = calcPackedBreaks(children, 100, text, segmenter);

		expect(breaks).toEqual([1]);
	});
});
