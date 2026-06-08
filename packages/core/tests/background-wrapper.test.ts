import { describe, expect, it } from "vitest";
import * as layout from "../src/lyric-player/base/layout.ts";

describe("computeBackgroundWrapperPresentation", () => {
	it("maps hidden, visible, and intermediate slide positions to continuous wrapper state", () => {
		const compute = (
			layout as typeof layout & {
				computeBackgroundWrapperPresentation?: (
					slideY: number,
					hiddenSlideY: number,
				) => {
					activeProgress: number;
					shouldBeActive: boolean;
					shouldBeHidden: boolean;
					scale: number;
				};
			}
		).computeBackgroundWrapperPresentation;

		expect(compute).toBeTypeOf("function");
		if (!compute) return;

		expect(compute(80, 80)).toEqual({
			activeProgress: 0,
			shouldBeActive: false,
			shouldBeHidden: true,
			scale: 0.8,
		});
		expect(compute(-80, -80)).toEqual({
			activeProgress: 0,
			shouldBeActive: false,
			shouldBeHidden: true,
			scale: 0.8,
		});

		expect(compute(0, 80)).toEqual({
			activeProgress: 1,
			shouldBeActive: true,
			shouldBeHidden: false,
			scale: 1,
		});

		const halfway = compute(40, 80);
		expect(halfway.activeProgress).toBeCloseTo(0.5);
		expect(halfway.shouldBeActive).toBe(false);
		expect(halfway.shouldBeHidden).toBe(false);
		expect(halfway.scale).toBeCloseTo(0.9);

		const nearlyReady = compute(20.8, 80);
		expect(nearlyReady.activeProgress).toBeCloseTo(0.74);
		expect(nearlyReady.shouldBeActive).toBe(false);
		expect(nearlyReady.shouldBeHidden).toBe(false);

		const ready = compute(20, 80);
		expect(ready.activeProgress).toBeCloseTo(0.75);
		expect(ready.shouldBeActive).toBe(true);
		expect(ready.shouldBeHidden).toBe(false);
	});
});
