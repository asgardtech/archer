import { Vec2, Projectile, WeaponType } from "../types";

const PLASMA_SPEED = 400;

export class PlasmaBolt implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 8;
  public height = 8;
  public damage = 2;
  public piercing = false;
  public sourceWeapon: WeaponType = "plasma";

  private angle: number;
  private sprite: HTMLImageElement | null = null;
  private time = 0;

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
    this.time += dt;
    this.pos.x += Math.sin(this.angle) * PLASMA_SPEED * dt;
    this.pos.y -= Math.cos(this.angle) * PLASMA_SPEED * dt;

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
    ctx.translate(this.pos.x, this.pos.y);
    if (this.angle !== 0) {
      ctx.rotate(this.angle);
    }
    ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const pulse = 1 + Math.sin(this.time * 12) * 0.15;
    const r = (this.width / 2) * pulse;

    ctx.shadowColor = "#9b59b6";
    ctx.shadowBlur = 4 + Math.sin(this.time * 10) * 4;

    const grad = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, r
    );
    grad.addColorStop(0, "#c77dff");
    grad.addColorStop(1, "#7b2ff7");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.3 + Math.sin(this.time * 8) * 0.15;
    ctx.strokeStyle = "#c77dff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
