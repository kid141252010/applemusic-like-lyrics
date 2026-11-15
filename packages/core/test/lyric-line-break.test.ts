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
			{ segment: "甲乙丙", index: 0, isWordLike: true },
			{ segment: "丁戊己", index: 3, isWordLike: true },
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
		expect(calcBalancedBreaks(children, 4, text, wordSegmenter)).toEqual([3]);
		expect(calcBalancedBreaks([], 4, "", injected)).toEqual([]);
		setWordSegmenter({ segment: () => [] });
		expect(calcBalancedBreaks(children, 4, text, wordSegmenter)).toEqual([4]);
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

it.each([
	["我的|心脏|扑通|到|不再|普通", 6, "我的心脏扑通/到不再普通"],
	["我的|心脏|扑通|到|不再|普通", 7, "我的心脏扑通到/不再普通"],
	["我的|心脏|扑通|到|不再|普通", 8, "我的心脏扑通到/不再普通"],
	["为|你|照亮|角落|的|光|该|如何|形容", 6, "为你照亮角落/的光该如何/形容"],
	["为|你|照亮|角落|的|光|该|如何|形容", 7, "为你照亮角落的/光该如何形容"],
	["为|你|照亮|角落|的|光|该|如何|形容", 8, "为你照亮角落的光/该如何形容"],
	["你|说|，|再见|之后|我们|还|会|相逢", 6, "你说，/再见之后我们/还会相逢"],
	["你|说|，|再见|之后|我们|还|会|相逢", 7, "你说，再见之后/我们还会相逢"],
])(
	"fills earlier rows without charging the final row: %s at %i",
	(parts, width, expected) => {
		const text = parts.replaceAll("|", "");
		const segmenter: WordSegmenter = {
			*segment() {
				let index = 0;
				for (const segment of parts.split("|")) {
					yield { segment, index, isWordLike: /\p{L}/u.test(segment) };
					index += segment.length;
				}
			},
		};
		const children = [...text].map((text) => ({
			text,
			width: 1,
			isSpace: false,
		}));
		const breaks = [
			0,
			...calcBalancedBreaks(children, width, text, segmenter),
			children.length,
		];
		expect(
			breaks
				.slice(1)
				.map((end, i) => text.slice(breaks[i], end))
				.join("/"),
		).toBe(expected);
	},
);

it("keeps English word units and oversized-unit overflow handling", () => {
	const text = "The music keeps playing in my heart";
	const segmenter = new Intl.Segmenter("en", { granularity: "word" });
	const children = [...segmenter.segment(text)].map(({ segment }) => ({
		text: segment,
		width: segment.length,
		isSpace: !segment.trim(),
	}));
	const breaks = [
		0,
		...calcBalancedBreaks(children, 18, text, segmenter),
		children.length,
	];
	expect(
		breaks
			.slice(1)
			.map((end, i) =>
				children
					.slice(breaks[i], end)
					.map((child) => child.text)
					.join(""),
			)
			.join("/"),
	).toBe("The music keeps /playing in my /heart");
	expect(
		calcBalancedBreaks(
			[
				{ text: "oversized", width: 9, isSpace: false },
				{ text: "end", width: 3, isSpace: false },
			],
			4,
			"oversizedend",
			segmenter,
		),
	).toEqual([1]);
	expect(calcBalancedBreaks([], 4, "", segmenter)).toEqual([]);
});
