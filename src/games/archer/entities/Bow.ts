import { Vec2, UpgradeState } from "../types";

const BOW_RADIUS = 40;
const SPRITE_SIZE = 80;

const UPGRADE_GLOW_COLORS: Record<string, string> = {
  "multi-shot": "rgba(52, 152, 219, 0.6)",
  "piercing": "rgba(230, 126, 34, 0.6)",
  "rapid-fire": "rgba(241, 196, 15, 0.6)",
};

export class Bow {
  public pos: Vec2;
  public angle = -Math.PI / 2;
  private sprites: Map<string, HTMLImageElement> = new Map();

  constructor(canvasW: number, canvasH: number, bottomOffset = 30) {
    this.pos = { x: canvasW / 2, y: canvasH - bottomOffset };
  }

  setSprites(sprites: Map<string, HTMLImageElement>): void {
    this.sprites = sprites;
  }

  update(mousePos: Vec2): void {
    const dx = mousePos.x - this.pos.x;
    const dy = mousePos.y - this.pos.y;
    this.angle = Math.atan2(dy, dx);

    if (this.angle > 0) {
      this.angle = this.angle < Math.PI / 2 ? 0 : -Math.PI;
    }
  }

  getFireAngles(multiShot: boolean): number[] {
    if (multiShot) {
      return [this.angle - 0.15, this.angle, this.angle + 0.15];
    }
    return [this.angle];
  }

  private getSpriteKey(activeUpgrades?: ReadonlyArray<UpgradeState>): string {
    if (activeUpgrades) {
      if (activeUpgrades.some(u => u.type === "multi-shot")) return "bow_multishot";
      if (activeUpgrades.some(u => u.type === "piercing")) return "bow_piercing";
      if (activeUpgrades.some(u => u.type === "rapid-fire")) return "bow_rapidfire";
    }
    return "bow_default";
  }

  render(ctx: CanvasRenderingContext2D, hasAmmo: boolean, activeUpgrades?: ReadonlyArray<UpgradeState>): void {
    const spriteKey = this.getSpriteKey(activeUpgrades);
    const sprite = this.sprites.get(spriteKey);

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    if (sprite) {
      // Upgrade glow rings still render on top of the sprite
      if (activeUpgrades) {
        for (const u of activeUpgrades) {
          const glowColor = UPGRADE_GLOW_COLORS[u.type];
          if (glowColor) {
            ctx.beginPath();
            ctx.arc(0, 0, BOW_RADIUS + 8, -0.9, 0.9, false);
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = 5;
            ctx.stroke();
          }
        }
      }

      ctx.drawImage(sprite, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);

      if (hasAmmo) {
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(30, 0);
        ctx.strokeStyle = "#8B5E3C";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(24, -3);
        ctx.lineTo(24, 3);
        ctx.closePath();
        ctx.fillStyle = "#333";
        ctx.fill();
      }
    } else {
      this.renderFallback(ctx, hasAmmo, activeUpgrades);
    }

    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D, hasAmmo: boolean, activeUpgrades?: ReadonlyArray<UpgradeState>): void {
    if (activeUpgrades) {
      for (const u of activeUpgrades) {
        const glowColor = UPGRADE_GLOW_COLORS[u.type];
        if (glowColor) {
          ctx.beginPath();
          ctx.arc(0, 0, BOW_RADIUS + 8, -0.9, 0.9, false);
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 5;
          ctx.stroke();
        }
      }
    }

    ctx.beginPath();
    ctx.arc(0, 0, BOW_RADIUS, -0.9, 0.9, false);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.stroke();

    const endTopX = Math.cos(-0.9) * BOW_RADIUS;
    const endTopY = Math.sin(-0.9) * BOW_RADIUS;
    const endBotX = Math.cos(0.9) * BOW_RADIUS;
    const endBotY = Math.sin(0.9) * BOW_RADIUS;

    ctx.beginPath();
    ctx.moveTo(endTopX, endTopY);
    ctx.lineTo(0, 0);
    ctx.lineTo(endBotX, endBotY);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (hasAmmo) {
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(30, 0);
      ctx.strokeStyle = "#8B5E3C";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(24, -3);
      ctx.lineTo(24, 3);
      ctx.closePath();
      ctx.fillStyle = "#333";
      ctx.fill();
    }
  }
}
