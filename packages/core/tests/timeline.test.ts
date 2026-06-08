import { describe, expect, it } from "vitest";
import {
	LyricLineGroupBase,
	type LyricPlayerFlags,
} from "../src/lyric-player/base/group.ts";
import { LyricLineBase } from "../src/lyric-player/base/line.ts";
import {
	commitPlayerTimeState,
	computePlayerTimeState,
	pickScrollToIndexForSeek,
	type PlayerTimelineState,
} from "../src/lyric-player/base/timeline.ts";

const lyricPlayerFlags: LyricPlayerFlags = {
	getEnableSpring: () => false,
	getEnableScale: () => false,
	getIsPlaying: () => true,
	getAlwaysPostpositionBackground: () => false,
};

class TestLyricLine extends LyricLineBase {
	getLine(): never {
		throw new Error("TestLyricLine#getLine is not used in timeline tests");
	}

	enable(): void {}
	disable(): void {}
	resume(): void {}
	pause(): void {}
	onLineSizeChange(): void {}
	update(): void {}
}

class TestLyricLineGroup extends LyricLineGroupBase<TestLyricLine> {
	protected readonly lyricPlayer = lyricPlayerFlags;

	constructor(
		private readonly testStartTime: number,
		private readonly testEndTime: number,
	) {
		super(new TestLyricLine());
	}

	override get startTime(): number {
		return this.testStartTime;
	}

	override get endTime(): number {
		return this.testEndTime;
	}

	get isInSight(): boolean {
		return true;
	}

	protected renderStyles(): void {}
}

function group(startTime: number, endTime: number): LyricLineGroupBase {
	return new TestLyricLineGroup(startTime, endTime);
}

function timelineState(
	overrides: Partial<PlayerTimelineState>,
): PlayerTimelineState {
	return {
		currentTime: 0,
		lastCurrentTime: 0,
		hotGroups: new Set(),
		bufferedGroups: new Set(),
		scrollToIndex: 0,
		isSeeking: false,
		isPlaying: true,
		initialLayoutFinished: true,
		...overrides,
	};
}

describe("lyric timeline", () => {
	function commitAt(
		state: PlayerTimelineState,
		time: number,
		currentGroups: LyricLineGroupBase[],
		hasBottomContent = false,
	) {
		const stateResult = computePlayerTimeState({
			time,
			currentGroups,
			timelineState: state,
		});

		const commitResult = commitPlayerTimeState({
			timelineState: state,
			time,
			currentGroups,
			hasBottomContent,
			stateResult,
		});

		return { stateResult, commitResult };
	}

	it("disables the previous buffered group when the next group becomes active", () => {
		const currentGroups = [group(0, 1000), group(1000, 2000)];
		const state = timelineState({
			currentTime: 999,
			lastCurrentTime: 999,
			hotGroups: new Set([0]),
			bufferedGroups: new Set([0]),
		});

		const stateResult = computePlayerTimeState({
			time: 1000,
			currentGroups,
			timelineState: state,
		});

		expect([...stateResult.nextHotGroups]).toEqual([1]);
		expect([...stateResult.addedIds]).toEqual([1]);
		expect([...stateResult.removedHotIds]).toEqual([0]);
		expect([...stateResult.removedBufferedIds]).toEqual([0]);

		const commitResult = commitPlayerTimeState({
			timelineState: state,
			time: 1000,
			currentGroups,
			hasBottomContent: false,
			stateResult,
		});

		expect([...state.bufferedGroups]).toEqual([1]);
		expect(commitResult.groupsToEnable).toEqual([1]);
		expect(commitResult.groupsToDisable).toEqual([0]);
		expect(state.scrollToIndex).toBe(1);
	});

	it("relayouts to the remaining hot group when an overlapping group exits hot state", () => {
		const currentGroups = [group(0, 2000), group(1000, 3000)];
		const state = timelineState({
			currentTime: 1500,
			lastCurrentTime: 1500,
			hotGroups: new Set([0, 1]),
			bufferedGroups: new Set([0, 1]),
			scrollToIndex: 0,
		});

		const { stateResult, commitResult } = commitAt(state, 2000, currentGroups);

		expect([...stateResult.nextHotGroups]).toEqual([1]);
		expect([...stateResult.addedIds]).toEqual([]);
		expect([...stateResult.removedHotIds]).toEqual([0]);
		expect([...stateResult.removedBufferedIds]).toEqual([0]);
		expect([...state.bufferedGroups]).toEqual([0, 1]);
		expect(commitResult.groupsToDisable).toEqual([0]);
		expect(commitResult.shouldLayout).toBe(true);
		expect(state.scrollToIndex).toBe(1);
	});

	it("picks the next lyric group while seeking into an empty timeline range", () => {
		const currentGroups = [group(0, 1000), group(2000, 3000)];
		const state = timelineState({
			isSeeking: true,
		});

		const { commitResult } = commitAt(state, 1500, currentGroups);

		expect([...state.hotGroups]).toEqual([]);
		expect([...state.bufferedGroups]).toEqual([]);
		expect(state.scrollToIndex).toBe(1);
		expect(commitResult.shouldResetScroll).toBe(true);
		expect(commitResult.shouldLayout).toBe(true);
	});

	it("uses buffered groups before upcoming lyrics while picking seek targets", () => {
		const currentGroups = [group(0, 1000), group(2000, 3000)];

		expect(
			pickScrollToIndexForSeek(1500, currentGroups, new Set([0])),
		).toBe(0);
	});

	it("replaces buffered groups when seeking backwards into an earlier group", () => {
		const currentGroups = [group(0, 1000), group(1000, 2000)];
		const state = timelineState({
			currentTime: 1500,
			lastCurrentTime: 1500,
			hotGroups: new Set([1]),
			bufferedGroups: new Set([1]),
			scrollToIndex: 1,
		});

		const { commitResult } = commitAt(state, 500, currentGroups);

		expect([...state.hotGroups]).toEqual([0]);
		expect([...state.bufferedGroups]).toEqual([0]);
		expect(commitResult.groupsToEnable).toEqual([0]);
		expect(commitResult.groupsToDisable).toEqual([1]);
		expect(state.scrollToIndex).toBe(0);
	});

	it("moves to the last lyric group after playback leaves the final group", () => {
		const currentGroups = [group(0, 1000), group(1000, 2000)];
		const state = timelineState({
			currentTime: 1500,
			lastCurrentTime: 1500,
			hotGroups: new Set([1]),
			bufferedGroups: new Set([1]),
			scrollToIndex: 1,
		});

		const { commitResult } = commitAt(state, 2000, currentGroups);

		expect([...state.hotGroups]).toEqual([]);
		expect([...state.bufferedGroups]).toEqual([]);
		expect(commitResult.groupsToDisable).toEqual([1]);
		expect(commitResult.shouldLayout).toBe(true);
		expect(state.scrollToIndex).toBe(1);
	});

	it("moves to bottom content after playback leaves the final group", () => {
		const currentGroups = [group(0, 1000), group(1000, 2000)];
		const state = timelineState({
			currentTime: 1500,
			lastCurrentTime: 1500,
			hotGroups: new Set([1]),
			bufferedGroups: new Set([1]),
			scrollToIndex: 1,
		});

		commitAt(state, 2000, currentGroups, true);

		expect(state.scrollToIndex).toBe(2);
	});
});
