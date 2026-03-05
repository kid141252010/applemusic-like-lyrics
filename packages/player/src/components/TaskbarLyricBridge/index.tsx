import {
	musicAlbumNameAtom,
	musicArtistsAtom,
	musicCoverAtom,
	musicCoverIsVideoAtom,
	musicDurationAtom,
	musicLyricLinesAtom,
	musicNameAtom,
	musicPlayingAtom,
	musicPlayingPositionAtom,
	onPlayOrResumeAtom,
	onRequestNextSongAtom,
	onRequestPrevSongAtom,
} from "@applemusic-like-lyrics/react-full";
import { emit, listen } from "@tauri-apps/api/event";
import { useAtomValue } from "jotai";
import { type FC, useEffect, useRef } from "react";
import {
	CTRL_NEXT_EVENT,
	CTRL_PLAY_OR_RESUME_EVENT,
	CTRL_PREV_EVENT,
	METADATA_EVENT,
	PLAY_STATUS_EVENT,
	POSITION_EVENT,
	REQUEST_UPDATE_EVENT,
	type TaskbarLyricMetadataPayload,
	type TaskbarLyricPlayStatusPayload,
	type TaskbarLyricPositionPayload,
} from "./types";

export const TaskbarLyricBridge: FC = () => {
	const musicName = useAtomValue(musicNameAtom);
	const musicArtists = useAtomValue(musicArtistsAtom);
	const musicAlbumName = useAtomValue(musicAlbumNameAtom);
	const musicDuration = useAtomValue(musicDurationAtom);
	const musicLyricLines = useAtomValue(musicLyricLinesAtom);
	const musicPlaying = useAtomValue(musicPlayingAtom);
	const musicPlayingPosition = useAtomValue(musicPlayingPositionAtom);
	const musicCover = useAtomValue(musicCoverAtom);
	const musicCoverIsVideo = useAtomValue(musicCoverIsVideoAtom);
	const lastEmitTime = useRef(0);
	const onRequestPrevSong = useAtomValue(onRequestPrevSongAtom).onEmit;
	const onPlayOrResume = useAtomValue(onPlayOrResumeAtom).onEmit;
	const onRequestNextSong = useAtomValue(onRequestNextSongAtom).onEmit;

	const stateCache = useRef({
		metadata: {} as TaskbarLyricMetadataPayload,
		playStatus: {} as TaskbarLyricPlayStatusPayload,
		position: {} as TaskbarLyricPositionPayload,
	});

	useEffect(() => {
		const payload: TaskbarLyricMetadataPayload = {
			musicName,
			musicArtists,
			musicAlbumName,
			musicDuration,
			lyricLines: musicLyricLines,
			musicCover,
			musicCoverIsVideo,
		};
		stateCache.current.metadata = payload;
		emit(METADATA_EVENT, payload).catch(console.error);
	}, [
		musicName,
		musicArtists,
		musicAlbumName,
		musicDuration,
		musicLyricLines,
		musicCover,
		musicCoverIsVideo,
	]);

	useEffect(() => {
		const payload: TaskbarLyricPlayStatusPayload = { musicPlaying };
		stateCache.current.playStatus = payload;
		emit(PLAY_STATUS_EVENT, payload).catch(console.error);
	}, [musicPlaying]);

	useEffect(() => {
		const now = performance.now();
		if (now - lastEmitTime.current < 200) return;
		lastEmitTime.current = now;

		const payload: TaskbarLyricPositionPayload = {
			position: musicPlayingPosition,
		};
		stateCache.current.position = payload;
		emit(POSITION_EVENT, payload).catch(console.error);
	}, [musicPlayingPosition]);

	useEffect(() => {
		const unlistenRequest = listen(REQUEST_UPDATE_EVENT, () => {
			if (stateCache.current.metadata.musicName !== undefined) {
				emit(METADATA_EVENT, stateCache.current.metadata).catch(console.error);
				emit(PLAY_STATUS_EVENT, stateCache.current.playStatus).catch(
					console.error,
				);
				emit(POSITION_EVENT, stateCache.current.position).catch(console.error);
			}
		});

		return () => {
			unlistenRequest.then((fn) => fn());
		};
	}, []);

	useEffect(() => {
		const unlistenPrev = listen(CTRL_PREV_EVENT, () => {
			onRequestPrevSong?.();
		});
		const unlistenPlayOrResume = listen(CTRL_PLAY_OR_RESUME_EVENT, () => {
			onPlayOrResume?.();
		});
		const unlistenNext = listen(CTRL_NEXT_EVENT, () => {
			onRequestNextSong?.();
		});
		return () => {
			unlistenPrev.then((fn) => fn());
			unlistenPlayOrResume.then((fn) => fn());
			unlistenNext.then((fn) => fn());
		};
	}, [onRequestPrevSong, onPlayOrResume, onRequestNextSong]);

	return null;
};
