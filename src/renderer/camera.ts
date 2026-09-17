import type { Mat4, Vec3 } from 'wgpu-matrix';
import { mat4 } from 'wgpu-matrix';
import { Input } from '~/input';
import { clamp } from '~/util';
import { GAME_H, GAME_W, HUD_H } from '~/util/constants';

export interface Camera {
	eye: Vec3;
	target: Vec3;
	up: Vec3;
	forward: Vec3;

	distance: number;
	viewHeight: number;

	fovY: number;

	viewMatrix: Mat4;
	projMatrix: Mat4;
	viewProjMatrix: Mat4;
}

export function create(): Camera {
	return {
		eye: new Float32Array([0, 0, 100]),
		target: new Float32Array([0, 0, 0]),
		up: new Float32Array([0, 1, 0]),
		forward: new Float32Array([0, 0, -1]),

		distance: 100,
		viewHeight: GAME_H,

		fovY: Math.PI / 4,

		viewMatrix: mat4.create(),
		projMatrix: mat4.create(),
		viewProjMatrix: mat4.create(),
	};
}

export function follow(
	cam: Camera,
	target: [number, number],
	dt: number,
	posSmoothness: number,
): void {
	const t = 1 - Math.exp(-posSmoothness * dt);
	cam.target[0] += (target[0] - cam.target[0]) * t;
	cam.target[1] += (target[1] - cam.target[1]) * t;

	cam.target[0] = clamp(cam.target[0], 0, 768 - GAME_W);
	cam.target[1] = clamp(cam.target[1], 0, 312 - GAME_H + HUD_H);
}

export function update(cam: Camera, input: Input, aspect: number): void {
	cam.eye[0] = cam.target[0];
	cam.eye[1] = cam.target[1];
	cam.eye[2] = cam.target[2] + cam.distance;

	const halfH = cam.viewHeight / 2;
	const halfW = halfH * aspect;

	mat4.lookAt(cam.eye, cam.target, cam.up, cam.viewMatrix);

	// mat4.ortho(-halfW, halfW, -halfH, halfH, -1000, 1000, cam.projMatrix);
	mat4.ortho(
		0,
		cam.viewHeight * aspect,
		cam.viewHeight,
		0,
		-1000,
		1000,
		cam.projMatrix,
	);
	mat4.multiply(cam.projMatrix, cam.viewMatrix, cam.viewProjMatrix);

	cam.forward[0] = 0;
	cam.forward[1] = 0;
	cam.forward[2] = -1;
}
