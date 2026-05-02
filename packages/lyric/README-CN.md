# AMLL Lyric

[English](./README.md) / 简体中文

![AMLL-Lyric](https://img.shields.io/badge/Lyric-%23FB8C84?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/lyric)](https://www.npmjs.com/package/@applemusic-like-lyrics/lyric)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Flyric)](https://www.npmjs.com/package/@applemusic-like-lyrics/lyric)

`@applemusic-like-lyrics/lyric` 是 AMLL 的多格式歌词解析/生成包，当前为 TypeScript 实现，支持 LRC、YRC、QRC、Lyricify、TTML 等格式。

## 安装

```bash
npm install @applemusic-like-lyrics/lyric
```

如果使用 pnpm 或 Yarn，将 `npm install` 替换为 `pnpm add` 或 `yarn add`。

## 使用

```ts
import { parseLrc, parseYrc, parseQrc, parseTTML } from "@applemusic-like-lyrics/lyric";

const lrcLines = parseLrc("[00:00.00]Hello AMLL");
const yrcLines = parseYrc(yrcText);
const qrcLines = parseQrc(qrcText);
const ttmlLyric = parseTTML(ttmlText);
```

除 TTML 外，解析函数通常返回 `LyricLine[]`；TTML 会返回包含 `lines` 与 `metadata` 的 `TTMLLyric` 对象。

## 与播放器配合

AMLL 播放器需要 Core 的 `LyricLine[]`。使用 TTML 时推荐直接取 `lines`：

```ts
import type { LyricLine } from "@applemusic-like-lyrics/core";
import { parseTTML } from "@applemusic-like-lyrics/lyric";

const lyricLines: LyricLine[] = parseTTML(ttmlText).lines;
```

如果只处理 TTML，优先使用专用包 `@applemusic-like-lyrics/ttml`，它能提供更完整的 TTML API，并支持在 Node 环境中注入 DOM 实现。

## 文档

- 歌词格式指南：https://amll.dev/guides/lyric/quickstart
- API 参考：https://amll.dev/reference/lyric
