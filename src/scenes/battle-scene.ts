import { vec2 } from 'wgpu-matrix';
import type { ControllerInput } from '~/input';
import { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import { SpriteData, SpriteGroup } from '~/sprite';
import type { Game, SceneState } from '~/util';
import { GAME_H, GAME_W } from '~/util/constants';
import {
	chain,
	fadeIn,
	fadeIn2,
	parallel,
	pause,
	repeat,
} from '~/util/generators';

let text = _text;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/text-renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) text = mod;
	});
}

const BG_AND_ENEMY = 3;

export const GROUP = {
	BG: 'BG',
	ENEMY: 'ENEMY',
	HUD: 'HUD',
} as const;

export enum FSMState {
	NONE,

	INTRO,
	PLAYER_INPUT,
	FIGHT,

	GAME_WON,
	GAME_OVER,

	PAUSED,

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
	attack: Direction;
}

interface Enemy {
	health: number;
	state: EnemyState;
	attack: Direction;
	pose: SpriteGroup;
	poses: {
		prepare: SpriteGroup;
		idle: SpriteGroup;
		left: SpriteGroup;
		right: SpriteGroup;
		down: SpriteGroup;
		up: SpriteGroup;
		hurt: SpriteGroup;
	};
	bounce: number;
}

export interface BattleState extends SceneState {
	lastState: FSMState;
	state: FSMState;
	nextState: FSMState;

	skipIntro: boolean;

	player: Player;

	enemy: Enemy;
}

export function init(camera: Camera, spriteData: SpriteData): BattleState {
	const spriteGroups = getSpriteGroups(
		spriteData,
		'Background',
		'HEARTS',
		'HEARTS',
		'Prepare',
		'IDLE',
		'Right/Left ATK',
		'Right/Left ATK',
		'Down ATK',
		'Up ATK',
		'HURT',
		'DIRECTIONAL ARROWS',
	);

	const sprites = spriteGroups.flatMap((group) => group.sprites);

	const [_bg, hearts, hearts2, prepare, idle, left, right, down, up, hurt] =
		spriteGroups;

	hearts.sprites.forEach((sprite) => {
		sprite.setDefaultPalette(0, 2, 1, 3);
	});
	hearts2.sprites.forEach((sprite) => {
		sprite.offsetX = GAME_W - sprite.offsetX - sprite.width;
	});

	const initialState = FSMState.PLAYER_INPUT;
	const battleState: BattleState = {
		camera,
		spriteGroups,
		sprites,

		skipIntro: false,

		lastState: FSMState.NONE,
		state: FSMState.NONE,
		nextState: initialState,

		player: {
			health: 4,
			attack: Direction.None,
		},

		enemy: {
			health: 4,
			state: 'IDLE',
			attack: Direction.None,
			pose: prepare,
			poses: {
				prepare,
				idle,
				left,
				right,
				down,
				up,
				hurt,
			},
			bounce: 0,
		},
	};

	spriteGroups
		.slice(BG_AND_ENEMY, -1)
		.forEach((group) => (group.visible = false));

	setEnemyPose(battleState, 'PREPARE');

	return battleState;
}

export function reset(battleState: BattleState) {
	const { player, enemy, camera } = battleState;

	battleState.state = FSMState.NONE;
	battleState.nextState = battleState.skipIntro
		? FSMState.PLAYER_INPUT
		: FSMState.INTRO;

	player.health = 4;
	enemy.health = 4;

	camera.target[0] = 0;
	camera.target[1] = 0;

	setEnemyPose(battleState, 'PREPARE');

	battleState.skipIntro = false;
}

function updateHearts(
	hearts: SpriteGroup,
	health: number,
	frameId: number,
	animate = true,
) {
	const sprites = hearts.sprites.slice(1);
	const healthCount = health;
	const curI = Math.floor(frameId / 15) % (sprites.length + 2);
	for (let i = 0; i < healthCount; ++i) {
		if (animate) sprites[i].y = i === curI ? -1 : 0;
	}
	for (let i = healthCount; i < sprites.length; ++i) {
		if (animate) sprites[i].y = 0;

		sprites[i].setMaxLevel(1);
	}
}

let stateStarted = -1;
export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	const { battleState, frameId } = game;

	const { rawInput: input } = controller;

	if (import.meta.hot) {
		for (let i = 0; i < FSMState.NUM; ++i) {
			if (i === FSMState.NONE) continue;
			if (i === FSMState.NUM) continue;
			if (input.keyPressed(`Digit${i}`)) battleState.nextState = i;
		}
	}

	if (controller.keyPressed('Start')) {
		battleState.nextState = FSMState.PAUSED;
	}

	if (battleState.state !== battleState.nextState) {
		battleState.state = battleState.nextState;
	}

	const { spriteGroups, lastState, state, player, enemy } = battleState;

	if (lastState !== state) {
		while (game.curGenerator) {
			const res = game.curGenerator.next();
			if (res.done) game.curGenerator = null;
		}

		stateStarted = frameId;
		switch (state) {
			case FSMState.INTRO:
				game.curGenerator = runIntro(battleState);
				break;

			case FSMState.PLAYER_INPUT:
				setEnemyPose(battleState, 'PREPARE');
				break;

			case FSMState.FIGHT:
				game.curGenerator = runFight(battleState);
				break;

			case FSMState.GAME_WON:
				enemy.pose.visible = false;
				break;

			case FSMState.GAME_OVER:
				enemy.pose.visible = false;
				break;

			case FSMState.NONE:
			case FSMState.NUM:
				throw new Error('???' + state);

			case FSMState.PAUSED:
				game.nextScene = 'MENU';
				break;
		}
	}

	if (game.curGenerator) {
		const res = game.curGenerator.next();
		if (res.done) game.curGenerator = null;
	}

	const stateFrameId = frameId - stateStarted;
	switch (state) {
		case FSMState.PLAYER_INPUT: {
			let direction = Direction.None;

			let spriteIndex = -1;

			switch (true) {
				case controller.keyHeld('Right'):
					direction = Direction.Right;
					spriteIndex = 1;
					break;
				case controller.keyHeld('Down'):
					direction = Direction.Down;
					spriteIndex = 0;
					break;
				case controller.keyHeld('Left'):
					direction = Direction.Left;
					spriteIndex = 2;
					break;
				case controller.keyHeld('Up'):
					direction = Direction.Up;
					spriteIndex = 3;
					break;
			}

			// update arrows
			const arrows = spriteGroups.at(-1)!;
			for (let i = 0; i < 4; ++i) {
				const offset = i * 2;
				const selected = i === spriteIndex;
				arrows.sprites[offset + 0].visible = selected;
				arrows.sprites[offset + 1].visible = !selected;
			}

			const canPlay = direction !== Direction.None;
			if (
				canPlay &&
				(controller.keyPressed('B') || controller.keyPressed('A'))
			) {
				enemy.health -= 1;
				battleState.nextState = FSMState.FIGHT;
			}

			enemy.attack = Direction.None as Direction;

			const offset = 2;

			// enemy pos
			enemy.pose.sprites[0].x = 0;
			enemy.pose.sprites[0].y = 0;
			switch (enemy.attack) {
				case Direction.None:
					break;
				case Direction.Left:
					enemy.pose.sprites[0].x = -offset;
					break;
				case Direction.Right:
					enemy.pose.sprites[0].x = offset;
					break;
				case Direction.Up:
					enemy.pose.sprites[0].y = -offset;
					break;
				case Direction.Down:
					enemy.pose.sprites[0].y = offset;
					break;
			}
		}
	}

	if (state === FSMState.PLAYER_INPUT) {
		enemy.bounce = Math.floor(stateFrameId / 60) % 2;
	} else {
		enemy.bounce = 0;
	}

	// hearts
	const animateHearts = battleState.state > FSMState.INTRO;
	if (animateHearts) {
		const heartsPlayer = spriteGroups[1];
		const heartsEnemy = spriteGroups[2];
		updateHearts(heartsPlayer, player.health, frameId, false);
		updateHearts(heartsEnemy, enemy.health, frameId, false);
	}

	// frame timer
	++game.frameId;

	battleState.lastState = battleState.state;
}

export function render(textRenderer: TextRenderer, battleState: BattleState) {
	let XX = 0;
	let YY = GAME_H - 21;

	const { enemy } = battleState;
	enemy.pose.sprites.forEach((sprite) => {
		sprite.y -= enemy.bounce;
	});

	switch (battleState.state) {
		case FSMState.FIGHT:
			// text.renderText(textRenderer, ' > CYC SWINGS LEFT!!', XX, YY);
			// YY += 7;
			// text.renderText(textRenderer, '  > YOU DEFEND LEFT!!', XX, YY);
			// YY += 7;
			// text.renderText(textRenderer, '    @NO DAMAGE!', XX, YY);
			break;
		case FSMState.GAME_WON:
			YY = GAME_H / 2 - 5;
			XX = GAME_W / 2 - 18;
			text.renderText(textRenderer, 'YOU WON!!', XX, YY, 0);
			break;
		case FSMState.GAME_OVER:
			YY = GAME_H / 2 - 10;
			XX = GAME_W / 2 - 8;
			text.renderText(textRenderer, 'GAME', XX, YY, 0);
			YY += 7;
			text.renderText(textRenderer, 'OV@ER', XX, YY, 0);
			break;
	}
}

function* runIntro(battleState: BattleState) {
	const { sprites, spriteGroups } = battleState;

	sprites.forEach((sprite) => (sprite.visible = false));
	sprites.at(-1)!.visible = true;

	const enemy = battleState.enemy.pose.sprites;

	const fadeInEye = fadeIn(enemy.slice(0, 2), 30);
	const fadeInBody = fadeIn(enemy.slice(2), 30);
	// const fadeInBg = fadeInReverse(spriteGroups[0].sprites.slice(0, 2), 30);
	const fadeInBg = fadeIn(spriteGroups[0].sprites.slice(0, 2), 30);
	const fadeInHUD = parallel(
		//
		fadeIn2(spriteGroups[1].sprites),
		fadeIn2(spriteGroups[2].sprites),
		chain(pause(), fadeIn(spriteGroups.at(-1)!.sprites)),
	);

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

	switch (enemyState) {
		case 'IDLE':
			enemy.pose = enemy.poses.idle;
			break;
		case 'HURT':
			enemy.pose = enemy.poses.hurt;
			break;
		case 'PREPARE':
			enemy.pose = enemy.poses.prepare;
			break;
		default:
			enemy.pose = new SpriteGroup();
			break;
	}

	enemy.pose.visible = true;
}

function* runFight(battleState: BattleState) {
	const _bg = battleState.spriteGroups[0];
	const bg = new SpriteGroup(..._bg.sprites.slice(0, 2));

	setEnemyPose(battleState, 'HURT');

	yield* pause(30);

	const enemy = battleState.enemy.pose;

	enemy.setPalette(3);
	bg.setPalette(3, 2, 1, 0);
	const vec = vec2.create(-3, 0);

	const startX = enemy.sprites[0].x;
	const startY = enemy.sprites[0].y;

	yield* repeat(4, function* () {
		enemy.sprites.forEach((sprite) => {
			sprite.x = vec[0];
			sprite.y = vec[1];
		});
		yield* pause(15);
		vec2.rotate(vec, vec2.zero(), -Math.PI / 2, vec);
	});

	enemy.sprites.forEach((sprite) => {
		sprite.x = startX;
		sprite.y = startY;
	});

	enemy.resetPalette();
	bg.resetPalette();
	yield* pause(15);

	const { health } = battleState.enemy;
	const next = health > 0 ? FSMState.PLAYER_INPUT : FSMState.GAME_WON;
	battleState.nextState = next;
}

export function postRender(
	textRenderer: TextRenderer,
	battleState: BattleState,
) {
	const { enemy } = battleState;

	enemy.pose.sprites.forEach((sprite) => {
		sprite.y += enemy.bounce;
	});
}
