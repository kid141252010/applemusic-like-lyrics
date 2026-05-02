# AMLL for Vue

English / [简体中文](./README-CN.md)

> Warning: This is a personal project and is still under development. There may still be many issues, so please do not use it directly in production environments.

![AMLL-Vue](https://img.shields.io/badge/Vue-%2342d392?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/vue)](https://www.npmjs.com/package/@applemusic-like-lyrics/vue)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Fvue)](https://www.npmjs.com/package/@applemusic-like-lyrics/vue)

Vue bindings for AMLL Core, providing `LyricPlayer` and `BackgroundRender` components.

## Installation

```bash
npm install @applemusic-like-lyrics/vue @applemusic-like-lyrics/ttml vue
npm install @pixi/app @pixi/core @pixi/display @pixi/filter-blur @pixi/filter-bulge-pinch @pixi/filter-color-matrix @pixi/sprite
```

For pnpm or Yarn, replace `npm install` with `pnpm add` or `yarn add`. The current package only needs the peer dependencies listed above.

## Basic Usage

```vue
<template>
    <LyricPlayer
        :lyric-lines="lyricLines"
        :current-time="currentTime"
        :playing="playing"
        style="height: 480px"
    />
</template>

<script setup lang="ts">
import type { LyricLine } from "@applemusic-like-lyrics/core";
import { LyricPlayer } from "@applemusic-like-lyrics/vue";
import { shallowRef, ref } from "vue";
import "@applemusic-like-lyrics/core/style.css";

const lyricLines = shallowRef<LyricLine[]>([]);
const currentTime = ref(0);
const playing = ref(false);
</script>
```

TTML parsing:

```ts
import { parseTTML } from "@applemusic-like-lyrics/ttml";

lyricLines.value = parseTTML(ttmlText).lines;
```

Background component:

```vue
<BackgroundRender :album="albumUrl" :playing="playing" />
```

## Documentation

- Quick start: https://amll.dev/en/guides/overview/quickstart#vue-bindings
- API reference: https://amll.dev/en/reference/vue
- Playground: `packages/playground/vue`
