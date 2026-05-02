# AMLL TTML

English / [简体中文](./README-CN.md)

![AMLL-TTML](https://img.shields.io/badge/TTML-%23FB8C84?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/ttml)](https://www.npmjs.com/package/@applemusic-like-lyrics/ttml)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Fttml)](https://www.npmjs.com/package/@applemusic-like-lyrics/ttml)

`@applemusic-like-lyrics/ttml` is AMLL's TTML parser/generator package. It can read/write structured TTML and convert TTML lyrics into data that Core players can consume directly.

## Installation

```bash
npm install @applemusic-like-lyrics/ttml
```

## Browser Shortcut

```ts
import { parseTTML, exportTTML } from "@applemusic-like-lyrics/ttml";

const amllLyric = parseTTML(ttmlText);
const lyricLines = amllLyric.lines;
const nextTtmlText = exportTTML(amllLyric);
```

`parseTTML(ttmlText).lines` can be passed directly to `LyricPlayer` from `@applemusic-like-lyrics/core`, `@applemusic-like-lyrics/react`, or `@applemusic-like-lyrics/vue`.

## Node.js

The shortcut functions depend on browser globals: `DOMParser`, `document.implementation`, and `XMLSerializer`. In Node.js, use class mode and inject DOM implementations, for example with `@xmldom/xmldom`:

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

## Documentation

- TTML guide: https://amll.dev/en/guides/lyric/ttml
- API reference: https://amll.dev/en/reference/ttml
