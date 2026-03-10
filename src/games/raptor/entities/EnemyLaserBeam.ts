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
    this.originY = enemyBottomY;
    this.targetX = playerX;
    this.time = 0;
    this.justActivated = false;
  }

  update(dt: number, enemyX: number, enemyBottomY: number, playerX: number): void {
    this.justActivated = false;

    if (this.phase === "idle") return;

    this.time += dt;
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
    ctx.moveTo(this.beamX, this.originY);
    ctx.lineTo(this.beamX, canvasHeight);
    ctx.stroke();
    ctx.restore();
  }

  private renderBeam(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    const halfWidth = this.beamWidth / 2;
    const beamTop = this.originY;
    const beamHeight = canvasHeight - beamTop;

    ctx.save();

    const pulse = 0.6 + Math.sin(this.time * 20) * 0.15;

    const outerGlow = ctx.createLinearGradient(
      this.beamX - halfWidth * 4, 0, this.beamX + halfWidth * 4, 0
    );
    outerGlow.addColorStop(0, "rgba(255, 80, 0, 0)");
    outerGlow.addColorStop(0.3, `rgba(255, 80, 0, ${0.15 * pulse})`);
    outerGlow.addColorStop(0.5, `rgba(255, 120, 20, ${0.3 * pulse})`);
    outerGlow.addColorStop(0.7, `rgba(255, 80, 0, ${0.15 * pulse})`);
    outerGlow.addColorStop(1, "rgba(255, 80, 0, 0)");
    ctx.fillStyle = outerGlow;
    ctx.fillRect(this.beamX - halfWidth * 4, beamTop, halfWidth * 8, beamHeight);

    ctx.fillStyle = `rgba(255, 120, 20, ${0.5 * pulse})`;
    ctx.fillRect(this.beamX - halfWidth, beamTop, this.beamWidth, beamHeight);

    const coreWidth = halfWidth * 0.5;
    ctx.fillStyle = `rgba(255, 220, 150, ${0.8 * pulse})`;
    ctx.fillRect(this.beamX - coreWidth, beamTop, coreWidth * 2, beamHeight);

    ctx.restore();
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
    this.originY = 0;
    this.justActivated = false;
  }
}
