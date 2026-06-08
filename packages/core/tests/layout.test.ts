import { describe, expect, it } from "vitest";
import { computeGroupPresentation } from "../src/lyric-player/base/layout.ts";

describe("computeGroupPresentation", () => {
	it("keeps hot groups active while buffered-only groups enter inactive presentation", () => {
		const hot = computeGroupPresentation({
			groupIndex: 0,
			scrollToIndex: 0,
			latestIndex: 0,
			hasHot: true,
			hasBuffered: true,
			hidePassedLines: false,
			isPlaying: true,
			isNonDynamic: false,
			enableBlur: true,
			isUserScrolling: false,
			isCompact: false,
		});

		const bufferedOnly = computeGroupPresentation({
			groupIndex: 0,
			scrollToIndex: 0,
			latestIndex: 0,
			hasHot: false,
			hasBuffered: true,
			hidePassedLines: false,
			isPlaying: true,
			isNonDynamic: false,
			enableBlur: true,
			isUserScrolling: false,
			isCompact: false,
		});

		const unbuffered = computeGroupPresentation({
			groupIndex: 0,
			scrollToIndex: 0,
			latestIndex: 0,
			hasHot: false,
			hasBuffered: false,
			hidePassedLines: false,
			isPlaying: true,
			isNonDynamic: false,
			enableBlur: true,
			isUserScrolling: false,
			isCompact: false,
		});

		expect(hot).toEqual({
			isActive: true,
			targetOpacity: 0.85,
			blurLevel: 0,
			shouldKeepMounted: true,
		});
		expect(bufferedOnly).toEqual({
			isActive: false,
			targetOpacity: 0.85,
			blurLevel: 1,
			shouldKeepMounted: true,
		});
		expect(unbuffered).toEqual({
			isActive: false,
			targetOpacity: 1,
			blurLevel: 1,
			shouldKeepMounted: false,
		});
	});
});
