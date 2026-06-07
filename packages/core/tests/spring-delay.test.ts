import { describe, expect, it } from "vitest";
import { Spring } from "../src/utils/spring.ts";

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
});
