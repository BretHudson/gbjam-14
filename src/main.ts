import { vec2 } from 'wgpu-matrix';
import './css/styles.css';

import * as _consoleUI from './console-ui';
import * as _game from './game';
import { ControllerInput, Input } from './input';
import * as _cam from './renderer/camera';
import * as _render from './renderer/renderer';
import { Renderer } from './renderer/renderer';
import { Sprite } from './sprite';
import {
	BattleState,
	FSMState,
	Game,
	MenuOption,
	MenuState,
	Player,
} from './util';
import { GAME_H, GAME_W } from './util/constants';

import spritesheet from '../public/img/spritesheet.json';

let game: Game;
let menuState: MenuState;
let battleState: BattleState;

let ggame = _game;
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
		if (mod) {
			// @ts-expect-error -- ignore
			ggame = mod;
			ggame.initGroups(battleState!);
		}
	});
	import.meta.hot.accept('./console-ui', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) consoleUI = mod;
		// consoleUI.initConsoleUI();
	});
}

async function setupApp(): Promise<void> {
	const canvas = document.getElementById('game') as HTMLCanvasElement;
	canvas.width = GAME_W;
	canvas.height = GAME_H;

	const textCanvas = document.getElementById('text') as HTMLCanvasElement;
	textCanvas.width = GAME_W;
	textCanvas.height = GAME_H;

	let aspect = canvas.width / canvas.height;

	if (!('gpu' in navigator)) throw new Error('WebGPU not supported');
	const adapter = await navigator.gpu.requestAdapter();
	const device = await adapter?.requestDevice();
	if (!device) throw new Error('Failed to create WebGPU device');

	const camera = cam.create();

	// Y = 46
	const player: Player = {
		pos: vec2.create(32, 32),
		sprite: new Sprite(GAME_W + 16, 16, 16, 16),
		health: 4,
	};

	const sprites: Sprite[] = [];

	let _heart: Sprite = new Sprite(0, 0, 0, 0);
	const identifiers = Object.entries(spritesheet.frames).map(
		([name, data]) => {
			const { frame } = data;
			data;
			const sprite = new Sprite(frame.x, frame.y, frame.w, frame.h);
			if (data.trimmed) {
				sprite.offsetX = data.spriteSourceSize.x;
				sprite.offsetY = data.spriteSourceSize.y;
			}

			sprites.push(sprite);
			if (name === 'Heart 1') {
				console.log(data);
				_heart = sprite;
			}
			return [name, sprite];
		},
	);

	_heart = sprites.at(-4)!;

	// player hearts
	for (let i = 0; i < 4; ++i) {
		const heart = new Sprite(
			_heart.textureX,
			_heart.textureY,
			_heart.width,
			_heart.height,
		);
		heart.offsetX = GAME_W - _heart.offsetX - 10;
		heart.offsetY = _heart.offsetY;
		heart.x = -i * 12;
		// sprites.push(heart);
	}

	// enemy hearts

	for (let i = 0; i < 4; ++i) {
		const heart = new Sprite(
			_heart.textureX,
			_heart.textureY,
			_heart.width,
			_heart.height,
		);
		heart.offsetX = _heart.offsetX;
		heart.offsetY = _heart.offsetY;
		heart.x = i * 12;
		// heart.setPalette(0, 1);
		sprites.push(heart);
	}

	const textSprite = new Sprite(0, 0, GAME_W, GAME_H);
	textSprite.textureId = 1;
	sprites.push(textSprite);

	console.table(identifiers);

	const spriteGroups = new Map();

	const initialState = FSMState.PLAYER_INPUT;

	const menuSprites: Sprite[] = [];
	menuSprites.push(sprites[0]);
	menuSprites.push(sprites[1]);
	menuSprites.push(textSprite);

	menuState = {
		camera,
		sprites: menuSprites,
		option: MenuOption.PLAY,
	};

	battleState = {
		camera,
		player,
		sprites,
		spriteGroups,
		lastState: FSMState.NONE,
		state: FSMState.NONE,
		nextState: initialState,
	};

	ggame.initGroups(battleState);

	game = {
		scene: null,
		nextScene: 'MENU',
		swapPalette: false,
		menuState,
		battleState,
	};

	const debugInfo = document.createElement('pre');
	debugInfo.classList.add('debug-info');
	canvas.parentElement?.append(debugInfo);

	const input = new Input(canvas);
	input.listen();

	const controllerInput = new ControllerInput(input);

	const renderer = new Renderer(canvas, device, textCanvas);
	await renderer.init();

	consoleUI.initConsoleUI(controllerInput);

	function onUpdate(dt: number): void {
		if (game.nextScene !== null) {
			game.scene = game.nextScene;

			switch (game.nextScene) {
				case 'MENU':
					[sprites[0], sprites[1]].forEach((sprite) => {
						sprite.setPalette(0, 0, 3, 1);
					});
					break;
				case 'BATTLE':
					[sprites[0], sprites[1]].forEach((sprite) => {
						sprite.resetPalette();
					});
					break;
			}

			game.nextScene = null;
		}

		ggame.update(dt, game, controllerInput);

		cam.update(camera, aspect);

		consoleUI.updateConsoleUI(controllerInput);

		game.swapPalette ||= controllerInput.keyPressed('Select');

		if (game.swapPalette) {
			render.nextPalette();
			render.updateTime(dt);
			game.swapPalette = false;
		}
	}

	function onRender(): void {
		render.render(renderer, game);
		debugInfo.textContent = ggame.debugText(game);
	}

	let lastTime: number;
	function loop(t: number): void {
		lastTime ||= t;
		const dt = t - lastTime;
		lastTime = t;

		controllerInput.update();
		onUpdate(dt);
		onRender();
		controllerInput.postUpdate();

		window.requestAnimationFrame(loop);
	}

	console.log('Game initialized');
	window.requestAnimationFrame(loop);

	renderer.onCanvasSizeUpdate(GAME_W, GAME_H);
}

void setupApp();
