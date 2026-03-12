import { TerrainStyle, GROUND_HEIGHT } from "../types";

export class TerrainRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    terrain: TerrainStyle,
  ): void {
    switch (terrain.type) {
      case "meadow":
        this.renderMeadow(ctx, canvasWidth, canvasHeight, terrain);
        break;
      case "forest":
        this.renderForest(ctx, canvasWidth, canvasHeight, terrain);
        break;
      case "mountains":
        this.renderMountains(ctx, canvasWidth, canvasHeight, terrain);
        break;
      case "storm":
        this.renderStorm(ctx, canvasWidth, canvasHeight, terrain);
        break;
      case "sky_fortress":
        this.renderSkyFortress(ctx, canvasWidth, canvasHeight, terrain);
        break;
      default: {
        const _exhaustive: never = terrain.type;
        void _exhaustive;
      }
    }
  }

  private static deterministicRandom(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  private static drawWavySurface(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    baseColor: string,
    surfaceColor: string,
    amplitude: number,
    frequency: number,
  ): void {
    const terrainY = canvasHeight - GROUND_HEIGHT;

    const grad = ctx.createLinearGradient(0, terrainY, 0, canvasHeight);
    grad.addColorStop(0, surfaceColor);
    grad.addColorStop(0.3, baseColor);
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    for (let x = 0; x <= canvasWidth; x += 4) {
      const y = terrainY + Math.sin(x * frequency) * amplitude;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.closePath();
    ctx.fill();
  }

  private static renderMeadow(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    terrain: TerrainStyle,
  ): void {
    this.drawWavySurface(ctx, canvasWidth, canvasHeight, terrain.baseColor, terrain.surfaceColor, 3, 0.04);

    const terrainY = canvasHeight - GROUND_HEIGHT;

    // Grass tufts
    for (let x = 5; x < canvasWidth; x += 18) {
      const r = this.deterministicRandom(x);
      const surfaceY = terrainY + Math.sin(x * 0.04) * 3;
      const h = 4 + r * 4;

      ctx.fillStyle = r > 0.5 ? "#5ca34e" : "#3a7d32";
      ctx.beginPath();
      ctx.moveTo(x - 1, surfaceY);
      ctx.lineTo(x, surfaceY - h);
      ctx.lineTo(x + 1, surfaceY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + 2, surfaceY);
      ctx.lineTo(x + 3.5, surfaceY - h * 0.8);
      ctx.lineTo(x + 4, surfaceY);
      ctx.closePath();
      ctx.fill();
    }

    // Flowers
    for (let x = 12; x < canvasWidth; x += 45) {
      const r = this.deterministicRandom(x + 100);
      const surfaceY = terrainY + Math.sin(x * 0.04) * 3;
      const flowerX = x + r * 15;
      const flowerY = surfaceY - 2;
      const color = r > 0.5 ? terrain.accentColor : "#f5d742";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static renderForest(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    terrain: TerrainStyle,
  ): void {
    const terrainY = canvasHeight - GROUND_HEIGHT;

    // Bumpy contour fill
    const grad = ctx.createLinearGradient(0, terrainY, 0, canvasHeight);
    grad.addColorStop(0, terrain.surfaceColor);
    grad.addColorStop(0.35, terrain.baseColor);
    grad.addColorStop(1, "#2a4420");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    for (let x = 0; x <= canvasWidth; x += 4) {
      const r = this.deterministicRandom(x * 0.3);
      const bump = Math.sin(x * 0.06) * 2 + r * 3;
      ctx.lineTo(x, terrainY + bump);
    }
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.closePath();
    ctx.fill();

    // Bushes
    for (let x = 20; x < canvasWidth; x += 55) {
      const r = this.deterministicRandom(x + 200);
      const surfaceY = terrainY + Math.sin(x * 0.06) * 2 + r * 3;
      ctx.fillStyle = "#2d5a27";
      ctx.beginPath();
      ctx.arc(x, surfaceY, 5, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = "#3a7d32";
      ctx.beginPath();
      ctx.arc(x + 3, surfaceY - 1, 3, Math.PI, 0, false);
      ctx.fill();
    }

    // Mushrooms
    for (let x = 40; x < canvasWidth; x += 85) {
      const r = this.deterministicRandom(x + 300);
      const surfaceY = terrainY + Math.sin(x * 0.06) * 2 + r * 3;
      const mx = x + r * 10;

      // Stem
      ctx.fillStyle = "#d4c5a9";
      ctx.fillRect(mx - 1, surfaceY - 5, 2, 5);

      // Cap
      ctx.fillStyle = terrain.accentColor;
      ctx.beginPath();
      ctx.arc(mx, surfaceY - 5, 3, Math.PI, 0, false);
      ctx.fill();

      // Cap spots
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(mx - 1, surfaceY - 6, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 1, surfaceY - 6.5, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tree stumps
    for (let x = 70; x < canvasWidth; x += 110) {
      const r = this.deterministicRandom(x + 400);
      const surfaceY = terrainY + Math.sin(x * 0.06) * 2 + r * 3;

      ctx.fillStyle = "#5C4033";
      ctx.fillRect(x - 3, surfaceY - 4, 6, 4);

      ctx.fillStyle = "#8B7355";
      ctx.beginPath();
      ctx.ellipse(x, surfaceY - 4, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static renderMountains(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    terrain: TerrainStyle,
  ): void {
    const terrainY = canvasHeight - GROUND_HEIGHT;

    // Jagged angular contour
    const grad = ctx.createLinearGradient(0, terrainY, 0, canvasHeight);
    grad.addColorStop(0, terrain.surfaceColor);
    grad.addColorStop(0.3, terrain.baseColor);
    grad.addColorStop(1, "#5a5a5a");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    for (let x = 0; x <= canvasWidth; x += 12) {
      const r = this.deterministicRandom(x * 0.5);
      const peak = (r - 0.5) * 8;
      ctx.lineTo(x, terrainY + peak);
      ctx.lineTo(x + 6, terrainY + peak + 3 + r * 2);
    }
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.closePath();
    ctx.fill();

    // Rocks
    for (let x = 10; x < canvasWidth; x += 35) {
      const r = this.deterministicRandom(x + 500);
      const surfaceY = terrainY + (r - 0.5) * 6;
      const rockX = x + r * 8;

      ctx.fillStyle = r > 0.5 ? "#7a7a7a" : "#888";
      ctx.beginPath();
      ctx.moveTo(rockX - 3, surfaceY);
      ctx.lineTo(rockX - 1, surfaceY - 3 - r * 2);
      ctx.lineTo(rockX + 2, surfaceY - 2);
      ctx.lineTo(rockX + 3, surfaceY);
      ctx.closePath();
      ctx.fill();
    }

    // Snow patches at edges
    ctx.fillStyle = terrain.accentColor;
    ctx.beginPath();
    ctx.ellipse(30, terrainY + 2, 25, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(canvasWidth - 35, terrainY + 1, 30, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(canvasWidth - 90, terrainY + 3, 15, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private static renderStorm(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    terrain: TerrainStyle,
  ): void {
    const terrainY = canvasHeight - GROUND_HEIGHT;

    // Gentle uneven contour
    const grad = ctx.createLinearGradient(0, terrainY, 0, canvasHeight);
    grad.addColorStop(0, terrain.surfaceColor);
    grad.addColorStop(0.3, terrain.baseColor);
    grad.addColorStop(1, "#2a2520");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    for (let x = 0; x <= canvasWidth; x += 4) {
      const r = this.deterministicRandom(x * 0.2);
      const y = terrainY + Math.sin(x * 0.025) * 2 + r * 1.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.closePath();
    ctx.fill();

    // Mud speckles
    for (let x = 3; x < canvasWidth; x += 8) {
      const r = this.deterministicRandom(x + 600);
      const speckleY = terrainY + 8 + r * 18;
      if (speckleY < canvasHeight) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + r * 0.15})`;
        ctx.beginPath();
        ctx.arc(x + r * 5, speckleY, 0.8 + r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Puddles
    for (let x = 30; x < canvasWidth; x += 65) {
      const r = this.deterministicRandom(x + 700);
      const surfaceY = terrainY + Math.sin(x * 0.025) * 2 + r * 1.5;
      const px = x + r * 20;
      const pw = 12 + r * 10;
      const ph = 3 + r * 2;

      ctx.fillStyle = terrain.accentColor;
      ctx.beginPath();
      ctx.ellipse(px, surfaceY + 5, pw, ph, 0, 0, Math.PI * 2);
      ctx.fill();

      // Reflection highlight
      ctx.fillStyle = "rgba(180, 210, 230, 0.25)";
      ctx.beginPath();
      ctx.ellipse(px, surfaceY + 4, pw * 0.6, ph * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static renderSkyFortress(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    terrain: TerrainStyle,
  ): void {
    const terrainY = canvasHeight - GROUND_HEIGHT;
    const crenH = 6;
    const crenW = 8;

    // Main platform body
    ctx.fillStyle = terrain.baseColor;
    ctx.fillRect(0, terrainY + crenH, canvasWidth, GROUND_HEIGHT - crenH);

    // Crenellations along top edge
    ctx.fillStyle = terrain.surfaceColor;
    for (let x = 0; x < canvasWidth; x += crenW * 2) {
      ctx.fillRect(x, terrainY, crenW, crenH);
    }

    // Flat walkway between crenellations
    ctx.fillStyle = terrain.baseColor;
    ctx.fillRect(0, terrainY + crenH, canvasWidth, 3);

    // Brick pattern
    ctx.strokeStyle = terrain.accentColor;
    ctx.lineWidth = 0.5;
    let rowIndex = 0;
    for (let y = terrainY + crenH + 4; y < canvasHeight - 2; y += 7) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      const offset = (rowIndex % 2) * 12;
      for (let x = offset; x < canvasWidth; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 7);
        ctx.stroke();
      }
      rowIndex++;
    }

    // Broken edge pieces (floating island feel)
    ctx.fillStyle = terrain.surfaceColor;

    // Left edge
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    ctx.lineTo(8, canvasHeight);
    ctx.lineTo(5, canvasHeight + 6);
    ctx.lineTo(0, canvasHeight + 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12, canvasHeight);
    ctx.lineTo(20, canvasHeight);
    ctx.lineTo(16, canvasHeight + 8);
    ctx.lineTo(10, canvasHeight + 3);
    ctx.closePath();
    ctx.fill();

    // Right edge
    ctx.beginPath();
    ctx.moveTo(canvasWidth - 18, canvasHeight);
    ctx.lineTo(canvasWidth - 8, canvasHeight);
    ctx.lineTo(canvasWidth - 10, canvasHeight + 7);
    ctx.lineTo(canvasWidth - 20, canvasHeight + 3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(canvasWidth - 6, canvasHeight);
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.lineTo(canvasWidth, canvasHeight + 5);
    ctx.lineTo(canvasWidth - 4, canvasHeight + 4);
    ctx.closePath();
    ctx.fill();
  }
}
