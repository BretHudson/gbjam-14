import { Input } from './input';
import * as _cam from './renderer/camera';
import { GameState } from './util';
import { GAME_H, GAME_W, HUD_H } from './util/constants';

let cam = _cam;
if (import.meta.hot) {
	import.meta.hot.accept('./renderer/camera', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) cam = mod;
	});
}

let frameId = 0;

export function update(dt: number, state: GameState, input: Input): void {
	const { player, camera, sprites } = state;

	// player
	const xx = +input.keyHeld('KeyD') - +input.keyHeld('KeyA');
	player.pos[0] += xx;
	const yy = +input.keyHeld('KeyS') - +input.keyHeld('KeyW');
	player.pos[1] += yy;

	player.sprite.x = player.pos[0];
	player.sprite.y = player.pos[1];

	const [
		_,
		_a,
		_b,
		_c,
		_d,
		swirl,
		letterbox,
		moreLetterbox,
		_e,
		eye,
		eye2,
		body,
		arm,
		text1,
		text2,
		text3,
		...hearts
	] = sprites;
	sprites.forEach((sprite) => (sprite.y = 0));

	// bg
	const bounce = Math.floor(frameId / 60) % 2;
	body.y = bounce ? -1 : 0;
	arm.y = body.y;

	// right arm

	// hearts
	// const hearts = sprites.slice(-4);
	const curI = Math.floor(frameId / 15) % 4;
	for (let i = 0; i < hearts.length; ++i) {
		hearts[i].y = i === curI ? -1 : 0;
	}

	// camera
	let [xPos, yPos] = player.pos;
	xPos -= GAME_W / 2;
	yPos -= GAME_H - HUD_H - 36;
	cam.follow(camera, [xPos, yPos], dt, 6);

	// frame timer
	++frameId;
}

export function debugText(state: GameState) {
	const { camera, player } = state;

	return `\
CameraX: ${camera.target[0]} CameraY: ${camera.target[1]}
playerX: ${player.pos[0]} playerY: ${player.pos[1]}
`;
}
