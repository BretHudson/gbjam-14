import type { ControllerInput } from '~/input';
import type { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import type { SpriteData } from '~/sprite';
import type { Game, SceneState } from '~/util';
import { GAME_H } from '~/util/constants';

let text = _text;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/text-renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) text = mod;
	});
}

export interface DebugState extends SceneState {
	// intentionally left empty
}

export function init(camera: Camera, spriteData: SpriteData): DebugState {
	const groups = getSpriteGroups(spriteData, 'Group 2');

	const debugState: DebugState = {
		camera,
		spriteGroups: groups,
		sprites: groups.flatMap((group) => group.sprites),
	};

	console.log(debugState.sprites);

	return debugState;
}

export function reset(debugState: DebugState) {
	//
}

export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	// update debug state
}

export function render(textRenderer: TextRenderer, debugState: DebugState) {
	const XX = 0;
	let YY = GAME_H - 21;

	text.renderText(textRenderer, ' > CYC SWINGS LEFT!!', XX, YY, 2);
	YY += 7;
	text.renderText(textRenderer, '  > YOU DEFEND LEFT!!', XX, YY);
	YY += 7;
	text.renderText(textRenderer, '    @NO DAMAGE!', XX, YY);
}
