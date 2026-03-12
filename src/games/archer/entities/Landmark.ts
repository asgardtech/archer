import { LandmarkConfig, LandmarkType, GROUND_HEIGHT } from "../types";

export class Landmark {
  private type: LandmarkType;
  private x: number;
  private groundY: number;

  private bladeAngle = 0;
  private beamPhase = 0;
  private flagPhase = 0;
  private swayPhase = 0;

  constructor(config: LandmarkConfig, canvasWidth: number, canvasHeight: number) {
    this.type = config.type;
    this.x = Math.max(0, Math.min(1, config.positionX)) * canvasWidth;
    this.groundY = canvasHeight - GROUND_HEIGHT;
  }

  update(dt: number): void {
    this.bladeAngle += dt * 1.5;
    this.beamPhase += dt * 2.0;
    this.flagPhase += dt * 3.0;
    this.swayPhase += dt * 1.2;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.groundY);

    switch (this.type) {
      case "windmill":
        this.renderWindmill(ctx);
        break;
      case "treehouse":
        this.renderTreehouse(ctx);
        break;
      case "watchtower":
        this.renderWatchtower(ctx);
        break;
      case "lighthouse":
        this.renderLighthouse(ctx);
        break;
      case "castle":
        this.renderCastle(ctx);
        break;
      default: {
        const _exhaustive: never = this.type;
        void _exhaustive;
      }
    }

    ctx.restore();
  }

  private renderWindmill(ctx: CanvasRenderingContext2D): void {
    // Stone tower body (trapezoid)
    ctx.fillStyle = "#8B8682";
    ctx.strokeStyle = "#6B6462";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(-10, -50);
    ctx.lineTo(10, -50);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Roof
    ctx.fillStyle = "#5C4033";
    ctx.beginPath();
    ctx.moveTo(-12, -50);
    ctx.lineTo(0, -60);
    ctx.lineTo(12, -50);
    ctx.closePath();
    ctx.fill();

    // Door arch
    ctx.fillStyle = "#2C2C2C";
    ctx.beginPath();
    ctx.arc(0, 0, 5, Math.PI, 0, false);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();

    // Blades — rotate around hub at top of tower body
    const hubX = 0;
    const hubY = -50;
    ctx.save();
    ctx.translate(hubX, hubY);
    ctx.rotate(this.bladeAngle);

    ctx.fillStyle = "#DEB887";
    ctx.strokeStyle = "#A0826D";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-1, -30);
      ctx.lineTo(2, -30);
      ctx.lineTo(2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Hub circle
    ctx.fillStyle = "#654321";
    ctx.beginPath();
    ctx.arc(hubX, hubY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderTreehouse(ctx: CanvasRenderingContext2D): void {
    // Trunk
    ctx.fillStyle = "#5C4033";
    ctx.fillRect(-5, -60, 10, 60);

    // Roots
    ctx.strokeStyle = "#5C4033";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-12, 5);
    ctx.moveTo(5, 0);
    ctx.lineTo(12, 5);
    ctx.stroke();

    // Platform
    ctx.fillStyle = "#8B5E3C";
    ctx.fillRect(-18, -42, 36, 4);

    // Small house on platform
    ctx.fillStyle = "#C4A35A";
    ctx.fillRect(-10, -55, 20, 13);

    // House roof
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(-12, -55);
    ctx.lineTo(0, -63);
    ctx.lineTo(12, -55);
    ctx.closePath();
    ctx.fill();

    // Window on house
    ctx.fillStyle = "#F0C040";
    ctx.fillRect(-3, -52, 6, 5);

    // Canopy (sways with animation)
    const swayOffset = Math.sin(this.swayPhase) * 2;
    ctx.fillStyle = "#2D5A27";
    ctx.beginPath();
    ctx.arc(swayOffset, -65, 22, 0, Math.PI * 2);
    ctx.fill();

    // Lighter highlight
    ctx.fillStyle = "#3A7D32";
    ctx.beginPath();
    ctx.arc(swayOffset + 8, -70, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2D5A27";
    ctx.beginPath();
    ctx.arc(swayOffset - 10, -62, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderWatchtower(ctx: CanvasRenderingContext2D): void {
    // Wide stone base (trapezoid)
    ctx.fillStyle = "#6B6462";
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-14, -20);
    ctx.lineTo(14, -20);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();

    // Tower body
    ctx.fillStyle = "#8B8682";
    ctx.fillRect(-9, -65, 18, 45);

    // Stone row lines
    ctx.strokeStyle = "#7B7872";
    ctx.lineWidth = 0.5;
    for (let row = -25; row > -65; row -= 8) {
      ctx.beginPath();
      ctx.moveTo(-9, row);
      ctx.lineTo(9, row);
      ctx.stroke();
    }

    // Battlement crenellations
    ctx.fillStyle = "#8B8682";
    const crenW = 5;
    const crenH = 5;
    for (let cx = -9; cx < 9; cx += crenW * 2) {
      ctx.fillRect(cx, -70, crenW, crenH);
    }

    // Flag pole
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(0, -85);
    ctx.stroke();

    // Waving flag
    const flagTipOffset = Math.sin(this.flagPhase) * 4;
    ctx.fillStyle = "#C41E3A";
    ctx.beginPath();
    ctx.moveTo(0, -85);
    ctx.lineTo(12 + flagTipOffset, -82);
    ctx.lineTo(0, -78);
    ctx.closePath();
    ctx.fill();
  }

  private renderLighthouse(ctx: CanvasRenderingContext2D): void {
    // Wider base
    ctx.fillStyle = "#7F8C8D";
    ctx.fillRect(-12, -8, 24, 8);

    // Tapered tower with alternating stripes
    const towerTopW = 8;
    const towerBotW = 11;
    const towerH = 60;
    const bands = 4;
    const bandH = towerH / bands;

    for (let i = 0; i < bands; i++) {
      const t0 = i / bands;
      const t1 = (i + 1) / bands;
      const w0 = towerBotW + (towerTopW - towerBotW) * t0;
      const w1 = towerBotW + (towerTopW - towerBotW) * t1;
      const y0 = -8 - bandH * i;
      const y1 = -8 - bandH * (i + 1);

      ctx.fillStyle = i % 2 === 0 ? "#C0392B" : "#ECEDED";
      ctx.beginPath();
      ctx.moveTo(-w0, y0);
      ctx.lineTo(-w1, y1);
      ctx.lineTo(w1, y1);
      ctx.lineTo(w0, y0);
      ctx.closePath();
      ctx.fill();
    }

    // Lamp room
    const lampY = -68;
    ctx.fillStyle = "#333";
    ctx.fillRect(-towerTopW - 1, lampY - 6, (towerTopW + 1) * 2, 6);

    // Glass dome
    ctx.fillStyle = "#F0E68C";
    ctx.beginPath();
    ctx.arc(0, lampY - 6, towerTopW, Math.PI, 0, false);
    ctx.fill();

    // Light beam (pulsing)
    const beamOpacity = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(this.beamPhase));
    ctx.fillStyle = `rgba(255, 255, 200, ${beamOpacity})`;
    ctx.beginPath();
    ctx.moveTo(0, lampY - 6);
    ctx.lineTo(60, lampY - 40);
    ctx.lineTo(60, lampY + 10);
    ctx.closePath();
    ctx.fill();

    // Beam on the other side (dimmer)
    ctx.fillStyle = `rgba(255, 255, 200, ${beamOpacity * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(0, lampY - 6);
    ctx.lineTo(-50, lampY - 35);
    ctx.lineTo(-50, lampY + 5);
    ctx.closePath();
    ctx.fill();
  }

  private renderCastle(ctx: CanvasRenderingContext2D): void {
    // Main wall
    ctx.fillStyle = "#8B8682";
    ctx.fillRect(-25, -40, 50, 40);

    // Left turret
    ctx.fillStyle = "#7B7872";
    ctx.fillRect(-30, -55, 12, 55);

    // Right turret
    ctx.fillRect(18, -55, 12, 55);

    // Turret crenellations — left
    const crenW = 4;
    const crenH = 5;
    for (let cx = -30; cx < -18; cx += crenW * 2) {
      ctx.fillRect(cx, -60, crenW, crenH);
    }
    // Right
    for (let cx = 18; cx < 30; cx += crenW * 2) {
      ctx.fillRect(cx, -60, crenW, crenH);
    }

    // Wall crenellations
    for (let cx = -25; cx < 25; cx += crenW * 2) {
      ctx.fillRect(cx, -45, crenW, crenH);
    }

    // Gate arch
    ctx.fillStyle = "#2C2C2C";
    ctx.beginPath();
    ctx.arc(0, 0, 8, Math.PI, 0, false);
    ctx.lineTo(8, 0);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    // Portcullis lines
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 0.8;
    for (let px = -6; px <= 6; px += 3) {
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, -Math.sqrt(64 - px * px));
      ctx.stroke();
    }

    // Windows above gate
    ctx.fillStyle = "#F0C040";
    ctx.fillRect(-8, -32, 5, 5);
    ctx.fillRect(3, -32, 5, 5);

    // Flag on right turret
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, -55);
    ctx.lineTo(24, -72);
    ctx.stroke();

    const flagTipOffset = Math.sin(this.flagPhase) * 3;
    ctx.fillStyle = "#4169E1";
    ctx.beginPath();
    ctx.moveTo(24, -72);
    ctx.lineTo(34 + flagTipOffset, -69);
    ctx.lineTo(24, -65);
    ctx.closePath();
    ctx.fill();
  }
}
