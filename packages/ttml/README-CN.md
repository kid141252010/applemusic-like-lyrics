# AMLL TTML

[English](./README.md) / 简体中文

![AMLL-TTML](https://img.shields.io/badge/TTML-%23FB8C84?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/ttml)](https://www.npmjs.com/package/@applemusic-like-lyrics/ttml)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Fttml)](https://www.npmjs.com/package/@applemusic-like-lyrics/ttml)

`@applemusic-like-lyrics/ttml` 是 AMLL 的 TTML 解析与生成包，提供 TTML 结构化读写，以及转换为 Core 播放器可直接使用的歌词数据。

## 安装

```bash
npm install @applemusic-like-lyrics/ttml
```

## 浏览器快捷用法

```ts
import { parseTTML, exportTTML } from "@applemusic-like-lyrics/ttml";

const amllLyric = parseTTML(ttmlText);
const lyricLines = amllLyric.lines;
const nextTtmlText = exportTTML(amllLyric);
```

`parseTTML(ttmlText).lines` 可以直接传给 `@applemusic-like-lyrics/core`、`@applemusic-like-lyrics/react` 或 `@applemusic-like-lyrics/vue` 的 `LyricPlayer`。

## Node 环境

快捷函数依赖浏览器全局的 `DOMParser`、`document.implementation` 和 `XMLSerializer`。在 Node 环境中，请使用类模式并注入 DOM 实现，例如 `@xmldom/xmldom`：

```ts
import { DOMImplementation, DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { TTMLGenerator, TTMLParser, toAmllLyrics } from "@applemusic-like-lyrics/ttml";

const parser = new TTMLParser({
    domParser: new DOMParser(),
});

const parsed = parser.parse(ttmlText);
const amllLyric = toAmllLyrics(parsed);

const generator = new TTMLGenerator({
    domImplementation: new DOMImplementation(),
    xmlSerializer: new XMLSerializer(),
});

const nextTtmlText = generator.generate(parsed);
```

## 文档

- TTML 指南：https://amll.dev/guides/lyric/ttml
- API 参考：https://amll.dev/reference/ttml
