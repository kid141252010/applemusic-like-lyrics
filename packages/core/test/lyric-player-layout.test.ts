import { describe, expect, it } from "bun:test";
import type { LyricLine } from "../src/interfaces.ts";

class MockElement {
	children: MockElement[] = [];
	className = "";
	innerHTML = "";
	dataset: Record<string, string> = {};
	style = {
		setProperty() {},
	};
	classList = {
		add() {},
		remove() {},
	};

	appendChild(child: MockElement): MockElement {
		this.children.push(child);
		return child;
	}

	setAttribute() {}
	addEventListener() {}
	removeEventListener() {}

	get clientWidth(): number {
		return 0;
	}

	get clientHeight(): number {
		return 0;
	}
}

Object.assign(globalThis, {
	document: {
		createElement: () => new MockElement(),
	},
	MouseEvent: class extends Event {},
	ResizeObserver: class {
		observe() {}
		disconnect() {}
	},
	window: {
		addEventListener() {},
		removeEventListener() {},
		innerHeight: 300,
	},
	requestAnimationFrame: (callback: FrameRequestCallback) => {
		callback(0);
		return 0;
	},
});

const { LyricPlayerBase } = await import("../src/lyric-player/index.ts");

interface TransformRecord {
	top: number;
	scale: number;
	opacity: number;
}

class TestLineObject {
	readonly transforms: TransformRecord[] = [];
	preActivateCount = 0;
	dePreActivateCount = 0;
	enableCount = 0;
	isPreActivatedVisible = false;
	lineTransforms = {
		posY: { updateParams() {} },
		scale: { updateParams() {} },
	};

	constructor(private readonly line: LyricLine) {}

	getLine(): LyricLine {
		return this.line;
	}

	setTransform(top: number, scale: number, opacity = 1): void {
		this.transforms.push({ top, scale, opacity });
	}

	preActivate(visible = false): void {
		this.preActivateCount++;
		this.isPreActivatedVisible = visible;
	}
	dePreActivate(): void {
		this.dePreActivateCount++;
		this.isPreActivatedVisible = false;
	}
	enable(): void {
		this.enableCount++;
	}
	disable(): void {
		this.dePreActivate();
	}
	resume(): void {}
	pause(): void {}
	update(): void {}
	dispose(): void {}

	get lastTransform(): TransformRecord {
		const last = this.transforms.at(-1);
		if (!last) throw new Error("line was not transformed");
		return last;
	}
}

class LayoutTestPlayer extends LyricPlayerBase {
	get baseFontSize(): number {
		return 24;
	}

	setLayoutFixture(
		lines: LyricLine[],
		sizes: [number, number][],
		bufferedLines: number[],
		isPlaying: boolean,
	): TestLineObject[] {
		this.size[0] = 400;
		this.size[1] = 300;
		this.alignAnchor = "top";
		this.alignPosition = 0;
		this.scrollOffset = 0;
		this.scrollToIndex = 0;
		this.targetAlignIndex = 0;
		this.lastInterludeState = false;
		this.isPlaying = isPlaying;
		this.processedLines = lines;
		this.initialLayoutFinished = true;
		this.bufferedLines = new Set(bufferedLines);
		this.hotLines = new Set(bufferedLines);

		const objects = lines.map((line) => new TestLineObject(line));
		this.currentLyricLineObjects = objects as never;
		for (let i = 0; i < objects.length; i++) {
			this.lyricLinesSize.set(objects[i] as never, sizes[i]);
		}
		return objects;
	}

	async layout(): Promise<void> {
		await this.calcLayout(true, true);
	}
}

function makeLine(options: {
	isBG?: boolean;
	lineStart?: number;
	wordStart?: number;
}): LyricLine {
	const wordStart = options.wordStart ?? options.lineStart ?? 0;

	return {
		words: [
			{
				word: options.isBG ? "bg" : "main",
				startTime: wordStart,
				endTime: wordStart + 500,
			},
		],
		translatedLyric: "",
		romanLyric: "",
		startTime: options.lineStart ?? wordStart,
		endTime: wordStart + 1000,
		isBG: options.isBG ?? false,
		isDuet: false,
	};
}

describe("LyricPlayerBase background layout", () => {
	it("places paused early background vocals above the main line using word timing", async () => {
		const mainLine = makeLine({ lineStart: 900, wordStart: 1000 });
		const bgLine = makeLine({ isBG: true, lineStart: 900, wordStart: 998 });
		const player = new LayoutTestPlayer();
		const [mainObj, bgObj] = player.setLayoutFixture(
			[mainLine, bgLine],
			[
				[100, 40],
				[80, 20],
			],
			[0, 1],
			false,
		);

		await player.layout();

		expect(bgObj.lastTransform.top).toBe(0);
		expect(mainObj.lastTransform.top).toBe(20);
		expect(bgObj.lastTransform.scale).toBe(100);
	});

	it("keeps background vocals below the main line when the lead is not early enough", async () => {
		const mainLine = makeLine({ lineStart: 900, wordStart: 1000 });
		const bgLine = makeLine({ isBG: true, lineStart: 900, wordStart: 999 });
		const player = new LayoutTestPlayer();
		const [mainObj, bgObj] = player.setLayoutFixture(
			[mainLine, bgLine],
			[
				[100, 40],
				[80, 20],
			],
			[0, 1],
			false,
		);

		await player.layout();

		expect(mainObj.lastTransform.top).toBe(0);
		expect(bgObj.lastTransform.top).toBe(40);
	});

	it("places active early background vocals above the main line while playing", async () => {
		const mainLine = makeLine({ lineStart: 900, wordStart: 1000 });
		const bgLine = makeLine({ isBG: true, lineStart: 900, wordStart: 998 });
		const player = new LayoutTestPlayer();
		const [mainObj, bgObj] = player.setLayoutFixture(
			[mainLine, bgLine],
			[
				[100, 40],
				[80, 20],
			],
			[0, 1],
			true,
		);

		await player.layout();

		expect(bgObj.lastTransform.top).toBe(0);
		expect(mainObj.lastTransform.top).toBe(20);
	});

	it("does not move inactive background vocals above the main line while playing", async () => {
		const mainLine = makeLine({ lineStart: 900, wordStart: 1000 });
		const bgLine = makeLine({ isBG: true, lineStart: 900, wordStart: 998 });
		const player = new LayoutTestPlayer();
		const [mainObj, bgObj] = player.setLayoutFixture(
			[mainLine, bgLine],
			[
				[100, 40],
				[80, 20],
			],
			[],
			true,
		);

		await player.layout();

		expect(mainObj.lastTransform.top).toBe(0);
		expect(bgObj.lastTransform.top).toBe(40);
		expect(bgObj.lastTransform.scale).toBe(75);
	});

	it("pre-activates the next background line during the warmup window without enabling it", async () => {
		const mainLine = makeLine({ lineStart: 1000, wordStart: 1000 });
		const bgLine = makeLine({ isBG: true, lineStart: 1000, wordStart: 1000 });
		const player = new LayoutTestPlayer();
		const [mainObj, bgObj] = player.setLayoutFixture(
			[mainLine, bgLine],
			[
				[100, 40],
				[80, 20],
			],
			[],
			true,
		);

		player.setCurrentTime(619);

		expect(bgObj.preActivateCount).toBe(0);
		expect(bgObj.enableCount).toBe(0);

		player.setCurrentTime(620);

		expect(bgObj.preActivateCount).toBe(1);
		expect(bgObj.enableCount).toBe(0);
		expect(bgObj.isPreActivatedVisible).toBe(false);
		expect(mainObj.lastTransform.top).toBe(20);
		expect(bgObj.lastTransform.top).toBe(2);
		expect(bgObj.lastTransform.scale).toBe(100);

		player.setCurrentTime(810);

		expect(bgObj.isPreActivatedVisible).toBe(true);
	});

	it("moves a pre-activated background line from its warmup position to the final above-main position when activated", async () => {
		const mainLine = makeLine({ lineStart: 1000, wordStart: 1000 });
		const bgLine = makeLine({ isBG: true, lineStart: 1000, wordStart: 1000 });
		const player = new LayoutTestPlayer();
		const [mainObj, bgObj] = player.setLayoutFixture(
			[mainLine, bgLine],
			[
				[100, 40],
				[80, 20],
			],
			[],
			true,
		);

		player.setCurrentTime(620);
		expect(bgObj.lastTransform.top).toBe(2);

		player.setCurrentTime(1000);

		expect(bgObj.enableCount).toBeGreaterThan(0);
		expect(mainObj.lastTransform.top).toBe(20);
		expect(bgObj.lastTransform.top).toBe(0);
	});
});
