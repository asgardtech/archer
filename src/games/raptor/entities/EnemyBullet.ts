import { Vec2 } from "../types";

const ENEMY_BULLET_SPEED = 300;

export interface EnemyBulletOptions {
  damage?: number;
  speed?: number;
  radius?: number;
  homing?: boolean;
  homingStrength?: number;
  spriteKey?: string;
  fallbackColor?: string;
  ttl?: number;
  isMine?: boolean;
}

export class EnemyBullet {
  public pos: Vec2;
  public vel: Vec2;
  public alive = true;
  public radius: number;
  public damage: number;
  public homing: boolean;
  public homingStrength: number;
  public speed: number;
  public spriteKey: string;
  public fallbackColor: string;
  public ttl: number | null;
  public isMine: boolean;
  public reflected = false;

  protected angle: number;
  protected sprite: HTMLImageElement | null = null;
  protected time = 0;

  constructor(x: number, y: number, targetX: number, targetY: number, options?: EnemyBulletOptions) {
    this.pos = { x, y };
    this.damage = options?.damage ?? 25;
    this.speed = options?.speed ?? ENEMY_BULLET_SPEED;
    this.radius = options?.radius ?? 4;
    this.homing = options?.homing ?? false;
    this.homingStrength = options?.homingStrength ?? 0;
    this.spriteKey = options?.spriteKey ?? "bullet_enemy";
    this.fallbackColor = options?.fallbackColor ?? "#ff3333";
    this.ttl = options?.ttl ?? null;
    this.isMine = options?.isMine ?? false;

    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      this.angle = 0;
      this.vel = { x: 0, y: this.speed };
    } else {
      this.angle = Math.atan2(dx, dy);
      this.vel = {
        x: (dx / dist) * this.speed,
        y: (dy / dist) * this.speed,
      };
    }
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  public get heading(): number { return this.angle; }

  get left(): number { return this.pos.x - this.radius; }
  get right(): number { return this.pos.x + this.radius; }
  get top(): number { return this.pos.y - this.radius; }
  get bottom(): number { return this.pos.y + this.radius; }

  update(dt: number, canvasWidth: number, canvasHeight: number, playerPos?: Vec2): void {
    if (!this.alive) return;

    this.time += dt;

    if (this.ttl !== null) {
      this.ttl -= dt;
      if (this.ttl <= 0) {
        this.alive = false;
        return;
      }
    }

    if (this.homing && playerPos) {
      const dx = playerPos.x - this.pos.x;
      const dy = playerPos.y - this.pos.y;
      const desiredAngle = Math.atan2(dx, dy);
      let angleDiff = desiredAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const maxTurn = this.homingStrength * dt;
      this.angle += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

      this.vel.x = Math.sin(this.angle) * this.speed;
      this.vel.y = Math.cos(this.angle) * this.speed;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    if (
      !this.isMine &&
      (this.pos.x < -20 || this.pos.x > canvasWidth + 20 ||
       this.pos.y < -20 || this.pos.y > canvasHeight + 20)
    ) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.isMine) {
      this.renderMine(ctx);
    } else if (this.sprite) {
      this.renderSprite(ctx);
    } else {
      this.renderFallback(ctx);
    }
  }

  private renderSprite(ctx: CanvasRenderingContext2D): void {
    const size = this.radius * 2;
    ctx.drawImage(
      this.sprite!,
      this.pos.x - this.radius,
      this.pos.y - this.radius,
      size,
      size
    );
  }

  private renderMine(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const pulse = 1 + Math.sin(this.time * 4) * 0.2;
    const r = this.radius * pulse;

    ctx.fillStyle = "rgba(255, 204, 0, 0.3)";
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 8 + Math.sin(this.time * 4) * 4;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffcc00";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.fallbackColor;
    ctx.shadowColor = this.fallbackColor;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.fallbackCoreColor;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private get fallbackCoreColor(): string {
    if (this.fallbackColor === "#ff3333") return "#ff8888";
    if (this.fallbackColor === "#ff8800") return "#ffcc66";
    return "#ffffff";
  }
}
