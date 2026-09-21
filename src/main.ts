import '~/css/styles.css';

import * as _consoleUI from '~/console-ui';
import * as _game from '~/game';
import { ControllerInput, Input } from '~/input';
import * as _cam from '~/renderer/camera';
import * as _render from '~/renderer/renderer';
import { Renderer } from '~/renderer/renderer';

import * as _battle from '~/scenes/battle-scene';
import * as _boot from '~/scenes/boot-scene';
import * as _debug from '~/scenes/debug-scene';
import * as _menu from '~/scenes/menu-scene';

import { Sprite, SpriteData } from '~/sprite';
import { Game, SceneState } from '~/util';
import { GAME_H, GAME_W } from '~/util/constants';

import { parseAsepriteData, spriteFromData } from '~/renderer/render-utils';
import spritesheet from '../public/img/spritesheet.json';

let game: Game;

function addTextSprite(sprites: Sprite[]) {
	const textSprite = new Sprite(0, 0, GAME_W, GAME_H);
	textSprite.textureId = 1;
	sprites.push(textSprite);
}

let ggame = _game;
let boot = _boot;
let menu = _menu;
let battle = _battle;
let debug = _debug;
let cam = _cam;
let render = _render;
let consoleUI = _consoleUI;
const sprites: Sprite[] = [];
let groups: SpriteData;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/camera', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) cam = mod;
	});
	import.meta.hot.accept('~/renderer/renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) render = mod;
	});
	import.meta.hot.accept('~/console-ui', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) consoleUI = mod;
		// consoleUI.initConsoleUI();
	});

	import.meta.hot.accept('~/scenes/battle-scene', (mod) => {
		if (mod) {
			// @ts-expect-error -- ignore
			battle = mod;
			game.battleState = battle.init(cam.create(), groups);
			addTextSprite(game.battleState.sprites);
		}
	});
	import.meta.hot.accept('~/scenes/boot-scene', (mod) => {
		if (mod) {
			// @ts-expect-error -- ignore
			boot = mod;
			game.bootState = boot.init(cam.create(), groups);
			addTextSprite(game.bootState.sprites);
		}
	});
	import.meta.hot.accept('~/scenes/debug-scene', (mod) => {
		if (mod) {
			// @ts-expect-error -- ignore
			debug = mod;
			game.debugState = debug.init(cam.create(), groups);
			addTextSprite(game.debugState.sprites);
		}
	});
	import.meta.hot.accept('~/scenes/menu-scene', (mod) => {
		if (mod) {
			// @ts-expect-error -- ignore
			menu = mod;
			game.menuState = menu.init(cam.create(), groups);
			addTextSprite(game.menuState.sprites);
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

	const menuSprites: Sprite[] = [];
	menuSprites.push(sprites[0]);
	menuSprites.push(sprites[1]);
	menuSprites.push(textSprite);

	game = {
		scene: null,
		// nextScene: 'DEBUG',
		nextScene: 'BOOT',
		debugEnabled: false,
		// nextScene: 'MENU',
		// nextScene: 'BATTLE',
		swapPalette: 0,
		bootState: boot.init(cam.create(), groups),
		menuState: menu.init(cam.create(), groups),
		battleState: battle.init(cam.create(), groups),
		debugState: debug.init(cam.create(), groups),

		frameId: 0,
		curGenerator: null,
	};

	if (import.meta.hot) {
		// game.battleState.skipIntro = true;
		// game.nextScene = 'BATTLE';
	}

	addTextSprite(game.bootState.sprites);
	addTextSprite(game.menuState.sprites);
	addTextSprite(game.battleState.sprites);
	addTextSprite(game.debugState.sprites);

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

			let sceneState: SceneState;
			switch (game.nextScene) {
				case 'BOOT':
					sceneState = game.bootState;
					boot.reset(game.bootState);
					break;
				case 'MENU':
					sceneState = game.menuState;
					menu.reset(game.menuState);
					break;
				case 'BATTLE':
					sceneState = game.battleState;
					battle.reset(game.battleState);
					break;
				case 'DEBUG':
					sceneState = game.debugState;
					debug.reset(game.debugState);
					break;
			}

			game.nextScene = null;
		}

		ggame.update(dt, game, controllerInput);

		cam.update(camera, aspect);

		consoleUI.updateConsoleUI(controllerInput);

		if (input.keyPressed('Backquote')) {
			debugInfo.classList.toggle('visible');
			game.debugEnabled = !game.debugEnabled;
		}
		game.swapPalette ||= controllerInput.keyPressed('Select') ? 1 : 0;

		if (game.swapPalette !== 0) {
			render.nextPalette(renderer, game.swapPalette);
			render.updateTime(dt);
			game.swapPalette = 0;
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
