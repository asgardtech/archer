import { Vec2, Projectile } from "../types";

const ION_SPEED = 600;

export class IonBolt implements Projectile {
  public pos: Vec2;
  public alive = true;
  public damage: number;
  public piercing = true;
  public width: number;
  public height: number;
  public chargeLevel: number;

  private angle: number;
  private sprite: HTMLImageElement | null = null;
  private time = 0;

  constructor(x: number, y: number, chargeLevel: number, angle = 0) {
    this.pos = { x, y };
    this.chargeLevel = Math.max(0, Math.min(1, chargeLevel));
    this.angle = angle;
    this.damage = 2 + this.chargeLevel * 3;
    this.width = 6 + this.chargeLevel * 6;
    this.height = 10 + this.chargeLevel * 6;
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
    this.pos.x += Math.sin(this.angle) * ION_SPEED * dt;
    this.pos.y -= Math.cos(this.angle) * ION_SPEED * dt;

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

    const intensity = 0.6 + this.chargeLevel * 0.4;
    const glowRadius = (this.width / 2 + 4) * intensity;

    ctx.shadowColor = "#00bcd4";
    ctx.shadowBlur = 6 + this.chargeLevel * 6;

    const grad = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, this.width / 2
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, "#b2ebf2");
    grad.addColorStop(1, "#00bcd4");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(this.pos.x, this.pos.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.3 + Math.sin(this.time * 15) * 0.15;
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(this.pos.x, this.pos.y, glowRadius, glowRadius * 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.5 + Math.sin(this.time * 20) * 0.2;
    ctx.strokeStyle = "#80deea";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const seed = this.time * 12 + i * 2.1;
      const cx = this.pos.x + Math.sin(seed) * this.width * 0.4;
      const cy = this.pos.y + Math.cos(seed * 1.3) * this.height * 0.4;
      const ex = this.pos.x + Math.sin(seed + 1.5) * this.width * 0.6;
      const ey = this.pos.y + Math.cos(seed * 1.3 + 1.5) * this.height * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    ctx.restore();
  }
}
