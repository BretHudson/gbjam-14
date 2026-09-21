import type { ControllerInput } from '~/input';
import type { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import { Sprite, type SpriteData } from '~/sprite';
import type { Game, SceneState } from '~/util';
import { GAME_H, GAME_W } from '~/util/constants';
import { pause } from '~/util/generators';

let text = _text;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/text-renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) text = mod;
	});
}

export interface BootState extends SceneState {
	entered: boolean;
	ready: boolean;
	opacity: number;
}

export function init(camera: Camera, spriteData: SpriteData): BootState {
	const spriteGroups = getSpriteGroups(spriteData);

	const bootState: BootState = {
		camera,
		entered: true,
		spriteGroups,
		sprites: spriteGroups.flatMap((group) => group.sprites),
		ready: false,
		opacity: 0,
	};

	const sprite = new Sprite(0, 0, GAME_W, GAME_H);
	sprite.textureId = 2;
	bootState.sprites.push(sprite);

	// spriteGroups[0].setPalette(0);

	return bootState;
}

export function reset(bootState: BootState) {
	bootState.entered = true;
}

function* runAnimate(game: Game) {
	const { bootState } = game;

	const [sprite] = bootState.sprites;

	for (let i = 0; i < 4; ++i) {
		sprite.setShift(-3 + i);
		yield* pause(30);
	}

	yield* pause(30);

	for (let i = 0; i < 4; ++i) {
		sprite.setShift(i);
		yield* pause(30);
	}

	game.nextScene = 'MENU';
}

export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	const { bootState } = game;

	if (bootState.entered) {
		// game.nextScene = 'MENU';
		bootState.entered = false;

		game.curGenerator = runAnimate(game);
	}

	if (game.curGenerator) {
		const res = game.curGenerator.next();
		if (res.done) game.curGenerator = null;
	}
}

export function render(textRenderer: TextRenderer, bootState: BootState) {
	//
}
