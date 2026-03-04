import { Vec2 } from "../types";

const MIN_VY = 60;

export class Ball {
  public pos: Vec2;
  public vel: Vec2;
  public radius = 6;
  public alive = true;
  public stuck = true;
  public stuckOffset = 0;

  private trail: Vec2[] = [];
  private readonly maxTrail = 6;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
  }

  launch(speed: number): void {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.vel = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
    this.stuck = false;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): { lost: boolean } {
    if (this.stuck || !this.alive) return { lost: false };

    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    if (this.pos.x - this.radius <= 0) {
      this.pos.x = this.radius;
      this.vel.x = Math.abs(this.vel.x);
    }
    if (this.pos.x + this.radius >= canvasWidth) {
      this.pos.x = canvasWidth - this.radius;
      this.vel.x = -Math.abs(this.vel.x);
    }
    if (this.pos.y - this.radius <= 0) {
      this.pos.y = this.radius;
      this.vel.y = Math.abs(this.vel.y);
    }

    if (this.pos.y - this.radius > canvasHeight) {
      this.alive = false;
      return { lost: true };
    }

    return { lost: false };
  }

  ensureMinVerticalSpeed(): void {
    if (Math.abs(this.vel.y) < MIN_VY) {
      this.vel.y = this.vel.y >= 0 ? MIN_VY : -MIN_VY;
    }
  }

  getSpeed(): number {
    return Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
  }

  setSpeed(speed: number): void {
    const currentSpeed = this.getSpeed();
    if (currentSpeed === 0) return;
    const scale = speed / currentSpeed;
    this.vel.x *= scale;
    this.vel.y *= scale;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i + 1) / (this.trail.length + 1) * 0.3;
      const r = this.radius * (i + 1) / (this.trail.length + 1);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(this.pos.x - 2, this.pos.y - 2, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
