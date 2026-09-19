import type { ButtonType, ControllerInput } from './input';

export function initConsoleUI(controller: ControllerInput) {
	console.warn('========== init console UI ========');

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

	function pressButton(button: ButtonType) {
		let key = controller.keys[button]!;
		key.state = 3;
	}

	function releaseButton(button: ButtonType) {
		let key = controller.keys[button]!;
		key.state = 1;
	}

	function assign(elem: HTMLElement, button: ButtonType) {
		elem.addEventListener('pointerdown', (e) => {
			// this ensures pointerenter can execute
			elem.releasePointerCapture(e.pointerId);

			pressButton(button);
		});

		elem.addEventListener('pointerenter', (e) => {
			if (e.buttons === 0) return;

			pressButton(button);
		});

		elem.addEventListener('pointerup', () => releaseButton(button));
		elem.addEventListener('pointerleave', () => releaseButton(button));
		elem.addEventListener('pointercancel', () => releaseButton(button));
	}

	assign(dpadL, 'Left');
	assign(dpadR, 'Right');
	assign(dpadU, 'Up');
	assign(dpadD, 'Down');

	assign(select, 'Select');
	assign(start, 'Start');

	assign(buttonB, 'B');
	assign(buttonA, 'A');
}

export function updateConsoleUI(controller: ControllerInput) {
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

	function assign(elem: HTMLElement, button: ButtonType) {
		elem.classList.toggle('pressed', controller.keyHeld(button));
	}

	assign(dpadL, 'Left');
	assign(dpadR, 'Right');
	assign(dpadU, 'Up');
	assign(dpadD, 'Down');

	assign(select, 'Select');
	assign(start, 'Start');

	assign(buttonB, 'B');
	assign(buttonA, 'A');
}
