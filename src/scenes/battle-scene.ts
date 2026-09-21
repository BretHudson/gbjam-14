import { Vec2, vec2 } from 'wgpu-matrix';
import type { ControllerInput } from '~/input';
import { Camera } from '~/renderer/camera';
import { getSpriteGroups } from '~/renderer/render-utils';
import type { TextRenderer } from '~/renderer/text-renderer';
import * as _text from '~/renderer/text-renderer';
import { Sprite, SpriteData, SpriteGroup } from '~/sprite';
import type { Game, SceneState } from '~/util';
import { GAME_H, GAME_W } from '~/util/constants';
import { chain, fadeIn, fadeIn2, parallel, pause } from '~/util/generators';

let text = _text;
if (import.meta.hot) {
	import.meta.hot.accept('~/renderer/text-renderer', (mod) => {
		// @ts-expect-error -- ignore
		if (mod) text = mod;
	});
}

const BG_AND_ENEMY = 3;

const DODGE_WINDUP = -12;
const DODGE_OFFSET = 32;

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
	END_FIGHT,

	GAME_WON,
	GAME_OVER,

	PAUSED,

	NUM,
}

enum Direction {
	None = -1,
	Right,
	Up,
	Left,
	Down,
}

type EnemyState = 'IDLE' | 'PREPARE' | 'ATTACK' | 'HURT';

interface Player {
	health: number;
	heartsSprites: SpriteGroup;
	hurt: boolean;

	direction: Direction;
	directionVec: Vec2;
}

interface Enemy {
	state: EnemyState;

	health: number;
	heartsSprites: SpriteGroup;
	hurt: boolean;

	direction: Direction;
	directionVec: Vec2;

	bounce: number;
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
}

export interface BattleState extends SceneState {
	lastState: FSMState;
	state: FSMState;
	nextState: FSMState;

	skipIntro: boolean;

	attacker: Player | Enemy;
	defender: Player | Enemy;
	hitResult: number;

	showResultText: boolean;

	player: Player;
	enemy: Enemy;
}

export function init(camera: Camera, spriteData: SpriteData): BattleState {
	const spriteGroups = getSpriteGroups(
		spriteData,
		'Background',
		'Prepare',
		'IDLE',
		'Right/Left ATK',
		'Right/Left ATK',
		'Down ATK',
		'Up ATK',
		'HURT',
		'HEARTS',
		'HEARTS',
		'DIRECTIONAL ARROWS',
	);

	const sprites = spriteGroups.flatMap((group) => group.sprites);

	const [_bg, prepare, idle, left, right, down, up, hurt, hearts, hearts2] =
		spriteGroups;

	hearts.sprites.forEach((sprite) => {
		sprite.setDefaultPalette(0, 2, 1, 3);
	});
	hearts2.sprites.forEach((sprite) => {
		sprite.offsetX = GAME_W - sprite.offsetX - sprite.width;
	});

	const player: Player = {
		health: 4,
		heartsSprites: hearts,
		hurt: false,

		direction: Direction.None,
		directionVec: vec2.create(0, 0),
	};

	const enemy: Enemy = {
		state: 'IDLE',

		health: 4,
		heartsSprites: hearts2,
		hurt: false,

		direction: Direction.None,
		directionVec: vec2.create(0, 0),
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
	};

	const initialState = FSMState.PLAYER_INPUT;
	const battleState: BattleState = {
		camera,
		spriteGroups,
		sprites,

		skipIntro: false,

		lastState: FSMState.NONE,
		state: FSMState.NONE,
		nextState: initialState,

		attacker: player,
		defender: enemy,
		hitResult: 0,

		showResultText: false,

		player,
		enemy,
	};

	spriteGroups
		.slice(BG_AND_ENEMY, -3)
		.forEach((group) => (group.visible = false));

	setEnemyPose(battleState, 'IDLE');
	offsetEnemy(enemy, 0);

	return battleState;
}

export function reset(battleState: BattleState) {
	const { player, enemy, camera } = battleState;

	battleState.state = FSMState.NONE;
	battleState.nextState = battleState.skipIntro
		? FSMState.PLAYER_INPUT
		: FSMState.INTRO;

	battleState.attacker = player;
	battleState.defender = enemy;
	battleState.hitResult = 0;

	player.health = 4;
	player.direction = Direction.None;

	enemy.health = 4;
	enemy.direction = Direction.None;

	camera.target[0] = 0;
	camera.target[1] = 0;

	setEnemyPose(battleState, 'IDLE');
	offsetEnemy(enemy, 0);

	battleState.skipIntro = false;
}

function updateHearts(
	entity: Player | Enemy,
	hearts: SpriteGroup,
	frameId: number,
	animate = true,
) {
	const sprites = hearts.sprites.slice(1);
	let healthCount = entity.health;
	if (entity.hurt) ++healthCount;
	const curI = Math.floor(frameId / 15) % (sprites.length + 2);
	for (let i = 0; i < healthCount; ++i) {
		if (animate) sprites[i].y = i === curI ? -1 : 0;
	}
	for (let i = healthCount; i < sprites.length; ++i) {
		if (animate) sprites[i].y = 0;

		sprites[i].setMaxLevel(1);
	}
}

function dirToVec(direction: Direction, dst: Vec2) {
	switch (direction) {
		case Direction.None:
			vec2.set(0, 0, dst);
			break;
		case Direction.Left:
			vec2.set(-1, 0, dst);
			break;
		case Direction.Right:
			vec2.set(1, 0, dst);
			break;
		case Direction.Up:
			vec2.set(0, -1, dst);
			break;
		case Direction.Down:
			vec2.set(0, 1, dst);
			break;
	}
}

function offsetEnemy(enemy: Enemy, amount = 1) {
	const [first] = enemy.pose.sprites;
	first.x = 0;
	first.y = 0;
	switch (enemy.direction) {
		case Direction.None:
			break;
		case Direction.Left:
			first.x = -amount;
			break;
		case Direction.Right:
			first.x = amount;
			break;
		case Direction.Up:
			first.y = -amount;
			break;
		case Direction.Down:
			first.y = amount;
			break;
	}
	enemy.pose.sprites.slice(1).forEach((sprite) => {
		sprite.x = first.x;
		sprite.y = first.y;
	});
}

function didHit(hitResult: number): boolean {
	return hitResult > 0;
}

function evaluateBattle(battleState: BattleState) {
	const { attacker, defender } = battleState;

	dirToVec(attacker.direction, attacker.directionVec);
	dirToVec(defender.direction, defender.directionVec);

	const d = vec2.dot(attacker.directionVec, defender.directionVec);
	battleState.hitResult = d;

	if (didHit(battleState.hitResult)) {
		defender.health -= 1;
		defender.hurt = true;
	}

	battleState.nextState = FSMState.FIGHT;
}

function dirToArrowSpriteIndex(dir: Direction) {
	switch (dir) {
		case Direction.Right:
			return 1;
		case Direction.Down:
			return 0;
		case Direction.Left:
			return 2;
		case Direction.Up:
			return 3;
		default:
			return -1;
	}
}

let stateStarted = -1;
export function update(
	dt: number,
	game: Game,
	controller: ControllerInput,
): void {
	for (let i = 0; i < 4; ++i) {
		game.palette[i] = i;
	}

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
				enemy.direction = Math.floor(Math.random() * 4);
				if (battleState.attacker === enemy) {
					setEnemyPose(battleState, 'PREPARE');
				} else {
					setEnemyPose(battleState, 'IDLE');
				}
				break;

			case FSMState.FIGHT:
				game.curGenerator = runAttack(battleState);
				break;

			case FSMState.END_FIGHT: {
				const { attacker, defender } = battleState;
				battleState.attacker = defender;
				battleState.defender = attacker;

				if (player.health <= 0) {
					battleState.nextState = FSMState.GAME_OVER;
				} else if (enemy.health <= 0) {
					battleState.nextState = FSMState.GAME_WON;
				} else {
					battleState.nextState = FSMState.PLAYER_INPUT;
				}

				break;
			}

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

			if (import.meta.hot) {
				const ii = dirToArrowSpriteIndex(enemy.direction);
				for (let i = 0; i < 4; ++i) {
					let selected = i === ii;
					const wantSelected = enemy === battleState.attacker;
					const isWanted = selected === wantSelected;
					arrows.sprites[2 * i + 1].x =
						isWanted && game.debugEnabled ? 1000 : 0;
				}
			}

			const canPlay = direction !== Direction.None;
			if (
				canPlay &&
				(controller.keyPressed('B') || controller.keyPressed('A'))
			) {
				player.direction = direction;
				evaluateBattle(battleState);
			}

			// enemy pos
			const offsetHint = 0;
			offsetEnemy(enemy, offsetHint);
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
		updateHearts(player, heartsPlayer, frameId, false);
		updateHearts(enemy, heartsEnemy, frameId, false);
	}

	// frame timer
	++game.frameId;

	battleState.lastState = battleState.state;
}

function* runIntro(battleState: BattleState) {
	const { sprites, spriteGroups } = battleState;

	sprites.forEach((sprite) => (sprite.visible = false));
	sprites.at(-1)!.visible = true;

	const enemy = battleState.enemy.pose.sprites;

	const fadeInEnemy = fadeIn(enemy, 30);
	const fadeInBg = fadeIn(spriteGroups[0].sprites, 30);
	const fadeInHUD = parallel(
		fadeIn2(spriteGroups.at(-2)!.sprites),
		fadeIn2(spriteGroups.at(-3)!.sprites),
		chain(pause(), fadeIn(spriteGroups.at(-1)!.sprites)),
	);

	spriteGroups[0].visible = true;
	spriteGroups[0].setPalette(0);

	yield* chain(
		parallel(fadeInEnemy),
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
		case 'ATTACK':
			switch (enemy.direction) {
				case Direction.Left:
					enemy.pose = enemy.poses.left;
					enemy.pose.sprites.forEach(
						(sprite) => (sprite.flipped = false),
					);
					break;
				case Direction.Right:
					enemy.pose = enemy.poses.right;
					enemy.pose.sprites.forEach(
						(sprite) => (sprite.flipped = true),
					);
					break;
				case Direction.Up:
					enemy.pose = enemy.poses.up;
					break;
				case Direction.Down:
					enemy.pose = enemy.poses.down;
					break;
			}
			break;
		default:
			enemy.pose = new SpriteGroup();
			break;
	}

	enemy.pose.visible = true;
}

function* runAttack(battleState: BattleState) {
	const { spriteGroups, player } = battleState;

	const arrows = spriteGroups.at(-1)!;
	for (let i = 0; i < 4; ++i) {
		arrows.sprites[i * 2 + 1].visible = false;
	}

	if (battleState.attacker === player) {
		yield* runAttackAtEnemy(battleState);
	} else {
		yield* runAttackAtPlayer(battleState);
	}

	battleState.nextState = FSMState.END_FIGHT;
}

function* runAttackAtPlayer(battleState: BattleState) {
	const { player, enemy, defender } = battleState;
	const [bg] = battleState.spriteGroups;

	const step = 4;
	const backFrames = 8;
	const attackFrames = 4;
	const frames = 4;

	for (let i = 2; i >= DODGE_WINDUP; i -= step) {
		offsetEnemy(enemy, i);
		yield* pause(backFrames);
	}

	for (let i = 0; i < 4; ++i) {
		enemy.pose.sprites.forEach((sprite) => sprite.cyclePalette());
		yield* pause(15);
	}

	setEnemyPose(battleState, 'ATTACK');

	for (let i = DODGE_WINDUP; i <= DODGE_OFFSET; i += step * 2) {
		offsetEnemy(enemy, i);
		yield* pause(attackFrames);
	}

	battleState.showResultText = true;

	if (didHit(battleState.hitResult)) {
		const lostHeart = player.heartsSprites.sprites[player.health + 1];

		// heart
		bg.setPalette(0);
		lostHeart.cyclePalette();
		yield* pause(30);

		bg.setPalette(3);
		lostHeart.cyclePalette();
		yield* pause(30);

		bg.setPalette(0);
		lostHeart.cyclePalette();
		yield* pause(30);

		bg.resetPalette();
		lostHeart.setMaxLevel(1);
		yield* pause(30);
	} else {
		yield* pause(120);
		// show missed text
	}

	defender.hurt = false;

	battleState.showResultText = false;

	for (let i = DODGE_OFFSET; i >= 0; i -= step) {
		offsetEnemy(enemy, i);
		yield* pause(frames);
	}

	setEnemyPose(battleState, 'IDLE');
	offsetEnemy(enemy, 0);
}

function* runAttackAtEnemy(battleState: BattleState): Generator {
	const { enemy, defender } = battleState;

	const step = 4;
	const frames = 4;

	for (let i = 2; i < DODGE_OFFSET; i += step) {
		offsetEnemy(enemy, i);
		yield* pause(frames);
	}

	battleState.showResultText = true;

	if (didHit(battleState.hitResult)) {
		yield* runHitEnemy(battleState);
	} else {
		yield* runMissedEnemy(battleState);
	}

	defender.hurt = false;

	battleState.showResultText = false;

	setEnemyPose(battleState, 'PREPARE');
	offsetEnemy(enemy, DODGE_OFFSET);

	for (let i = DODGE_OFFSET; i >= 0; i -= step) {
		offsetEnemy(enemy, i);
		yield* pause(frames);
	}
}

function* runMissedEnemy(battleState: BattleState) {
	setEnemyPose(battleState, 'IDLE');

	const { enemy } = battleState;

	yield* pause(120);
}

function* runHitEnemy(battleState: BattleState) {
	const { enemy } = battleState;

	const bg = battleState.spriteGroups[0];

	const lostHeart = enemy.heartsSprites.sprites[enemy.health + 1];

	setEnemyPose(battleState, 'HURT');
	offsetEnemy(enemy, DODGE_OFFSET);
	lostHeart.cyclePalette();
	yield* pause(30);

	enemy.pose.setPalette(3);
	bg.setPalette(3, 2, 1, 0);
	lostHeart.cyclePalette();
	yield* pause(30);

	enemy.pose.resetPalette();
	bg.resetPalette();
	lostHeart.cyclePalette();
	yield* pause(30);

	lostHeart.setMaxLevel(1);
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

	const { ctx } = textRenderer;
	ctx.save();
	ctx.imageSmoothingEnabled = false;
	ctx.font = '12px "Sekuya", system-ui';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.textRendering = 'geometricPrecision';

	const v = vec2.create();
	dirToVec(enemy.direction, v);
	v[0] *= -1;
	v[1] *= -1;
	const X_OFF = 38;
	const Y_OFF = 36;

	enemy.direction = Direction.Down;

	if (battleState.showResultText) {
		const str = didHit(battleState.hitResult) ? '' : 'MISS!';
		ctx.fillStyle = '#222';
		ctx.fillText(str, GAME_W / 2 + v[0] * X_OFF, GAME_H / 2 + v[1] * Y_OFF);
	}

	ctx.restore();
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
