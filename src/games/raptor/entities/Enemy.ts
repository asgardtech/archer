import { Vec2, EnemyVariant, EnemyConfig, EnemyWeaponType, ENEMY_CONFIGS } from "../types";

export function isBossVariant(variant: EnemyVariant): boolean {
  return variant === "boss" || variant === "boss_gunship" || variant === "boss_dreadnought" || variant === "boss_fortress";
}

export class Enemy {
  public pos: Vec2;
  public vel: Vec2;
  public variant: EnemyVariant;
  public hitPoints: number;
  public maxHitPoints: number;
  public scoreValue: number;
  public fireRate: number;
  public fireCooldown: number;
  public width: number;
  public height: number;
  public readonly weaponType: EnemyWeaponType;
  public alive = true;

  private flashTimer = 0;
  private time = 0;
  private sprite: HTMLImageElement | null = null;
  private static _flashCanvas: HTMLCanvasElement | null = null;
  private static _flashCtx: CanvasRenderingContext2D | null = null;

  private cloakTimer = 0;
  private cloakVisible = true;
  private readonly CLOAK_VISIBLE_DURATION = 2.0;
  private readonly CLOAK_HIDDEN_DURATION = 1.5;

  private mineTimer = 0;
  private readonly MINE_DROP_INTERVAL = 2.0;
  private minelayerDirection = 0;
  private minelayerInitialized = false;

  private gunshipPhase: "entering" | "pausing" | "strafing" = "entering";
  private gunshipStrafeTarget = 0;
  private gunshipPauseTimer = 0;
  private gunshipStrafeDirection: 1 | -1 = 1;

  private dreadnoughtPhase: "entering" | "drifting" | "locking" = "entering";
  private dreadnoughtDriftTimer = 0;
  private dreadnoughtLockTimer = 0;
  private readonly DREADNOUGHT_DRIFT_DURATION_MIN = 3.0;
  private readonly DREADNOUGHT_DRIFT_DURATION_MAX = 5.0;
  private readonly DREADNOUGHT_LOCK_DURATION = 1.5;

  private fortressPhase: "entering" | "hovering" = "entering";
  public fortressAttackPhase: "A" | "B" = "A";

  private burstRemaining = 0;
  private burstTimer = 0;
  private burstSpreadIndex = 0;
  private readonly BURST_COUNT = 4;
  private readonly BURST_INTERVAL = 0.15;

  constructor(x: number, y: number, variant: EnemyVariant, speed?: number, overrideConfig?: Partial<EnemyConfig>) {
    const config = { ...ENEMY_CONFIGS[variant], ...overrideConfig };
    this.variant = variant;
    this.hitPoints = Math.max(config.hitPoints, isBossVariant(variant) ? 25 : 1);
    this.maxHitPoints = this.hitPoints;
    this.scoreValue = config.scoreValue;
    this.fireRate = config.fireRate;
    this.fireCooldown = Math.random() * (1 / Math.max(this.fireRate, 0.1));
    this.width = config.width;
    this.height = config.height;
    this.weaponType = config.weaponType ?? "standard";

    const actualSpeed = speed ?? config.speed;
    this.pos = { x, y };
    this.vel = { x: 0, y: actualSpeed };
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasHeight: number, targetX?: number, canvasWidth?: number): void {
    if (!this.alive) return;
    this.time += dt;

    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (this.variant === "boss_gunship") {
      const cw = canvasWidth ?? 800;
      const margin = 40;
      const parkY = canvasHeight * 0.18;

      if (this.gunshipPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.gunshipPhase = "pausing";
          this.gunshipPauseTimer = 0.4 + Math.random() * 0.2;
          this.gunshipStrafeDirection = this.pos.x > cw / 2 ? -1 : 1;
        }
      } else if (this.gunshipPhase === "pausing") {
        this.gunshipPauseTimer -= dt;
        if (this.gunshipPauseTimer <= 0) {
          this.gunshipStrafeTarget = this.gunshipStrafeDirection > 0
            ? Math.max(margin, cw - margin)
            : Math.min(margin, cw - margin);
          this.gunshipPhase = "strafing";
        }
      } else if (this.gunshipPhase === "strafing") {
        const strafeSpeed = this.vel.y * 2.5;
        const dx = this.gunshipStrafeTarget - this.pos.x;
        if (Math.abs(dx) <= 5) {
          this.pos.x = this.gunshipStrafeTarget;
          this.gunshipStrafeDirection *= -1;
          this.gunshipPhase = "pausing";
          this.gunshipPauseTimer = 0.4 + Math.random() * 0.2;
        } else {
          const step = Math.sign(dx) * strafeSpeed * dt;
          if (Math.abs(step) > Math.abs(dx)) {
            this.pos.x = this.gunshipStrafeTarget;
          } else {
            this.pos.x += step;
          }
        }
      }

      this.pos.x = Math.max(margin, Math.min(cw - margin, this.pos.x));
    } else if (this.variant === "boss_dreadnought") {
      const dCw = canvasWidth ?? 800;
      const dMargin = 50;
      const parkY = canvasHeight * 0.25;

      if (this.dreadnoughtPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.dreadnoughtPhase = "drifting";
          this.dreadnoughtDriftTimer = this.DREADNOUGHT_DRIFT_DURATION_MIN
            + Math.random() * (this.DREADNOUGHT_DRIFT_DURATION_MAX - this.DREADNOUGHT_DRIFT_DURATION_MIN);
        }
      } else if (this.dreadnoughtPhase === "drifting") {
        this.pos.x += Math.sin(this.time * 0.5) * 35 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.3) * 4;
        this.pos.x = Math.max(dMargin, Math.min(dCw - dMargin, this.pos.x));

        this.dreadnoughtDriftTimer -= dt;
        if (this.dreadnoughtDriftTimer <= 0) {
          this.dreadnoughtPhase = "locking";
          this.dreadnoughtLockTimer = this.DREADNOUGHT_LOCK_DURATION;
        }
      } else if (this.dreadnoughtPhase === "locking") {
        this.pos.x += Math.sin(this.time * 20) * 0.5;
        this.dreadnoughtLockTimer -= dt;
        if (this.dreadnoughtLockTimer <= 0) {
          this.initiateBurst();
          this.dreadnoughtPhase = "drifting";
          this.dreadnoughtDriftTimer = this.DREADNOUGHT_DRIFT_DURATION_MIN
            + Math.random() * (this.DREADNOUGHT_DRIFT_DURATION_MAX - this.DREADNOUGHT_DRIFT_DURATION_MIN);
        }
      }

      if (this.burstRemaining > 0) {
        this.burstTimer -= dt;
      }
    } else if (this.variant === "boss_fortress") {
      const fCw = canvasWidth ?? 800;
      const fMargin = 50;
      const parkY = canvasHeight * 0.12;

      if (this.fortressPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.fortressPhase = "hovering";
        }
      } else {
        this.pos.x += Math.sin(this.time * 0.3) * 8 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.2) * 3;
        this.pos.x = Math.max(fMargin, Math.min(fCw - fMargin, this.pos.x));
      }
    } else if (isBossVariant(this.variant)) {
      this.pos.x += Math.sin(this.time * 1.5) * 60 * dt;
      const bossTargetY = canvasHeight * 0.15;
      if (this.pos.y < bossTargetY) {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y > bossTargetY) this.pos.y = bossTargetY;
      }
    } else if (this.variant === "interceptor") {
      this.pos.x += Math.sin(this.time * 4) * 120 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "drone") {
      this.pos.x += (Math.random() - 0.5) * 40 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "swarmer" && targetX !== undefined) {
      const dx = targetX - this.pos.x;
      this.pos.x += dx * 1.5 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "cruiser") {
      const patrolThreshold = canvasHeight * 0.3;
      if (this.pos.y >= patrolThreshold) {
        this.pos.y += this.vel.y * 0.1 * dt;
        this.pos.x += Math.sin(this.time * 0.8) * 50 * dt;
      } else {
        this.pos.y += this.vel.y * dt;
      }
    } else if (this.variant === "destroyer") {
      const stopY = canvasHeight * 0.25;
      if (this.pos.y < stopY) {
        this.pos.y += this.vel.y * dt;
      } else {
        this.pos.x += Math.sin(this.time * 0.6) * 40 * dt;
        this.pos.y += Math.sin(this.time * 0.3) * 5 * dt;
      }
    } else if (this.variant === "juggernaut") {
      const targetY = canvasHeight * 0.2;
      if (this.pos.y < targetY) {
        this.pos.y += this.vel.y * dt;
      } else {
        this.pos.x += Math.sin(this.time * 1.0) * 70 * dt;
      }
    } else if (this.variant === "stealth") {
      this.pos.x += Math.sin(this.time * 2) * 40 * dt;
      this.pos.y += this.vel.y * dt;

      this.cloakTimer += dt;
      if (this.cloakVisible) {
        if (this.cloakTimer >= this.CLOAK_VISIBLE_DURATION) {
          this.cloakVisible = false;
          this.cloakTimer = 0;
        }
      } else {
        if (this.cloakTimer >= this.CLOAK_HIDDEN_DURATION) {
          this.cloakVisible = true;
          this.cloakTimer = 0;
        }
      }
    } else if (this.variant === "minelayer") {
      if (!this.minelayerInitialized) {
        this.minelayerInitialized = true;
        this.minelayerDirection = Math.random() < 0.5 ? -1 : 1;
        this.vel.x = this.minelayerDirection * Math.abs(this.vel.y);
        this.vel.y = 20;
        if (this.minelayerDirection > 0) {
          this.pos.x = -30;
        } else {
          this.pos.x = 830;
        }
        if (this.pos.y < 0) {
          this.pos.y = 30 + Math.random() * 100;
        }
      }

      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      this.mineTimer += dt;

      if (
        (this.minelayerDirection > 0 && this.pos.x > 850) ||
        (this.minelayerDirection < 0 && this.pos.x < -50)
      ) {
        this.alive = false;
      }
    } else {
      this.pos.y += this.vel.y * dt;
    }

    if (this.fireRate > 0) {
      this.fireCooldown -= dt;
    }

    if (
      !isBossVariant(this.variant) && this.variant !== "destroyer" &&
      this.variant !== "juggernaut" && this.variant !== "minelayer" &&
      this.pos.y > canvasHeight + 50
    ) {
      this.alive = false;
    }
  }

  canFire(): boolean {
    if (this.variant === "stealth" && !this.cloakVisible) return false;
    return this.fireRate > 0 && this.fireCooldown <= 0 && this.alive;
  }

  shouldDropMine(): boolean {
    if (this.variant !== "minelayer") return false;
    if (this.mineTimer >= this.MINE_DROP_INTERVAL) {
      this.mineTimer = 0;
      return true;
    }
    return false;
  }

  resetFireCooldown(multiplier = 1): void {
    this.fireCooldown = (1 / this.fireRate) * multiplier;
  }

  private initiateBurst(): void {
    this.burstRemaining = this.BURST_COUNT;
    this.burstTimer = 0;
    this.burstSpreadIndex = 0;
  }

  public hasPendingBurst(): boolean {
    return this.burstRemaining > 0 && this.burstTimer <= 0;
  }

  public consumeBurstTick(): { offsetX: number; offsetY: number } {
    this.burstRemaining--;
    this.burstTimer = this.BURST_INTERVAL;
    const spreadOffsets = [-24, -8, 8, 24];
    const offsetX = spreadOffsets[this.burstSpreadIndex % spreadOffsets.length];
    this.burstSpreadIndex++;
    return { offsetX, offsetY: this.height * 0.3 };
  }

  public toggleFortressPhase(): void {
    this.fortressAttackPhase = this.fortressAttackPhase === "A" ? "B" : "A";
  }

  hit(damage = 1): boolean {
    if (!this.alive) return false;
    this.hitPoints -= damage;
    this.flashTimer = 0.08;
    if (this.hitPoints <= 0) {
      this.hitPoints = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.pos.x;
    const y = this.pos.y;
    const isFlashing = this.flashTimer > 0;

    ctx.save();

    if (this.sprite) {
      this.renderSpriteVariant(ctx, x, y, isFlashing);
    } else {
      switch (this.variant) {
        case "scout":
          this.renderScout(ctx, x, y, isFlashing);
          break;
        case "fighter":
          this.renderFighter(ctx, x, y, isFlashing);
          break;
        case "bomber":
          this.renderBomber(ctx, x, y, isFlashing);
          break;
        case "boss":
          this.renderBoss(ctx, x, y, isFlashing);
          break;
        case "boss_gunship":
          this.renderBossGunship(ctx, x, y, isFlashing);
          break;
        case "boss_dreadnought":
          this.renderBossDreadnought(ctx, x, y, isFlashing);
          break;
        case "boss_fortress":
          this.renderBossFortress(ctx, x, y, isFlashing);
          break;
        case "interceptor":
          this.renderInterceptor(ctx, x, y, isFlashing);
          break;
        case "dart":
          this.renderDart(ctx, x, y, isFlashing);
          break;
        case "drone":
          this.renderDrone(ctx, x, y, isFlashing);
          break;
        case "swarmer":
          this.renderSwarmer(ctx, x, y, isFlashing);
          break;
        case "gunship":
          this.renderGunship(ctx, x, y, isFlashing);
          break;
        case "cruiser":
          this.renderCruiser(ctx, x, y, isFlashing);
          break;
        case "destroyer":
          this.renderDestroyer(ctx, x, y, isFlashing);
          break;
        case "juggernaut":
          this.renderJuggernaut(ctx, x, y, isFlashing);
          break;
        case "stealth":
          this.renderStealth(ctx, x, y, isFlashing);
          break;
        case "minelayer":
          this.renderMinelayer(ctx, x, y, isFlashing);
          break;
        default:
          this.renderFallbackShape(ctx, x, y, isFlashing);
          break;
      }
    }

    ctx.restore();
  }

  private static getFlashCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    if (!Enemy._flashCanvas || !Enemy._flashCtx) {
      Enemy._flashCanvas = document.createElement("canvas");
      Enemy._flashCtx = Enemy._flashCanvas.getContext("2d")!;
    }
    if (Enemy._flashCanvas.width < w) Enemy._flashCanvas.width = w;
    if (Enemy._flashCanvas.height < h) Enemy._flashCanvas.height = h;
    return [Enemy._flashCanvas, Enemy._flashCtx];
  }

  private renderSpriteVariant(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    if (isBossVariant(this.variant)) {
      ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
      ctx.beginPath();
      ctx.arc(x, y, this.width * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.variant === "juggernaut") {
      ctx.fillStyle = "rgba(102, 68, 136, 0.15)";
      ctx.beginPath();
      ctx.arc(x, y, this.width * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.variant === "stealth" && !this.cloakVisible && !flash) {
      ctx.globalAlpha = 0.1;
    }

    if (flash) {
      const w = this.width;
      const h = this.height;
      const [offCanvas, offCtx] = Enemy.getFlashCanvas(w, h);
      offCtx.clearRect(0, 0, w, h);
      offCtx.globalCompositeOperation = "source-over";
      offCtx.drawImage(this.sprite!, 0, 0, w, h);
      offCtx.globalCompositeOperation = "source-atop";
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, w, h);
      offCtx.globalCompositeOperation = "source-over";

      ctx.globalAlpha = 0.6;
      ctx.drawImage(offCanvas, 0, 0, w, h, x - w / 2, y - h / 2, w, h);
      ctx.globalAlpha = 1;
    } else {
      if (this.variant === "scout") {
        ctx.save();
        ctx.translate(x, y);
        const bank = Math.sin(this.time * 2) * 0.1;
        ctx.rotate(bank);
        ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      } else {
        ctx.drawImage(this.sprite!, x - this.width / 2, y - this.height / 2, this.width, this.height);
      }
    }

    if (isBossVariant(this.variant) || this.variant === "cruiser" || this.variant === "destroyer" || this.variant === "juggernaut") {
      this.renderHPBar(ctx, x, y);
    }
  }

  private renderHPBar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const hh = this.height / 2;
    const barW = this.width * 1.2;
    const barH = 5;
    const barX = x - barW / 2;
    const barY = y - hh - 12;
    const hpFrac = this.hitPoints / this.maxHitPoints;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, barY, barW, barH);

    const fillColor = hpFrac > 0.5 ? "#2ecc71" : hpFrac > 0.25 ? "#f1c40f" : "#e74c3c";
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barW * hpFrac, barH);
  }

  private renderScout(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    ctx.fillStyle = flash ? "#ffffff" : "#44cc44";
    ctx.beginPath();
    ctx.moveTo(x, y + this.height / 2);
    ctx.lineTo(x - this.width / 2, y - this.height / 2);
    ctx.lineTo(x + this.width / 2, y - this.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#228822";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderFighter(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cc4444";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.lineTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#882222";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderBomber(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cc8844";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh * 0.3);
    ctx.lineTo(x - hw, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#886633";
    ctx.fillRect(x - 6, y - 4, 12, 8);
  }

  private renderInterceptor(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#44cccc";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y - hh);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.2);
    ctx.lineTo(x, y - hh * 0.5);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.2);
    ctx.lineTo(x + hw, y - hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#228888";
    ctx.beginPath();
    ctx.arc(x, y + hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDart(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cccc44";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y);
    ctx.lineTo(x - hw, y - hh * 0.7);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.5);
    ctx.lineTo(x, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.5);
    ctx.lineTo(x + hw, y - hh * 0.7);
    ctx.lineTo(x + hw * 0.4, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#888822";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDrone(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const r = this.width / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#88ee88";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#338833";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSwarmer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cc44cc";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y - hh);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.1);
    ctx.lineTo(x, y - hh * 0.5);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.1);
    ctx.lineTo(x + hw, y - hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#662266";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private static readonly VARIANT_CATEGORY_COLORS: Record<string, string> = {
    interceptor: "#66cc66",
    dart: "#66cc66",
    drone: "#88ee88",
    swarmer: "#cc44cc",
    gunship: "#cc9933",
    cruiser: "#cc9933",
    destroyer: "#cc3333",
    juggernaut: "#cc3333",
    stealth: "#9966cc",
    minelayer: "#9966cc",
  };

  private renderGunship(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#4466cc";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.1);
    ctx.lineTo(x - hw * 0.7, y - hh);
    ctx.lineTo(x + hw * 0.7, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.1);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#334499";
    ctx.fillRect(x - hw * 0.85 - 3, y - 3, 6, 6);
    ctx.fillRect(x + hw * 0.85 - 3, y - 3, 6, 6);

    ctx.fillStyle = flash ? "#cccccc" : "#224477";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderCruiser(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#556688";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.2);
    ctx.lineTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.6, y - hh);
    ctx.lineTo(x + hw * 0.6, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#778899";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.fillRect(x - hw * 0.8 - 2, y - hh * 0.2, 5, 8);
    ctx.fillRect(x + hw * 0.8 - 3, y - hh * 0.2, 5, 8);

    ctx.fillStyle = flash ? "#cccccc" : "#3a4d5e";
    ctx.fillRect(x - 5, y - 4, 10, 8);

    this.renderHPBar(ctx, x, y);
  }

  private renderDestroyer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#884444";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.7);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#aa5555";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#663333";
    ctx.fillRect(x - hw * 0.85 - 3, y - hh * 0.1, 6, 10);
    ctx.fillRect(x + hw * 0.85 - 3, y - hh * 0.1, 6, 10);

    ctx.fillStyle = flash ? "#cccccc" : "#552222";
    ctx.fillRect(x - 6, y - 5, 12, 10);

    this.renderHPBar(ctx, x, y);
  }

  private renderJuggernaut(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(102, 68, 136, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#664488";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.35, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.15);
    ctx.lineTo(x - hw * 0.9, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.9, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.15);
    ctx.lineTo(x + hw * 0.35, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#8866aa";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#553377";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.6, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y - hh * 0.2);
    ctx.moveTo(x - hw * 0.5, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.2);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#443366";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderStealth(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (!this.cloakVisible && !flash) {
      ctx.globalAlpha = 0.1;
    }

    ctx.fillStyle = flash ? "#ffffff" : "#666688";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.6, y - hh);
    ctx.lineTo(x, y - hh * 0.6);
    ctx.lineTo(x + hw * 0.6, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#555577";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private renderMinelayer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#888844";
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.7, y - hh);
    ctx.lineTo(x + hw * 0.7, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.6, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#666633";
    ctx.fillRect(x - 5, y + hh * 0.2, 10, hh * 0.5);

    ctx.fillStyle = flash ? "#cccccc" : "#777733";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderFallbackShape(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const color = Enemy.VARIANT_CATEGORY_COLORS[this.variant] ?? "#999999";
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : color;
    ctx.fillRect(x - hw, y - hh, this.width, this.height);

    ctx.fillStyle = flash ? "#cccccc" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, Math.min(hw, hh) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderBoss(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#aa2222";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.5);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw * 0.8, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.8, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ff6666";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 8, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossGunship(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(51, 85, 170, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#3355aa";
    ctx.beginPath();
    ctx.moveTo(x, y + hh * 0.7);
    ctx.lineTo(x - hw * 0.5, y + hh * 0.4);
    ctx.lineTo(x - hw, y);
    ctx.lineTo(x - hw * 0.9, y - hh * 0.5);
    ctx.lineTo(x - hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.9, y - hh * 0.5);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#5577cc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.fillRect(x - hw * 0.9 - 4, y - hh * 0.15, 8, 10);
    ctx.fillRect(x + hw * 0.9 - 4, y - hh * 0.15, 8, 10);

    ctx.fillStyle = flash ? "#cccccc" : "#5577cc";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 6, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossDreadnought(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(136, 34, 68, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#882244";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.35, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.35, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#aa3366";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#773355";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.7, y - hh * 0.1);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.1);
    ctx.moveTo(x - hw * 0.6, y + hh * 0.3);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.3);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#663344";
    ctx.fillRect(x - hw * 0.95 - 4, y - hh * 0.15, 8, 14);
    ctx.fillRect(x + hw * 0.95 - 4, y - hh * 0.15, 8, 14);

    ctx.fillStyle = flash ? "#999999" : "#441122";
    for (let i = 0; i < 3; i++) {
      const ty = y - hh * 0.1 + i * 4;
      ctx.fillRect(x - hw * 0.95 - 1, ty, 2, 2);
      ctx.fillRect(x + hw * 0.95 - 1, ty, 2, 2);
    }

    ctx.fillStyle = flash ? "#cccccc" : "#aa4466";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossFortress(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(0, 204, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#556677";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.4);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#6688aa";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#445566";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.7, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.2);
    ctx.moveTo(x - hw * 0.6, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.2);
    ctx.stroke();

    const pulse = 0.5 + Math.sin(this.time * 3) * 0.5;
    const turretGlow = `rgba(0, 204, 255, ${0.4 + pulse * 0.6})`;

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.fillRect(x - hw * 0.85 - 4, y - hh * 0.15, 8, 14);
    ctx.fillRect(x + hw * 0.85 - 4, y - hh * 0.15, 8, 14);

    ctx.fillStyle = flash ? "#aaaaaa" : turretGlow;
    ctx.fillRect(x - hw * 0.85 - 2, y - hh * 0.1, 4, 4);
    ctx.fillRect(x + hw * 0.85 - 2, y - hh * 0.1, 4, 4);

    ctx.fillStyle = flash ? "#cccccc" : "#00ccff";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }
}
