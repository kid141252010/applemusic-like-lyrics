import { describe, expect, it } from "vitest";
import type { LyricLineGroupBase } from "../src/lyric-player/base/group.ts";
import {
	commitPlayerTimeState,
	computePlayerTimeState,
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

describe("lyric timeline", () => {
	it("keeps a finished line buffered during post-active grace before disabling it", () => {
		const currentGroups = [group(0, 1000)];
		const timelineState: PlayerTimelineState = {
			currentTime: 999,
			lastCurrentTime: 999,
			hotGroups: new Set([0]),
			bufferedGroups: new Set([0]),
			bufferedGroupExitTimes: new Map(),
			scrollToIndex: 0,
			isSeeking: false,
			isPlaying: true,
			initialLayoutFinished: true,
		};

		const stateResult = computePlayerTimeState({
			time: 1000,
			currentGroups,
			timelineState,
		});

		expect([...stateResult.nextHotGroups]).toEqual([]);
		expect([...stateResult.removedHotIds]).toEqual([0]);
		expect([...stateResult.removedBufferedIds]).toEqual([]);

		const commitResult = commitPlayerTimeState({
			timelineState,
			time: 1000,
			currentGroups,
			hasBottomContent: false,
			stateResult,
		});

		expect([...timelineState.bufferedGroups]).toEqual([0]);
		expect(timelineState.bufferedGroupExitTimes.get(0)).toBe(1000);
		expect(commitResult.groupsToDisable).toEqual([]);
		expect(commitResult.shouldLayout).toBe(true);

		const graceResult = computePlayerTimeState({
			time: 1300,
			currentGroups,
			timelineState,
		});

		expect([...graceResult.removedBufferedIds]).toEqual([0]);

		const graceCommitResult = commitPlayerTimeState({
			timelineState,
			time: 1300,
			currentGroups,
			hasBottomContent: false,
			stateResult: graceResult,
		});

		expect([...timelineState.bufferedGroups]).toEqual([]);
		expect(timelineState.bufferedGroupExitTimes.has(0)).toBe(false);
		expect(graceCommitResult.groupsToDisable).toEqual([0]);
	});
});
