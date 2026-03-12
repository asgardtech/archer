import { LandmarkConfig, LandmarkType, GROUND_HEIGHT } from "../types";

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const LANDMARK_BOUNDS: Record<LandmarkType, { width: number; height: number; offsetY: number }> = {
  windmill:   { width: 70, height: 90, offsetY: -45 },
  treehouse:  { width: 60, height: 90, offsetY: -45 },
  watchtower: { width: 40, height: 90, offsetY: -45 },
  lighthouse: { width: 30, height: 85, offsetY: -40 },
  castle:     { width: 70, height: 75, offsetY: -37 },
};

const SPARKLE_COLORS = [
  "rgba(255, 215, 0, 1)",
  "rgba(255, 255, 255, 1)",
  "rgba(255, 245, 100, 1)",
  "rgba(255, 200, 50, 1)",
];

type LandmarkVisualState = "siege" | "liberated";

export class Landmark {
  private type: LandmarkType;
  private x: number;
  private groundY: number;

  private bladeAngle = 0;
  private beamPhase = 0;
  private flagPhase = 0;
  private swayPhase = 0;

  private state: LandmarkVisualState = "siege";
  private siegeProgress = 0;
  private shakeTimer = 0;
  private liberationTimer = 0;
  private sparkles: Sparkle[] = [];

  constructor(config: LandmarkConfig, canvasWidth: number, canvasHeight: number) {
    this.type = config.type;
    this.x = Math.max(0, Math.min(1, config.positionX)) * canvasWidth;
    this.groundY = canvasHeight - GROUND_HEIGHT;
  }

  setSiegeProgress(progress: number): void {
    if (this.state === "liberated") return;
    this.siegeProgress = Math.max(0, Math.min(1, progress));
  }

  liberate(): void {
    this.state = "liberated";
    this.siegeProgress = 1;
    this.liberationTimer = 1.5;
    this.spawnSparkles(25);
  }

  update(dt: number): void {
    this.bladeAngle += dt * 1.5;
    this.beamPhase += dt * 2.0;
    this.flagPhase += dt * 3.0;
    this.swayPhase += dt * 1.2;
    this.shakeTimer += dt;

    if (this.state === "liberated" && this.liberationTimer > 0) {
      this.liberationTimer -= dt;
      for (const s of this.sparkles) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
      }
      this.sparkles = this.sparkles.filter((s) => s.life > 0);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.groundY);

    if (this.state === "siege") {
      const siegeIntensity = 1 - this.siegeProgress;
      const shakeX = Math.sin(this.shakeTimer * 15) * 1.5 * siegeIntensity;
      const shakeY = Math.cos(this.shakeTimer * 12) * 1.0 * siegeIntensity;
      ctx.translate(shakeX, shakeY);
    }

    switch (this.type) {
      case "windmill":
        this.renderWindmill(ctx);
        break;
      case "treehouse":
        this.renderTreehouse(ctx);
        break;
      case "watchtower":
        this.renderWatchtower(ctx);
        break;
      case "lighthouse":
        this.renderLighthouse(ctx);
        break;
      case "castle":
        this.renderCastle(ctx);
        break;
      default: {
        const _exhaustive: never = this.type;
        void _exhaustive;
      }
    }

    if (this.state === "siege") {
      this.renderSiegeBalloons(ctx);

      if (this.siegeProgress < 1) {
        const bounds = LANDMARK_BOUNDS[this.type];
        const overlayAlpha = 0.45 * (1 - this.siegeProgress);
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
        ctx.fillRect(
          -bounds.width / 2,
          bounds.offsetY - bounds.height / 2,
          bounds.width,
          bounds.height
        );
      }
    }

    if (this.state === "liberated" && this.liberationTimer > 0) {
      this.renderLiberationEffect(ctx);
    }

    ctx.restore();
  }

  private renderSiegeBalloons(ctx: CanvasRenderingContext2D): void {
    const intensity = 1 - this.siegeProgress;
    const count = Math.ceil(intensity * 5);
    if (count <= 0) return;

    const bounds = LANDMARK_BOUNDS[this.type];
    const positions = [
      { x: -bounds.width / 2 - 8, y: bounds.offsetY - bounds.height * 0.3 },
      { x: bounds.width / 2 + 8,  y: bounds.offsetY - bounds.height * 0.5 },
      { x: -bounds.width / 2 + 5, y: bounds.offsetY - bounds.height * 0.7 },
      { x: bounds.width / 2 - 5,  y: bounds.offsetY - bounds.height * 0.1 },
      { x: 0,                     y: bounds.offsetY - bounds.height * 0.8 },
    ];

    ctx.fillStyle = "rgba(100, 20, 20, 0.5)";
    ctx.strokeStyle = "rgba(60, 10, 10, 0.4)";
    ctx.lineWidth = 0.5;

    for (let i = 0; i < count && i < positions.length; i++) {
      const p = positions[i];
      const bobOffset = Math.sin(this.shakeTimer * 2 + i * 1.3) * 2;

      ctx.beginPath();
      ctx.ellipse(p.x, p.y + bobOffset, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(p.x, p.y + bobOffset + 5);
      ctx.lineTo(p.x + (i % 2 === 0 ? 3 : -3), p.y + bobOffset + 14);
      ctx.stroke();
    }
  }

  private renderLiberationEffect(ctx: CanvasRenderingContext2D): void {
    const burstAlpha = Math.max(0, (this.liberationTimer - 1.0) / 0.5);
    if (burstAlpha > 0) {
      const bounds = LANDMARK_BOUNDS[this.type];
      const gradient = ctx.createRadialGradient(
        0, bounds.offsetY, 0,
        0, bounds.offsetY, bounds.width
      );
      gradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * burstAlpha})`);
      gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(
        -bounds.width,
        bounds.offsetY - bounds.height / 2,
        bounds.width * 2,
        bounds.height
      );
    }

    for (const s of this.sparkles) {
      const alpha = s.life / s.maxLife;
      ctx.fillStyle = s.color.replace("1)", `${alpha})`);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private spawnSparkles(count: number): void {
    const bounds = LANDMARK_BOUNDS[this.type];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const life = 0.8 + Math.random() * 0.7;
      this.sparkles.push({
        x: (Math.random() - 0.5) * bounds.width,
        y: bounds.offsetY + (Math.random() - 0.5) * bounds.height * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life,
        maxLife: life,
        size: 1.5 + Math.random() * 2.5,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
      });
    }
  }

  private renderWindmill(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#8B8682";
    ctx.strokeStyle = "#6B6462";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-10, -50);
    ctx.lineTo(10, -50);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#5C4033";
    ctx.beginPath();
    ctx.moveTo(-12, -50);
    ctx.lineTo(0, -60);
    ctx.lineTo(12, -50);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2C2C2C";
    ctx.beginPath();
    ctx.arc(0, 0, 5, Math.PI, 0, false);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();

    const hubX = 0;
    const hubY = -50;
    ctx.save();
    ctx.translate(hubX, hubY);
    ctx.rotate(this.bladeAngle);

    ctx.fillStyle = "#DEB887";
    ctx.strokeStyle = "#A0826D";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-1, -30);
      ctx.lineTo(2, -30);
      ctx.lineTo(2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    ctx.fillStyle = "#654321";
    ctx.beginPath();
    ctx.arc(hubX, hubY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderTreehouse(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#5C4033";
    ctx.fillRect(-5, -60, 10, 60);

    ctx.strokeStyle = "#5C4033";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-12, 5);
    ctx.moveTo(5, 0);
    ctx.lineTo(12, 5);
    ctx.stroke();

    ctx.fillStyle = "#8B5E3C";
    ctx.fillRect(-18, -42, 36, 4);

    ctx.fillStyle = "#C4A35A";
    ctx.fillRect(-10, -55, 20, 13);

    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(-12, -55);
    ctx.lineTo(0, -63);
    ctx.lineTo(12, -55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#F0C040";
    ctx.fillRect(-3, -52, 6, 5);

    const swayOffset = Math.sin(this.swayPhase) * 2;
    ctx.fillStyle = "#2D5A27";
    ctx.beginPath();
    ctx.arc(swayOffset, -65, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3A7D32";
    ctx.beginPath();
    ctx.arc(swayOffset + 8, -70, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2D5A27";
    ctx.beginPath();
    ctx.arc(swayOffset - 10, -62, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderWatchtower(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#6B6462";
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-14, -20);
    ctx.lineTo(14, -20);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8B8682";
    ctx.fillRect(-9, -65, 18, 45);

    ctx.strokeStyle = "#7B7872";
    ctx.lineWidth = 0.5;
    for (let row = -25; row > -65; row -= 8) {
      ctx.beginPath();
      ctx.moveTo(-9, row);
      ctx.lineTo(9, row);
      ctx.stroke();
    }

    ctx.fillStyle = "#8B8682";
    const crenW = 5;
    const crenH = 5;
    for (let cx = -9; cx < 9; cx += crenW * 2) {
      ctx.fillRect(cx, -70, crenW, crenH);
    }

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(0, -85);
    ctx.stroke();

    const flagTipOffset = Math.sin(this.flagPhase) * 4;
    ctx.fillStyle = "#C41E3A";
    ctx.beginPath();
    ctx.moveTo(0, -85);
    ctx.lineTo(12 + flagTipOffset, -82);
    ctx.lineTo(0, -78);
    ctx.closePath();
    ctx.fill();
  }

  private renderLighthouse(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#7F8C8D";
    ctx.fillRect(-12, -8, 24, 8);

    const towerTopW = 8;
    const towerBotW = 11;
    const towerH = 60;
    const bands = 4;
    const bandH = towerH / bands;

    for (let i = 0; i < bands; i++) {
      const t0 = i / bands;
      const t1 = (i + 1) / bands;
      const w0 = towerBotW + (towerTopW - towerBotW) * t0;
      const w1 = towerBotW + (towerTopW - towerBotW) * t1;
      const y0 = -8 - bandH * i;
      const y1 = -8 - bandH * (i + 1);

      ctx.fillStyle = i % 2 === 0 ? "#C0392B" : "#ECEDED";
      ctx.beginPath();
      ctx.moveTo(-w0, y0);
      ctx.lineTo(-w1, y1);
      ctx.lineTo(w1, y1);
      ctx.lineTo(w0, y0);
      ctx.closePath();
      ctx.fill();
    }

    const lampY = -68;
    ctx.fillStyle = "#333";
    ctx.fillRect(-towerTopW - 1, lampY - 6, (towerTopW + 1) * 2, 6);

    ctx.fillStyle = "#F0E68C";
    ctx.beginPath();
    ctx.arc(0, lampY - 6, towerTopW, Math.PI, 0, false);
    ctx.fill();

    const beamOpacity = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(this.beamPhase));
    ctx.fillStyle = `rgba(255, 255, 200, ${beamOpacity})`;
    ctx.beginPath();
    ctx.moveTo(0, lampY - 6);
    ctx.lineTo(60, lampY - 40);
    ctx.lineTo(60, lampY + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 200, ${beamOpacity * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(0, lampY - 6);
    ctx.lineTo(-50, lampY - 35);
    ctx.lineTo(-50, lampY + 5);
    ctx.closePath();
    ctx.fill();
  }

  private renderCastle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#8B8682";
    ctx.fillRect(-25, -40, 50, 40);

    ctx.fillStyle = "#7B7872";
    ctx.fillRect(-30, -55, 12, 55);

    ctx.fillRect(18, -55, 12, 55);

    const crenW = 4;
    const crenH = 5;
    for (let cx = -30; cx < -18; cx += crenW * 2) {
      ctx.fillRect(cx, -60, crenW, crenH);
    }
    for (let cx = 18; cx < 30; cx += crenW * 2) {
      ctx.fillRect(cx, -60, crenW, crenH);
    }

    for (let cx = -25; cx < 25; cx += crenW * 2) {
      ctx.fillRect(cx, -45, crenW, crenH);
    }

    ctx.fillStyle = "#2C2C2C";
    ctx.beginPath();
    ctx.arc(0, 0, 8, Math.PI, 0, false);
    ctx.lineTo(8, 0);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 0.8;
    for (let px = -6; px <= 6; px += 3) {
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, -Math.sqrt(64 - px * px));
      ctx.stroke();
    }

    ctx.fillStyle = "#F0C040";
    ctx.fillRect(-8, -32, 5, 5);
    ctx.fillRect(3, -32, 5, 5);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, -55);
    ctx.lineTo(24, -72);
    ctx.stroke();

    const flagTipOffset = Math.sin(this.flagPhase) * 3;
    ctx.fillStyle = "#4169E1";
    ctx.beginPath();
    ctx.moveTo(24, -72);
    ctx.lineTo(34 + flagTipOffset, -69);
    ctx.lineTo(24, -65);
    ctx.closePath();
    ctx.fill();
  }
}
