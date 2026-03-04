import { Vec2, Projectile } from "../types";

const BULLET_SPEED = 500;

export class Bullet implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 4;
  public height = 10;
  public damage = 1;
  public piercing = false;

  private angle: number;
  private sprite: HTMLImageElement | null = null;

  constructor(x: number, y: number, angle = 0) {
    this.pos = { x, y };
    this.angle = angle;
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasWidth = 800, _canvasHeight?: number, _enemies?: unknown[]): void {
    if (!this.alive) return;
    this.pos.x += Math.sin(this.angle) * BULLET_SPEED * dt;
    this.pos.y -= Math.cos(this.angle) * BULLET_SPEED * dt;

    if (this.pos.y < -20 || this.pos.x < -20 || this.pos.x > canvasWidth + 20) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.sprite) {
      this.renderSprite(ctx);
    } else {
      this.renderFallback(ctx);
    }
  }

  private renderSprite(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.angle !== 0) {
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(-this.angle);
      ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.drawImage(
        this.sprite!,
        this.pos.x - this.width / 2,
        this.pos.y - this.height / 2,
        this.width,
        this.height
      );
    }
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#ffdd00";
    ctx.shadowColor = "#ffdd00";
    ctx.shadowBlur = 4;
    ctx.fillRect(this.pos.x - this.width / 2, this.pos.y - this.height / 2, this.width, this.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(this.pos.x - 1, this.pos.y - this.height / 2, 2, this.height * 0.6);
    ctx.restore();
  }
}
