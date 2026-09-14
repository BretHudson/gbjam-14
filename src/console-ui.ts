import { Input } from './input';

export function initConsoleUI() {
	//
}

export function updateConsoleUI(input: Input) {
	const [dpadL, dpadR, dpadU, dpadD, select, start, buttonA, buttonB] = [
		'dpad-left',
		'dpad-right',
		'dpad-up',
		'dpad-down',
		'select-button',
		'start-button',
		'a-button',
		'b-button',
	].map((id) => document.getElementById(id)!);

	dpadL.classList.toggle('pressed', input.keyHeld('KeyA'));
	dpadR.classList.toggle('pressed', input.keyHeld('KeyD'));
	dpadU.classList.toggle('pressed', input.keyHeld('KeyW'));
	dpadD.classList.toggle('pressed', input.keyHeld('KeyS'));

	select.classList.toggle('pressed', input.keyHeld('Enter'));
	start.classList.toggle('pressed', input.keyHeld('Space'));

	buttonA.classList.toggle('pressed', input.keyHeld('KeyK'));
	buttonB.classList.toggle('pressed', input.keyHeld('KeyJ'));
}
