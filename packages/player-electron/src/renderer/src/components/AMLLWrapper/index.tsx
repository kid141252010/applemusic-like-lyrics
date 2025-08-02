import {
	isLyricPageOpenedAtom,
	musicIdAtom,
	PrebuiltLyricPlayer,
} from "@applemusic-like-lyrics/react-full";
import "@applemusic-like-lyrics/core/styles/index.css";
import { useAtomValue, } from "jotai";
import styles from "./index.module.css";
import clsx from "clsx";
import { AMLLMenu } from "./menu.js";
import { useLayoutEffect } from "react";

export const AMLLWrapper = () => {
	const isLyricPageOpened = useAtomValue(isLyricPageOpenedAtom);
	const musicId = useAtomValue(musicIdAtom);

	useLayoutEffect(() => {
		if (isLyricPageOpened) {
			document.body.dataset.amllLyricsOpen = "";
		} else {
			delete document.body.dataset.amllLyricsOpen;
		}
	}, [isLyricPageOpened]);

	return (
		<>
			<PrebuiltLyricPlayer
				key={musicId}
				id="amll-lyric-player"
				className={clsx(
					styles.lyricPage,
					styles.opened,
					isLyricPageOpened && styles.opened,
				)}
			/>
			<AMLLMenu />
		</>
	);
};

export default AMLLWrapper;
