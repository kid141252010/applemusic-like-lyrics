import type { Disposable } from "#interfaces";
import { Spring } from "#utils/spring.ts";
import { Duration, MediaTime } from "#utils/time.ts";
import { LyricLineRenderMode } from "./consts.ts";
import type { LyricLineBase } from "./line.ts";

export interface LyricPlayerFlags {
	getEnableSpring(): boolean;
	getEnableScale(): boolean;
	getIsPlaying(): boolean;
	getAlwaysPostpositionBackground(): boolean;
	getCurrentTime(): number;
}

export abstract class LyricLineGroupBase<
	T extends LyricLineBase = LyricLineBase,
> implements Disposable
{
	protected abstract readonly lyricPlayer: LyricPlayerFlags;

	public posY: Spring = new Spring(0);
	public bgSlideY: Spring = new Spring(-80);
	public top = 0;
	public delay: Duration = Duration.ZERO;

	public isActive = false;
	public isMainActive = false;
	public isBgActive = false;
	public opacity = 1;
	public blur = 0;

	public isBgFirst = false;

	protected isUiDirty = true;

	constructor(
		public mainLine: T,
		public bgLine?: T | undefined,
	) {}

	get startTime(): MediaTime {
		const mainStart = this.mainLine.getLine().startTime;
		if (!this.bgLine) return MediaTime.fromMillis(mainStart);
		const bgStart = this.bgLine.getLine().startTime;
		return MediaTime.fromMillis(Math.min(mainStart, bgStart));
	}

	get endTime(): MediaTime {
		return MediaTime.fromMillis(this.mainLine.getLine().endTime);
	}

	onLineSizeChange(size: [number, number]): void {
		this.mainLine.onLineSizeChange(size);
		this.bgLine?.onLineSizeChange(size);
	}

	onBgSizeChange?(size: [number, number]): void;

	abstract getElement(): Element;

	/**
	 * 根据当前媒体播放时间独立调度主行和背景行的激活
	 */
	public updateLineActivation(time: number, shouldPlay?: boolean): void {
		if (!this.isActive) return;

		let changed = false;

		// 1. 伴唱行激活调度
		if (this.bgLine) {
			const bgStart = this.bgLine.getLine().startTime;
			if (time >= bgStart && !this.isBgActive) {
				this.isBgActive = true;
				this.bgLine.enable(time, shouldPlay);
				changed = true;
			}
		}

		// 2. 主歌词行激活调度：只有当时间真正到达主行开唱点才激活
		const mainStart = this.mainLine.getLine().startTime;
		if (time >= mainStart && !this.isMainActive) {
			this.isMainActive = true;
			this.mainLine.enable(time, shouldPlay);
			changed = true;
		}

		if (changed) {
			this.setLineTransformations(this.delay);
			this.updateBgSlideY();
			this.isUiDirty = true;
		}
	}

	private updateBgSlideY(immediate = false): void {
		const alwaysPostposition =
			this.lyricPlayer.getAlwaysPostpositionBackground();
		const shouldBgFirst = alwaysPostposition ? false : this.isBgFirst;
		const hiddenSlideY = shouldBgFirst ? 80 : -80;

		const isPlaying = this.lyricPlayer.getIsPlaying();
		const shouldBgShow = this.isBgActive || !isPlaying;
		const targetBgSlideY = shouldBgShow ? 0 : hiddenSlideY;

		if (immediate || !this.lyricPlayer.getEnableSpring()) {
			this.bgSlideY.setPosition(targetBgSlideY);
		} else {
			this.bgSlideY.setTargetPosition(targetBgSlideY, this.delay);
		}
	}

	setTransform(
		top: number,
		immediate: boolean,
		delay: Duration,
		isActive: boolean,
		opacity: number,
		blur: number,
	): void {
		this.top = top;
		this.delay = delay;
		this.isActive = isActive;
		this.opacity = opacity;
		this.blur = blur;

		if (isActive) {
			this.updateLineActivation(
				this.lyricPlayer.getCurrentTime(),
				this.lyricPlayer.getIsPlaying(),
			);
		} else {
			this.isMainActive = false;
			this.isBgActive = false;
		}

		this.setLineTransformations(delay);

		const enableSpring = this.lyricPlayer.getEnableSpring();
		if (immediate || !enableSpring) {
			this.posY.setPosition(top);
		} else {
			this.posY.setTargetPosition(top, delay);
		}

		this.updateBgSlideY(immediate);
		this.isUiDirty = true;
	}

	private setLineTransformations(delay: Duration) {
		const enableScale = this.lyricPlayer.getEnableScale();
		const isPlaying = this.lyricPlayer.getIsPlaying();

		const mainRenderMode = this.isMainActive
			? LyricLineRenderMode.GRADIENT
			: LyricLineRenderMode.SOLID;

		const SCALE_ASPECT = enableScale ? 97 : 100;
		let mainScale = 100;
		if (!this.isMainActive && isPlaying) {
			mainScale = SCALE_ASPECT;
		}

		this.mainLine.setTransform(mainScale, 1, 0, delay, mainRenderMode);

		let bgScale = 100;
		if (!this.isBgActive && isPlaying) {
			bgScale = 75;
		}
		const bgRenderMode = this.isBgActive
			? LyricLineRenderMode.GRADIENT
			: LyricLineRenderMode.SOLID;

		this.bgLine?.setTransform(bgScale, 1, 0, delay, bgRenderMode);
	}

	protected abstract renderStyles(): void;

	/**
	 * 根据当前动画位置判断歌词行是否处于渲染范围内
	 *
	 * @param includeOverscan 是否包含 overscan 渲染缓冲范围，默认包含；
	 * 传入 false 时，仅判断歌词行是否在真实视口范围内
	 */
	abstract isInRenderRange(includeOverscan?: boolean): boolean;

	update(delta: Duration = Duration.ZERO): void {
		if (
			this.isActive &&
			(!this.isMainActive || (this.bgLine && !this.isBgActive))
		) {
			this.updateLineActivation(
				this.lyricPlayer.getCurrentTime(),
				this.lyricPlayer.getIsPlaying(),
			);
		}

		if (this.lyricPlayer.getEnableSpring()) {
			const posMoving = !this.posY.arrived();
			const bgMoving = !this.bgSlideY.arrived();
			this.posY.update(delta);
			this.bgSlideY.update(delta);

			if (posMoving || bgMoving) {
				this.isUiDirty = true;
			}
		}

		this.mainLine.update(delta);
		this.bgLine?.update(delta);
	}

	commitChanges(): void {
		if (!this.isInRenderRange()) return;
		if (this.isUiDirty) {
			this.renderStyles();
			this.isUiDirty = false;
		}
		this.mainLine.commitChanges();
		this.bgLine?.commitChanges();
	}

	rebuildAllLines(): void {
		this.mainLine.rebuildElement();
		this.bgLine?.rebuildElement();
	}

	enable(
		time: number = this.lyricPlayer.getCurrentTime(),
		shouldPlay: boolean = this.lyricPlayer.getIsPlaying(),
	): void {
		this.isActive = true;
		this.updateLineActivation(time, shouldPlay);
	}

	disable(): void {
		this.isActive = false;
		this.isMainActive = false;
		this.isBgActive = false;
		this.mainLine.disable();
		this.bgLine?.disable();
		this.updateBgSlideY();
		this.setLineTransformations(this.delay);
		this.isUiDirty = true;
	}

	dispose(): void {
		this.mainLine.dispose();
		this.bgLine?.dispose();
	}
}
