import { Vec2 } from "../types";

export class InputManager {
  public mousePos: Vec2 = { x: 400, y: 300 };
  public isMouseDown = false;
  public wasClicked = false;
  public wasEscPressed = false;
  public shieldPressed = false;
  public weaponSlotPressed: number | null = null;
  public readonly isTouchDevice: boolean;

  private canvas: HTMLCanvasElement;
  private activeTouchId: number | null = null;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: () => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseDown = (e) => this.onMouseDown(e);
    this.boundMouseUp = () => this.onMouseUp();
    this.boundTouchStart = (e) => this.onTouchStart(e);
    this.boundTouchMove = (e) => this.onTouchMove(e);
    this.boundTouchEnd = (e) => this.onTouchEnd(e);
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundContextMenu = (e) => this.onContextMenu(e);

    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mousedown", this.boundMouseDown);
    canvas.addEventListener("mouseup", this.boundMouseUp);

    canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });
    canvas.addEventListener("touchend", this.boundTouchEnd, { passive: false });

    window.addEventListener("keydown", this.boundKeyDown);
    canvas.addEventListener("contextmenu", this.boundContextMenu);
  }

  consume(): void {
    this.wasClicked = false;
    this.wasEscPressed = false;
    this.shieldPressed = false;
    this.weaponSlotPressed = null;
  }

  destroy(): void {
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
    window.removeEventListener("keydown", this.boundKeyDown);
    this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
  }

  private toCanvasCoords(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private onMouseMove(e: MouseEvent): void {
    this.mousePos = this.toCanvasCoords(e.clientX, e.clientY);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isMouseDown = true;
    this.wasClicked = true;
    this.mousePos = this.toCanvasCoords(e.clientX, e.clientY);
  }

  private onMouseUp(): void {
    this.isMouseDown = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.activeTouchId !== null) return;
    const touch = e.changedTouches[0];
    this.activeTouchId = touch.identifier;
    this.mousePos = this.toCanvasCoords(touch.clientX, touch.clientY);
    this.isMouseDown = true;
    this.wasClicked = true;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = this.getActiveTouch(e.touches);
    if (!touch) return;
    this.mousePos = this.toCanvasCoords(touch.clientX, touch.clientY);
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    const touch = this.getActiveTouch(e.changedTouches);
    if (!touch) return;
    this.activeTouchId = null;
    this.isMouseDown = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.wasEscPressed = true;
    }
    if (e.key >= "1" && e.key <= "4") {
      this.weaponSlotPressed = parseInt(e.key, 10);
    }
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      this.shieldPressed = true;
    }
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.shieldPressed = true;
  }

  private getActiveTouch(touches: TouchList): Touch | null {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.activeTouchId) return touches[i];
    }
    return null;
  }
}
