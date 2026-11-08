/**
 * 从 `time` 开始播放动画，并把开始时间固定在当前帧的时间线上
 *
 * 直接 `play()` 会进入 pending 状态，合成器动画要等这一帧提交后才确定开始时间，
 * 帧耗时较长（如移动端换行时的布局）时整行动画都会落后于播放进度
 */
export function playFrom(animation: Animation, time: number): void {
	animation.currentTime = time;
	animation.play();
	const now = animation.timeline?.currentTime ?? document.timeline?.currentTime;
	if (typeof now === "number" && animation.playbackRate !== 0) {
		animation.startTime = now - time / animation.playbackRate;
	}
}
