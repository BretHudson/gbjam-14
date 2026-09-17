import { vec2 } from 'wgpu-matrix';
import './css/styles.css';

import * as _game from './game';
import { Input } from './input';
import * as _cam from './renderer/camera';
import * as _render from './renderer/renderer';
import * as _consoleUI from './console-ui';
import { Renderer } from './renderer/renderer';
import { GameState, Player } from './util';
import { GAME_H, GAME_W, HUD_H } from './util/constants';
import { Sprite } from './sprite';

let game = _game;
let cam = _cam;
let render = _render;
let consoleUI = _consoleUI;
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
	import.meta.hot.accept('./console-ui', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) consoleUI = mod;
		consoleUI.initConsoleUI();
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
	const player = {
		pos: vec2.create(32, 32),
		sprite: new Sprite(GAME_W + 16, 16, 16, 16),
	};

	const sprites: Sprite[] = [];
	sprites.push(new Sprite(0, 0, GAME_W, GAME_H)); // bg
	sprites.push(new Sprite(160, 0, 16, 16)); // thing in corner
	sprites.push(player.sprite);
	const hud = new Sprite(GAME_W, 16, 16, 16);
	sprites.push(hud); // "HUD"

	const state: GameState = { camera, player, sprites };

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

		hud.x = camera.eye[0];
		hud.y = GAME_H - HUD_H + camera.eye[1];

		consoleUI.updateConsoleUI(input);

		if (input.keyPressed('Enter')) {
			render.nextPalette();
			render.updateTime(dt);
		}
	}

	function onRender(): void {
		render.render(renderer, camera, sprites);
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
