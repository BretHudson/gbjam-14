import { vec2 } from 'wgpu-matrix';
import './css/styles.css';

import * as _game from './game';
import { Input } from './input';
import * as _cam from './renderer/camera';
import * as _render from './renderer/renderer';
import { Renderer } from './renderer/renderer';
import { GameState, Player } from './util';
import { GAME_H, GAME_W } from './util/constants';

let game = _game;
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
	import.meta.hot.accept('./game', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) game = mod;
	});
}

async function setupApp(): Promise<void> {
	const canvas = document.getElementById('game') as HTMLCanvasElement;

	canvas.width = GAME_W;
	canvas.height = GAME_H;

	let aspect = canvas.width / canvas.height;

	if (!('gpu' in navigator)) throw new Error('WebGPU not supported');
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) throw new Error('Failed to create WebGPU device');

	const camera = cam.create();

	// Y = 46
	const player: Player = {
		pos: vec2.create(32, 32),
	};

	const state: GameState = { camera, player };

	const debugInfo = document.createElement('pre');
	debugInfo.classList.add('debug-info');
	canvas.parentElement?.append(debugInfo);

	const input = new Input(canvas);
	input.listen();

	const renderer = new Renderer(canvas, device);
	await renderer.init();

	function onUpdate(dt: number): void {
		game.update(dt, state, input);

		cam.update(camera, input, aspect);
		render.updateTime(dt);
	}

	function onRender(): void {
		render.render(renderer, camera, player);
		debugInfo.textContent = game.debugText(state);
	}

	let lastTime: number;
	function loop(t: number): void {
		lastTime ||= t;
		const dt = t - lastTime;
		lastTime = t;

		input.preUpdate();
		input.update();
		onUpdate(dt);
		onRender();
		input.postUpdate();

		window.requestAnimationFrame(loop);
	}

	console.log('Game initialized');
	window.requestAnimationFrame(loop);

	renderer.onCanvasSizeUpdate(GAME_W, GAME_H);
}

void setupApp();
