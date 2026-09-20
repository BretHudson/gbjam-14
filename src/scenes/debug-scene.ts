import type { ControllerInput } from '~/input';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import type { SpriteData } from '~/sprite';
import { Sprite } from '~/sprite';
import type { Game, SceneState } from '~/util';

export interface DebugState extends SceneState {
	//
}

export function init(
	debugState: DebugState,
	_sprites: Sprite[],
	spriteData: SpriteData,
) {
	// which groups?
	const groups = getSpriteGroups(spriteData, 'Group 2', 'Hearts');
	debugState.spriteGroups = groups;
	debugState.sprites = groups.flatMap((group) => group.sprites);
}

export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	// update debug state
}

export function renderDebug(
	textRenderer: TextRenderer,
	debugState: DebugState,
) {
	//
}
