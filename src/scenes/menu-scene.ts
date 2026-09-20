import type { ControllerInput } from '~/input';
import { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import { Sprite, type SpriteData } from '~/sprite';
import { FSMState, type Game, type SceneState } from '~/util';
import { GAME_H, GAME_W } from '~/util/constants';

let text = _text;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/text-renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) text = mod;
	});
}

export enum MenuOption {
	PLAY,
	SKIP_INTRO,
	PALETTE,
	RESET,

	NUM,
}

export interface MenuState extends SceneState {
	option: MenuOption;
}

export function init(camera: Camera, spriteData: SpriteData): MenuState {
	const groups = getSpriteGroups(spriteData, 'Group 2', 'Hearts');

	const menuState: MenuState = {
		camera,
		spriteGroups: groups,
		sprites: groups.flatMap((group) => group.sprites),
		option: MenuOption.PLAY,
	};

	const textSprite = new Sprite(0, 0, GAME_W, GAME_H);
	textSprite.textureId = 1;
	menuState.sprites.push(textSprite);

	return menuState;
}

export function reset(menuState: MenuState) {
	const { sprites } = menuState;
	[sprites[0], sprites[1]].forEach((sprite) => {
		sprite.setPalette(0, 0, 3, 1);
	});
}

let timer = 0;
let timeout = 12;

export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	const { menuState, battleState } = game;

	timer = Math.max(0, --timer);
	function switchOption(delta: number) {
		if (timer > 0) return;

		menuState.option += delta;
		timer = timeout;
	}

	let delta = 0;
	if (controller.keyHeld('Up')) --delta;
	if (controller.keyHeld('Down')) ++delta;
	switchOption(delta);

	if (!controller.keyHeld('Up') && !controller.keyHeld('Down')) timer = 0;

	if (controller.keyPressed('Start') || controller.keyPressed('A')) {
		switch (menuState.option) {
			case MenuOption.PLAY:
				game.nextScene = 'BATTLE';
				battleState.nextState = FSMState.INTRO;
				break;
			case MenuOption.SKIP_INTRO:
				game.nextScene = 'BATTLE';
				battleState.nextState = FSMState.PLAYER_INPUT;
				break;
			case MenuOption.PALETTE:
				console.log(game.swapPalette);
				game.swapPalette = true;
				console.log(game.swapPalette);
				break;
			case MenuOption.RESET:
				alert('not yet implemented, sorry');
				break;
		}
	}

	menuState.option = (menuState.option + MenuOption.NUM) % MenuOption.NUM;
}

export function render(textRenderer: TextRenderer, menuState: MenuState) {
	const options = [
		//
		' @ENGAGE IN BATTLE',
		'@@[DEBUG] SKIP INTRO',
		'SWAP COLOR PALETTE',
		'  @@RESET CONSOLE',
	];

	const spacing = 10;
	const XX = 41;
	let YY = Math.floor((GAME_H - spacing) / 2) - 5;

	const title = 'B@A@T@T@L@E  II';
	const TEXT_X = XX + 20;
	const TEXT_Y = YY - 20;
	for (let xx = -1; xx <= 1; ++xx) {
		for (let yy = -1; yy <= 1; ++yy) {
			text.renderText(textRenderer, title, TEXT_X + xx, TEXT_Y + yy, 0);
		}
	}
	text.renderText(textRenderer, title, TEXT_X, TEXT_Y, 3);

	for (let i = 0; i < MenuOption.NUM; ++i) {
		const selected = i === menuState.option;
		const prefix = selected ? ' ' : ' ';
		text.renderText(
			textRenderer,
			prefix + options[i],
			XX,
			YY,
			selected ? 2 : 3,
		);
		YY += spacing;
	}

	textRenderer.ctx.fillStyle = '#333';
	textRenderer.ctx.fillRect(0, GAME_H - 13, GAME_W, 13);
	textRenderer.ctx.fillStyle = '#000';
	textRenderer.ctx.fillRect(0, GAME_H - 12, GAME_W, 11);

	text.renderText(textRenderer, ' made by EFAN + BERT ', 0, GAME_H - 9, 2);
	text.renderText(textRenderer, ' (c) 2026 ', GAME_W - 37, GAME_H - 9, 2);
}
