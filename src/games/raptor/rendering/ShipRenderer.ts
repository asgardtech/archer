export interface ShipRenderState {
  thrustLevel: number;
  bankAngle: number;
  runningLightPhase: number;
  panelLightFlicker: number;
  heatShimmer: number;
  damageLevel: number;
}

const HULL_PRIMARY = "#4a5a56";
const HULL_SECONDARY = "#3d4d48";
const HULL_HIGHLIGHT = "#6b7d76";
const RUST_GRIME = "#8b5e3c";
const WELD_SEAM = "#7a8a84";
const COCKPIT_GLASS = "#b8e0d0";
const COCKPIT_GLOW = "#e8ffcc";
const ENGINE_HOUSING = "#2e3a36";
const RUNNING_RED = "#ff3333";
const RUNNING_GREEN = "#33ff55";
const PANEL_LIGHT = "#ffaa22";
const HULL_NUMBER_COLOR = "#8899aa";

export const ENGINE_SPACING_FACTOR = 0.42;

export class ShipRenderer {
  private dpr = 1;

  static getEngineSpacing(shipWidth: number): number {
    return shipWidth * ENGINE_SPACING_FACTOR;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    state: ShipRenderState,
    dpr: number = 1
  ): void {
    this.dpr = dpr;
    ctx.save();
    const hw = width / 2;
    const hh = height / 2;

    if (state.bankAngle !== 0) {
      ctx.translate(x, y);
      const scaleX = 1 - Math.abs(state.bankAngle) * 0.3;
      ctx.transform(scaleX, 0, state.bankAngle * 0.5, 1, 0, 0);
      ctx.translate(-x, -y);
    }

    this.renderEngineGlow(ctx, x, y, hw, hh, state.thrustLevel);
    this.renderHull(ctx, x, y, hw, hh);
    this.renderArmorPanels(ctx, x, y, hw, hh);
    if (this.dpr >= 1) {
      this.renderWeldSeams(ctx, x, y, hw, hh);
    }
    this.renderWeathering(ctx, x, y, hw, hh, state.damageLevel);
    this.renderWings(ctx, x, y, hw, hh);
    this.renderEngineHousings(ctx, x, y, hw, hh);
    this.renderCockpit(ctx, x, y, hw, hh);
    this.renderDetails(ctx, x, y, hw, hh);
    this.renderRunningLights(ctx, x, y, hw, hh, state.runningLightPhase);
    this.renderPanelWarningLight(ctx, x, y, hw, hh, state.panelLightFlicker);
    this.renderHeatShimmer(ctx, x, y, hw, hh, state.heatShimmer);

    if (state.damageLevel > 0.5) {
      this.renderDamageOverlay(ctx, x, y, hw, hh, state.damageLevel);
    }

    ctx.restore();
  }

  renderMiniSilhouette(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    const hw = w / 2;
    const hh = h / 2;
    const cx = x + hw;
    const cy = y + hh;

    ctx.strokeStyle = HULL_HIGHLIGHT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw * 0.35, cy - hh * 0.2);
    ctx.lineTo(cx + hw * 0.4, cy + hh * 0.3);
    ctx.lineTo(cx + hw * 0.9, cy + hh * 0.5);
    ctx.lineTo(cx + hw * 0.85, cy + hh * 0.8);
    ctx.lineTo(cx + hw * 0.3, cy + hh * 0.7);
    ctx.lineTo(cx + hw * 0.3, cy + hh);
    ctx.lineTo(cx - hw * 0.3, cy + hh);
    ctx.lineTo(cx - hw * 0.3, cy + hh * 0.7);
    ctx.lineTo(cx - hw * 0.85, cy + hh * 0.8);
    ctx.lineTo(cx - hw * 0.9, cy + hh * 0.5);
    ctx.lineTo(cx - hw * 0.4, cy + hh * 0.3);
    ctx.lineTo(cx - hw * 0.35, cy - hh * 0.2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private renderEngineGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    thrustLevel: number
  ): void {
    if (thrustLevel <= 0) return;
    ctx.save();
    const engineSpacing = hw * ENGINE_SPACING_FACTOR;
    const baseY = y + hh;
    const intensity = 0.5 + thrustLevel * 0.5;
    const flameLen = hh * 0.45 * intensity;
    const pulse = 1 + Math.sin(Date.now() * 0.025) * 0.15;

    for (const side of [-1, 1]) {
      const ex = x + side * engineSpacing;

      const outerGrad = ctx.createRadialGradient(
        ex, baseY, 0,
        ex, baseY + flameLen * 0.5, (hw * 0.25 + 2) * pulse
      );
      outerGrad.addColorStop(0, `rgba(255, 153, 68, ${0.7 * intensity})`);
      outerGrad.addColorStop(0.5, `rgba(255, 100, 20, ${0.4 * intensity})`);
      outerGrad.addColorStop(1, `rgba(255, 60, 0, 0)`);
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.ellipse(ex, baseY + flameLen * 0.3, hw * 0.22 * pulse, flameLen * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      const coreGrad = ctx.createLinearGradient(ex, baseY - 2, ex, baseY + flameLen * 0.7);
      coreGrad.addColorStop(0, `rgba(255, 255, 220, ${0.9 * intensity})`);
      coreGrad.addColorStop(0.3, `rgba(255, 221, 136, ${0.7 * intensity})`);
      coreGrad.addColorStop(1, `rgba(255, 153, 68, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.moveTo(ex - hw * 0.1, baseY);
      ctx.quadraticCurveTo(ex - hw * 0.06, baseY + flameLen * 0.4, ex, baseY + flameLen * 0.7 * pulse);
      ctx.quadraticCurveTo(ex + hw * 0.06, baseY + flameLen * 0.4, ex + hw * 0.1, baseY);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderHull(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();

    ctx.fillStyle = HULL_PRIMARY;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw * 0.22, y - hh * 0.65);
    ctx.lineTo(x + hw * 0.35, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.3);
    ctx.lineTo(x + hw * 0.35, y + hh * 0.7);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.85);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.85);
    ctx.lineTo(x - hw * 0.35, y + hh * 0.7);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.3);
    ctx.lineTo(x - hw * 0.35, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.22, y - hh * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = HULL_HIGHLIGHT;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  private renderArmorPanels(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();
    ctx.strokeStyle = HULL_SECONDARY;
    ctx.lineWidth = 0.6;

    ctx.beginPath();
    ctx.moveTo(x - hw * 0.32, y - hh * 0.1);
    ctx.lineTo(x + hw * 0.32, y - hh * 0.1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - hw * 0.38, y + hh * 0.15);
    ctx.lineTo(x + hw * 0.38, y + hh * 0.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - hw * 0.37, y + hh * 0.4);
    ctx.lineTo(x + hw * 0.37, y + hh * 0.4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - hw * 0.32, y + hh * 0.6);
    ctx.lineTo(x + hw * 0.32, y + hh * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.5);
    ctx.lineTo(x, y + hh * 0.4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + hw * 0.18, y - hh * 0.3);
    ctx.lineTo(x + hw * 0.2, y + hh * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - hw * 0.18, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.2, y + hh * 0.6);
    ctx.stroke();

    const panelOffsets = [
      { px: x - hw * 0.1, py: y - hh * 0.3, w: hw * 0.15, h: hh * 0.15 },
      { px: x + hw * 0.05, py: y + hh * 0.05, w: hw * 0.12, h: hh * 0.12 },
      { px: x - hw * 0.15, py: y + hh * 0.2, w: hw * 0.1, h: hh * 0.15 },
    ];
    for (const p of panelOffsets) {
      ctx.fillStyle = HULL_SECONDARY;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(p.px, p.py, p.w, p.h);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private renderWeldSeams(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();
    ctx.strokeStyle = WELD_SEAM;
    ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.6;

    const seams = [
      [x - hw * 0.1, y - hh * 0.5, x - hw * 0.12, y - hh * 0.1],
      [x + hw * 0.1, y - hh * 0.5, x + hw * 0.12, y - hh * 0.1],
      [x - hw * 0.25, y + hh * 0.15, x - hw * 0.22, y + hh * 0.55],
      [x + hw * 0.25, y + hh * 0.15, x + hw * 0.22, y + hh * 0.55],
      [x - hw * 0.05, y + hh * 0.45, x + hw * 0.05, y + hh * 0.45],
      [x - hw * 0.3, y + hh * 0.7, x + hw * 0.3, y + hh * 0.7],
    ];

    for (const [x1, y1, x2, y2] of seams) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderWeathering(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    damageLevel: number
  ): void {
    ctx.save();
    const baseAlpha = 0.15 + damageLevel * 0.2;

    ctx.fillStyle = RUST_GRIME;
    ctx.globalAlpha = baseAlpha;
    ctx.beginPath();
    ctx.moveTo(x + hw * 0.15, y - hh * 0.4);
    ctx.lineTo(x + hw * 0.2, y - hh * 0.1);
    ctx.lineTo(x + hw * 0.12, y + hh * 0.05);
    ctx.lineTo(x + hw * 0.08, y - hh * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.8;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.2, y + hh * 0.1);
    ctx.lineTo(x - hw * 0.12, y + hh * 0.4);
    ctx.lineTo(x - hw * 0.18, y + hh * 0.45);
    ctx.lineTo(x - hw * 0.25, y + hh * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.6;
    ctx.beginPath();
    ctx.ellipse(x - hw * 0.05, y + hh * 0.55, hw * 0.08, hh * 0.06, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.5;
    ctx.fillStyle = "#5a4a3a";
    ctx.beginPath();
    ctx.ellipse(x + hw * 0.1, y + hh * 0.3, hw * 0.06, hh * 0.04, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.4;
    ctx.fillStyle = RUST_GRIME;
    ctx.beginPath();
    ctx.moveTo(x + hw * 0.28, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.32, y + hh * 0.65);
    ctx.lineTo(x + hw * 0.25, y + hh * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderWings(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();

    for (const side of [-1, 1]) {
      ctx.fillStyle = HULL_SECONDARY;
      ctx.beginPath();
      ctx.moveTo(x + side * hw * 0.35, y + hh * 0.1);
      ctx.lineTo(x + side * hw * 0.95, y + hh * 0.4);
      ctx.lineTo(x + side * hw * 0.9, y + hh * 0.6);
      ctx.lineTo(x + side * hw * 0.8, y + hh * 0.65);
      ctx.lineTo(x + side * hw * 0.38, y + hh * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = HULL_HIGHLIGHT;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.strokeStyle = HULL_PRIMARY;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x + side * hw * 0.5, y + hh * 0.22);
      ctx.lineTo(x + side * hw * 0.85, y + hh * 0.52);
      ctx.stroke();

      ctx.fillStyle = HULL_HIGHLIGHT;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(x + side * hw * 0.35, y + hh * 0.1);
      ctx.lineTo(x + side * hw * 0.95, y + hh * 0.4);
      ctx.lineTo(x + side * hw * 0.9, y + hh * 0.45);
      ctx.lineTo(x + side * hw * 0.38, y + hh * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private renderEngineHousings(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();
    const engineSpacing = hw * ENGINE_SPACING_FACTOR;

    for (const side of [-1, 1]) {
      const ex = x + side * engineSpacing;

      ctx.fillStyle = ENGINE_HOUSING;
      ctx.beginPath();
      ctx.moveTo(ex - hw * 0.15, y + hh * 0.55);
      ctx.lineTo(ex + hw * 0.15, y + hh * 0.55);
      ctx.lineTo(ex + hw * 0.18, y + hh * 0.85);
      ctx.lineTo(ex + hw * 0.14, y + hh);
      ctx.lineTo(ex - hw * 0.14, y + hh);
      ctx.lineTo(ex - hw * 0.18, y + hh * 0.85);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = HULL_HIGHLIGHT;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.fillStyle = "#1a2220";
      ctx.beginPath();
      ctx.ellipse(ex, y + hh * 0.95, hw * 0.1, hh * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = HULL_SECONDARY;
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(ex - hw * 0.12, y + hh * 0.65);
      ctx.lineTo(ex + hw * 0.12, y + hh * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex - hw * 0.1, y + hh * 0.75);
      ctx.lineTo(ex + hw * 0.1, y + hh * 0.75);
      ctx.stroke();

      ctx.strokeStyle = "#556060";
      ctx.lineWidth = 0.3;
      for (let i = 0; i < 3; i++) {
        const pipeY = y + hh * (0.6 + i * 0.08);
        ctx.beginPath();
        ctx.moveTo(ex + side * hw * 0.15, pipeY);
        ctx.lineTo(ex + side * hw * 0.22, pipeY + hh * 0.04);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private renderCockpit(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();

    ctx.fillStyle = COCKPIT_GLASS;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.7);
    ctx.lineTo(x + hw * 0.14, y - hh * 0.35);
    ctx.quadraticCurveTo(x + hw * 0.12, y - hh * 0.15, x, y - hh * 0.1);
    ctx.quadraticCurveTo(x - hw * 0.12, y - hh * 0.15, x - hw * 0.14, y - hh * 0.35);
    ctx.closePath();
    ctx.fill();

    const glowGrad = ctx.createRadialGradient(
      x, y - hh * 0.35, 0,
      x, y - hh * 0.35, hh * 0.25
    );
    glowGrad.addColorStop(0, `rgba(232, 255, 204, 0.4)`);
    glowGrad.addColorStop(0.6, `rgba(232, 255, 204, 0.1)`);
    glowGrad.addColorStop(1, `rgba(232, 255, 204, 0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(x, y - hh * 0.35, hw * 0.18, hh * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = HULL_HIGHLIGHT;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.7);
    ctx.lineTo(x + hw * 0.14, y - hh * 0.35);
    ctx.quadraticCurveTo(x + hw * 0.12, y - hh * 0.15, x, y - hh * 0.1);
    ctx.quadraticCurveTo(x - hw * 0.12, y - hh * 0.15, x - hw * 0.14, y - hh * 0.35);
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COCKPIT_GLASS;
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.65);
    ctx.lineTo(x, y - hh * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.1, y - hh * 0.35);
    ctx.lineTo(x + hw * 0.1, y - hh * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  private renderDetails(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number
  ): void {
    ctx.save();

    if (this.dpr >= 1) {
      ctx.fillStyle = HULL_HIGHLIGHT;
      ctx.globalAlpha = 0.5;
      const rivetPositions = [
        [x - hw * 0.28, y - hh * 0.05],
        [x + hw * 0.28, y - hh * 0.05],
        [x - hw * 0.3, y + hh * 0.2],
        [x + hw * 0.3, y + hh * 0.2],
        [x - hw * 0.25, y + hh * 0.45],
        [x + hw * 0.25, y + hh * 0.45],
        [x - hw * 0.15, y + hh * 0.6],
        [x + hw * 0.15, y + hh * 0.6],
        [x - hw * 0.2, y - hh * 0.25],
        [x + hw * 0.2, y - hh * 0.25],
        [x, y + hh * 0.15],
        [x, y + hh * 0.35],
        [x - hw * 0.32, y + hh * 0.35],
        [x + hw * 0.32, y + hh * 0.35],
        [x - hw * 0.08, y - hh * 0.45],
        [x + hw * 0.08, y - hh * 0.45],
      ];
      for (const [rx, ry] of rivetPositions) {
        ctx.beginPath();
        ctx.arc(rx, ry, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.font = "4px monospace";
    ctx.fillStyle = HULL_NUMBER_COLOR;
    ctx.globalAlpha = 0.5;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("RA-227", x + hw * 0.05, y + hh * 0.5);
    ctx.globalAlpha = 1;

    ctx.fillStyle = HULL_SECONDARY;
    ctx.globalAlpha = 0.6;
    for (const side of [-1, 1]) {
      ctx.fillRect(
        x + side * hw * 0.28 - 1.5,
        y - hh * 0.15,
        3, 2
      );
      ctx.fillRect(
        x + side * hw * 0.32 - 1,
        y + hh * 0.1,
        2, 1.5
      );
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = HULL_HIGHLIGHT;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + hw * 0.05, y - hh * 0.85);
    ctx.lineTo(x + hw * 0.08, y - hh);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + hw * 0.08, y - hh, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = HULL_SECONDARY;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(x - hw * 0.12, y + hh * 0.65, hw * 0.08, hh * 0.06);
    ctx.fillRect(x + hw * 0.06, y + hh * 0.65, hw * 0.08, hh * 0.06);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "#556666";
    ctx.lineWidth = 0.3;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.3, y + hh * 0.55);
    ctx.quadraticCurveTo(x - hw * 0.2, y + hh * 0.52, x - hw * 0.1, y + hh * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + hw * 0.1, y + hh * 0.55);
    ctx.quadraticCurveTo(x + hw * 0.2, y + hh * 0.52, x + hw * 0.3, y + hh * 0.55);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private renderRunningLights(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    phase: number
  ): void {
    ctx.save();
    const cycle = phase % 1;
    const portOn = cycle < 0.7;
    const starboardOn = cycle >= 0.3;

    if (portOn) {
      ctx.fillStyle = RUNNING_RED;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x - hw * 0.88, y + hh * 0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x - hw * 0.88, y + hh * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (starboardOn) {
      ctx.fillStyle = RUNNING_GREEN;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x + hw * 0.88, y + hh * 0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(x + hw * 0.88, y + hh * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderPanelWarningLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    flicker: number
  ): void {
    if (flicker >= 0.6) return;
    ctx.save();
    ctx.fillStyle = PANEL_LIGHT;
    ctx.globalAlpha = 0.8 * flicker;
    ctx.beginPath();
    ctx.arc(x - hw * 0.08, y - hh * 0.05, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.25 * flicker;
    ctx.beginPath();
    ctx.arc(x - hw * 0.08, y - hh * 0.05, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderHeatShimmer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    shimmer: number
  ): void {
    if (shimmer <= 0) return;
    ctx.save();
    const engineSpacing = hw * ENGINE_SPACING_FACTOR;
    const baseY = y + hh;
    const displacement = shimmer * 1;

    ctx.globalAlpha = 0.06 + shimmer * 0.04;
    ctx.fillStyle = HULL_HIGHLIGHT;

    for (const side of [-1, 1]) {
      const ex = x + side * engineSpacing;
      for (let line = 0; line < 2; line++) {
        const ly = baseY + 2 + line * 3;
        const offset = Math.sin(Date.now() * 0.015 + line * 2 + side) * displacement;
        ctx.fillRect(ex - hw * 0.12, ly + offset, hw * 0.24, 1);
      }
    }

    ctx.restore();
  }

  private renderDamageOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hw: number,
    hh: number,
    damageLevel: number
  ): void {
    ctx.save();

    ctx.fillStyle = "#1a1008";
    ctx.globalAlpha = (damageLevel - 0.5) * 0.3;
    const scorchPositions = [
      [x - hw * 0.15, y - hh * 0.2, hw * 0.12, hh * 0.08],
      [x + hw * 0.1, y + hh * 0.15, hw * 0.1, hh * 0.06],
      [x - hw * 0.05, y + hh * 0.4, hw * 0.08, hh * 0.05],
    ];
    for (let idx = 0; idx < scorchPositions.length; idx++) {
      const [sx, sy, sw, sh] = scorchPositions[idx];
      ctx.beginPath();
      ctx.ellipse(sx, sy, sw, sh, 0.2 * idx, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (Math.random() < (damageLevel - 0.5) * 0.4) {
      const sparkX = x + (Math.random() - 0.5) * hw * 0.6;
      const sparkY = y + (Math.random() - 0.5) * hh * 0.8;
      ctx.fillStyle = "#ffff44";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 0.8 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
