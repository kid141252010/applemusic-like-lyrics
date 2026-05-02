# AMLL for React (Full ver.)

English / [简体中文](./README-CN.md)

> Warning: This is a personal project and has not yet been completed. There may still be a lot of problems, so please do not use it directly in the production environment!

`@applemusic-like-lyrics/react-full` provides ready-to-use modular React player components built on top of AMLL Core and React bindings. Use it when you want a fuller player layout instead of wiring only `LyricPlayer` and `BackgroundRender`.

## Installation

```bash
npm install @applemusic-like-lyrics/react-full jotai react react-dom
```

Import the package stylesheet when using the prebuilt components:

```ts
import "@applemusic-like-lyrics/react-full/style.css";
```

For lower-level lyric rendering, use `@applemusic-like-lyrics/react`.
