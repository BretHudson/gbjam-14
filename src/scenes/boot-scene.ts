import type { ControllerInput } from '~/input';
import type { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import type { SpriteData } from '~/sprite';
import type { Game, SceneState } from '~/util';
import { GAME_H } from '~/util/constants';
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
}

export function init(camera: Camera, spriteData: SpriteData): BootState {
	const spriteGroups = getSpriteGroups(spriteData, 'PREPARE SPRITE');

	const bootState: BootState = {
		camera,
		entered: true,
		spriteGroups,
		sprites: spriteGroups.flatMap((group) => group.sprites),
	};

	spriteGroups[0].setPalette(0);

	return bootState;
}

export function reset(bootState: BootState) {
	bootState.entered = true;
}

function* runAnimate(game: Game) {
	const { bootState } = game;

	bootState.spriteGroups[0].setPalette(0);
	for (let i = 0; i < 4; ++i) {
		bootState.spriteGroups[0].setPalette(i);
		yield* pause(15);
	}
	for (let i = 4; i >= 0; --i) {
		bootState.spriteGroups[0].setPalette(i);
		yield* pause(15);
	}

	yield* pause(15);

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
		console.log('gennnn');
		const res = game.curGenerator.next();
		if (res.done) game.curGenerator = null;
	}
}

export function render(textRenderer: TextRenderer, bootState: BootState) {
	const XX = 0;
	let YY = GAME_H - 21;

	text.renderText(textRenderer, ' > CYC SWINGS LEFT!!', XX, YY, 2);
	YY += 7;
	text.renderText(textRenderer, '  > YOU DEFEND LEFT!!', XX, YY);
	YY += 7;
	text.renderText(textRenderer, '    @NO DAMAGE!', XX, YY);
}
