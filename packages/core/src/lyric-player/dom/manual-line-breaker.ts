import styles from "../../styles/lyric-player.module.css";
import type { LyricManualLineBreakConfig } from "./index.ts";
import {
	areLineRangesEqual,
	calcPackedLineRanges,
	type LineRange,
} from "./manual-line-break-algorithm.ts";

/**
 * 断行布局单元，对应主行 DOM 中的一个连续节点片段。
 * 收集阶段 width 为 0，apply 时才测量并填入真实像素宽度。
 */
export interface LayoutToken {
	/** 对应的 DOM 节点（HTMLElement 或 Text） */
	node: Node;
	/**
	 * 断行优先级：
	 * - 0：不可/低优先级断行点
	 * - 2：空白符后（可断行）
	 * - 3：标点符号后（可断行）
	 */
	breakPriority: number;
	/** 节点的视觉宽度（像素，apply 后填充） */
	width: number;
	/** 节点对应的原始文本，用于分词边界判断 */
	text: string;
}

/**
 * 手动断行管理器。
 *
 * 负责收集歌词主行的布局 token，并在宽度不足时将其按
 * "尽量填满当前行、最后空格优先、最后标点次之"的策略
 * 拆分到多个 `.lyricManualLine` 子容器中。
 *
 * 使用方式：
 * 1. 构建 DOM 时调用 {@link pushToken} 注册每个节点；
 * 2. DOM 插入布局后调用 {@link apply} 执行断行；
 * 3. 容器尺寸变化时调用 {@link maybeReflow} 按需重排；
 * 4. 重建元素前调用 {@link reset}（清空 token 列表）。
 */
export class ManualLineBreaker {
	/** 当前行所有布局 token，按 DOM 顺序排列 */
	private layoutTokens: LayoutToken[] = [];
	/** apply 生成的 `.lyricManualLine` 容器，用于 clear 时还原 DOM */
	private manualLineContainers: HTMLDivElement[] = [];
	/** 上次 apply 时的主行内容宽度，用于 maybeReflow 的变化检测 */
	private lastMainWidth = 0;
	/** 上次应用到 DOM 的断行结果，用于避免无变化时重复重包节点 */
	private lastLineRanges: LineRange[] = [];
	private readonly measurementCache = new WeakMap<
		Node,
		{ key: string; width: number }
	>();
	/** 用于纯文本分段的分词器 */
	private segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

	constructor(private readonly getConfig: () => LyricManualLineBreakConfig) {}

	/** 重置 token 列表与缓存宽度，通常在重建元素前调用 */
	reset(): void {
		this.layoutTokens = [];
		this.lastMainWidth = 0;
		this.lastLineRanges = [];
	}

	/**
	 * 将纯文本分段为 token 并追加到布局列表。
	 */
	appendPlainTextTokens(main: HTMLDivElement, text: string): void {
		const punctuations = this.getConfig().punctuations;

		let currentToken = "";
		const flush = (token: string, isWhitespace: boolean = false) => {
			if (!token.length) return;
			const node = document.createTextNode(token);
			main.appendChild(node);
			if (isWhitespace) {
				this.pushToken(node, token, 2);
			} else {
				this.pushToken(node, token);
			}
		};

		for (const { segment } of this.segmenter.segment(text)) {
			// 空白字符单独成节点，并结束当前正在累积的普通 token
			if (segment.trim().length === 0) {
				flush(currentToken, false);
				currentToken = "";
				flush(segment, true);
				continue;
			}

			// 非空白 segment
			if (punctuations.includes(segment)) {
				// 标点附着到前一个 token（如果存在），否则单独成 token
				if (currentToken.length) {
					currentToken += segment;
				} else {
					currentToken = segment;
				}
			} else {
				// 普通词：先提交之前的 token，再开始新 token
				flush(currentToken, false);
				currentToken = segment;
			}
		}
		flush(currentToken, false);
	}

	/**
	 * 向列表末尾追加一个布局 token。
	 * 若未显式指定 breakPriority，会根据文本内容自动推断：
	 * 纯空白 → 2，末字符为标点 → 3，其余 → 0。
	 */
	pushToken(node: Node, rawText: string, breakPriority: number = -1): void {
		let priority = breakPriority;
		if (priority === -1) {
			if (rawText.trim().length === 0) {
				priority = 2; // 空白
			} else {
				const normalized = rawText.trimEnd();
				const lastChar = normalized.charAt(normalized.length - 1);
				if (lastChar && this.getConfig().punctuations.includes(lastChar)) {
					priority = 3; // 标点符号
				} else {
					priority = 0;
				}
			}
		}
		this.layoutTokens.push({
			node,
			breakPriority: priority,
			width: 0,
			text: rawText,
		});
	}

	/**
	 * 移除所有手动断行容器，将 token 节点还原到 main 直属子节点，
	 * 并移除 manualLineBreakEnabled CSS 类。
	 */
	clear(main: HTMLDivElement): void {
		for (const line of this.manualLineContainers) {
			// 将行容器内的子节点逐一移回 main（保持相对顺序）
			while (line.firstChild) {
				line.parentNode?.insertBefore(line.firstChild, line);
			}
			line.remove();
		}
		this.manualLineContainers = [];
		this.lastLineRanges = [];
		main.classList.remove(styles.manualLineBreakEnabled);
	}

	/**
	 * 在容器宽度变化超过 0.5px 时触发重排，避免每帧都重算。
	 * 通常由 ResizeObserver 回调驱动。
	 */
	maybeReflow(main: HTMLDivElement): boolean {
		if (this.layoutTokens.length === 0) return false;
		const transformScale = this.getMainTransformScale(main);
		const width = this.getMainContentWidth(main, transformScale);
		if (width <= 0) return false;
		if (Math.abs(width - this.lastMainWidth) > 0.5) {
			return this.apply(main);
		}
		return false;
	}

	/**
	 * 执行手动断行布局：
	 * 1. 启用 nowrap，避免测量时被浏览器自动换行影响；
	 * 2. 测量所有 token 的像素宽度；
	 * 3. 用 packed greedy 算法逐行尽量填满；
	 * 4. 断点未变化时跳过 DOM 重包；
	 * 5. 需要断行时将 token 分组包裹进 `.lyricManualLine` 容器。
	 *
	 * @returns DOM 断行结构是否发生变化。
	 */
	apply(main: HTMLDivElement): boolean {
		if (!this.getConfig().enabled) {
			const changed =
				this.manualLineContainers.length > 0 ||
				main.classList.contains(styles.manualLineBreakEnabled);
			this.clear(main);
			this.lastMainWidth = 0;
			return changed;
		}
		if (this.layoutTokens.length === 0) {
			const changed =
				this.manualLineContainers.length > 0 ||
				main.classList.contains(styles.manualLineBreakEnabled);
			this.clear(main);
			return changed;
		}

		const transformScale = this.getMainTransformScale(main);
		const maxWidth = this.getMainContentWidth(main, transformScale);
		if (maxWidth <= 0) {
			return false;
		}

		// 启用 nowrap 以阻止浏览器自行换行，改由本算法控制
		main.classList.add(styles.manualLineBreakEnabled);

		// 测量所有 token 的视觉宽度
		for (const token of this.layoutTokens) {
			token.width = this.measureNodeWidth(token.node, transformScale);
		}

		const lineRanges = calcPackedLineRanges(this.layoutTokens, maxWidth);
		if (lineRanges.length === 0) {
			this.lastMainWidth = maxWidth;
			return false;
		}

		const rangesChanged = !areLineRangesEqual(lineRanges, this.lastLineRanges);
		const shouldWrap = lineRanges.length > 1;
		const structureMatches = shouldWrap
			? this.manualLineContainers.length === lineRanges.length
			: this.manualLineContainers.length === 0;
		if (!rangesChanged && structureMatches) {
			this.lastMainWidth = maxWidth;
			return false;
		}

		this.clear(main);
		main.classList.add(styles.manualLineBreakEnabled);
		this.lastLineRanges = lineRanges.map(([start, end]) => [start, end]);

		if (!shouldWrap) {
			this.lastMainWidth = maxWidth;
			return true;
		}

		// 将每行 token 包裹进独立的 div 容器并批量插入
		const fragment = document.createDocumentFragment();
		for (const [start, end] of lineRanges) {
			const line = document.createElement("div");
			line.classList.add(styles.lyricManualLine);
			for (let i = start; i <= end; i++) {
				line.appendChild(this.layoutTokens[i].node);
			}
			this.manualLineContainers.push(line);
			fragment.appendChild(line);
		}
		main.appendChild(fragment);
		this.lastMainWidth = maxWidth;
		return true;
	}

	/** 获取 HTMLElement 的水平内边距之和（像素） */
	private getNodeHorizontalPadding(node: Node): number {
		if (!(node instanceof HTMLElement)) return 0;
		const style = getComputedStyle(node);
		const pl = Number.parseFloat(style.paddingLeft) || 0;
		const pr = Number.parseFloat(style.paddingRight) || 0;
		return pl + pr;
	}

	/** 获取主行 div 的内容区宽度，使用 DOMRect 保留亚像素精度。 */
	private getMainContentWidth(
		main: HTMLDivElement,
		transformScale = this.getMainTransformScale(main),
	): number {
		const scale = transformScale > 0 ? transformScale : 1;
		const rectWidth = main.getBoundingClientRect().width;
		const borderBoxWidth = rectWidth > 0 ? rectWidth / scale : main.clientWidth;
		if (borderBoxWidth <= 0) return 0;
		const style = getComputedStyle(main);
		const pl = Number.parseFloat(style.paddingLeft) || 0;
		const pr = Number.parseFloat(style.paddingRight) || 0;
		const bl = Number.parseFloat(style.borderLeftWidth) || 0;
		const br = Number.parseFloat(style.borderRightWidth) || 0;
		const contentWidth = borderBoxWidth - (pl + pr + bl + br);
		return Math.max(0, contentWidth);
	}

	/** 获取主行及其祖先 transform 产生的横向缩放比例。 */
	private getMainTransformScale(main: HTMLDivElement): number {
		let scale = 1;
		let element: HTMLElement | null = main;
		while (element && element !== document.documentElement) {
			scale *= this.getElementTransformScale(element);
			element = element.parentElement;
		}
		return scale > 0 && Number.isFinite(scale) ? scale : 1;
	}

	private getElementTransformScale(element: HTMLElement): number {
		const transform = getComputedStyle(element).transform;
		if (!transform || transform === "none") return 1;

		const match = transform.match(/^matrix(3d)?\((.+)\)$/);
		if (!match) return 1;
		const values = match[2]
			.split(",")
			.map((value) => Number.parseFloat(value.trim()));
		if (match[1]) {
			const [a = 1, b = 0, c = 0] = values;
			return Math.hypot(a, b, c) || 1;
		}
		const [a = 1, b = 0] = values;
		return Math.hypot(a, b) || 1;
	}

	/**
	 * 测量单个节点的视觉宽度（布局像素）：
	 * - HTMLElement：使用 getBoundingClientRect，但扣除水平 padding（动画容器等会撑大 rect）；
	 * - Text 节点：使用 Range.getBoundingClientRect 直接测量文本渲染宽度。
	 * transformScale 用于将物理像素还原为布局像素。
	 */
	private measureNodeWidth(node: Node, transformScale = 1): number {
		const cacheKey = this.getMeasurementCacheKey(node);
		const cached = this.measurementCache.get(node);
		if (cached?.key === cacheKey) return cached.width;

		const scale = transformScale > 0 ? transformScale : 1;
		let width = 0;
		if (node instanceof HTMLElement) {
			const rectWidth = node.getBoundingClientRect().width;
			const visualPadding = this.getNodeHorizontalPadding(node) * scale;
			const visualWidth = rectWidth - visualPadding;
			width = Math.max(0, visualWidth / scale);
		} else if (node instanceof Text) {
			const range = document.createRange();
			range.selectNodeContents(node);
			width = range.getBoundingClientRect().width / scale;
			range.detach?.();
		}

		this.measurementCache.set(node, { key: cacheKey, width });
		return width;
	}

	private getMeasurementCacheKey(node: Node): string {
		const element =
			node instanceof HTMLElement ? node : (node.parentElement ?? null);
		if (!element) return node.textContent ?? "";
		const style = getComputedStyle(element);
		return [
			node.textContent ?? "",
			element.className,
			style.font,
			style.letterSpacing,
			style.wordSpacing,
			style.textTransform,
			style.fontKerning,
			style.fontFeatureSettings,
			style.fontVariationSettings,
			style.paddingLeft,
			style.paddingRight,
		].join("\0");
	}
}
