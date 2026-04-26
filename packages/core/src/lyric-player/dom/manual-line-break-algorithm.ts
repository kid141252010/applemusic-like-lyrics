export const MEASUREMENT_EPSILON_PX = 2;

export interface PackedLineBreakToken {
	width: number;
	/**
	 * 0: ordinary token, 2: whitespace, 3: configured punctuation.
	 */
	breakPriority: number;
}

export type LineRange = [start: number, end: number];

/**
 * Greedy line breaking that packs each line as far right as possible.
 *
 * Ranges are inclusive token indexes. A single token wider than the container is
 * kept on its own line so callers always make forward progress.
 */
export function calcPackedLineRanges(
	tokens: readonly PackedLineBreakToken[],
	maxWidth: number,
	epsilonPx?: number,
): LineRange[] {
	if (tokens.length === 0 || maxWidth <= 0) return [];

	const fitWidth = maxWidth + Math.max(0, epsilonPx ?? MEASUREMENT_EPSILON_PX);
	const ranges: LineRange[] = [];
	let start = 0;

	while (start < tokens.length) {
		let width = 0;
		let rightMostFit = start - 1;
		let lastFittingSpace = -1;
		let lastFittingPunctuation = -1;

		for (let i = start; i < tokens.length; i++) {
			const token = tokens[i];
			const nextWidth = width + token.width;
			if (nextWidth > fitWidth && rightMostFit >= start) break;

			width = nextWidth;
			rightMostFit = i;

			if (token.breakPriority === 2) {
				lastFittingSpace = i;
			} else if (token.breakPriority >= 3) {
				lastFittingPunctuation = i;
			}

			if (nextWidth > fitWidth) break;
		}

		if (rightMostFit < start) {
			rightMostFit = start;
		}

		if (rightMostFit >= tokens.length - 1) {
			ranges.push([start, tokens.length - 1]);
			break;
		}

		const breakAt =
			lastFittingSpace >= start
				? lastFittingSpace
				: lastFittingPunctuation >= start
					? lastFittingPunctuation
					: rightMostFit;

		ranges.push([start, breakAt]);
		start = breakAt + 1;
	}

	return ranges;
}

export function areLineRangesEqual(
	a: readonly LineRange[],
	b: readonly LineRange[],
): boolean {
	return (
		a.length === b.length &&
		a.every((range, index) => {
			const other = b[index];
			return range[0] === other?.[0] && range[1] === other?.[1];
		})
	);
}
