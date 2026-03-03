import { Vec2 } from "../types";

const COLORS = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db", "#e91e90", "#ff8c00"];

export class Balloon {
  public pos: Vec2;
  public vel: Vec2;
  public radius: number;
  public color: string;
  public alive = true;

  private wobbleOffset: number;
  private wobbleAmplitude = 30;
  private baseX: number;
  private time = 0;

  constructor(x: number, y: number, speed: number) {
    this.radius = 20 + Math.random() * 15;
    this.pos = { x, y };
    this.vel = { x: 0, y: -speed };
    this.baseX = x;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.wobbleOffset = Math.random() * Math.PI * 2;
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.time += dt;
    this.pos.y += this.vel.y * dt;
    this.pos.x = this.baseX + Math.sin(this.time * 1.5 + this.wobbleOffset) * this.wobbleAmplitude;

    if (this.pos.y + this.radius < 0) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Balloon body (oval)
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 0.8, this.radius, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.ellipse(
      -this.radius * 0.25,
      -this.radius * 0.35,
      this.radius * 0.2,
      this.radius * 0.3,
      -0.4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();

    // Knot at bottom
    ctx.beginPath();
    ctx.moveTo(-3, this.radius);
    ctx.lineTo(0, this.radius + 6);
    ctx.lineTo(3, this.radius);
    ctx.fillStyle = this.color;
    ctx.fill();

    // String
    ctx.beginPath();
    ctx.moveTo(0, this.radius + 6);
    ctx.quadraticCurveTo(5, this.radius + 20, -3, this.radius + 35);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
