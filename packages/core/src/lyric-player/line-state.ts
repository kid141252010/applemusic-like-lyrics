import type { LyricLine } from "../interfaces.ts";

export const isLineActiveAtTime = (line: LyricLine, time: number) =>
	line.startTime <= time && line.endTime > time;

export const collectActiveLineIndexes = (lines: LyricLine[], time: number) => {
	const activeLineIndexes = new Set<number>();
	for (let i = 0; i < lines.length; i += 1) {
		if (isLineActiveAtTime(lines[i], time)) {
			activeLineIndexes.add(i);
		}
	}
	return activeLineIndexes;
};

const pickLatestActiveLineIndex = (
	lines: LyricLine[],
	activeLineIndexes: ReadonlySet<number>,
	isBG: boolean,
) => {
	let result = -1;
	let resultStartTime = Number.NEGATIVE_INFINITY;

	for (const index of activeLineIndexes) {
		const line = lines[index];
		if (!line || line.isBG !== isBG) continue;

		if (
			line.startTime > resultStartTime ||
			(line.startTime === resultStartTime && index > result)
		) {
			result = index;
			resultStartTime = line.startTime;
		}
	}

	return result === -1 ? undefined : result;
};

/**
 * 选择当前滚动锚点（焦点）索引：
 *
 * 1. 优先活跃主行（非背景行）
 * 2. 若没有活跃主行，则退回活跃背景行
 * 3. 若仍没有活跃行，则定位到下一句即将开始的主行
 * 4. 若再无主行，则聚焦到底栏（length）
 */
export const pickFocusLineIndex = (
	lines: LyricLine[],
	activeLineIndexes: ReadonlySet<number>,
	time: number,
) => {
	const activeMain = pickLatestActiveLineIndex(lines, activeLineIndexes, false);
	if (activeMain !== undefined) return activeMain;

	const activeBackground = pickLatestActiveLineIndex(
		lines,
		activeLineIndexes,
		true,
	);
	if (activeBackground !== undefined) return activeBackground;

	const nextMainIndex = lines.findIndex(
		(line) => !line.isBG && line.startTime >= time,
	);
	return nextMainIndex === -1 ? lines.length : nextMainIndex;
};
