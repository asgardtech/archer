import { Vec2, BalloonVariant, UpgradeType } from "../types";

const COLORS = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db", "#e91e90", "#ff8c00"];

const UPGRADE_ICONS: Record<UpgradeType, string> = {
  "multi-shot": "⫸",
  "piercing": "➤",
  "rapid-fire": "⚡",
  "bonus-arrows": "+10",
};

export class Balloon {
  public pos: Vec2;
  public vel: Vec2;
  public radius: number;
  public color: string;
  public alive = true;
  public variant: BalloonVariant = "standard";
  public upgradeType?: UpgradeType;

  private wobbleOffset: number;
  private wobbleAmplitude = 30;
  private baseX: number;
  private time = 0;

  constructor(x: number, y: number, speed: number, upgrade?: UpgradeType) {
    this.radius = 20 + Math.random() * 15;
    this.pos = { x, y };
    this.vel = { x: 0, y: -speed };
    this.baseX = x;
    this.wobbleOffset = Math.random() * Math.PI * 2;

    if (upgrade) {
      this.variant = "upgrade";
      this.upgradeType = upgrade;
      this.color = "#FFD700";
      this.radius *= 1.2;
    } else {
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
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

    if (this.variant === "upgrade") {
      this.renderUpgradeBalloon(ctx);
    } else {
      this.renderStandardBalloon(ctx);
    }

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

  private renderStandardBalloon(ctx: CanvasRenderingContext2D): void {
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
  }

  private renderUpgradeBalloon(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + Math.sin(this.time * 4) * 0.05;
    const r = this.radius * pulse;

    // Glow behind
    const glowAlpha = 0.25 + Math.sin(this.time * 3) * 0.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 1.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha})`;
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.ellipse(
      -r * 0.25,
      -r * 0.35,
      r * 0.2,
      r * 0.3,
      -0.4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();

    // Icon
    if (this.upgradeType) {
      ctx.fillStyle = "#333";
      ctx.font = `bold ${r * 0.55}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(UPGRADE_ICONS[this.upgradeType], 0, 0);
    }
  }
}
