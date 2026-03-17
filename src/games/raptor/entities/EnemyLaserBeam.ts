import { TurretMount, TurretMountConfig } from "./TurretMount";

export type EnemyLaserPhase = "idle" | "warmup" | "active" | "cooldown";

export interface EnemyLaserBeamConfig {
  warmupDuration: number;
  activeDuration: number;
  cooldownDuration: number;
  beamWidth: number;
  trackingSpeed: number;
  damage: number;
  turret?: TurretMountConfig;
}

const DEFAULT_ENEMY_TURRET: TurretMountConfig = {
  offsetX: 0,
  offsetY: 0,
  barrelLength: 8,
  baseRadius: 4,
  color: "rgba(255, 120, 20, 0.8)",
  barrelColor: "rgba(255, 180, 80, 0.9)",
};

export class EnemyLaserBeam {
  phase: EnemyLaserPhase = "idle";
  beamX = 0;
  originX = 0;
  originY = 0;
  beamWidth: number;
  damage: number;
  fixedTarget = false;
  public turret: TurretMount;

  private phaseTimer = 0;
  private config: EnemyLaserBeamConfig;
  private time = 0;
  private targetX = 0;
  private justActivated = false;

  constructor(config: EnemyLaserBeamConfig) {
    this.config = config;
    this.beamWidth = config.beamWidth;
    this.damage = config.damage;
    this.turret = new TurretMount(config.turret ?? DEFAULT_ENEMY_TURRET);
  }

  activate(enemyX: number, enemyBottomY: number, targetX: number, fixedTarget = false): void {
    if (this.phase !== "idle") return;
    this.phase = "warmup";
    this.phaseTimer = this.config.warmupDuration;
    this.beamX = enemyX;
    this.originX = enemyX;
    this.originY = enemyBottomY;
    this.targetX = targetX;
    this.fixedTarget = fixedTarget;
    this.time = 0;
    this.justActivated = false;
  }

  update(dt: number, enemyX: number, enemyBottomY: number, playerX: number): void {
    this.justActivated = false;

    if (this.phase === "idle") return;

    this.time += dt;
    if (!this.fixedTarget) {
      this.originX = enemyX;
    }
    this.originY = enemyBottomY;
    this.phaseTimer -= dt;

    if (this.phase === "warmup") {
      if (!this.fixedTarget) {
        this.beamX = enemyX;
      }
      if (this.phaseTimer <= 0) {
        this.phase = "active";
        this.phaseTimer = this.config.activeDuration;
        this.justActivated = true;
      }
      return;
    }

    if (this.phase === "active") {
      if (!this.fixedTarget) {
        this.targetX = playerX;
      }
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

  private updateTurretAngle(canvasHeight: number): void {
    const dx = this.beamX - this.originX;
    const dy = canvasHeight - this.originY;
    this.turret.angle = Math.atan2(dy, dx);
  }

  render(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    if (this.phase === "warmup") {
      this.updateTurretAngle(canvasHeight);
      const progress = 1 - (this.phaseTimer / this.config.warmupDuration);
      this.turret.render(ctx, this.originX, this.originY, 0.3 + progress * 0.7);
      this.renderWarning(ctx, canvasHeight);
    } else if (this.phase === "active") {
      this.updateTurretAngle(canvasHeight);
      this.turret.render(ctx, this.originX, this.originY, 1.0);
      this.renderBeam(ctx, canvasHeight);
    }
  }

  private renderWarning(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    ctx.save();
    const pulse = 0.4 + Math.sin(this.time * 12) * 0.15;
    ctx.strokeStyle = `rgba(255, 204, 0, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.originX, this.originY);
    ctx.lineTo(this.beamX, canvasHeight);
    ctx.stroke();
    ctx.restore();
  }

  private renderBeam(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    const halfWidth = this.beamWidth / 2;

    ctx.save();

    const pulse = 0.6 + Math.sin(this.time * 20) * 0.15;

    this.fillTrapezoid(ctx, this.originX, this.originY, this.beamX, canvasHeight, halfWidth * 4);
    ctx.fillStyle = `rgba(255, 120, 20, ${0.3 * pulse})`;
    ctx.fill();

    this.fillTrapezoid(ctx, this.originX, this.originY, this.beamX, canvasHeight, halfWidth);
    ctx.fillStyle = `rgba(255, 120, 20, ${0.5 * pulse})`;
    ctx.fill();

    const coreWidth = halfWidth * 0.5;
    this.fillTrapezoid(ctx, this.originX, this.originY, this.beamX, canvasHeight, coreWidth);
    ctx.fillStyle = `rgba(255, 220, 150, ${0.8 * pulse})`;
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
    this.fixedTarget = false;
    this.justActivated = false;
  }
}
