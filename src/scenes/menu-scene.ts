import { vec2 } from 'wgpu-matrix';
import type { ControllerInput } from '~/input';
import { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import { Renderer } from '~/renderer/renderer';
import * as _text from '~/renderer/text-renderer';
import { TextRenderer } from '~/renderer/text-renderer';
import { type SpriteData } from '~/sprite';
import { type Game, type SceneState } from '~/util';
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
	PALETTE,
	ORIGINAL,
	RESET,

	NUM,
}

export interface MenuState extends SceneState {
	option: MenuOption;
}

export function init(camera: Camera, spriteData: SpriteData): MenuState {
	const spriteGroups = getSpriteGroups(spriteData);

	const menuState: MenuState = {
		camera,
		spriteGroups,
		sprites: spriteGroups.flatMap((group) => group.sprites),
		option: MenuOption.PLAY,
	};

	menuState.sprites.forEach((sprite) => {
		// sprite.setPalette(0, 0, 3, 1);
	});

	return menuState;
}

export function reset(menuState: MenuState) {
	menuState.option = 0;
}

let timerX = 0;
let timerY = 0;
let timeout = 20;

export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	const { menuState, battleState } = game;

	timerX = Math.max(0, --timerX);
	timerY = Math.max(0, --timerY);
	function switchOption(delta: number) {
		if (timerY > 0) return;
		if (deltaY === 0) return;

		menuState.option += delta;
		timerY = timeout;
		frameId = 0;
	}

	let deltaX = 0;
	if (controller.keyHeld('Left')) --deltaX;
	if (controller.keyHeld('Right')) ++deltaX;

	let deltaY = 0;
	if (controller.keyHeld('Up')) --deltaY;
	if (controller.keyHeld('Down')) ++deltaY;
	switchOption(deltaY);

	if (!controller.keyHeld('Left') && !controller.keyHeld('Right')) timerX = 0;
	if (!controller.keyHeld('Up') && !controller.keyHeld('Down')) timerY = 0;

	switch (menuState.option) {
		case MenuOption.PALETTE:
			if (deltaX !== 0 && timerX === 0) {
				timerX = timeout * 1.5;
				game.swapPalette = deltaX;
			}
			break;
		default:
			break;
	}

	if (controller.keyPressed('Start') || controller.keyPressed('A')) {
		switch (menuState.option) {
			case MenuOption.PLAY:
				game.nextScene = 'BATTLE';
				battleState.skipIntro = deltaX !== 0;
				break;
			case MenuOption.PALETTE:
				game.swapPalette = 1;
				break;
			case MenuOption.ORIGINAL:
				window.open('https://brethudson.com/battle/', '_blank');
				break;
			case MenuOption.RESET:
				game.nextScene = 'BOOT';
				break;
		}
	}

	menuState.option = (menuState.option + MenuOption.NUM) % MenuOption.NUM;
}

function renderTextWithOutline(
	textRenderer: TextRenderer,
	str: string,
	x: number,
	y: number,
	color: number,
	outline = 1,
) {
	for (let xx = -1; xx <= 1; ++xx) {
		for (let yy = -1; yy <= 1; ++yy) {
			text.renderTextCentered(textRenderer, str, x + xx, y + yy, outline);
		}
	}
	text.renderTextCentered(textRenderer, str, x, y, color);
}

let frameId = 0;
export function render(renderer: Renderer, menuState: MenuState) {
	const { textRenderer } = renderer;

	const index = renderer.paletteIndex + 1;
	const total = renderer.palettes.length;

	const options = [
		'Start Game',
		`Swap Palette (@${index}@/@${total}@)`,
		'Play the Original',
		'RESET CONSOLE',
	];

	let str = options[menuState.option];
	const space = Math.floor(frameId++ / 30) % 2 ? '@@@' : '@@@@@';
	str = `>${space}` + str + `${space}<`;
	options[menuState.option] = str;

	const spacing = 10;
	let YY = Math.floor((GAME_H - spacing) / 2);

	// const title = 'B@A@T@T@L@E  II';
	// const TEXT_Y = YY - 20;
	// renderTextWithOutline(textRenderer, title, 0, TEXT_Y, 3);

	for (let i = 0; i < MenuOption.NUM; ++i) {
		if (i === MenuOption.RESET) YY += 10;

		const selected = i === menuState.option;
		const prefix = selected ? ' ' : ' ';
		renderTextWithOutline(
			textRenderer,
			prefix + options[i],
			0,
			YY,
			selected ? 3 : 2,
			selected ? 1 : 0,
		);
		YY += spacing;
	}

	{
		const { ctx } = textRenderer;
		ctx.save();
		ctx.imageSmoothingEnabled = false;
		ctx.font = '14pt "Sekuya", system-ui';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.textRendering = 'geometricPrecision';

		ctx.fillStyle = '#333';
		const TITLE_Y = GAME_H / 2 - 38;
		for (let yy = 5; yy >= -1; --yy) {
			for (let xx = -1; xx <= 1; ++xx) {
				ctx.fillText('Battle II', GAME_W / 2 + xx, TITLE_Y + yy);
			}
		}

		const w = 124;
		ctx.fillRect((GAME_W - w) / 2, TITLE_Y + 13, w, 2);

		ctx.fillStyle = '#555';
		ctx.fillText('Battle II', GAME_W / 2, TITLE_Y);

		ctx.restore();
	}

	const colors = ['#000', '#333', '#aaa', '#fff'];

	const FOOTER_Y = GAME_H - 14;
	textRenderer.ctx.fillStyle = colors[2];
	textRenderer.ctx.fillRect(0, FOOTER_Y - 1, GAME_W, 15);
	textRenderer.ctx.fillStyle = colors[3];
	textRenderer.ctx.fillRect(0, FOOTER_Y, GAME_W, 13);
	textRenderer.ctx.fillStyle = colors[1];
	textRenderer.ctx.fillRect(0, FOOTER_Y + 1, GAME_W, 11);

	const dudes = 'Ethan@@@&@@@Bret';
	text.renderText(textRenderer, '@:', 0, FOOTER_Y + 4, 3);
	text.renderTextCentered(
		textRenderer,
		`(c) 2026 ${dudes}`,
		0,
		FOOTER_Y + 4,
		3,
	);
	text.renderTextRight(textRenderer, ':', GAME_W, FOOTER_Y + 4, 3);
}
