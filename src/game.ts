import { Input } from './input';
import * as _cam from './renderer/camera';
import { Camera } from './renderer/camera';
import { GameState, Player } from './util';
import { GAME_H, GAME_W, HUD_H } from './util/constants';

import { Renderer } from './renderer/renderer';

let cam = _cam;
if (import.meta.hot) {
	import.meta.hot.accept('./renderer/camera', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) cam = mod;
	});
}

export function update(dt: number, state: GameState, input: Input): void {
	const { player, camera } = state;

	const xx = +input.keyHeld('ArrowRight') - +input.keyHeld('ArrowLeft');
	player.pos[0] += xx;
	const yy = +input.keyHeld('ArrowDown') - +input.keyHeld('ArrowUp');
	player.pos[1] += yy;

	let [xPos, yPos] = player.pos;
	xPos -= GAME_W / 2;
	yPos -= GAME_H - HUD_H - 36;
	cam.follow(camera, [xPos, yPos], dt, 6);
}

export function debugText(state: GameState) {
	const { camera, player } = state;

	return `\
CameraX: ${camera.target[0]} CameraY: ${camera.target[1]}
playerX: ${player.pos[0]} playerY: ${player.pos[1]}
`;
}
