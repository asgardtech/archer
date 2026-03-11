import { Vec2, EnemyVariant, EnemyConfig, EnemyWeaponType, ENEMY_CONFIGS } from "../types";

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

  constructor(x: number, y: number, variant: EnemyVariant, speed?: number, overrideConfig?: Partial<EnemyConfig>) {
    const config = { ...ENEMY_CONFIGS[variant], ...overrideConfig };
    this.variant = variant;
    this.hitPoints = Math.max(config.hitPoints, variant === "boss" ? 10 : 1);
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

  update(dt: number, canvasHeight: number, targetX?: number): void {
    if (!this.alive) return;
    this.time += dt;

    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (this.variant === "boss") {
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
    } else {
      this.pos.y += this.vel.y * dt;
    }

    if (this.fireRate > 0) {
      this.fireCooldown -= dt;
    }

    if (this.variant !== "boss" && this.pos.y > canvasHeight + 50) {
      this.alive = false;
    }
  }

  canFire(): boolean {
    return this.fireRate > 0 && this.fireCooldown <= 0 && this.alive;
  }

  resetFireCooldown(multiplier = 1): void {
    this.fireCooldown = (1 / this.fireRate) * multiplier;
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
    if (this.variant === "boss") {
      ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
      ctx.beginPath();
      ctx.arc(x, y, this.width * 0.7, 0, Math.PI * 2);
      ctx.fill();
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

    if (this.variant === "boss") {
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
}
