export interface ChildNodeInfo {
	width: number;
	text: string;
	isSpace: boolean;
}

/**
 * 计算尽量塞满当前行的断点位置
 * @param children 子节点信息
 * @param containerWidth 容器可用内容宽度
 * @param fullText 完整的行文本
 * @param segmenter 预创建的 Intl.Segmenter 分词器
 * @returns 需要在其前面插入 `<br>` 的子节点索引数组，升序
 */
export function calcPackedBreaks(
	children: ChildNodeInfo[],
	containerWidth: number,
	_fullText: string,
	_segmenter: Intl.Segmenter,
): number[] {
	const n = children.length;
	if (n === 0 || containerWidth <= 0) {
		return [];
	}

	const prefixWidth = new Float64Array(n + 1);
	for (let i = 0; i < n; i++) {
		prefixWidth[i + 1] = prefixWidth[i] + children[i].width;
	}

	if (prefixWidth[n] <= containerWidth) {
		return [];
	}

	const breaks: number[] = [];
	let lineStart = 0;
	while (lineStart < n) {
		const remainingWidth = prefixWidth[n] - prefixWidth[lineStart];
		if (remainingWidth <= containerWidth) {
			break;
		}

		let firstOverflow = lineStart + 1;
		while (
			firstOverflow <= n &&
			prefixWidth[firstOverflow] - prefixWidth[lineStart] <= containerWidth
		) {
			firstOverflow++;
		}

		let breakIndex = firstOverflow - 1;
		if (breakIndex <= lineStart) {
			// 单个不可拆节点已经超过容器宽度时，独占一行以避免死循环。
			breakIndex = lineStart + 1;
		} else {
			const lastSpaceBreak = findLastSpaceBreak(
				children,
				lineStart,
				breakIndex,
			);
			if (lastSpaceBreak > lineStart) {
				breakIndex = lastSpaceBreak;
			}
		}

		if (breakIndex >= n) {
			break;
		}
		breaks.push(breakIndex);
		lineStart = breakIndex;
	}

	return breaks;
}

function findLastSpaceBreak(
	children: ChildNodeInfo[],
	lineStart: number,
	maxIncludedIndex: number,
): number {
	for (let i = maxIncludedIndex - 1; i >= lineStart; i--) {
		if (children[i].isSpace) {
			return i + 1;
		}
	}
	return -1;
}
