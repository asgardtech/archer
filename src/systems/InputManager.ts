import { Vec2 } from "../types";

export class InputManager {
  public mousePos: Vec2 = { x: 400, y: 300 };
  public isMouseDown = false;
  public wasClicked = false;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    canvas.addEventListener("mouseup", () => this.onMouseUp());

    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", () => this.onTouchEnd());
  }

  consume(): void {
    this.wasClicked = false;
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
    const touch = e.touches[0];
    this.mousePos = this.toCanvasCoords(touch.clientX, touch.clientY);
    this.isMouseDown = true;
    this.wasClicked = true;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    this.mousePos = this.toCanvasCoords(touch.clientX, touch.clientY);
  }

  private onTouchEnd(): void {
    this.isMouseDown = false;
  }
}
