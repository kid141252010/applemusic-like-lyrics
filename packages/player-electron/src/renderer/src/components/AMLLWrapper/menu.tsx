import {
    onRequestOpenMenuAtom,
} from "@applemusic-like-lyrics/react-full";
import { useStore } from "jotai";
import { useLayoutEffect, useState } from "react";
import { DropdownMenu } from "radix-ui";
import styles from "./menu.module.css";

export const AMLLMenu = () => {
    const [menuOpen, setMenuOpen] = useState<{ x: number, y: number } | boolean>(false);

    const store = useStore();

    useLayoutEffect(() => {
        store.set(onRequestOpenMenuAtom, {
            onEmit(evt) {
                setMenuOpen({
                    x: evt.clientX,
                    y: evt.clientY,
                });
            },
        })
    }, [store]);

    return (

        <DropdownMenu.Root open={menuOpen !== false} onOpenChange={setMenuOpen}>
            <DropdownMenu.Trigger asChild>
                <div style={{
                    position: "fixed",
                    top: typeof menuOpen === "object" ? menuOpen.y : 0,
                    left: typeof menuOpen === "object" ? menuOpen.x : 0,
                }} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className={styles.menuContent}>
                    <DropdownMenu.Item>连接设置</DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
