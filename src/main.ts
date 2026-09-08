import './css/styles.css';

import * as _cam from './renderer/camera';
import { initCanvasResize } from './renderer/render-utils';
import * as _render from './renderer/renderer';
import { Renderer } from './renderer/renderer';

let cam = _cam;
let render = _render;
if (import.meta.hot) {
	import.meta.hot.accept('./renderer/camera', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) cam = mod;
	});
	import.meta.hot.accept('./renderer/renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) render = mod;
	});
}

async function setupApp(): Promise<void> {
	const canvas = document.getElementById('game') as HTMLCanvasElement;

	let aspect = canvas.width / canvas.height;

	if (!('gpu' in navigator)) throw new Error('WebGPU not supported');
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) throw new Error('Failed to create WebGPU device');

	const camera = cam.create();

	const renderer = new Renderer(canvas, device);
	await renderer.init();

	function onUpdate(dt: number): void {
		cam.update(camera, aspect);
		render.updateTime(dt);
	}

	function onRender(): void {
		render.render(renderer, camera);
	}

	let lastTime: number;
	function loop(t: number): void {
		lastTime ||= t;
		const dt = t - lastTime;
		lastTime = t;
		onUpdate(dt);
		onRender();

		window.requestAnimationFrame(loop);
	}

	console.log('Game initialized');
	window.requestAnimationFrame(loop);

	initCanvasResize(canvas, (width: number, height: number) => {
		const { maxTextureDimension2D } = device.limits;

		canvas.width = Math.max(1, Math.min(width, maxTextureDimension2D));
		canvas.height = Math.max(1, Math.min(height, maxTextureDimension2D));
		aspect = canvas.width / canvas.height;

		renderer.onCanvasSizeUpdate(canvas.width, canvas.height);
	});
}

void setupApp();
