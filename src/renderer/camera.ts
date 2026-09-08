import type { Mat4, Vec3 } from 'wgpu-matrix';
import { mat4 } from 'wgpu-matrix';

export interface Camera {
	eye: Vec3;
	target: Vec3;
	up: Vec3;

	forward: Vec3;

	distance: number;
	yaw: number;
	pitch: number;

	fovY: number;

	viewMatrix: Mat4;
	projMatrix: Mat4;
	viewProjMatrix: Mat4;
}

export function create(): Camera {
	return {
		eye: new Float32Array([0, 5, 10]),
		target: new Float32Array([0, 0, 0]),
		up: new Float32Array([0, 1, 0]),

		forward: new Float32Array([0, 0, -1]),

		distance: 10,
		yaw: 0,
		pitch: 0.3,

		fovY: Math.PI / 4,

		viewMatrix: mat4.create(),
		projMatrix: mat4.create(),
		viewProjMatrix: mat4.create(),
	};
}

export function follow(
	cam: Camera,
	target: [number, number, number],
	playerYaw: number,
	speed: number,
	dt: number,
	posSmoothness: number,
	yawSmoothness: number,
): void {
	const t = 1 - Math.exp(-posSmoothness * dt);
	cam.target[0] += (target[0] - cam.target[0]) * t;
	cam.target[1] += (target[1] + 2 - cam.target[1]) * t;
	cam.target[2] += (target[2] - cam.target[2]) * t;

	if (speed > 0.05) {
		const desiredYaw = playerYaw;
		let diff = (desiredYaw - cam.yaw) % (Math.PI * 2);
		diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
		const tYaw = 1 - Math.exp(-yawSmoothness * dt);
		cam.yaw += diff * tYaw;
	}
}

export function update(cam: Camera, aspect: number): void {
	const maxPitch = Math.PI / 2 - 0.01;
	cam.pitch = Math.max(-maxPitch, Math.min(maxPitch, cam.pitch));

	const cosPitch = Math.cos(cam.pitch);
	cam.eye[0] = cam.target[0] + cam.distance * Math.sin(cam.yaw) * cosPitch;
	cam.eye[1] = cam.target[1] + cam.distance * Math.sin(cam.pitch);
	cam.eye[2] = cam.target[2] + cam.distance * Math.cos(cam.yaw) * cosPitch;

	mat4.lookAt(cam.eye, cam.target, cam.up, cam.viewMatrix);
	mat4.perspective(cam.fovY, aspect, 0.1, 1000, cam.projMatrix);
	mat4.multiply(cam.projMatrix, cam.viewMatrix, cam.viewProjMatrix);

	for (let i = 0; i < 3; ++i) {
		cam.forward[i] = cam.target[i] - cam.eye[i];
	}
}
