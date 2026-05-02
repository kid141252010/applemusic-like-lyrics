# AMLL Core

English / [简体中文](./README-CN.md)

> Warning: This is a personal project and is still under development. There may still be many issues, so please do not use it directly in production environments.

![AMLL-Core](https://img.shields.io/badge/Core-%233178c6?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/core)](https://www.npmjs.com/package/@applemusic-like-lyrics/core)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Fcore)](https://www.npmjs.com/package/@applemusic-like-lyrics/core)

AMLL Core is the framework-agnostic DOM component package. It provides the lyric player, background renderer, and shared types. The React and Vue bindings are built on top of this package.

## Installation

```bash
npm install @applemusic-like-lyrics/core @applemusic-like-lyrics/ttml
npm install @pixi/app @pixi/core @pixi/display @pixi/filter-blur @pixi/filter-bulge-pinch @pixi/filter-color-matrix @pixi/sprite
```

For pnpm or Yarn, replace `npm install` with `pnpm add` or `yarn add`. Some package managers install peer dependencies automatically; if your build reports missing `@pixi/*` packages, install the Pixi packages above explicitly.

## Basic Usage

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

Key points:

- `setLyricLines()` accepts Core `LyricLine[]`. For TTML, use `parseTTML(ttmlText).lines` from `@applemusic-like-lyrics/ttml`.
- `setCurrentTime()` uses integer milliseconds. Pass `true` as the second argument when the user seeks or jumps by clicking a lyric line.
- `update(deltaMs)` advances animation and should be called every frame while the component is mounted.
- Call `dispose()` when the component is no longer used.

## Data Model

`LyricLine[]` contains:

- `words`: timed words, each with `startTime`, `endTime`, `word`, and optional `romanWord`, `ruby`, `obscene`
- `translatedLyric`: translated text
- `romanLyric`: romanized text
- `startTime` / `endTime`: line timestamps in milliseconds
- `isBG` / `isDuet`: background-vocal and duet flags

## Styling

Import `@applemusic-like-lyrics/core/style.css`. Common customization is done by overriding CSS variables:

```css
.amll-lyric-player {
    --amll-lp-color: #ffffff;
    --amll-lp-bg-color: rgba(0, 0, 0, 0.35);
}
```

## Docs and Development

- Guide: https://amll.dev/en/guides/overview/quickstart
- API reference: https://amll.dev/en/reference/core
- Playground: `packages/playground/core`

```bash
bun run --cwd packages/core dev
bun run --cwd packages/core build
```
