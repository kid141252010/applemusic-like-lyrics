const NativeMouseEvent: typeof MouseEvent =
	typeof globalThis.MouseEvent === "function"
		? globalThis.MouseEvent
		: (globalThis.Event as unknown as typeof MouseEvent);

export { NativeMouseEvent };
