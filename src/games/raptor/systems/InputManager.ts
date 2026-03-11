export class InputManager {
  public targetX: number;
  public targetY: number;
  public isFiring = false;
  public wasClicked = false;
  public wasEscPressed = false;
  public wasBombPressed = false;
  public wasConsoleToggled = false;
  public isMouseDown = false;
  public mouseX = 0;
  public mouseY = 0;
  public readonly isTouchDevice: boolean;

  private canvas: HTMLCanvasElement;
  private logicalWidth: number;
  private logicalHeight: number;
  private activeTouchId: number | null = null;
  private keys = new Set<string>();

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, logicalWidth?: number, logicalHeight?: number) {
    this.canvas = canvas;
    this.logicalWidth = logicalWidth ?? canvas.width;
    this.logicalHeight = logicalHeight ?? canvas.height;
    this.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.targetX = this.logicalWidth / 2;
    this.targetY = this.logicalHeight * 0.8;

    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseDown = (e) => this.onMouseDown(e);
    this.boundMouseUp = (e) => this.onMouseUp(e);
    this.boundTouchStart = (e) => this.onTouchStart(e);
    this.boundTouchMove = (e) => this.onTouchMove(e);
    this.boundTouchEnd = (e) => this.onTouchEnd(e);
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.onKeyUp(e);

    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mouseup", this.boundMouseUp);
    canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.boundTouchEnd, { passive: false });
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
  }

  updateFromKeyboard(dt: number, canvasWidth: number, canvasHeight: number): void {
    const speed = 400 * dt;
    if (this.keys.has("ArrowLeft") || this.keys.has("a")) this.targetX -= speed;
    if (this.keys.has("ArrowRight") || this.keys.has("d")) this.targetX += speed;
    if (this.keys.has("ArrowUp") || this.keys.has("w")) this.targetY -= speed;
    if (this.keys.has("ArrowDown") || this.keys.has("s")) this.targetY += speed;

    this.targetX = Math.max(0, Math.min(canvasWidth, this.targetX));
    this.targetY = Math.max(0, Math.min(canvasHeight, this.targetY));

    this.isFiring = this.keys.has(" ") || this.isFiring;
  }

  consume(): void {
    this.wasClicked = false;
    this.wasEscPressed = false;
    this.wasBombPressed = false;
    this.wasConsoleToggled = false;
  }

  destroy(): void {
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    window.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
  }

  private toCanvasX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) * (this.logicalWidth / rect.width);
  }

  private toCanvasY(clientY: number): number {
    const rect = this.canvas.getBoundingClientRect();
    return (clientY - rect.top) * (this.logicalHeight / rect.height);
  }

  private onMouseMove(e: MouseEvent): void {
    this.targetX = this.toCanvasX(e.clientX);
    this.targetY = this.toCanvasY(e.clientY);
    this.mouseX = this.targetX;
    this.mouseY = this.targetY;
  }

  private onMouseDown(e: MouseEvent): void {
    this.wasClicked = true;
    this.isMouseDown = true;
    this.targetX = this.toCanvasX(e.clientX);
    this.targetY = this.toCanvasY(e.clientY);
    this.mouseX = this.targetX;
    this.mouseY = this.targetY;
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isMouseDown = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    this.activeTouchId = touch.identifier;
    const cx = this.toCanvasX(touch.clientX);
    const cy = this.toCanvasY(touch.clientY);
    this.targetX = cx;
    this.targetY = cy - 60;
    this.mouseX = cx;
    this.mouseY = cy;
    this.wasClicked = true;
    this.isMouseDown = true;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = this.getActiveTouch(e.touches);
    if (!touch) return;
    const cx = this.toCanvasX(touch.clientX);
    const cy = this.toCanvasY(touch.clientY);
    this.targetX = cx;
    this.targetY = cy - 60;
    this.mouseX = cx;
    this.mouseY = cy;
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const touch = this.getActiveTouch(e.changedTouches);
    if (!touch) return;
    this.activeTouchId = null;
    this.isMouseDown = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key);
    if (e.key === " ") {
      e.preventDefault();
    }
    if (e.key === "Escape") {
      this.wasEscPressed = true;
      e.preventDefault();
    }
    if (e.key === "b") {
      this.wasBombPressed = true;
    }
    if (e.key === "`") {
      this.wasConsoleToggled = true;
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key);
  }

  private getActiveTouch(touches: TouchList): Touch | null {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.activeTouchId) return touches[i];
    }
    return null;
  }
}
