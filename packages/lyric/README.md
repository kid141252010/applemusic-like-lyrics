# AMLL Lyric

English / [简体中文](./README-CN.md)

![AMLL-Lyric](https://img.shields.io/badge/Lyric-%23FB8C84?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/lyric)](https://www.npmjs.com/package/@applemusic-like-lyrics/lyric)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Flyric)](https://www.npmjs.com/package/@applemusic-like-lyrics/lyric)

`@applemusic-like-lyrics/lyric` is AMLL's multi-format lyric parser/generator package. It is implemented in TypeScript and supports LRC, YRC, QRC, Lyricify, TTML, and more.

## Installation

```bash
npm install @applemusic-like-lyrics/lyric
```

For pnpm or Yarn, replace `npm install` with `pnpm add` or `yarn add`.

## Usage

```ts
import { parseLrc, parseYrc, parseQrc, parseTTML } from "@applemusic-like-lyrics/lyric";

const lrcLines = parseLrc("[00:00.00]Hello AMLL");
const yrcLines = parseYrc(yrcText);
const qrcLines = parseQrc(qrcText);
const ttmlLyric = parseTTML(ttmlText);
```

Except for TTML, parse functions usually return `LyricLine[]`. TTML returns a `TTMLLyric` object containing `lines` and `metadata`.

## Use with the Player

The AMLL player consumes Core `LyricLine[]`. For TTML, use the parsed `lines`:

```ts
import type { LyricLine } from "@applemusic-like-lyrics/core";
import { parseTTML } from "@applemusic-like-lyrics/lyric";

const lyricLines: LyricLine[] = parseTTML(ttmlText).lines;
```

If you only work with TTML, prefer the dedicated `@applemusic-like-lyrics/ttml` package. It exposes a fuller TTML API and supports injecting DOM implementations for Node.js usage.

## Documentation

- Lyric format guide: https://amll.dev/en/guides/lyric/quickstart
- API reference: https://amll.dev/en/reference/lyric
