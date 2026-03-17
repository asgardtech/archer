import { BeamLike } from "../types";

export type EnemyChargeBeamPhase = "idle" | "warmup" | "active" | "cooldown";

export interface EnemyChargeBeamConfig {
  warmupDuration: number;
  activeDuration: number;
  cooldownDuration: number;
  beamWidth: number;
  trackingSpeed: number;
  damage: number;
}

export class EnemyChargeBeam implements BeamLike {
  phase: EnemyChargeBeamPhase = "idle";
  beamX = 0;
  originX = 0;
  originY = 0;
  beamWidth: number;
  damage: number;

  private phaseTimer = 0;
  private config: EnemyChargeBeamConfig;
  private time = 0;
  private targetX = 0;
  private justActivated = false;

  constructor(config: EnemyChargeBeamConfig) {
    this.config = config;
    this.beamWidth = config.beamWidth;
    this.damage = config.damage;
  }

  activate(enemyX: number, enemyBottomY: number, targetX: number): void {
    if (this.phase !== "idle") return;
    this.phase = "warmup";
    this.phaseTimer = this.config.warmupDuration;
    this.beamX = enemyX;
    this.originX = enemyX;
    this.originY = enemyBottomY;
    this.targetX = targetX;
    this.time = 0;
    this.justActivated = false;
  }

  update(dt: number, enemyX: number, enemyBottomY: number, playerX: number): void {
    this.justActivated = false;

    if (this.phase === "idle") return;

    this.time += dt;
    this.originX = enemyX;
    this.originY = enemyBottomY;
    this.phaseTimer -= dt;

    if (this.phase === "warmup") {
      this.beamX = enemyX;
      if (this.phaseTimer <= 0) {
        this.phase = "active";
        this.phaseTimer = this.config.activeDuration;
        this.justActivated = true;
      }
      return;
    }

    if (this.phase === "active") {
      this.targetX = playerX;
      const dx = this.targetX - this.beamX;
      const maxMove = this.config.trackingSpeed * dt;
      if (Math.abs(dx) <= maxMove) {
        this.beamX = this.targetX;
      } else {
        this.beamX += Math.sign(dx) * maxMove;
      }

      if (this.phaseTimer <= 0) {
        this.phase = "cooldown";
        this.phaseTimer = this.config.cooldownDuration;
      }
      return;
    }

    if (this.phase === "cooldown") {
      if (this.phaseTimer <= 0) {
        this.phase = "idle";
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    if (this.phase === "warmup") {
      this.renderCharging(ctx);
    } else if (this.phase === "active") {
      this.renderBeam(ctx, canvasHeight);
    }
  }

  private renderCharging(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const progress = 1 - (this.phaseTimer / this.config.warmupDuration);
    const pulse = 0.3 + Math.sin(this.time * 15) * 0.2;
    const radius = 6 + progress * 10;

    ctx.fillStyle = `rgba(100, 180, 255, ${pulse + progress * 0.3})`;
    ctx.shadowColor = "#66bbff";
    ctx.shadowBlur = 10 + progress * 15;
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(200, 230, 255, ${0.5 + progress * 0.4})`;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderBeam(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    const halfWidth = this.beamWidth / 2;
    ctx.save();

    const pulse = 0.7 + Math.sin(this.time * 25) * 0.15;

    this.fillTrapezoid(ctx, this.originX, this.originY, this.beamX, canvasHeight, halfWidth * 3);
    ctx.fillStyle = `rgba(80, 160, 255, ${0.2 * pulse})`;
    ctx.fill();

    this.fillTrapezoid(ctx, this.originX, this.originY, this.beamX, canvasHeight, halfWidth);
    ctx.fillStyle = `rgba(100, 180, 255, ${0.6 * pulse})`;
    ctx.fill();

    const coreWidth = halfWidth * 0.5;
    this.fillTrapezoid(ctx, this.originX, this.originY, this.beamX, canvasHeight, coreWidth);
    ctx.fillStyle = `rgba(200, 230, 255, ${0.9 * pulse})`;
    ctx.fill();

    ctx.restore();
  }

  private fillTrapezoid(
    ctx: CanvasRenderingContext2D,
    topX: number, topY: number,
    bottomX: number, bottomY: number,
    halfWidth: number,
  ): void {
    const dx = bottomX - topX;
    const dy = bottomY - topY;
    const len = Math.sqrt(dx * dx + dy * dy);

    let perpX: number;
    let perpY: number;

    if (len < 0.001) {
      perpX = 1;
      perpY = 0;
    } else {
      perpX = -dy / len;
      perpY = dx / len;
    }

    const offsetX = perpX * halfWidth;
    const offsetY = perpY * halfWidth;

    ctx.beginPath();
    ctx.moveTo(topX - offsetX, topY - offsetY);
    ctx.lineTo(topX + offsetX, topY + offsetY);
    ctx.lineTo(bottomX + offsetX, bottomY + offsetY);
    ctx.lineTo(bottomX - offsetX, bottomY - offsetY);
    ctx.closePath();
  }

  get isActive(): boolean {
    return this.phase === "active";
  }

  get isFiring(): boolean {
    return this.phase === "warmup" || this.phase === "active";
  }

  get canFire(): boolean {
    return this.phase === "idle";
  }

  get didJustActivate(): boolean {
    return this.justActivated;
  }

  reset(): void {
    this.phase = "idle";
    this.phaseTimer = 0;
    this.time = 0;
    this.beamX = 0;
    this.originX = 0;
    this.originY = 0;
    this.justActivated = false;
  }
}
