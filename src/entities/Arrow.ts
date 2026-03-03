import { Vec2 } from "../types";

const ARROW_SPEED = 600;
const ARROW_LENGTH = 40;

export class Arrow {
  public pos: Vec2;
  public vel: Vec2;
  public angle: number;
  public alive = true;

  constructor(origin: Vec2, angle: number) {
    this.pos = { x: origin.x, y: origin.y };
    this.angle = angle;
    this.vel = {
      x: Math.cos(angle) * ARROW_SPEED,
      y: Math.sin(angle) * ARROW_SPEED,
    };
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    if (!this.alive) return;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    const margin = ARROW_LENGTH;
    if (
      this.pos.x < -margin ||
      this.pos.x > canvasW + margin ||
      this.pos.y < -margin ||
      this.pos.y > canvasH + margin
    ) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    // Shaft
    ctx.beginPath();
    ctx.moveTo(-ARROW_LENGTH, 0);
    ctx.lineTo(0, 0);
    ctx.strokeStyle = "#8B5E3C";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fillStyle = "#333";
    ctx.fill();

    // Fletching
    ctx.beginPath();
    ctx.moveTo(-ARROW_LENGTH, 0);
    ctx.lineTo(-ARROW_LENGTH + 8, -4);
    ctx.lineTo(-ARROW_LENGTH + 5, 0);
    ctx.lineTo(-ARROW_LENGTH + 8, 4);
    ctx.closePath();
    ctx.fillStyle = "#c0392b";
    ctx.fill();

    ctx.restore();
  }
}
