import { Vec2 } from "../types";

const ENEMY_BULLET_SPEED = 300;

export class EnemyBullet {
  public pos: Vec2;
  public vel: Vec2;
  public alive = true;
  public radius = 4;

  private sprite: HTMLImageElement | null = null;

  constructor(x: number, y: number, targetX: number, targetY: number) {
    this.pos = { x, y };
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      this.vel = { x: 0, y: ENEMY_BULLET_SPEED };
    } else {
      this.vel = {
        x: (dx / dist) * ENEMY_BULLET_SPEED,
        y: (dy / dist) * ENEMY_BULLET_SPEED,
      };
    }
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.radius; }
  get right(): number { return this.pos.x + this.radius; }
  get top(): number { return this.pos.y - this.radius; }
  get bottom(): number { return this.pos.y + this.radius; }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.alive) return;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    if (
      this.pos.x < -20 || this.pos.x > canvasWidth + 20 ||
      this.pos.y < -20 || this.pos.y > canvasHeight + 20
    ) {
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
    const size = this.radius * 2;
    ctx.drawImage(
      this.sprite!,
      this.pos.x - this.radius,
      this.pos.y - this.radius,
      size,
      size
    );
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#ff3333";
    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff8888";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
