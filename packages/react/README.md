# AMLL for React

English / [简体中文](./README-CN.md)

> Warning: This is a personal project and is still under development. There may still be many issues, so please do not use it directly in production environments.

![AMLL-React](https://img.shields.io/badge/React-%23149eca?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/react)](https://www.npmjs.com/package/@applemusic-like-lyrics/react)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Freact)](https://www.npmjs.com/package/@applemusic-like-lyrics/react)

React bindings for AMLL Core, providing `LyricPlayer` and `BackgroundRender` components.

## Installation

```bash
npm install @applemusic-like-lyrics/react @applemusic-like-lyrics/ttml react react-dom
npm install @pixi/app @pixi/core @pixi/display @pixi/filter-blur @pixi/filter-bulge-pinch @pixi/filter-color-matrix @pixi/sprite
```

For pnpm or Yarn, replace `npm install` with `pnpm add` or `yarn add`. The current package only needs the peer dependencies listed above.

## Basic Usage

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

TTML parsing:

```ts
import { parseTTML } from "@applemusic-like-lyrics/ttml";

const lyricLines = parseTTML(ttmlText).lines;
```

Background component:

```tsx
import { BackgroundRender } from "@applemusic-like-lyrics/react";

<BackgroundRender album="/cover.jpg" playing={playing} />;
```

## Documentation

- Quick start: https://amll.dev/en/guides/react/quick-start
- API reference: https://amll.dev/en/reference/react
- Playground: `packages/playground/react`
