export class InputManager {
  public mouseX = 400;
  public mouseY = 0;
  public wasClicked = false;
  public readonly isTouchDevice: boolean;

  private canvas: HTMLCanvasElement;
  private activeTouchId: number | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

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

    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mousedown", this.boundMouseDown);
    canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.boundTouchEnd, { passive: false });
  }

  consume(): void {
    this.wasClicked = false;
  }

  destroy(): void {
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
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
    this.wasClicked = true;
    this.mouseX = this.toCanvasX(e.clientX);
    this.mouseY = this.toCanvasY(e.clientY);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.activeTouchId !== null) return;
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

  private getActiveTouch(touches: TouchList): Touch | null {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.activeTouchId) return touches[i];
    }
    return null;
  }
}
