import { describe, expect, it } from "vitest";
import { computeGroupDelayPlan } from "../src/lyric-player/base/layout.ts";

describe("computeGroupDelayPlan", () => {
	it("advances one step for normal groups including duet/main alternation", () => {
		const first = computeGroupDelayPlan({
			currentDelay: 0,
			baseDelay: 0.05,
			hasBackgroundLine: false,
			isBgFirst: false,
			shouldAdvanceDelay: true,
		});
		const second = computeGroupDelayPlan({
			currentDelay: first.nextDelay,
			baseDelay: 0.05,
			hasBackgroundLine: false,
			isBgFirst: false,
			shouldAdvanceDelay: true,
		});

		expect(first.delayPlan).toEqual({
			positionDelay: 0,
			mainLineDelay: 0,
			bgLineDelay: 0,
			bgSlideDelay: 0,
		});
		expect(first.nextDelay).toBeCloseTo(0.05);
		expect(second.delayPlan.mainLineDelay).toBeCloseTo(0.05);
		expect(second.nextDelay).toBeCloseTo(0.1);
	});

	it("uses the same delay for front-positioned background and main lines", () => {
		const result = computeGroupDelayPlan({
			currentDelay: 0.1,
			baseDelay: 0.05,
			hasBackgroundLine: true,
			isBgFirst: true,
			shouldAdvanceDelay: true,
		});

		expect(result.delayPlan).toEqual({
			positionDelay: 0.1,
			mainLineDelay: 0.1,
			bgLineDelay: 0.1,
			bgSlideDelay: 0.1,
		});
		expect(result.nextDelay).toBeCloseTo(0.15);
	});

	it("delays post-positioned background after the main line without advancing the next group", () => {
		const result = computeGroupDelayPlan({
			currentDelay: 0.1,
			baseDelay: 0.05,
			hasBackgroundLine: true,
			isBgFirst: false,
			shouldAdvanceDelay: true,
		});

		expect(result.delayPlan.positionDelay).toBeCloseTo(0.1);
		expect(result.delayPlan.mainLineDelay).toBeCloseTo(0.1);
		expect(result.delayPlan.bgLineDelay).toBeCloseTo(0.15);
		expect(result.delayPlan.bgSlideDelay).toBeCloseTo(0.15);
		expect(result.nextDelay).toBeCloseTo(0.15);
	});

	it("does not let consecutive background groups add extra delay steps", () => {
		const postBackground = computeGroupDelayPlan({
			currentDelay: 0,
			baseDelay: 0.05,
			hasBackgroundLine: true,
			isBgFirst: false,
			shouldAdvanceDelay: true,
		});
		const frontBackground = computeGroupDelayPlan({
			currentDelay: postBackground.nextDelay,
			baseDelay: 0.05,
			hasBackgroundLine: true,
			isBgFirst: true,
			shouldAdvanceDelay: true,
		});
		const nextMain = computeGroupDelayPlan({
			currentDelay: frontBackground.nextDelay,
			baseDelay: 0.05,
			hasBackgroundLine: false,
			isBgFirst: false,
			shouldAdvanceDelay: true,
		});

		expect(postBackground.delayPlan.mainLineDelay).toBeCloseTo(0);
		expect(postBackground.delayPlan.bgLineDelay).toBeCloseTo(0.05);
		expect(frontBackground.delayPlan.bgLineDelay).toBeCloseTo(0.05);
		expect(frontBackground.delayPlan.mainLineDelay).toBeCloseTo(0.05);
		expect(nextMain.delayPlan.mainLineDelay).toBeCloseTo(0.1);
		expect(nextMain.nextDelay).toBeCloseTo(0.15);
	});
});
