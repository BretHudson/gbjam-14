export const fetchShader = async (shaderSrc: string): Promise<string> => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- safety check
	if (shaderSrc === undefined) {
		console.trace();
		throw new Error('wtf');
	}
	const path = `./shaders/${shaderSrc}`;
	const url = new URL(path, window.location.href);
	return fetch(url.href).then((res) => res.text());
};

type Callback = (width: number, height: number) => void;
export const initCanvasResize = (
	canvas: HTMLCanvasElement,
	callback: Callback,
): void => {
	const observer = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const width = entry.contentBoxSize[0].inlineSize;
			const height = entry.contentBoxSize[0].blockSize;
			const _canvas = entry.target as HTMLCanvasElement;
			callback(width, height);
		}
	});
	observer.observe(canvas);
};
