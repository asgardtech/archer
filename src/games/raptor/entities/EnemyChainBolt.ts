import { EnemyBullet, EnemyBulletOptions } from "./EnemyBullet";

const DEFAULT_CHAIN_FALLBACK_COLOR = "#88ccff";
const DEFAULT_CHAIN_GLOW_COLOR = "#88ccff";
const DEFAULT_CHAIN_CORE_COLOR = "#ccecff";

export class EnemyChainBolt extends EnemyBullet {
  public readonly arcDamageRatio = 0.5;
  private readonly segmentCount: number;
  private readonly trailLength: number;
  private segmentOffsets: number[] = [];
  private offsetTimer = 0;

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    options?: EnemyBulletOptions,
  ) {
    super(x, y, targetX, targetY, {
      ...options,
      fallbackColor: options?.fallbackColor ?? DEFAULT_CHAIN_FALLBACK_COLOR,
      glowColor: options?.glowColor ?? DEFAULT_CHAIN_GLOW_COLOR,
      coreColor: options?.coreColor ?? DEFAULT_CHAIN_CORE_COLOR,
    });
    this.segmentCount = 6 + Math.floor(Math.random() * 3);
    this.trailLength = 20;
    this.regenerateOffsets();
  }

  private regenerateOffsets(): void {
    this.segmentOffsets = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segmentOffsets.push((Math.random() - 0.5) * 8);
    }
  }

  override update(dt: number, canvasWidth: number, canvasHeight: number, playerPos?: { x: number; y: number }): void {
    super.update(dt, canvasWidth, canvasHeight, playerPos);
    if (!this.alive) return;

    this.offsetTimer += dt;
    if (this.offsetTimer >= 0.05) {
      this.offsetTimer = 0;
      this.regenerateOffsets();
    }
  }

  override render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.sprite) {
      super.render(ctx);
      return;
    }

    ctx.save();

    const speed = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
    const dirX = speed > 0 ? -this.vel.x / speed : 0;
    const dirY = speed > 0 ? -this.vel.y / speed : 0;
    const perpX = -dirY;
    const perpY = dirX;

    ctx.shadowColor = this.glowColor ?? DEFAULT_CHAIN_GLOW_COLOR;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = this.fallbackColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);

    for (let i = 1; i <= this.segmentCount; i++) {
      const t = i / this.segmentCount;
      const baseX = this.pos.x + dirX * this.trailLength * t;
      const baseY = this.pos.y + dirY * this.trailLength * t;
      const offset = this.segmentOffsets[i - 1];
      ctx.lineTo(baseX + perpX * offset, baseY + perpY * offset);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.coreColor ?? DEFAULT_CHAIN_CORE_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    for (let i = 1; i <= this.segmentCount; i++) {
      const t = i / this.segmentCount;
      const baseX = this.pos.x + dirX * this.trailLength * t;
      const baseY = this.pos.y + dirY * this.trailLength * t;
      const offset = this.segmentOffsets[i - 1] * 0.5;
      ctx.lineTo(baseX + perpX * offset, baseY + perpY * offset);
    }
    ctx.stroke();

    ctx.fillStyle = this.fallbackColor;
    ctx.shadowColor = this.glowColor ?? DEFAULT_CHAIN_GLOW_COLOR;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
