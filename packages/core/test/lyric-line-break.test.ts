import { expect, it } from "vitest";
import { calcBalancedBreaks } from "#utils/lyric-line-break.ts";
import {
	setWordSegmenter,
	type WordSegmenter,
	wordSegmenter,
} from "#utils/segmenter.ts";

it("discards leading spacing at the selected line start", () => {
	const children = [
		{ text: "aaa", width: 70, isSpace: false },
		{ text: "中", width: 50, isSpace: false, leadingSpacing: 10 },
		{ text: "bbb", width: 60, isSpace: false, leadingSpacing: 10 },
	];
	const breaks = (nodes: typeof children) =>
		calcBalancedBreaks(
			nodes,
			105,
			"aaa中bbb",
			new Intl.Segmenter("en", { granularity: "word" }),
		);
	expect(breaks(children)).toEqual([1]);
	expect(
		breaks(children.map((child) => ({ ...child, leadingSpacing: 0 }))),
	).toEqual([1, 2]);
});

it("在对不起之前断行，避免切开第一九四三句", () => {
	const text = "说了第一九四三句对不起之后";
	const children = [...text].map((text) => ({
		width: 1,
		text,
		isSpace: false,
	}));
	const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

	expect(calcBalancedBreaks(children, 8, text, segmenter)).toEqual([8]);
});

it("uses injected word boundaries and restores the default", () => {
	const nativeSegmenter = wordSegmenter;
	const injected: WordSegmenter = {
		segment: () => [
			{ segment: "甲乙", index: 0, isWordLike: true },
			{ segment: "丙丁戊己", index: 2, isWordLike: true },
		],
	};
	const text = "甲乙丙丁戊己";
	const children = [...text].map((text) => ({
		text,
		width: 1,
		isSpace: false,
	}));
	try {
		setWordSegmenter(injected);
		expect(wordSegmenter).toBe(injected);
		if (!wordSegmenter) throw new Error("missing injected segmenter");
		expect(calcBalancedBreaks(children, 4, text, wordSegmenter)).toEqual([2]);
		expect(calcBalancedBreaks([], 4, "", injected)).toEqual([]);
		setWordSegmenter({ segment: () => [] });
		expect(calcBalancedBreaks(children, 4, text, wordSegmenter)).toEqual([3]);
		const error = new Error("segmentation failed");
		setWordSegmenter({
			segment() {
				throw error;
			},
		});
		const failingSegmenter = wordSegmenter;
		expect(() =>
			calcBalancedBreaks(children, 4, text, failingSegmenter),
		).toThrow(error);
	} finally {
		setWordSegmenter(null);
	}
	expect(wordSegmenter).toBe(nativeSegmenter);
});
