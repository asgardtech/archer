import { Vec2, PowerUpType, PowerUpEntity } from "../types";

const FALL_SPEED = 100;

const POWERUP_COLORS: Record<PowerUpType, string> = {
  "wide-paddle": "#2196F3",
  "multi-ball": "#9C27B0",
  "sticky": "#FF9800",
  "extra-life": "#F44336",
  "shield": "#00BCD4",
};

const POWERUP_LABELS: Record<PowerUpType, string> = {
  "wide-paddle": "W",
  "multi-ball": "M",
  "sticky": "S",
  "extra-life": "\u2665",
  "shield": "D",
};

export class PowerUp {
  public pos: Vec2;
  public vel: Vec2;
  public type: PowerUpType;
  public alive = true;
  public radius = 10;
  public animTimer = 0;

  constructor(x: number, y: number, type: PowerUpType) {
    this.pos = { x, y };
    this.vel = { x: 0, y: FALL_SPEED };
    this.type = type;
  }

  get left(): number { return this.pos.x - this.radius; }
  get right(): number { return this.pos.x + this.radius; }
  get top(): number { return this.pos.y - this.radius; }
  get bottom(): number { return this.pos.y + this.radius; }

  update(dt: number, canvasHeight: number): void {
    if (!this.alive) return;
    this.animTimer += dt;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y > canvasHeight + 20) {
      this.alive = false;
    }
  }

  getEntity(): PowerUpEntity {
    return {
      pos: { ...this.pos },
      vel: { ...this.vel },
      type: this.type,
      alive: this.alive,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.pos.x;
    const y = this.pos.y;
    const pulse = 1 + Math.sin(this.animTimer * 5) * 0.15;
    const r = this.radius * pulse;

    ctx.save();

    // Glow
    ctx.fillStyle = POWERUP_COLORS[this.type] + "44";
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();

    // Capsule
    ctx.fillStyle = POWERUP_COLORS[this.type];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POWERUP_LABELS[this.type], x, y + 1);

    ctx.restore();
  }
}
