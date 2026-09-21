import { ControllerInput } from '~/input';
import * as _battle from '~/scenes/battle-scene';
import * as _boot from '~/scenes/boot-scene';
import * as _debug from '~/scenes/debug-scene';
import * as _menu from '~/scenes/menu-scene';
import { Game } from '~/util';
import * as _cam from './renderer/camera';

let boot = _boot;
let menu = _menu;
let battle = _battle;
let debug = _debug;
let cam = _cam;
if (import.meta.hot) {
	import.meta.hot.accept('~/scenes/battle-scene', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) battle = mod;
	});
	import.meta.hot.accept('~/scenes/boot-scene', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) boot = mod;
	});
	import.meta.hot.accept('~/scenes/debug-scene', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) debug = mod;
	});
	import.meta.hot.accept('~/scenes/menu-scene', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) menu = mod;
	});
	import.meta.hot.accept('./renderer/camera', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) cam = mod;
	});
}

export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	switch (game.scene) {
		case 'BOOT':
			boot.update(dt, game, controller);
			cam.update(game.bootState.camera, 10 / 9);
			break;
		case 'MENU':
			menu.update(dt, game, controller);
			cam.update(game.menuState.camera, 10 / 9);
			break;
		case 'BATTLE':
			battle.update(dt, game, controller);
			cam.update(game.battleState.camera, 10 / 9);
			break;
		case 'DEBUG':
			debug.update(dt, game, controller);
			cam.update(game.debugState.camera, 10 / 9);
			break;
		default:
			throw new Error(`"${game.scene}" is not a valid scene`);
	}
}

export function debugText(game: Game) {
	const { battleState } = game;

	const key = Object.values(_battle.FSMState)[battleState.state];

	let str = `\
[Scene: ${game.scene}]
`;

	if (game.scene === 'BATTLE') {
		str += `\
State: ${battleState.state} (${key})
Enemy: ${battleState.enemy.state}
Dir: ${battleState.enemy.attack}
`;
	}

	return str;
}
