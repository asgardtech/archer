import { Vec2 } from "../types";
import { SpriteSheet } from "../rendering/SpriteSheet";

const MOVE_SPEED = 500;
const INVINCIBILITY_DURATION = 2.0;

export class Player {
  public pos: Vec2;
  public width = 48;
  public height = 54;
  public shield = 100;
  public lives = 3;
  public alive = true;
  public invincibilityTimer = 0;
  public godMode = false;

  private flashTimer = 0;
  private sprite: HTMLImageElement | null = null;
  private thrustSheet: SpriteSheet | null = null;
  private thrustFrame = 0;
  private thrustTimer = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.pos = { x: canvasWidth / 2, y: canvasHeight * 0.8 };
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  setThrustSheet(sheet: SpriteSheet): void {
    this.thrustSheet = sheet;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }
  get isInvincible(): boolean { return this.invincibilityTimer > 0; }

  update(dt: number, targetX: number, targetY: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.alive) return;

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
      this.flashTimer += dt;
    }

    this.thrustTimer += dt;
    if (this.thrustTimer >= 0.08) {
      this.thrustTimer -= 0.08;
      this.thrustFrame = (this.thrustFrame + 1) % 4;
    }

    const dx = targetX - this.pos.x;
    const dy = targetY - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const moveAmount = Math.min(MOVE_SPEED * dt, dist);
      this.pos.x += (dx / dist) * moveAmount;
      this.pos.y += (dy / dist) * moveAmount;
    }

    const padding = this.width / 2;
    this.pos.x = Math.max(padding, Math.min(canvasWidth - padding, this.pos.x));

    const minY = canvasHeight * 0.6;
    const maxY = canvasHeight - this.height / 2 - 5;
    this.pos.y = Math.max(minY, Math.min(maxY, this.pos.y));
  }

  takeDamage(amount: number): boolean {
    if (this.godMode) return false;
    if (this.isInvincible || !this.alive) return false;

    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - amount);
      return false;
    }

    this.lives--;
    this.shield = 100;
    this.invincibilityTimer = INVINCIBILITY_DURATION;
    this.flashTimer = 0;

    if (this.lives <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  reset(canvasWidth: number, canvasHeight: number, fullReset = true): void {
    this.pos = { x: canvasWidth / 2, y: canvasHeight * 0.8 };
    this.shield = 100;
    this.alive = true;
    this.invincibilityTimer = 0;
    this.flashTimer = 0;
    if (fullReset) {
      this.lives = 3;
      this.godMode = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.isInvincible && Math.floor(this.flashTimer * 10) % 2 === 0) {
      return;
    }

    if (this.godMode) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.07 * Math.sin(Date.now() / 300);
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.ellipse(this.pos.x, this.pos.y, this.width * 0.7, this.height * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.sprite) {
      this.renderSprite(ctx);
    } else {
      this.renderFallback(ctx);
    }
  }

  private renderSprite(ctx: CanvasRenderingContext2D): void {
    const x = this.pos.x;
    const y = this.pos.y;

    if (this.thrustSheet) {
      this.thrustSheet.drawFrame(
        ctx,
        this.thrustFrame,
        x,
        y + this.height / 2 + 12,
        24,
        30
      );
    }

    ctx.drawImage(
      this.sprite!,
      x - this.width / 2,
      y - this.height / 2,
      this.width,
      this.height
    );
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    const x = this.pos.x;
    const y = this.pos.y;
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.save();

    ctx.fillStyle = "rgba(255, 150, 0, 0.6)";
    ctx.beginPath();
    ctx.moveTo(x - 6, y + hh);
    ctx.lineTo(x, y + hh + 12 + Math.random() * 6);
    ctx.lineTo(x + 6, y + hh);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 200, 50, 0.4)";
    ctx.beginPath();
    ctx.moveTo(x - 3, y + hh);
    ctx.lineTo(x, y + hh + 8 + Math.random() * 4);
    ctx.lineTo(x + 3, y + hh);
    ctx.fill();

    ctx.fillStyle = "#3a7dff";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw * 0.4, y);
    ctx.lineTo(x + hw * 0.35, y + hh * 0.7);
    ctx.lineTo(x - hw * 0.35, y + hh * 0.7);
    ctx.lineTo(x - hw * 0.4, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2a5dc8";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.3, y + hh * 0.1);
    ctx.lineTo(x - hw, y + hh * 0.6);
    ctx.lineTo(x - hw * 0.8, y + hh * 0.8);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + hw * 0.3, y + hh * 0.1);
    ctx.lineTo(x + hw, y + hh * 0.6);
    ctx.lineTo(x + hw * 0.8, y + hh * 0.8);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#80d4ff";
    ctx.beginPath();
    ctx.ellipse(x, y - hh * 0.2, hw * 0.15, hh * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.6, y + hh * 0.4);
    ctx.lineTo(x - hw * 0.9, y + hh * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + hw * 0.6, y + hh * 0.4);
    ctx.lineTo(x + hw * 0.9, y + hh * 0.7);
    ctx.stroke();

    ctx.restore();
  }
}
