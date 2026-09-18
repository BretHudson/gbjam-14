import { Input } from './input';
import * as _cam from './renderer/camera';
import { Sprite, SpriteGroup } from './sprite';
import { FSMState, GameState, GROUP } from './util';
import { GAME_H, GAME_W, HUD_H } from './util/constants';

let cam = _cam;
if (import.meta.hot) {
	import.meta.hot.accept('./renderer/camera', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) cam = mod;
	});
}

let frameId = 0;

// initial load

// loop
// player input
// animations
// 		use function generators?

let curGenerator: Generator | null = null;

function* pause(duration = 15) {
	for (let i = 0; i < duration; ++i) yield;
}

function* fadeIn(sprites: Sprite[], duration = 15) {
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0);
	});

	const palette = Array.from({ length: 4 }, (_, i) => i) as [
		number,
		number,
		number,
		number,
	];

	for (let c = 3; c >= 0; --c) {
		yield* pause(duration);

		for (let i = 0; i < 4; ++i) {
			palette[i] = Math.max(0, i - c);
		}
		sprites.forEach((sprite) => sprite.setPalette(...palette));
	}
}

function* fadeInReverse(sprites: Sprite[], duration = 15) {
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0);
	});
	yield* pause(duration);
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(1);
	});
	yield* pause(duration);
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0, 1);
	});
	yield* pause(duration);

	const palette = Array.from({ length: 4 }, (_, i) => i) as [
		number,
		number,
		number,
		number,
	];

	for (let c = 3; c >= 0; --c) {
		yield* pause(duration);

		for (let i = 1; i < 4; ++i) {
			palette[i] = Math.max(i, c);
		}
		sprites.forEach((sprite) => sprite.setPalette(...palette));
	}
}

function* fadeIn2(sprites: Sprite[], duration = 15) {
	sprites.forEach((sprite) => {
		sprite.visible = true;
		sprite.setPalette(0);
	});

	const palette = Array.from({ length: 4 }, (_, i) => i) as [
		number,
		number,
		number,
		number,
	];

	for (let c = 0; c < 4; ++c) {
		yield* pause(duration);

		for (let i = 0; i < 4; ++i) {
			palette[i] = Math.min(i, c);
		}
		sprites.forEach((sprite) => sprite.setPalette(...palette));
	}
}

function* runIntro(gameState: GameState) {
	const { sprites } = gameState;

	sprites.forEach((sprite) => (sprite.visible = false));

	yield* fadeIn(gameState.spriteGroups.get(GROUP.BG)!.sprites, 30);
	yield* pause();

	yield* fadeIn2(gameState.spriteGroups.get(GROUP.HUD)!.sprites);
	yield* pause(30);

	yield* fadeInReverse(gameState.spriteGroups.get(GROUP.ENEMY)!.sprites);
	yield* pause();

	gameState.nextState = FSMState.PLAYER_INPUT;
}

function* runSeePlay(gameState: GameState) {
	const _bg = gameState.spriteGroups.get(GROUP.BG)!;
	const bg = new SpriteGroup(..._bg.sprites.slice(0, 2));
	const enemy = gameState.spriteGroups.get(GROUP.ENEMY)!;

	bg.setPalette(0, 0, 1, 2);

	for (let i = 0; i < 2; ++i) {
		// bg.setPalette(0);
		enemy.setPalette(3);
		yield* pause(15);

		if (i === 1) break;

		// bg.setPalette(2);
		enemy.setPalette(0);
		yield* pause(15);
	}

	// bg.setPalette(1);
	// yield* pause(15);

	bg.resetPalette();
	enemy.resetPalette();

	yield* pause(15);

	gameState.nextState = FSMState.PLAYER_INPUT;
}

enum Direction {
	None,
	Right,
	Up,
	Left,
	Down,
}

export function initGroups(gameState: GameState): void {
	const { spriteGroups, sprites } = gameState;
	spriteGroups.clear();

	const bgGroup = new SpriteGroup(...sprites.slice(0, 4));
	spriteGroups.set(GROUP.BG, bgGroup);
	const enemyGroup = new SpriteGroup(...sprites.slice(4, 4 + 5));
	spriteGroups.set(GROUP.ENEMY, enemyGroup);
	const hudGroup = new SpriteGroup(...sprites.slice(12));
	spriteGroups.set(GROUP.HUD, hudGroup);
}

let stateStarted = -1;
export function update(dt: number, gameState: GameState, input: Input): void {
	if (input.keyPressed('Digit1')) gameState.nextState = 1;
	if (input.keyPressed('Digit2')) gameState.nextState = 2;

	if (gameState.state !== gameState.nextState) {
		console.warn('switching to ', gameState.nextState);
		gameState.state = gameState.nextState;
	}

	const { player, camera, sprites, lastState, state } = gameState;

	if (lastState !== state) {
		stateStarted = frameId;
		switch (state) {
			case FSMState.INTRO:
				curGenerator = runIntro(gameState);
				break;

			case FSMState.MENU:
				//
				break;

			// TODO(bret): WIND_UP

			case FSMState.PLAYER_INPUT:
				// gameState.nextState = 2;
				break;

			case FSMState.SEE_PLAY:
				curGenerator = runSeePlay(gameState);
				break;

			case FSMState.NONE:
			case FSMState.NUM:
				throw new Error('???');
		}
	}

	if (curGenerator) {
		const res = curGenerator.next();
		if (res.done) {
			console.log('all done');
			curGenerator = null;
		}
	}

	const stateFrameId = frameId - stateStarted;
	switch (state) {
		case FSMState.PLAYER_INPUT: {
			let direction = Direction.None;

			switch (true) {
				case input.keyHeld('KeyD'):
					direction = Direction.Right;
					break;
				case input.keyHeld('KeyS'):
					direction = Direction.Down;
					break;
				case input.keyHeld('KeyA'):
					direction = Direction.Left;
					break;
				case input.keyHeld('KeyW'):
					direction = Direction.Up;
					break;
			}

			// const canPlay = direction !== Direction.None;
			const canPlay = true;
			if (canPlay && input.keyPressed('Space')) {
				gameState.nextState = FSMState.SEE_PLAY;
			}
		}
	}

	const [
		bg,
		swirl,
		letterbox,
		moreLetterbox,
		eyeWhites,
		eye,
		eye2,
		body,
		arm,
		text1,
		text2,
		text3,
		..._hearts
	] = sprites;
	const hearts = _hearts.slice(0, 4);
	// sprites.forEach((sprite) => (sprite.y = 0));
	// sprites.forEach((sprite) => (sprite.visible = true));

	text1.visible = false;
	text2.visible = false;
	text3.visible = false;

	// sprites.forEach((sprite) => (sprite.visible = false));
	// eyeWhites.visible = true;

	// bg
	const bounce = Math.floor(frameId / 60) % 2;
	[body, eyeWhites, arm].forEach((sprite) => {
		sprite.y = bounce ? -1 : 0;
	});

	// const cycle = Math.floor(frameId / 15) % 2;
	// bg.resetPalette();
	// swirl.resetPalette();
	// if (cycle && frameId % 15 === 0) {
	// 	[body, eye, eye2, eyeWhites, arm].forEach((sprite) => {
	// 		sprite.cyclePalette();
	// 		sprite.resetPalette();
	// 	});
	// }

	// right arm

	player.health = 4;

	// hearts
	// const hearts = sprites.slice(-4);
	const animateHearts = false;
	if (animateHearts) {
		const healthCount = player.health;
		const curI = Math.floor(frameId / 15) % (hearts.length + 2);
		for (let i = 0; i < healthCount; ++i) {
			hearts[i].y = i === curI ? -1 : 0;
			if (i !== curI) hearts[i].resetPalette();
			else hearts[i].setPalette(0, 1, 2, 3);
		}
		for (let i = healthCount; i < hearts.length; ++i) {
			hearts[i].y = 0;
			hearts[i].setPalette(1);
		}
	}

	// camera
	let [xPos, yPos] = player.pos;
	xPos -= GAME_W / 2;
	yPos -= GAME_H - HUD_H - 36;
	cam.follow(camera, [xPos, yPos], dt, 6);

	// frame timer
	++frameId;

	gameState.lastState = gameState.state;
}

export function debugText(gameState: GameState) {
	const { camera, player } = gameState;

	const key = Object.values(FSMState)[gameState.state];

	return `\
State: ${gameState.state} (${key})
`;
}
