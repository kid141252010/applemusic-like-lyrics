import type { LyricLine as CoreLyricLine } from "@applemusic-like-lyrics/core";
import {
	type LyricLine,
	parseEslrc,
	parseLrc,
	parseLys,
	parseQrc,
	parseTTML,
	parseYrc,
} from "@applemusic-like-lyrics/lyric";
import chalk from "chalk";
import { useMemo } from "react";

const LYRIC_LOG_TAG = chalk.bgHex("#FF4444").hex("#FFFFFF")(" LYRIC ");

type TransLine = {
	[K in keyof CoreLyricLine]: CoreLyricLine[K] extends string ? K : never;
}[keyof CoreLyricLine];

function pairLyric(line: LyricLine, lines: CoreLyricLine[], key: TransLine) {
	if (
		line.words
			.map((v) => v.word)
			.join("")
			.trim().length === 0
	)
		return;
	interface PairedLine {
		startTime: number;
		lineText: string;
		origIndex: number;
		original: CoreLyricLine;
	}
	const processed: PairedLine[] = lines.map((v, i) => ({
		startTime: Math.min(v.startTime, ...v.words.map((v) => v.startTime)),
		origIndex: i,
		lineText: v.words
			.map((v) => v.word)
			.join("")
			.trim(),
		original: v,
	}));
	let nearestLine: PairedLine | undefined;
	for (const coreLine of processed) {
		if (coreLine.lineText.length > 0) {
			if (coreLine.startTime === line.words[0].startTime) {
				nearestLine = coreLine;
				break;
			}
			if (
				nearestLine &&
				Math.abs(nearestLine.startTime - line.words[0].startTime) >
					Math.abs(coreLine.startTime - line.words[0].startTime)
			) {
				nearestLine = coreLine;
			} else if (nearestLine === undefined) {
				nearestLine = coreLine;
			}
		}
	}
	if (nearestLine) {
		const joined = line.words.map((w) => w.word).join("");
		if (nearestLine.original[key].length > 0)
			nearestLine.original[key] += joined;
		else nearestLine.original[key] = joined;
	}
}

interface LyricParserResult {
	lyricLines: LyricLine[];
	hasLyrics: boolean;
	metadata: [string, string[]][];
}

/**
 * 从 TTML 原始文本中提取 iTunesMetadata 空间音频偏差值（毫秒）
 * 对应标签：<audio lyricOffset="<ms>" role="spatial"/>
 */
function parseSpatialAudioBias(ttmlRaw: string): number | undefined {
	const match = ttmlRaw.match(
		/<audio[^>]+role\s*=\s*["']spatial["'][^>]*lyricOffset\s*=\s*["']([^"']+)["'][^>]*\/?>|<audio[^>]+lyricOffset\s*=\s*["']([^"']+)["'][^>]+role\s*=\s*["']spatial["'][^>]*\/?>/,
	);
	if (!match) return undefined;
	const raw = match[1] ?? match[2];
	const val = Number(raw);
	return Number.isNaN(val) ? undefined : val;
}

export const useLyricParser = (
	lyricStr?: string,
	format?: string,
	translatedLrc?: string,
	romanLrc?: string,
	/** 当前音频编解码器，用于判断是否为杜比全景声 (eac3) */
	audioCodec?: string,
): LyricParserResult => {
	return useMemo(() => {
		if (!lyricStr || !format) {
			return { lyricLines: [], hasLyrics: false, metadata: [] };
		}

		try {
			let parsedLyricLines: LyricLine[] = [];
			let parsedMetadata: [string, string[]][] = [];

			switch (format) {
				case "lrc": {
					parsedLyricLines = parseLrc(lyricStr);
					console.log(LYRIC_LOG_TAG, "解析出 LyRiC 歌词", parsedLyricLines);
					break;
				}
				case "eslrc": {
					parsedLyricLines = parseEslrc(lyricStr);
					console.log(LYRIC_LOG_TAG, "解析出 ESLyRiC 歌词", parsedLyricLines);
					break;
				}
				case "yrc": {
					parsedLyricLines = parseYrc(lyricStr);
					console.log(LYRIC_LOG_TAG, "解析出 YRC 歌词", parsedLyricLines);
					break;
				}
				case "qrc": {
					parsedLyricLines = parseQrc(lyricStr);
					console.log(LYRIC_LOG_TAG, "解析出 QRC 歌词", parsedLyricLines);
					break;
				}
				case "lys": {
					parsedLyricLines = parseLys(lyricStr);
					console.log(
						LYRIC_LOG_TAG,
						"解析出 Lyricify Syllable 歌词",
						parsedLyricLines,
					);
					break;
				}
				case "ttml": {
					const ttmlResult = parseTTML(lyricStr);
					parsedLyricLines = ttmlResult.lines;
					parsedMetadata = ttmlResult.metadata;

					// 仅在杜比全景声 (eac3) 时应用空间音频歌词偏差
					const isSpatialAudio = audioCodec?.toLowerCase() === "eac3";
					if (isSpatialAudio) {
						const spatialBias = parseSpatialAudioBias(lyricStr);
						if (spatialBias !== undefined && spatialBias !== 0) {
							console.log(
								LYRIC_LOG_TAG,
								`检测到杜比全景声 (eac3)，应用空间音频歌词偏差: ${spatialBias}ms`,
							);
							parsedLyricLines = parsedLyricLines.map((line) => ({
								...line,
								startTime: Math.max(0, line.startTime + spatialBias),
								endTime: Math.max(0, line.endTime + spatialBias),
								words: line.words.map((word) => ({
									...word,
									startTime: Math.max(0, word.startTime + spatialBias),
									endTime: Math.max(0, word.endTime + spatialBias),
								})),
							}));
						}
					}

					console.log(
						LYRIC_LOG_TAG,
						"解析出 TTML 歌词",
						parsedLyricLines,
						parsedMetadata,
					);
					break;
				}
				default: {
					return { lyricLines: [], hasLyrics: false, metadata: [] };
				}
			}

			const compatibleLyricLines: CoreLyricLine[] = parsedLyricLines.map(
				(line) => ({
					...line,
					words: line.words.map((word) => ({
						...word,
						obscene: false,
					})),
				}),
			);

			if (translatedLrc) {
				try {
					const translatedLyricLines = parseLrc(translatedLrc);
					for (const line of translatedLyricLines) {
						pairLyric(
							{
								...line,
								words: line.words.map((word) => ({
									...word,
									obscene: false,
								})),
							},
							compatibleLyricLines,
							"translatedLyric",
						);
					}
					console.log(LYRIC_LOG_TAG, "已匹配翻译歌词");
				} catch (err) {
					console.warn(LYRIC_LOG_TAG, "解析翻译歌词时出现错误", err);
				}
			}

			if (romanLrc) {
				try {
					const romanLyricLines = parseLrc(romanLrc);
					for (const line of romanLyricLines) {
						pairLyric(
							{
								...line,
								words: line.words.map((word) => ({
									...word,
									obscene: false,
								})),
							},
							compatibleLyricLines,
							"romanLyric",
						);
					}
					console.log(LYRIC_LOG_TAG, "已匹配音译歌词");
				} catch (err) {
					console.warn(LYRIC_LOG_TAG, "解析音译歌词时出现错误", err);
				}
			}

			return {
				lyricLines: compatibleLyricLines,
				hasLyrics: compatibleLyricLines.length > 0,
				metadata: parsedMetadata,
			};
		} catch (e) {
			console.warn("解析歌词时出现错误", e);
			return { lyricLines: [], hasLyrics: false, metadata: [] };
		}
	}, [lyricStr, format, translatedLrc, romanLrc, audioCodec]);
};
