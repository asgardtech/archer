export class InputManager {
  public mouseX = 400;
  public mouseY = 0;
  public wasClicked = false;
  public deflectPressed = false;
  public readonly isTouchDevice: boolean;

  private canvas: HTMLCanvasElement;
  private activeTouchId: number | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundContextMenu: (e: Event) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    this.mouseX = canvas.width / 2;

    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseDown = (e) => this.onMouseDown(e);
    this.boundTouchStart = (e) => this.onTouchStart(e);
    this.boundTouchMove = (e) => this.onTouchMove(e);
    this.boundTouchEnd = (e) => this.onTouchEnd(e);
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundContextMenu = (e) => e.preventDefault();

    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mousedown", this.boundMouseDown);
    canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.boundTouchEnd, { passive: false });
    document.addEventListener("keydown", this.boundKeyDown);
    canvas.addEventListener("contextmenu", this.boundContextMenu);
  }

  consume(): void {
    this.wasClicked = false;
    this.deflectPressed = false;
  }

  destroy(): void {
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
    document.removeEventListener("keydown", this.boundKeyDown);
    this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
  }

  private toCanvasX(clientX: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    return (clientX - rect.left) * scaleX;
  }

  private toCanvasY(clientY: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const scaleY = this.canvas.height / rect.height;
    return (clientY - rect.top) * scaleY;
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseX = this.toCanvasX(e.clientX);
    this.mouseY = this.toCanvasY(e.clientY);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.wasClicked = true;
      this.mouseX = this.toCanvasX(e.clientX);
      this.mouseY = this.toCanvasY(e.clientY);
    } else if (e.button === 2) {
      this.deflectPressed = true;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.activeTouchId !== null) {
      if (e.touches.length >= 2) {
        this.deflectPressed = true;
      }
      return;
    }
    const touch = e.changedTouches[0];
    this.activeTouchId = touch.identifier;
    this.mouseX = this.toCanvasX(touch.clientX);
    this.mouseY = this.toCanvasY(touch.clientY);
    this.wasClicked = true;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = this.getActiveTouch(e.touches);
    if (!touch) return;
    this.mouseX = this.toCanvasX(touch.clientX);
    this.mouseY = this.toCanvasY(touch.clientY);
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const touch = this.getActiveTouch(e.changedTouches);
    if (!touch) return;
    this.activeTouchId = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      this.deflectPressed = true;
    }
  }

  private getActiveTouch(touches: TouchList): Touch | null {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.activeTouchId) return touches[i];
    }
    return null;
  }
}
