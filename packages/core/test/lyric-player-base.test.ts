import { describe, expect, test } from "bun:test";
import type { LyricLine } from "../src/interfaces.ts";

class FakeMouseEvent {}

globalThis.MouseEvent = FakeMouseEvent as unknown as typeof MouseEvent;
globalThis.document = {
	createElement(tagName: string) {
		const children: unknown[] = [];
		const classes = new Set<string>();
		const element = {
			tagName,
			className: "",
			children,
			childNodes: children,
			dataset: {} as Record<string, string>,
			style: {
				opacity: "",
				setProperty() {},
			},
			classList: {
				add(...names: string[]) {
					for (const name of names) classes.add(name);
				},
				remove(...names: string[]) {
					for (const name of names) classes.delete(name);
				},
				contains(name: string) {
					return classes.has(name);
				},
			},
			appendChild(child: unknown) {
				children.push(child);
				return child;
			},
			removeChild(child: unknown) {
				const index = children.indexOf(child);
				if (index >= 0) children.splice(index, 1);
				return child;
			},
			remove() {},
			addEventListener() {},
			removeEventListener() {},
			setAttribute() {},
			innerHTML: "",
			innerText: "",
			clientWidth: 0,
			clientHeight: 0,
		};

		return element as unknown as HTMLElement;
	},
} as unknown as Document;
globalThis.window = {
	addEventListener() {},
	removeEventListener() {},
	innerWidth: 1024,
} as unknown as Window & typeof globalThis;
globalThis.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;

const { LyricPlayerBase } = await import("../src/lyric-player/index.ts");

class TestLine {
	enabled = false;
	enableCalls = 0;
	disableCalls = 0;

	constructor(private readonly line: LyricLine) {}

	getLine(): LyricLine {
		return this.line;
	}

	enable(): void {
		this.enabled = true;
		this.enableCalls++;
	}

	disable(): void {
		this.enabled = false;
		this.disableCalls++;
	}

	resume(): void {}
	pause(): void {}
	update(): void {}
	dispose(): void {}
	onLineSizeChange(): void {}
	setTransform(): void {}
	rebuildElement(): void {}
}

class TestLyricPlayer extends LyricPlayerBase {
	currentLyricLineObjects: TestLine[] = [];
	layoutCalls = 0;

	get baseFontSize(): number {
		return 24;
	}

	loadLines(lines: LyricLine[]): void {
		this.processedLines = lines;
		this.currentLyricLines = lines;
		this.currentLyricLineObjects = lines.map((line) => new TestLine(line));
		this.hotLines.clear();
		this.bufferedLines.clear();
		this.currentTime = 0;
		this.lastCurrentTime = 0;
		this.scrollToIndex = 0;
		this.initialLayoutFinished = true;
		this.layoutCalls = 0;
	}

	lineState(index: number): TestLine {
		return this.currentLyricLineObjects[index];
	}

	activeState(): { hot: number[]; buffered: number[] } {
		return {
			hot: [...this.hotLines],
			buffered: [...this.bufferedLines],
		};
	}

	override async calcLayout(): Promise<void> {
		this.layoutCalls++;
	}
}

function makeLine(
	startTime: number,
	endTime: number,
	words: LyricLine["words"],
	isBG = false,
): LyricLine {
	return {
		words,
		translatedLyric: "",
		romanLyric: "",
		startTime,
		endTime,
		isBG,
		isDuet: false,
	};
}

describe("LyricPlayerBase background hot line timing", () => {
	test("removes a background line at its last word end while keeping the main line active", () => {
		const player = new TestLyricPlayer();
		player.loadLines([
			makeLine(500, 5000, [{ word: "main", startTime: 1000, endTime: 5000 }]),
			makeLine(
				500,
				5000,
				[{ word: "backing", startTime: 500, endTime: 2500 }],
				true,
			),
		]);

		player.setCurrentTime(1000);
		expect(player.activeState()).toEqual({ hot: [0, 1], buffered: [0, 1] });
		const layoutCallsBeforeBackgroundEnds = player.layoutCalls;

		player.setCurrentTime(2500);

		expect(player.activeState()).toEqual({ hot: [0], buffered: [0] });
		expect(player.lineState(0).enabled).toBe(true);
		expect(player.lineState(1).enabled).toBe(false);
		expect(player.lineState(1).disableCalls).toBe(1);
		expect(player.layoutCalls).toBe(layoutCallsBeforeBackgroundEnds + 1);
	});

	test("does not reactivate an expired background line when seeking into the main line", () => {
		const player = new TestLyricPlayer();
		player.loadLines([
			makeLine(500, 5000, [{ word: "main", startTime: 1000, endTime: 5000 }]),
			makeLine(
				500,
				5000,
				[{ word: "backing", startTime: 500, endTime: 2500 }],
				true,
			),
		]);

		player.setCurrentTime(3000, true);

		expect(player.activeState()).toEqual({ hot: [0], buffered: [0] });
		expect(player.lineState(0).enabled).toBe(true);
		expect(player.lineState(1).enabled).toBe(false);
		expect(player.lineState(1).enableCalls).toBe(0);
	});

	test("keeps a background line active until its own last word when it outlasts the main words", () => {
		const player = new TestLyricPlayer();
		player.loadLines([
			makeLine(1000, 4000, [{ word: "main", startTime: 1000, endTime: 3000 }]),
			makeLine(
				1000,
				4000,
				[{ word: "backing", startTime: 1200, endTime: 4000 }],
				true,
			),
		]);

		player.setCurrentTime(1200);
		player.setCurrentTime(3500);

		expect(player.activeState()).toEqual({ hot: [0, 1], buffered: [0, 1] });
		expect(player.lineState(0).enabled).toBe(true);
		expect(player.lineState(1).enabled).toBe(true);
	});
});
