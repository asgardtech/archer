export type EnemyLaserPhase = "idle" | "warmup" | "active" | "cooldown";

export interface EnemyLaserBeamConfig {
  warmupDuration: number;
  activeDuration: number;
  cooldownDuration: number;
  beamWidth: number;
  trackingSpeed: number;
  damage: number;
}

export class EnemyLaserBeam {
  phase: EnemyLaserPhase = "idle";
  beamX = 0;
  originX = 0;
  originY = 0;
  beamWidth: number;
  damage: number;

  private phaseTimer = 0;
  private config: EnemyLaserBeamConfig;
  private time = 0;
  private targetX = 0;
  private justActivated = false;

  constructor(config: EnemyLaserBeamConfig) {
    this.config = config;
    this.beamWidth = config.beamWidth;
    this.damage = config.damage;
  }

  activate(enemyX: number, enemyBottomY: number, playerX: number): void {
    if (this.phase !== "idle") return;
    this.phase = "warmup";
    this.phaseTimer = this.config.warmupDuration;
    this.beamX = enemyX;
    this.originX = enemyX;
    this.originY = enemyBottomY;
    this.targetX = playerX;
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
      this.renderWarning(ctx, canvasHeight);
    } else if (this.phase === "active") {
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
    ctx.beginPath();
    ctx.moveTo(topX - halfWidth, topY);
    ctx.lineTo(topX + halfWidth, topY);
    ctx.lineTo(bottomX + halfWidth, bottomY);
    ctx.lineTo(bottomX - halfWidth, bottomY);
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
