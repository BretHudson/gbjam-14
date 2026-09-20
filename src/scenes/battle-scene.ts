import type { ControllerInput } from '~/input';
import { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import { Sprite, SpriteData, SpriteGroup } from '~/sprite';
import type { Game, SceneState } from '~/util';
import { GAME_H, GAME_W } from '~/util/constants';
import { fadeIn, fadeIn2, fadeInReverse, pause } from '~/util/generators';

let text = _text;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/text-renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) text = mod;
	});
}

export const GROUP = {
	BG: 'BG',
	ENEMY: 'ENEMY',
	HUD: 'HUD',
} as const;

export enum FSMState {
	NONE,

	NULL,
	INTRO,
	PLAYER_INPUT,
	SEE_PLAY,

	NUM,
}

enum Direction {
	None,
	Right,
	Up,
	Left,
	Down,
}

type EnemyState = 'IDLE' | 'PREPARE' | 'ATTACK' | 'HURT';

interface Player {
	health: number;
}

interface Enemy {
	health: number;
	state: EnemyState;
	pose: SpriteGroup;
}

export interface BattleState extends SceneState {
	lastState: FSMState;
	state: FSMState;
	nextState: FSMState;

	player: Player;

	enemy: Enemy;
}

export function init(camera: Camera, spriteData: SpriteData): BattleState {
	const groups = getSpriteGroups(
		spriteData,
		'Group 2',
		'Hearts',
		'PREPARE SPRITE',
		'Neutral/Idle WIP',
		'Left ATK - WIP',
		'Right ATK - WIP',
		'Down ATK',
		'Up ATK',
		'HURT',
	);

	const initialState = FSMState.PLAYER_INPUT;
	const battleState: BattleState = {
		camera,
		spriteGroups: groups,
		sprites: groups.flatMap((group) => group.sprites),
		lastState: FSMState.NONE,
		state: FSMState.NONE,
		nextState: initialState,

		player: {
			health: 4,
		},

		enemy: {
			health: 4,
			state: 'IDLE',
			pose: groups[3],
		},
	};

	console.warn(battleState.sprites.length);

	battleState.spriteGroups
		.slice(2)
		.forEach((sprite) => (sprite.visible = false));

	setEnemyPose(battleState, 'PREPARE');

	const textSprite = new Sprite(0, 0, GAME_W, GAME_H);
	textSprite.textureId = 1;
	battleState.sprites.push(textSprite);

	return battleState;
}

export function reset(battleState: BattleState) {
	battleState.state = FSMState.NONE;

	setEnemyPose(battleState, 'IDLE');
}

let stateStarted = -1;
export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	const { battleState, frameId } = game;

	const { rawInput: input } = controller;

	for (let i = 0; i < FSMState.NUM; ++i) {
		if (input.keyPressed(`Digit${i}`)) battleState.nextState = i;
	}

	if (input.keyPressed('Escape')) game.nextScene = 'MENU';

	if (battleState.state !== battleState.nextState) {
		battleState.state = battleState.nextState;
	}

	const { camera, sprites, spriteGroups, lastState, state, player, enemy } =
		battleState;

	if (lastState !== state) {
		stateStarted = frameId;
		switch (state) {
			case FSMState.INTRO:
				game.curGenerator = runIntro(battleState);
				break;

			case FSMState.NULL:
				//
				break;

			// TODO(bret): WIND_UP

			case FSMState.PLAYER_INPUT:
				// battleState.nextState = 2;

				setEnemyPose(battleState, 'PREPARE');
				break;

			case FSMState.SEE_PLAY:
				game.curGenerator = runSeePlay(battleState);
				break;

			case FSMState.NONE:
			case FSMState.NUM:
				throw new Error('???');
		}
	}

	if (game.curGenerator) {
		const res = game.curGenerator.next();
		if (res.done) {
			console.log('all done');
			game.curGenerator = null;
		}
	}

	const stateFrameId = frameId - stateStarted;
	switch (state) {
		case FSMState.PLAYER_INPUT: {
			let direction = Direction.None;

			switch (true) {
				case controller.keyHeld('Right'):
					direction = Direction.Right;
					break;
				case controller.keyHeld('Down'):
					direction = Direction.Down;
					break;
				case controller.keyHeld('Left'):
					direction = Direction.Left;
					break;
				case controller.keyHeld('Up'):
					direction = Direction.Up;
					break;
			}

			const canPlay = direction !== Direction.None;
			if (
				canPlay &&
				(controller.keyPressed('B') || controller.keyPressed('A'))
			) {
				battleState.nextState = FSMState.SEE_PLAY;
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

	// text1.visible = false;
	// text2.visible = false;
	// text3.visible = false;

	// 3-6 = hearts

	// 7 is eye white
	// 8 is eye
	// 9 is body
	// 10 is right arm

	// sprites.forEach((sprite) => (sprite.visible = false));
	// eyeWhites.visible = true;

	// bg
	const bounce = Math.floor(frameId / 60) % 2;

	const [
		_a,
		_b,
		posePrepare,
		poseIdle,
		poseLeft,
		poseRight,
		poseDown,
		poseUp,
		poseHurt,
	] = spriteGroups; //.map(({ sprites }) => sprites);

	// const poses = [
	// 	posePrepare,
	// 	poseIdle,
	// 	poseLeft,
	// 	poseRight,
	// 	poseDown,
	// 	poseUp,
	// 	poseHurt,
	// ].flat();

	enemy.pose.sprites.forEach((sprite) => {
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

	// frame timer
	++game.frameId;

	battleState.lastState = battleState.state;
}

export function render(textRenderer: TextRenderer, battleState: BattleState) {
	const XX = 0;
	let YY = GAME_H - 21;

	if (battleState.state === FSMState.SEE_PLAY) {
		text.renderText(textRenderer, ' > CYC SWINGS LEFT!!', XX, YY);
		YY += 7;
		text.renderText(textRenderer, '  > YOU DEFEND LEFT!!', XX, YY);
		YY += 7;
		text.renderText(textRenderer, '    @NO DAMAGE!', XX, YY);
	}
}

function* chain(...generators: Generator[]) {
	while (generators.length) {
		const g = generators.shift()!;
		yield* g;
	}
}

function* parallel(...generators: Generator[]) {
	while (generators.filter((g) => g.next().done).length < generators.length) {
		yield;
	}
}

function* runIntro(battleState: BattleState) {
	const { sprites, spriteGroups } = battleState;

	sprites.forEach((sprite) => (sprite.visible = false));
	sprites.at(-1)!.visible = true;

	setEnemyPose(battleState, 'PREPARE');
	const enemy = battleState.enemy.pose.sprites;

	const fadeInEye = fadeIn(enemy.slice(0, 2), 30);
	const fadeInBody = fadeIn(enemy.slice(2), 30);
	const fadeInBg = fadeInReverse(spriteGroups[0].sprites.slice(0, 2), 30);
	const fadeInHUD = fadeIn2(spriteGroups[1].sprites);

	spriteGroups[0].visible = true;
	spriteGroups[0].setPalette(0);

	yield* chain(
		parallel(fadeInEye, fadeInBody),
		pause(),
		fadeInBg,
		pause(),
		fadeInHUD,
		pause(),
	);

	battleState.nextState = FSMState.PLAYER_INPUT;
}

function setEnemyPose(battleState: BattleState, enemyState: EnemyState) {
	const { enemy } = battleState;
	enemy.state = enemyState;
	enemy.pose.visible = false;

	const [
		_a,
		_b,
		posePrepare,
		poseIdle,
		poseLeft,
		poseRight,
		poseDown,
		poseUp,
		poseHurt,
	] = battleState.spriteGroups;

	switch (enemyState) {
		case 'IDLE':
			enemy.pose = poseIdle;
			break;
		case 'HURT':
			enemy.pose = poseHurt;
			break;
		case 'PREPARE':
			enemy.pose = posePrepare;
			break;
		default:
			enemy.pose = new SpriteGroup();
			break;
	}

	enemy.pose.visible = true;
}

function* runSeePlay(battleState: BattleState) {
	const _bg = battleState.spriteGroups[0];
	const bg = new SpriteGroup(..._bg.sprites.slice(0, 2));

	setEnemyPose(battleState, 'HURT');

	yield* pause(15);

	const enemy = battleState.enemy.pose;

	enemy.setPalette(3);
	bg.setPalette(3, 3, 0);
	yield* pause(15);

	enemy.resetPalette();
	bg.resetPalette();
	yield* pause(15);

	battleState.nextState = FSMState.PLAYER_INPUT;
}
