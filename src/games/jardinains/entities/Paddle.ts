import { PaddleState } from "../types";

const MIN_WIDTH = 40;
const SHRINK_AMOUNT = 30;
const WIDE_AMOUNT = 40;

export class Paddle {
  public x: number;
  public y: number;
  public width: number;
  public height = 14;
  public baseWidth: number;
  public shrinkTimer = 0;
  public wideTimer = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.baseWidth = 100;
    this.width = this.baseWidth;
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 30;
  }

  get left(): number {
    return this.x - this.width / 2;
  }
  get right(): number {
    return this.x + this.width / 2;
  }
  get top(): number {
    return this.y - this.height / 2;
  }
  get bottom(): number {
    return this.y + this.height / 2;
  }

  update(dt: number, mouseX: number, canvasWidth: number): void {
    this.x = Math.max(this.width / 2, Math.min(canvasWidth - this.width / 2, mouseX));

    if (this.shrinkTimer > 0) {
      this.shrinkTimer -= dt;
      if (this.shrinkTimer <= 0) {
        this.shrinkTimer = 0;
        this.recalcWidth();
      }
    }

    if (this.wideTimer > 0) {
      this.wideTimer -= dt;
      if (this.wideTimer <= 0) {
        this.wideTimer = 0;
        this.recalcWidth();
      }
    }
  }

  applyShrink(): void {
    this.shrinkTimer = 5;
    this.recalcWidth();
  }

  applyWide(): void {
    this.wideTimer = 10;
    this.recalcWidth();
  }

  private recalcWidth(): void {
    let w = this.baseWidth;
    if (this.wideTimer > 0) w += WIDE_AMOUNT;
    if (this.shrinkTimer > 0) w -= SHRINK_AMOUNT;
    this.width = Math.max(MIN_WIDTH, w);
  }

  reset(canvasWidth: number): void {
    this.width = this.baseWidth;
    this.x = canvasWidth / 2;
    this.shrinkTimer = 0;
    this.wideTimer = 0;
  }

  getState(): PaddleState {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      baseWidth: this.baseWidth,
      shrinkTimer: this.shrinkTimer,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const x = this.left;
    const y = this.top;
    const w = this.width;
    const h = this.height;
    const r = 5;

    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#228B22";
    ctx.fillRect(x + 2, y + 1, w - 4, 3);

    ctx.fillStyle = "#A0522D";
    ctx.fillRect(x + 2, y + h - 4, w - 4, 3);
  }
}
