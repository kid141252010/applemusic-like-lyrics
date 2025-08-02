import { defineConfig } from "electron-vite";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import wasm from "vite-plugin-wasm";
import react from "@vitejs/plugin-react";

export default defineConfig({
	renderer: {
		plugins: [
            react(),
			tailwindcss(),
			wasm(),
			// topLevelAwait(),

			svgr({
				svgrOptions: {
					ref: true,
				},
				include: ["./src/**/*.svg?react", "../react-full/src/**/*.svg?react"],
			}),
		],
		resolve: {
			dedupe: ["react", "react-dom", "jotai"],
			alias: {
				"@applemusic-like-lyrics/core": resolve(__dirname, "../core/src"),
				"@applemusic-like-lyrics/react": resolve(__dirname, "../react/src"),
				"@applemusic-like-lyrics/ttml": resolve(__dirname, "../ttml/src"),
				"@applemusic-like-lyrics/react-full": resolve(
					__dirname,
					"../react-full/src",
				),
			},
		},
	},
});
