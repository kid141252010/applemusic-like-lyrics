# AMLL Core

[English](./README.md) / 简体中文

> 警告：此为个人项目，且尚未完成开发，可能仍有大量问题，所以请勿直接用于生产环境！

![AMLL-Core](https://img.shields.io/badge/Core-%233178c6?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/core)](https://www.npmjs.com/package/@applemusic-like-lyrics/core)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Fcore)](https://www.npmjs.com/package/@applemusic-like-lyrics/core)

AMLL Core 是框架无关的 DOM 组件库，提供歌词播放组件、背景渲染组件和相关类型。React/Vue 绑定都基于本包构建。

## 安装

```bash
npm install @applemusic-like-lyrics/core @applemusic-like-lyrics/ttml
npm install @pixi/app @pixi/core @pixi/display @pixi/filter-blur @pixi/filter-bulge-pinch @pixi/filter-color-matrix @pixi/sprite
```

如果使用 pnpm 或 Yarn，将 `npm install` 替换为 `pnpm add` 或 `yarn add`。部分包管理器会自动安装 peer 依赖；如果构建时提示缺少 `@pixi/*`，请显式安装上面的 Pixi 包。

## 基本使用

```ts
import { LyricPlayer } from "@applemusic-like-lyrics/core";
import { parseTTML } from "@applemusic-like-lyrics/ttml";
import "@applemusic-like-lyrics/core/style.css";

const audio = document.querySelector<HTMLAudioElement>("#audio")!;
const player = new LyricPlayer();

document.body.appendChild(player.getElement());

const ttmlText = await fetch("/lyrics.ttml").then((res) => res.text());
player.setLyricLines(parseTTML(ttmlText).lines);
player.setCurrentTime(0, true);
player.update(0);

let lastFrameTime = -1;

function frame(time: number) {
    if (lastFrameTime === -1) lastFrameTime = time;
    const delta = time - lastFrameTime;
    lastFrameTime = time;

    if (!audio.paused) {
        player.setCurrentTime(Math.floor(audio.currentTime * 1000));
    }

    player.update(delta);
    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
```

要点：

- `setLyricLines()` 接收 Core 的 `LyricLine[]`，TTML 推荐使用 `@applemusic-like-lyrics/ttml` 的 `parseTTML(ttmlText).lines`。
- `setCurrentTime()` 的单位是整数毫秒；拖动进度条或点击歌词跳转时，将第二个参数设为 `true`。
- `update(deltaMs)` 推进动画，应在组件挂载后逐帧调用。
- 组件不用时调用 `dispose()` 释放资源。

## 数据结构

`LyricLine[]` 中每行包含：

- `words`: 逐词歌词数组，每个单词包含 `startTime`、`endTime`、`word`，并可选包含 `romanWord`、`ruby`、`obscene`
- `translatedLyric`: 翻译文本
- `romanLyric`: 音译文本
- `startTime` / `endTime`: 行级时间戳，单位毫秒
- `isBG` / `isDuet`: 背景人声与对唱标记

## 样式

必须引入 `@applemusic-like-lyrics/core/style.css`。常用自定义方式是覆写 CSS 变量：

```css
.amll-lyric-player {
    --amll-lp-color: #ffffff;
    --amll-lp-bg-color: rgba(0, 0, 0, 0.35);
}
```

## 文档与开发

- 使用指南：https://amll.dev/guides/overview/quickstart
- API 参考：https://amll.dev/reference/core
- 调试示例：`packages/playground/core`

```bash
bun run --cwd packages/core dev
bun run --cwd packages/core build
```
