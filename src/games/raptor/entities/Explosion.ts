import { SpriteSheet } from "../rendering/SpriteSheet";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
}

const COLORS = ["#ff4400", "#ff8800", "#ffcc00", "#ffffff"];

export class Explosion {
  public alive = true;
  private particles: Particle[] = [];
  private x: number;
  private y: number;
  private size: number;

  private spriteSheet: SpriteSheet | null = null;
  private currentFrame = 0;
  private frameTimer = 0;
  private frameDuration = 0.06;
  private useSprite = false;

  constructor(x: number, y: number, size = 1) {
    this.x = x;
    this.y = y;
    this.size = size;

    const count = Math.floor(8 + size * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120 * size;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4 * size,
        alpha: 1,
        decay: 1.5 + Math.random() * 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  setSpriteSheet(sheet: SpriteSheet): void {
    this.spriteSheet = sheet;
    this.useSprite = true;
    this.currentFrame = 0;
    this.frameTimer = 0;
  }

  update(dt: number): void {
    if (!this.alive) return;

    if (this.useSprite && this.spriteSheet) {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDuration) {
        this.frameTimer -= this.frameDuration;
        this.currentFrame++;
        if (this.currentFrame >= this.spriteSheet.frameCount) {
          this.alive = false;
          return;
        }
      }
    }

    let allDead = true;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      p.radius *= 1 - 0.5 * dt;
      if (p.alpha > 0) allDead = false;
    }

    if (!this.useSprite && allDead) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.useSprite && this.spriteSheet) {
      const drawSize = 40 * this.size;
      const alpha = this.currentFrame < this.spriteSheet.frameCount - 2 ? 1 :
        1 - (this.currentFrame - (this.spriteSheet.frameCount - 2)) / 2;

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      this.spriteSheet.drawFrame(ctx, this.currentFrame, this.x, this.y, drawSize, drawSize);
      ctx.restore();
    }

    ctx.save();
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
