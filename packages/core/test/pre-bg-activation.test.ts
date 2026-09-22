import { describe, expect, it } from "vitest";
import type { LyricLine } from "#interfaces";
import {
	LyricLineGroupBase,
	type LyricPlayerFlags,
} from "#lyric/base/group.ts";
import { LyricLineBase } from "#lyric/base/line.ts";
import { optimizeLyricLines } from "#utils/optimize-lyric.ts";
import { type Duration, MediaTime } from "#utils/time.ts";

function createLine(
	startTime: number,
	endTime: number,
	options: Partial<Omit<LyricLine, "startTime" | "endTime">> = {},
): LyricLine {
	return {
		words: [{ word: "test", startTime, endTime }],
		translatedLyric: "",
		romanLyric: "",
		startTime,
		endTime,
		isBG: false,
		isDuet: false,
		...options,
	};
}

class MockLyricLine extends LyricLineBase {
	public enabledTimes: number[] = [];
	public isEnabled = false;

	constructor(private line: LyricLine) {
		super();
	}

	getLine(): LyricLine {
		return this.line;
	}

	enable(time = 0, _shouldPlay = true): void {
		this.isEnabled = true;
		this.enabledTimes.push(time);
	}

	disable(): void {
		this.isEnabled = false;
	}

	resume(): void {}
	pause(): void {}
	update(_delta?: Duration): void {}
	onLineSizeChange(_size: [number, number]): void {}
	commitChanges(): void {}
}

class TestLyricLineGroup extends LyricLineGroupBase<MockLyricLine> {
	constructor(
		protected override readonly lyricPlayer: LyricPlayerFlags,
		mainLine: MockLyricLine,
		bgLine?: MockLyricLine,
	) {
		super(mainLine, bgLine);
	}

	getElement(): Element {
		return {} as Element;
	}

	isInRenderRange(_includeOverscan?: boolean): boolean {
		return true;
	}

	protected renderStyles(): void {}
}

function createMockPlayer(initialTime = 0, isPlaying = true) {
	let currentTime = initialTime;
	let playing = isPlaying;

	return {
		getEnableSpring: () => true,
		getEnableScale: () => true,
		getIsPlaying: () => playing,
		getAlwaysPostpositionBackground: () => false,
		getCurrentTime: () => currentTime,
		setCurrentTime: (time: number) => {
			currentTime = time;
		},
		setIsPlaying: (p: boolean) => {
			playing = p;
		},
	};
}

describe("Pre-BG (Pre-positioned Background Lyrics) Lifecycle & Activation", () => {
	it("satisfies requirement: mainLine startTime preserved, group uses bgStartTime, independent activation & handoff", () => {
		// 构造测试样本（主行 startTime = 3000，背景行 startTime = 1000）
		const mainLyric = createLine(3000, 5000);
		const bgLyric = createLine(1000, 4000, { isBG: true });
		const lines = [mainLyric, bgLyric];

		// 1. 数据清洗优化：syncMainAndBackgroundLines 仅同步最晚结束时间，不篡改起始时间
		optimizeLyricLines(lines, {
			normalizeSpaces: false,
			resetLineTimestamps: false,
			syncMainAndBackgroundLines: true,
			cleanUnintentionalOverlaps: false,
			tryAdvanceStartTime: false,
		});

		// 断言优化后 mainLine.startTime === 3000（起唱时间未被篡改）
		expect(mainLyric.startTime).toBe(3000);
		expect(bgLyric.startTime).toBe(1000);
		expect(mainLyric.endTime).toBe(5000);
		expect(bgLyric.endTime).toBe(5000);

		// 构建 Mock Group
		const mockPlayer = createMockPlayer(0, true);
		const mainLine = new MockLyricLine(mainLyric);
		const bgLine = new MockLyricLine(bgLyric);
		const group = new TestLyricLineGroup(mockPlayer, mainLine, bgLine);

		// 断言 group.startTime 为 1000（组时间正确取早）
		expect(MediaTime.asMillis(group.startTime)).toBe(1000);
		expect(MediaTime.asMillis(group.endTime)).toBe(5000);

		// 推进时间到 1500ms：伴唱已开唱，主行未开唱
		mockPlayer.setCurrentTime(1500);
		group.enable(1500, true);

		// 断言 Group 处于播放态，isBgActive === true 且 isMainActive === false
		expect(group.isActive).toBe(true);
		expect(group.isBgActive).toBe(true);
		expect(group.isMainActive).toBe(false);
		expect(bgLine.isEnabled).toBe(true);
		expect(bgLine.enabledTimes).toEqual([1500]);
		expect(mainLine.isEnabled).toBe(false);
		expect(mainLine.enabledTimes).toEqual([]);

		// 推进时间到 3000ms：主行开唱，逐帧接力触发
		mockPlayer.setCurrentTime(3000);
		group.update();

		// 断言主行接力触发，isMainActive === true
		expect(group.isMainActive).toBe(true);
		expect(group.isBgActive).toBe(true);
		expect(mainLine.isEnabled).toBe(true);
		expect(mainLine.enabledTimes).toEqual([3000]);
	});

	it("protects pre-BG independent advance time when tryAdvanceStartTime is enabled", () => {
		const mainLyric = createLine(3000, 5000);
		const bgLyric = createLine(1000, 4000, { isBG: true });
		const lines = [mainLyric, bgLyric];

		optimizeLyricLines(lines, {
			normalizeSpaces: false,
			resetLineTimestamps: false,
			syncMainAndBackgroundLines: true,
			cleanUnintentionalOverlaps: false,
			tryAdvanceStartTime: true,
		});

		// 第一行主行提前 600ms（3000 -> 2400）
		expect(mainLyric.startTime).toBe(2400);
		// 前置背景行独立提前 600ms（1000 -> 400），未被主行的 2400 覆盖
		expect(bgLyric.startTime).toBe(400);
	});

	it("correctly handles seek directly into main line playback (time >= mainStart)", () => {
		const mainLyric = createLine(3000, 5000);
		const bgLyric = createLine(1000, 4000, { isBG: true });

		const mockPlayer = createMockPlayer(3500, true);
		const mainLine = new MockLyricLine(mainLyric);
		const bgLine = new MockLyricLine(bgLyric);
		const group = new TestLyricLineGroup(mockPlayer, mainLine, bgLine);

		group.enable(3500, true);

		// 两者均到达开唱时间，应该同时激活
		expect(group.isActive).toBe(true);
		expect(group.isBgActive).toBe(true);
		expect(group.isMainActive).toBe(true);
		expect(bgLine.isEnabled).toBe(true);
		expect(mainLine.isEnabled).toBe(true);
	});

	it("resets all activation flags when group is disabled", () => {
		const mainLyric = createLine(3000, 5000);
		const bgLyric = createLine(1000, 4000, { isBG: true });

		const mockPlayer = createMockPlayer(3500, true);
		const mainLine = new MockLyricLine(mainLyric);
		const bgLine = new MockLyricLine(bgLyric);
		const group = new TestLyricLineGroup(mockPlayer, mainLine, bgLine);

		group.enable(3500, true);
		expect(group.isActive).toBe(true);
		expect(group.isMainActive).toBe(true);
		expect(group.isBgActive).toBe(true);

		group.disable();
		expect(group.isActive).toBe(false);
		expect(group.isMainActive).toBe(false);
		expect(group.isBgActive).toBe(false);
		expect(mainLine.isEnabled).toBe(false);
		expect(bgLine.isEnabled).toBe(false);
	});
});
