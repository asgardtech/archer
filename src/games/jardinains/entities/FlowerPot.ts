import { Vec2, FlowerPotEntity } from "../types";

const POT_SPEED = 180;

export class FlowerPot {
  public pos: Vec2;
  public vel: Vec2;
  public alive = true;
  public width = 12;
  public height = 14;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.vel = { x: 0, y: POT_SPEED };
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasHeight: number): void {
    if (!this.alive) return;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y > canvasHeight + 20) {
      this.alive = false;
    }
  }

  getEntity(): FlowerPotEntity {
    return {
      pos: { ...this.pos },
      vel: { ...this.vel },
      alive: this.alive,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.pos.x;
    const y = this.pos.y;

    // Terracotta pot (trapezoid)
    ctx.fillStyle = "#D2691E";
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 4);
    ctx.lineTo(x + 5, y - 4);
    ctx.lineTo(x + 7, y + 6);
    ctx.lineTo(x - 7, y + 6);
    ctx.closePath();
    ctx.fill();

    // Pot rim
    ctx.fillStyle = "#A0522D";
    ctx.fillRect(x - 6, y - 6, 12, 3);

    // Plant poking out
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#66BB6A";
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 10, 2, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 10, 2, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
