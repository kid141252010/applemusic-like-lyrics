import { describe, expect, it } from "vitest";
import {
	computeGroupPresentation,
	type ComputeGroupPresentationInput,
} from "../src/lyric-player/base/layout.ts";

describe("lyric group presentation", () => {
	function presentation(
		overrides: Partial<ComputeGroupPresentationInput>,
	) {
		return computeGroupPresentation({
			groupIndex: 0,
			scrollToIndex: 1,
			latestIndex: 1,
			hasHot: false,
			hasBuffered: false,
			hidePassedLines: false,
			isPlaying: true,
			isNonDynamic: false,
			enableBlur: true,
			isUserScrolling: false,
			isCompact: false,
			...overrides,
		});
	}

	it.each([
		{
			hasHot: true,
			hasBuffered: false,
			expectedActive: true,
			expectedKeepMounted: false,
		},
		{
			hasHot: true,
			hasBuffered: true,
			expectedActive: true,
			expectedKeepMounted: true,
		},
		{
			hasHot: false,
			hasBuffered: true,
			expectedActive: false,
			expectedKeepMounted: true,
		},
		{
			hasHot: false,
			hasBuffered: false,
			expectedActive: false,
			expectedKeepMounted: false,
		},
	])(
		"tracks active and mounted state for hot=$hasHot buffered=$hasBuffered",
		({ hasHot, hasBuffered, expectedActive, expectedKeepMounted }) => {
			const result = presentation({ hasHot, hasBuffered });

			expect(result.isActive).toBe(expectedActive);
			expect(result.shouldKeepMounted).toBe(expectedKeepMounted);
		},
	);

	it("keeps a buffered group mounted without treating it as active", () => {
		const result = presentation({
			hasHot: false,
			hasBuffered: true,
		});

		expect(result.isActive).toBe(false);
		expect(result.shouldKeepMounted).toBe(true);
	});

	it("hides passed lines while playback is running", () => {
		const result = presentation({
			hidePassedLines: true,
		});

		expect(result.targetOpacity).toBe(1e-4);
	});

	it("does not hide passed lines while playback is paused", () => {
		const result = presentation({
			hidePassedLines: true,
			isPlaying: false,
		});

		expect(result.targetOpacity).toBe(1);
	});

	it("dims inactive non-dynamic lyric groups", () => {
		const result = presentation({
			isNonDynamic: true,
		});

		expect(result.targetOpacity).toBe(0.2);
	});
});
