import type { ControllerInput } from '~/input';
import type { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import type { SpriteData } from '~/sprite';
import type { Game, SceneState } from '~/util';
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
	splash: HTMLImageElement;
	ready: boolean;
	opacity: number;
}

export function init(camera: Camera, spriteData: SpriteData): BootState {
	const spriteGroups = getSpriteGroups(spriteData, 'Prepare');

	const splash = new Image(160, 144);
	splash.onload = function () {
		console.log('loaded splash');
		bootState.ready = true;
	};
	splash.src = 'img/gbjam-14-splash.png';

	const bootState: BootState = {
		camera,
		entered: true,
		spriteGroups,
		sprites: spriteGroups.flatMap((group) => group.sprites),
		splash,
		ready: false,
		opacity: 0,
	};

	// spriteGroups[0].setPalette(0);

	return bootState;
}

export function reset(bootState: BootState) {
	bootState.entered = true;
}

function* runAnimate(game: Game) {
	// const { bootState } = game;

	yield* pause(60);

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
	const { ctx } = textRenderer;

	ctx.drawImage(bootState.splash, 0, 0);
}
