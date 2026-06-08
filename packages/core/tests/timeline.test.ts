import { describe, expect, it } from "vitest";
import type { LyricLineGroupBase } from "../src/lyric-player/base/group.ts";
import {
	commitPlayerTimeState,
	computePlayerTimeState,
	POST_ACTIVE_GROUP_GRACE_MS,
	type PlayerTimelineState,
} from "../src/lyric-player/base/timeline.ts";

function group(startTime: number, endTime: number): LyricLineGroupBase {
	return {
		get startTime() {
			return startTime;
		},
		get endTime() {
			return endTime;
		},
	} as unknown as LyricLineGroupBase;
}

function timelineState(
	overrides: Partial<PlayerTimelineState>,
): PlayerTimelineState {
	return {
		currentTime: 0,
		lastCurrentTime: 0,
		hotGroups: new Set(),
		bufferedGroups: new Set(),
		bufferedGroupExitTimes: new Map(),
		scrollToIndex: 0,
		isSeeking: false,
		isPlaying: true,
		initialLayoutFinished: true,
		...overrides,
	};
}

describe("lyric timeline", () => {
	it("keeps a finished line buffered during post-active grace before disabling it", () => {
		const currentGroups = [group(0, 1000)];
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

		expect([...stateResult.nextHotGroups]).toEqual([]);
		expect([...stateResult.removedHotIds]).toEqual([0]);
		expect([...stateResult.removedBufferedIds]).toEqual([]);

		const commitResult = commitPlayerTimeState({
			timelineState: state,
			time: 1000,
			currentGroups,
			hasBottomContent: false,
			stateResult,
		});

		expect([...state.bufferedGroups]).toEqual([0]);
		expect(state.bufferedGroupExitTimes.get(0)).toBe(1000);
		expect(commitResult.groupsToDisable).toEqual([]);
		expect(commitResult.shouldLayout).toBe(true);

		const graceResult = computePlayerTimeState({
			time: 1000 + POST_ACTIVE_GROUP_GRACE_MS,
			currentGroups,
			timelineState: state,
		});

		expect([...graceResult.removedBufferedIds]).toEqual([0]);

		const graceCommitResult = commitPlayerTimeState({
			timelineState: state,
			time: 1000 + POST_ACTIVE_GROUP_GRACE_MS,
			currentGroups,
			hasBottomContent: false,
			stateResult: graceResult,
		});

		expect([...state.bufferedGroups]).toEqual([]);
		expect(state.bufferedGroupExitTimes.has(0)).toBe(false);
		expect(graceCommitResult.groupsToDisable).toEqual([0]);
	});

	it("scrolls to the first hot group when previous groups remain buffered for grace", () => {
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
		expect([...stateResult.removedBufferedIds]).toEqual([]);

		const commitResult = commitPlayerTimeState({
			timelineState: state,
			time: 1000,
			currentGroups,
			hasBottomContent: false,
			stateResult,
		});

		expect([...state.bufferedGroups]).toEqual([0, 1]);
		expect(state.bufferedGroupExitTimes.get(0)).toBe(1000);
		expect(commitResult.groupsToEnable).toEqual([1]);
		expect(commitResult.groupsToDisable).toEqual([]);
		expect(state.scrollToIndex).toBe(1);
	});

	it("scrolls to the remaining hot group when an overlapping earlier hot group exits", () => {
		const currentGroups = [group(0, 2000), group(1000, 3000)];
		const state = timelineState({
			currentTime: 1999,
			lastCurrentTime: 1999,
			hotGroups: new Set([0, 1]),
			bufferedGroups: new Set([0, 1]),
			scrollToIndex: 0,
		});

		const stateResult = computePlayerTimeState({
			time: 2000,
			currentGroups,
			timelineState: state,
		});

		expect([...stateResult.nextHotGroups]).toEqual([1]);
		expect([...stateResult.addedIds]).toEqual([]);
		expect([...stateResult.removedHotIds]).toEqual([0]);
		expect([...stateResult.removedBufferedIds]).toEqual([]);

		const commitResult = commitPlayerTimeState({
			timelineState: state,
			time: 2000,
			currentGroups,
			hasBottomContent: false,
			stateResult,
		});

		expect([...state.bufferedGroups]).toEqual([0, 1]);
		expect(state.bufferedGroupExitTimes.get(0)).toBe(2000);
		expect(commitResult.groupsToDisable).toEqual([]);
		expect(state.scrollToIndex).toBe(1);
	});

	it("uses the group end time as the post-active grace start when playback jumps ahead", () => {
		const currentGroups = [group(0, 1000)];
		const state = timelineState({
			currentTime: 999,
			lastCurrentTime: 999,
			hotGroups: new Set([0]),
			bufferedGroups: new Set([0]),
		});

		const stateResult = computePlayerTimeState({
			time: 1000 + POST_ACTIVE_GROUP_GRACE_MS + 200,
			currentGroups,
			timelineState: state,
		});

		expect([...stateResult.nextHotGroups]).toEqual([]);
		expect([...stateResult.removedHotIds]).toEqual([0]);
		expect([...stateResult.removedBufferedIds]).toEqual([]);

		const commitResult = commitPlayerTimeState({
			timelineState: state,
			time: 1000 + POST_ACTIVE_GROUP_GRACE_MS + 200,
			currentGroups,
			hasBottomContent: false,
			stateResult,
		});

		expect([...state.bufferedGroups]).toEqual([]);
		expect(state.bufferedGroupExitTimes.has(0)).toBe(false);
		expect(commitResult.groupsToDisable).toEqual([0]);
	});
});
