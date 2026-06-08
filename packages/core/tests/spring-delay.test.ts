import { describe, expect, it } from "vitest";
import { LyricLineGroupBase } from "../src/lyric-player/base/group.ts";
import { LyricLineBase } from "../src/lyric-player/base/line.ts";
import { Spring } from "../src/utils/spring.ts";

class TestLine extends LyricLineBase {
	getLine() {
		return {
			words: [],
			translatedLyric: "",
			romanLyric: "",
			startTime: 0,
			endTime: 1000,
			isBG: false,
			isDuet: false,
		};
	}

	enable(): void {}
	disable(): void {}
	resume(): void {}
	pause(): void {}
	onLineSizeChange(): void {}

	override setTransform(
		scale = 100,
		opacity = 1,
		blur = 0,
		force = false,
		delay = 0,
	): void {
		super.setTransform(scale, opacity, blur, force, delay);
		if (force) {
			this.lineTransforms.scale.setPosition(scale);
		} else {
			this.lineTransforms.scale.setTargetPosition(scale, delay);
		}
	}

	update(delta = 0): void {
		this.lineTransforms.scale.update(delta);
	}
}

class TestGroup extends LyricLineGroupBase<TestLine> {
	protected readonly lyricPlayer = {
		getEnableSpring: () => true,
		getEnableScale: () => true,
		getIsPlaying: () => true,
		getAlwaysPostpositionBackground: () => false,
	};

	protected renderStyles(): void {}

	get isInSight(): boolean {
		return true;
	}
}

function expectSpringWaitsForDelay(
	spring: Spring,
	delay: number,
	initialPosition: number,
) {
	spring.update(delay - 0.001);
	expect(spring.getCurrentPosition()).toBe(initialPosition);

	spring.update(0.002);
	expect(spring.getCurrentPosition()).toBe(initialPosition);

	spring.update(0.016);
	expect(Math.abs(spring.getCurrentPosition() - initialPosition)).toBeGreaterThan(
		0,
	);
}

describe("Spring", () => {
	it("uses seconds for delayed target positions", () => {
		const spring = new Spring(0);

		spring.setTargetPosition(100, 0.05);
		spring.update(0.049);
		expect(spring.getCurrentPosition()).toBe(0);

		spring.update(0.002);
		expect(spring.getCurrentPosition()).toBe(0);

		spring.update(0.016);
		expect(spring.getCurrentPosition()).toBeGreaterThan(0);
		expect(spring.getCurrentPosition()).toBeLessThan(100);
	});

	it("uses split group delays for position, background slide, and line scale springs", () => {
		const positionGroup = new TestGroup(new TestLine(), new TestLine());
		positionGroup.setTransform(
			100,
			false,
			{
				positionDelay: 0.05,
				mainLineDelay: 0,
				bgLineDelay: 0,
				bgSlideDelay: 0,
			},
			false,
			1,
			0,
		);
		expectSpringWaitsForDelay(positionGroup.posY, 0.05, 0);

		const bgSlideGroup = new TestGroup(new TestLine(), new TestLine());
		bgSlideGroup.isBgFirst = true;
		bgSlideGroup.setTransform(
			0,
			false,
			{
				positionDelay: 0,
				mainLineDelay: 0,
				bgLineDelay: 0,
				bgSlideDelay: 0.05,
			},
			false,
			1,
			0,
		);
		expectSpringWaitsForDelay(bgSlideGroup.bgSlideY, 0.05, -80);

		const mainScaleGroup = new TestGroup(new TestLine(), new TestLine());
		mainScaleGroup.setTransform(
			0,
			false,
			{
				positionDelay: 0,
				mainLineDelay: 0.05,
				bgLineDelay: 0,
				bgSlideDelay: 0,
			},
			false,
			1,
			0,
		);
		expectSpringWaitsForDelay(
			mainScaleGroup.mainLine.lineTransforms.scale,
			0.05,
			100,
		);

		const bgScaleGroup = new TestGroup(new TestLine(), new TestLine());
		bgScaleGroup.setTransform(
			0,
			false,
			{
				positionDelay: 0,
				mainLineDelay: 0,
				bgLineDelay: 0.05,
				bgSlideDelay: 0,
			},
			false,
			1,
			0,
		);
		expectSpringWaitsForDelay(
			bgScaleGroup.bgLine?.lineTransforms.scale ?? new Spring(0),
			0.05,
			100,
		);
	});
});
