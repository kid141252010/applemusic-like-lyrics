# AMLL for Vue

[English](./README.md) / 简体中文

> 警告：此为个人项目，且尚未完成开发，可能仍有大量问题，所以请勿直接用于生产环境！

![AMLL-Vue](https://img.shields.io/badge/Vue-%2342d392?label=Apple%20Music-like%20Lyrics&labelColor=%23FB5C74)
[![npm](https://img.shields.io/npm/dt/%40applemusic-like-lyrics/vue)](https://www.npmjs.com/package/@applemusic-like-lyrics/vue)
[![npm](https://img.shields.io/npm/v/%40applemusic-like-lyrics%2Fvue)](https://www.npmjs.com/package/@applemusic-like-lyrics/vue)

AMLL Core 的 Vue 绑定，提供 `LyricPlayer` 和 `BackgroundRender` 组件。

## 安装

```bash
npm install @applemusic-like-lyrics/vue @applemusic-like-lyrics/ttml vue
npm install @pixi/app @pixi/core @pixi/display @pixi/filter-blur @pixi/filter-bulge-pinch @pixi/filter-color-matrix @pixi/sprite
```

如果使用 pnpm 或 Yarn，将 `npm install` 替换为 `pnpm add` 或 `yarn add`。当前包只需要上面列出的 peer 依赖。

## 基本使用

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

TTML 解析：

```ts
import { parseTTML } from "@applemusic-like-lyrics/ttml";

lyricLines.value = parseTTML(ttmlText).lines;
```

背景组件：

```vue
<BackgroundRender :album="albumUrl" :playing="playing" />
```

## 文档

- 快速入门：https://amll.dev/guides/overview/quickstart#vue-绑定
- API 参考：https://amll.dev/reference/vue
- 调试示例：`packages/playground/vue`
