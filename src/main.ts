import './css/styles.css';

import * as _consoleUI from './console-ui';
import * as _game from './game';
import { ControllerInput, Input } from './input';
import * as _cam from './renderer/camera';
import * as _render from './renderer/renderer';
import { Renderer } from './renderer/renderer';
import type { DebugState } from './scenes/debug-scene';
import * as _debug from './scenes/debug-scene';
import { Sprite, SpriteData } from './sprite';
import { BattleState, FSMState, Game, MenuOption, MenuState } from './util';
import { GAME_H, GAME_W } from './util/constants';

import spritesheet from '../public/img/spritesheet.json';
import { parseAsepriteData, spriteFromData } from './renderer/render-utils';

let game: Game;
let debugState: DebugState;
let menuState: MenuState;
let battleState: BattleState;

let ggame = _game;
let debug = _debug;
let cam = _cam;
let render = _render;
let consoleUI = _consoleUI;
const sprites: Sprite[] = [];
let groups: SpriteData;
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
	import.meta.hot.accept('./scenes/debug-scene', (mod) => {
		if (mod) {
			// @ts-expect-error -- ignore
			debug = mod;
			debug.init(debugState, sprites, groups);
		}
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

	groups = parseAsepriteData(spritesheet);
	console.table(Object.keys(groups));

	let _heart: Sprite = new Sprite(0, 0, 0, 0);
	const identifiers = Object.entries(spritesheet.frames).map(
		([name, data]) => {
			const sprite = spriteFromData(data);
			sprites.push(sprite);
			if (name === 'Heart 1') _heart = sprite;

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

	const spriteGroups = new Map();

	const initialState = FSMState.PLAYER_INPUT;

	const menuSprites: Sprite[] = [];
	menuSprites.push(sprites[0]);
	menuSprites.push(sprites[1]);
	menuSprites.push(textSprite);

	debugState = {
		camera,
		spriteGroups: [],
		sprites: [],
	};

	menuState = {
		camera,
		spriteGroups: [],
		sprites: menuSprites,
		option: MenuOption.PLAY,
	};

	battleState = {
		camera,
		playerHealth: 4,
		enemyHealth: 4,
		sprites,
		spriteGroups,
		lastState: FSMState.NONE,
		state: FSMState.NONE,
		nextState: initialState,
	};

	ggame.initGroups(battleState);

	game = {
		scene: null,
		// nextScene: 'MENU',
		nextScene: 'DEBUG',
		swapPalette: false,
		debugState,
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
				case 'DEBUG':
					debug.init(debugState, sprites, groups);
					break;
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

		if (input.keyPressed('Escape')) {
			input.active = !input.active;
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
