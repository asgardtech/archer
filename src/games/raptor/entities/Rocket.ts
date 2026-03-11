import { Vec2, Projectile } from "../types";

const ROCKET_SPEED = 450;

export class Rocket implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 10;
  public height = 18;
  public damage = 5;
  public piercing = false;

  private angle: number;
  private vx: number;
  private vy: number;
  private sprite: HTMLImageElement | null = null;
  private time = 0;

  constructor(x: number, y: number, angle = 0) {
    this.pos = { x, y };
    this.angle = angle;
    this.vx = Math.sin(angle) * ROCKET_SPEED;
    this.vy = -Math.cos(angle) * ROCKET_SPEED;
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasWidth = 800, canvasHeight = 600): void {
    if (!this.alive) return;
    this.time += dt;

    this.pos.x += this.vx * dt;
    this.pos.y += this.vy * dt;

    if (
      this.pos.y < -30 || this.pos.x < -30 ||
      this.pos.x > canvasWidth + 30 || this.pos.y > canvasHeight + 30
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
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    // Dark olive/green rocket body
    ctx.fillStyle = "#3d5c2e";
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 3);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 3);
    ctx.closePath();
    ctx.fill();

    // Orange nose tip
    ctx.fillStyle = "#ffaa33";
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 3, -this.height / 6);
    ctx.lineTo(this.width / 3, -this.height / 6);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = "#2e4a20";
    ctx.fillRect(-this.width / 2 - 2, this.height / 4, 4, this.height / 4);
    ctx.fillRect(this.width / 2 - 2, this.height / 4, 4, this.height / 4);

    // Flickering exhaust flame
    ctx.fillStyle = "#ff4400";
    ctx.shadowColor = "#ff4400";
    ctx.shadowBlur = 8;
    const flicker = 4 + Math.sin(this.time * 30) * 3;
    ctx.beginPath();
    ctx.moveTo(-this.width / 3, this.height / 2);
    ctx.lineTo(0, this.height / 2 + flicker);
    ctx.lineTo(this.width / 3, this.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
