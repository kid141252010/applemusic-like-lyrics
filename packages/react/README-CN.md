# AMLL for React

[English](./README.md) / 简体中文

> 警告：此为个人项目，且尚未完成开发，可能仍有大量问题，所以请勿直接用于生产环境！

![AMLL-React](https://img.shields.io/badge/React-%23149eca?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/react)](https://www.npmjs.com/package/@applemusic-like-lyrics/react)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Freact)](https://www.npmjs.com/package/@applemusic-like-lyrics/react)

AMLL Core 的 React 绑定，提供 `LyricPlayer` 和 `BackgroundRender` 组件。

## 安装

```bash
npm install @applemusic-like-lyrics/react @applemusic-like-lyrics/ttml react react-dom
npm install @pixi/app @pixi/core @pixi/display @pixi/filter-blur @pixi/filter-bulge-pinch @pixi/filter-color-matrix @pixi/sprite
```

如果使用 pnpm 或 Yarn，将 `npm install` 替换为 `pnpm add` 或 `yarn add`。当前包只需要上面列出的 peer 依赖。

## 基本使用

```tsx
import { useState } from "react";
import type { LyricLine } from "@applemusic-like-lyrics/core";
import { LyricPlayer } from "@applemusic-like-lyrics/react";
import "@applemusic-like-lyrics/core/style.css";

export function Lyrics() {
    const [lyricLines, setLyricLines] = useState<LyricLine[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [playing, setPlaying] = useState(false);

    return (
        <LyricPlayer
            lyricLines={lyricLines}
            currentTime={currentTime}
            playing={playing}
            style={{ height: 480 }}
        />
    );
}
```

TTML 解析：

```ts
import { parseTTML } from "@applemusic-like-lyrics/ttml";

const lyricLines = parseTTML(ttmlText).lines;
```

背景组件：

```tsx
import { BackgroundRender } from "@applemusic-like-lyrics/react";

<BackgroundRender album="/cover.jpg" playing={playing} />;
```

## 文档

- 快速入门：https://amll.dev/guides/react/quick-start
- API 参考：https://amll.dev/reference/react
- 调试示例：`packages/playground/react`
