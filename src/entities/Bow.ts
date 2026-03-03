import { Vec2 } from "../types";

const BOW_RADIUS = 40;

export class Bow {
  public pos: Vec2;
  public angle = -Math.PI / 2; // pointing up by default

  constructor(canvasW: number, canvasH: number) {
    this.pos = { x: canvasW / 2, y: canvasH - 30 };
  }

  update(mousePos: Vec2): void {
    const dx = mousePos.x - this.pos.x;
    const dy = mousePos.y - this.pos.y;
    this.angle = Math.atan2(dy, dx);

    // Clamp to upward hemisphere only (-π to 0)
    if (this.angle > 0) {
      this.angle = this.angle < Math.PI / 2 ? 0 : -Math.PI;
    }
  }

  render(ctx: CanvasRenderingContext2D, hasAmmo: boolean): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    // Bow limb (arc)
    ctx.beginPath();
    ctx.arc(0, 0, BOW_RADIUS, -0.9, 0.9, false);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Bowstring
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

    // Nocked arrow preview
    if (hasAmmo) {
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(30, 0);
      ctx.strokeStyle = "#8B5E3C";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Arrowhead preview
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(24, -3);
      ctx.lineTo(24, 3);
      ctx.closePath();
      ctx.fillStyle = "#333";
      ctx.fill();
    }

    ctx.restore();
  }
}
