export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  dodgePressed: boolean;
  attackPressed: boolean;
  attackHeld: boolean;
  attackHoldDuration: number;
  guardHeld: boolean;
  guardJustPressed: boolean;
  actionPressed: boolean;   // E (Thrust Counter / Execute)
  jumpPressed: boolean;     // F (Jump / Sweep Evade / Head Stomp)
  specialPressed: boolean;  // R (Special attack)
  healPressed: boolean;     // 1
  lockonPressed: boolean;   // Q
  switchTargetDir: number;  // -1 (prev), 1 (next), 0 (none)
  escapePressed: boolean;
}

export class InputManager {
  public state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    dodgePressed: false,
    attackPressed: false,
    attackHeld: false,
    attackHoldDuration: 0,
    guardHeld: false,
    guardJustPressed: false,
    actionPressed: false,
    jumpPressed: false,
    specialPressed: false,
    healPressed: false,
    lockonPressed: false,
    switchTargetDir: 0,
    escapePressed: false,
  };

  public mouseMovementX: number = 0;
  public mouseMovementY: number = 0;

  // Input buffering for tight combo responsiveness
  public bufferedAction: 'attack' | 'dodge' | 'guard' | 'special' | 'jump' | null = null;
  public bufferTimer: number = 0;
  private readonly BUFFER_WINDOW = 0.28; // 280ms input buffer

  private isPointerLocked: boolean = false;
  private domElement: HTMLElement;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Pointer lock on canvas click
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;

    switch (e.code) {
      case 'KeyW': this.state.forward = true; break;
      case 'KeyS': this.state.backward = true; break;
      case 'KeyA': this.state.left = true; break;
      case 'KeyD': this.state.right = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.state.sprint = true; break;
      case 'Space':
        this.state.dodgePressed = true;
        this.bufferAction('dodge');
        break;
      case 'KeyF':
        this.state.jumpPressed = true;
        this.bufferAction('jump');
        break;
      case 'KeyQ': this.state.lockonPressed = true; break;
      case 'KeyE': this.state.actionPressed = true; break;
      case 'KeyR':
        this.state.specialPressed = true;
        this.bufferAction('special');
        break;
      case 'Digit1': this.state.healPressed = true; break;
      case 'Escape': this.state.escapePressed = true; break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW': this.state.forward = false; break;
      case 'KeyS': this.state.backward = false; break;
      case 'KeyA': this.state.left = false; break;
      case 'KeyD': this.state.right = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.state.sprint = false; break;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) { // Left Mouse
      this.state.attackPressed = true;
      this.state.attackHeld = true;
      this.state.attackHoldDuration = 0;
      this.bufferAction('attack');
    } else if (e.button === 2) { // Right Mouse
      this.state.guardHeld = true;
      this.state.guardJustPressed = true;
      this.bufferAction('guard');
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.attackHeld = false;
    } else if (e.button === 2) {
      this.state.guardHeld = false;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      this.mouseMovementX += e.movementX;
      this.mouseMovementY += e.movementY;
    }
  }

  private onWheel(e: WheelEvent): void {
    if (e.deltaY < 0) {
      this.state.switchTargetDir = -1;
    } else if (e.deltaY > 0) {
      this.state.switchTargetDir = 1;
    }
  }

  public bufferAction(action: 'attack' | 'dodge' | 'guard' | 'special' | 'jump'): void {
    this.bufferedAction = action;
    this.bufferTimer = this.BUFFER_WINDOW;
  }

  public consumeBufferedAction(): 'attack' | 'dodge' | 'guard' | 'special' | 'jump' | null {
    const act = this.bufferedAction;
    this.bufferedAction = null;
    this.bufferTimer = 0;
    return act;
  }

  public update(delta: number): void {
    // Attack hold counter
    if (this.state.attackHeld) {
      this.state.attackHoldDuration += delta;
    }

    // Input buffer expiration
    if (this.bufferTimer > 0) {
      this.bufferTimer -= delta;
      if (this.bufferTimer <= 0) {
        this.bufferedAction = null;
      }
    }
  }

  /**
   * Resets single-frame triggers at the end of update frame
   */
  public endFrame(): void {
    this.state.dodgePressed = false;
    this.state.jumpPressed = false;
    this.state.attackPressed = false;
    this.state.guardJustPressed = false;
    this.state.actionPressed = false;
    this.state.specialPressed = false;
    this.state.healPressed = false;
    this.state.lockonPressed = false;
    this.state.switchTargetDir = 0;
    this.state.escapePressed = false;

    this.mouseMovementX = 0;
    this.mouseMovementY = 0;
  }

  public isLocked(): boolean {
    return this.isPointerLocked;
  }

  public lockPointer(): void {
    this.domElement.requestPointerLock();
  }

  public unlockPointer(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
}
