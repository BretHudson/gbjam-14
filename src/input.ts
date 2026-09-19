type KeyCode = string;

interface KeyState {
	code: KeyCode;
	state: 0 | 1 | 2 | 3;
	lastPressed: number;
	pressedEvent: KeyboardEvent | null;
	lastReleased: number;
	releasedEvent: KeyboardEvent | null;
	doublePressed: boolean;
}

type EventMap = keyof HTMLElementEventMap;
type Listener = {
	target: HTMLElement;
} & (
	| {
			type: Extract<
				EventMap,
				| 'pointerup'
				| 'pointercancel'
				| 'lostpointercapture'
				| 'pointerdown'
				| 'pointermove'
			>;
			callback: (e: PointerEvent) => void;
	  }
	| {
			type: Extract<EventMap, 'wheel'>;
			callback: (e: WheelEvent) => void;
	  }
);

export type ButtonType =
	| 'Left'
	| 'Right'
	| 'Up'
	| 'Down'
	| 'Select'
	| 'Start'
	| 'B'
	| 'A';

export class ControllerInput {
	buttons: Record<ButtonType, KeyState | undefined>;

	mapping: Record<ButtonType, string[]> = {
		Left: ['KeyA', 'ArrowLeft'],
		Right: ['KeyD', 'ArrowRight'],
		Up: ['KeyW', 'ArrowUp'],
		Down: ['KeyS', 'ArrowDown'],
		Select: ['Space', 'Backspace'],
		Start: ['Enter'],
		B: ['KeyZ', 'KeyK'],
		A: ['KeyX', 'KeyL'],
	};

	rawInput: Input;

	constructor(input: Input) {
		this.rawInput = input;

		this.buttons = {
			Left: input._initKey('DPAD_LEFT'),
			Right: input._initKey('DPAD_RIGHT'),
			Up: input._initKey('DPAD_UP'),
			Down: input._initKey('DPAD_DOWN'),

			Select: input._initKey('BUTTON_SELECT'),
			Start: input._initKey('BUTTON_START'),

			B: input._initKey('BUTTON_B'),
			A: input._initKey('BUTTON_A'),
		};
	}

	update() {
		const input = this.rawInput;

		input.preUpdate();
		input.update();

		Object.entries(this.mapping).forEach(([button, keys]) => {
			const pressed = keys.map((key) => input.keyPressed(key));
			const held = keys.map((key) => input.keyHeld(key));
			const released = keys.map((key) => input.keyReleased(key));

			const currentlyHeld = this.keyHeld(button as ButtonType);
			if (!currentlyHeld) {
				if (pressed.some(Boolean)) {
					this.buttons[button as ButtonType]!.state = 3;
				}
			} else {
				if (released.some((r) => r) && !held.some((h) => h)) {
					this.buttons[button as ButtonType]!.state = 1;
				}
			}
		});
	}

	postUpdate() {
		const input = this.rawInput;

		Object.entries(this.buttons).forEach(([_k]) => {
			const k = _k as ButtonType;
			if (!this.buttons[k]) return;
			this.buttons[k].state &= ~1;
			this.buttons[k].doublePressed = false;
		});

		input.postUpdate();
	}

	keyPressed(code: ButtonType): boolean {
		return this.buttons[code]?.state === 3;
	}

	keyDoublePressed(code: ButtonType): boolean {
		return this.buttons[code]?.doublePressed ?? false;
	}

	keyHeld(code: ButtonType): boolean {
		return ((this.buttons[code]?.state ?? 0) & 2) > 0;
	}

	keyReleased(code: ButtonType): boolean {
		return this.buttons[code]?.state === 1;
	}
}

export class Input {
	mouseX = -1;
	mouseY = -1;
	mouseMoveX = 0;
	mouseMoveY = 0;

	keys: Record<string, KeyState | undefined> = {};
	shift = false;

	mode: 'play' | 'type' = 'play';

	#doubleClickWindow = 0.2;
	mouse = {
		left: false,
		middle: false,
		right: false,
		wheel: 0,
	};

	listeners = new Map<HTMLElement, Listener[]>();

	target: HTMLCanvasElement;

	constructor(target: HTMLCanvasElement) {
		this.target = target;

		// ensure we don't scroll the page when game is active
		window.addEventListener(
			'wheel',
			(e) => {
				if (document.pointerLockElement) e.preventDefault();
			},
			{ passive: false },
		);
	}

	addListenerToTarget<T extends Listener>(
		target: HTMLElement,
		type: T['type'],
		callback: T['callback'],
		options?: boolean | AddEventListenerOptions | undefined,
	): void {
		const listeners = this.listeners.get(target);
		if (!listeners) {
			throw new Error('this target isnt registered');
		}

		listeners.push({ target, type, callback } as Listener);
		target.addEventListener(type, callback as EventListener, options);
	}

	removeListenerFromTarget(
		target: HTMLElement,
		type: Listener['type'],
		callback: Listener['callback'],
	): void {
		const listeners = this.listeners.get(target);
		if (!listeners) throw new Error('this target isnt registered');

		target.removeEventListener(type, callback as EventListener);
	}

	listen(): void {
		const listeners: Listener[] = [];
		this.listeners.set(this.target, listeners);
		this.initMouseListeners();
		this.initKeyListeners();
	}

	unlisten(): void {
		// TODO(bret): Make this listen to all targets when/if we have more
		const listeners = this.listeners.get(this.target);
		if (!listeners) throw new Error('this target isnt registered');

		listeners.forEach(({ target, type, callback }) => {
			target.removeEventListener(type, callback as EventListener);
		});

		this.listeners.clear();
	}

	#reset(): void {
		this.mouseMoveX = 0;
		this.mouseMoveY = 0;
	}

	onBlur(): void {
		this.#reset();

		this.unlisten();
	}

	onFocus(): void {
		this.#reset();

		this.listen();
	}

	preUpdate(): void {
		//
	}

	update(): void {
		//
	}

	postUpdate(): void {
		this.mouseMoveX = 0;
		this.mouseMoveY = 0;
		this.mouse.wheel = 0;

		Object.entries(this.keys).forEach(([k]) => {
			if (!this.keys[k]) return;
			this.keys[k].state &= ~1;
			this.keys[k].doublePressed = false;
		});
	}

	initMouseListeners(): void {
		const { target } = this;

		const onDown = (e: MouseEvent): void => {
			switch (e.button) {
				case 0:
					this.mouse.left = true;
					break;
				case 1:
					this.mouse.middle = true;
					break;
				case 2:
					this.mouse.right = true;
					break;
			}
		};

		const onUp = (e: MouseEvent): void => {
			switch (e.button) {
				case 0:
					this.mouse.left = false;
					break;
				case 1:
					this.mouse.middle = false;
					break;
				case 2:
					this.mouse.right = false;
					break;
			}
		};

		const onMove = (e: MouseEvent): void => {
			this.mouseMoveX += e.movementX;
			this.mouseMoveY += e.movementY;
			this.mouseX = e.clientX;
			this.mouseY = e.clientY;
			// requestFrame();
		};

		const onWheel = (e: WheelEvent): void => {
			e.preventDefault();

			this.mouse.wheel = Math.sign(e.deltaY);

			/// below is from WebGPU Fundamentals
			// const helper = cam.getUpdateHelper();
			// helper.dolly(cam.radius * 0.001 * e.deltaY);
			// requestFrame();
		};

		this.addListenerToTarget(target, 'pointerdown', onDown);
		this.addListenerToTarget(target, 'pointermove', onMove);
		this.addListenerToTarget(target, 'pointercancel', onUp);
		this.addListenerToTarget(target, 'pointerup', onUp);
		this.addListenerToTarget(target, 'lostpointercapture', onUp);
		this.addListenerToTarget(target, 'wheel', onWheel, { passive: false });
	}

	keyPressed(code: KeyCode): boolean {
		return this.keys[code]?.state === 3;
	}

	keyDoublePressed(code: KeyCode): boolean {
		return this.keys[code]?.doublePressed ?? false;
	}

	keyHeld(code: KeyCode): boolean {
		return ((this.keys[code]?.state ?? 0) & 2) > 0;
	}

	keyReleased(code: KeyCode): boolean {
		return this.keys[code]?.state === 1;
	}

	_initKey(code: KeyCode): KeyState {
		return {
			code,
			state: 0,
			lastPressed: -1,
			pressedEvent: null,
			lastReleased: -1,
			releasedEvent: null,
			doublePressed: false,
		};
	}

	initKeyListeners(): void {
		const { target } = this;

		const onKeyDown = (e: KeyboardEvent): void => {
			if (this.mode === 'type') return;

			e.preventDefault();

			if (e.repeat) return;

			const { code } = e;
			if (this.keyHeld(code)) return;

			this.keys[code] ??= this._initKey(code);

			const key = this.keys[code];
			key.state = 3;
			key.pressedEvent = e;

			const now = performance.now();
			const delta = (now - key.lastPressed) / 1000;
			key.doublePressed = delta < this.#doubleClickWindow;
			key.lastPressed = now;

			this.shift = e.shiftKey;
		};

		const onKeyUp = (e: KeyboardEvent): void => {
			if (this.mode === 'type') return;

			e.preventDefault();

			const { code } = e;
			if (!this.keyHeld(code)) return;

			this.keys[code] ??= this._initKey(code);

			const key = this.keys[code];
			key.state = 1;
			key.releasedEvent = e;

			key.lastReleased = performance.now();

			this.shift = e.shiftKey;
		};

		window.addEventListener('keydown', onKeyDown, false);
		window.addEventListener('keyup', onKeyUp, false);
	}
}
