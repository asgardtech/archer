export class HQPortrait {
  static render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    ctx.save();

    const frameX = x - 4;
    const frameY = y - 4;
    const frameW = size + 8;
    const frameH = size * 1.2 + 8;

    ctx.strokeStyle = "rgba(220, 180, 60, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180, 140, 40, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 1.2, 4);
    ctx.clip();

    HQPortrait.renderAdmiral(ctx, x, y, size, elapsed);

    ctx.restore();
  }

  static renderAdmiral(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    const s = size / 100;
    const cx = x + size / 2;
    const faceY = y + 42 * s;
    const shoulderY = y + 85 * s;

    ctx.fillStyle = "#0f1a2e";
    ctx.fillRect(x, y, size, size * 1.2);

    // Shoulders / dress uniform — distinct navy visible against background
    ctx.fillStyle = "#1a2844";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 20 * s, 45 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoulder seam lines
    ctx.strokeStyle = "#243258";
    ctx.lineWidth = Math.max(0.5, 1 * s);
    ctx.beginPath();
    ctx.moveTo(cx - 20 * s, shoulderY + 4 * s);
    ctx.quadraticCurveTo(cx - 36 * s, shoulderY + 12 * s, cx - 44 * s, shoulderY + 22 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 20 * s, shoulderY + 4 * s);
    ctx.quadraticCurveTo(cx + 36 * s, shoulderY + 12 * s, cx + 44 * s, shoulderY + 22 * s);
    ctx.stroke();

    // Lapel lines
    ctx.beginPath();
    ctx.moveTo(cx - 6 * s, shoulderY + 2 * s);
    ctx.lineTo(cx - 10 * s, shoulderY + 24 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 6 * s, shoulderY + 2 * s);
    ctx.lineTo(cx + 10 * s, shoulderY + 24 * s);
    ctx.stroke();

    // Medal ribbons on left chest
    const ribbonY = shoulderY + 6 * s;
    const ribbonX = cx - 26 * s;
    const rw = Math.max(1, 4 * s);
    const rh = Math.max(1, 2.5 * s);
    const ribbonGap = Math.max(0.5, 1 * s);
    ctx.fillStyle = "#c83030";
    ctx.fillRect(ribbonX, ribbonY, rw, rh);
    ctx.fillStyle = "#3060c8";
    ctx.fillRect(ribbonX + rw, ribbonY, rw, rh);
    ctx.fillStyle = "#c8a832";
    ctx.fillRect(ribbonX + rw * 2, ribbonY, rw, rh);
    ctx.fillStyle = "#30a040";
    ctx.fillRect(ribbonX, ribbonY + rh + ribbonGap, rw, rh);
    ctx.fillStyle = "#f0e0a0";
    ctx.fillRect(ribbonX + rw, ribbonY + rh + ribbonGap, rw, rh);
    ctx.fillStyle = "#8040a0";
    ctx.fillRect(ribbonX + rw * 2, ribbonY + rh + ribbonGap, rw, rh);

    // Button row down center
    ctx.fillStyle = "#c8a832";
    for (let i = 0; i < 3; i++) {
      const btnY = shoulderY + 14 * s + i * 6 * s;
      ctx.beginPath();
      ctx.arc(cx, btnY, Math.max(0.5, 1.5 * s), 0, Math.PI * 2);
      ctx.fill();
    }

    // Collar — toned-down off-white
    ctx.fillStyle = "#d8d8d0";
    ctx.beginPath();
    ctx.moveTo(cx - 12 * s, shoulderY - 2 * s);
    ctx.lineTo(cx + 12 * s, shoulderY - 2 * s);
    ctx.lineTo(cx + 8 * s, shoulderY + 10 * s);
    ctx.lineTo(cx - 8 * s, shoulderY + 10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#b8b8b0";
    ctx.lineWidth = Math.max(0.5, 0.8 * s);
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, shoulderY + 10 * s);
    ctx.lineTo(cx + 8 * s, shoulderY + 10 * s);
    ctx.stroke();

    // Gold epaulettes
    ctx.fillStyle = "#c8a832";
    ctx.beginPath();
    ctx.roundRect(x + 3 * s, shoulderY, 16 * s, 8 * s, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 81 * s, shoulderY, 16 * s, 8 * s, 2);
    ctx.fill();

    // Epaulette shadows
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.roundRect(x + 3 * s, shoulderY + 7 * s, 16 * s, 3 * s, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 81 * s, shoulderY + 7 * s, 16 * s, 3 * s, 1);
    ctx.fill();

    // Gold bars on epaulettes
    ctx.fillStyle = "#e8c840";
    ctx.fillRect(x + 5 * s, shoulderY + 2 * s, 12 * s, 1.5 * s);
    ctx.fillRect(x + 5 * s, shoulderY + 5 * s, 12 * s, 1.5 * s);
    ctx.fillRect(x + 83 * s, shoulderY + 2 * s, 12 * s, 1.5 * s);
    ctx.fillRect(x + 83 * s, shoulderY + 5 * s, 12 * s, 1.5 * s);

    // Neck
    ctx.fillStyle = "#c89a70";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY - 4 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears — positioned further out to avoid hair overlap
    ctx.fillStyle = "#c08a64";
    ctx.beginPath();
    ctx.ellipse(cx - 33 * s, faceY + 4 * s, 4 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 33 * s, faceY + 4 * s, 4 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#a87a54";
    ctx.lineWidth = Math.max(0.5, 0.7 * s);
    ctx.beginPath();
    ctx.arc(cx - 33 * s, faceY + 4 * s, 2 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 33 * s, faceY + 4 * s, 2 * s, 0, Math.PI * 2);
    ctx.stroke();

    // Face
    ctx.fillStyle = "#c89a70";
    ctx.beginPath();
    ctx.ellipse(cx, faceY, 30 * s, 33 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jaw — smoothed with curves, color close to face tone
    ctx.fillStyle = "#c09268";
    ctx.beginPath();
    ctx.moveTo(cx - 26 * s, faceY + 8 * s);
    ctx.quadraticCurveTo(cx - 13 * s, faceY + 32 * s, cx, faceY + 33 * s);
    ctx.quadraticCurveTo(cx + 13 * s, faceY + 32 * s, cx + 26 * s, faceY + 8 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#c89a70";
    ctx.beginPath();
    ctx.ellipse(cx, faceY + 5 * s, 28 * s, 23 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Short gray hair — unified base color
    ctx.fillStyle = "#888888";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 18 * s, 32 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8c8c8c";
    ctx.beginPath();
    ctx.arc(cx, faceY - 22 * s, 24 * s, Math.PI, 0);
    ctx.fill();

    // Temple sides — subtle darkening, close to base color
    ctx.fillStyle = "#828282";
    ctx.beginPath();
    ctx.ellipse(cx - 29 * s, faceY - 8 * s, 5 * s, 12 * s, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 29 * s, faceY - 8 * s, 5 * s, 12 * s, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Forehead lines (age detail)
    ctx.strokeStyle = "rgba(160, 128, 96, 0.4)";
    ctx.lineWidth = Math.max(0.5, 0.7 * s);
    for (let i = 0; i < 3; i++) {
      const lineY = faceY - 14 * s + i * 3 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * s, lineY);
      ctx.quadraticCurveTo(cx, lineY - 1 * s, cx + 14 * s, lineY);
      ctx.stroke();
    }

    // Eyes with blinking
    const blinkCycle = elapsed % 4;
    const isBlinking = blinkCycle > 3.8;
    const eyeY = faceY - 2 * s;
    const eyeSpacing = 12 * s;

    if (isBlinking) {
      ctx.strokeStyle = "#3a2a1a";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - eyeSpacing - 5 * s, eyeY);
      ctx.lineTo(cx - eyeSpacing + 5 * s, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + eyeSpacing - 5 * s, eyeY);
      ctx.lineTo(cx + eyeSpacing + 5 * s, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#f0e8d8";
      ctx.beginPath();
      ctx.ellipse(cx - eyeSpacing, eyeY, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + eyeSpacing, eyeY, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blue-gray irises
      ctx.fillStyle = "#4a6a8a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a2a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing + 1 * s, eyeY, Math.max(0.5, 1.2 * s), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeSpacing + 1 * s, eyeY, Math.max(0.5, 1.2 * s), 0, Math.PI * 2);
      ctx.fill();
    }

    // Crow's feet near eyes (age detail)
    ctx.strokeStyle = "rgba(160, 128, 96, 0.45)";
    ctx.lineWidth = Math.max(0.5, 0.7 * s);
    for (let i = 0; i < 3; i++) {
      const dy = (i - 1) * 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - eyeSpacing - 6 * s, eyeY + dy);
      ctx.lineTo(cx - eyeSpacing - 10 * s, eyeY + dy + (i - 1) * 1.5 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + eyeSpacing + 6 * s, eyeY + dy);
      ctx.lineTo(cx + eyeSpacing + 10 * s, eyeY + dy + (i - 1) * 1.5 * s);
      ctx.stroke();
    }

    // Stern eyebrows (angled down)
    ctx.strokeStyle = "#5a5a5a";
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpacing - 7 * s, eyeY - 8 * s);
    ctx.lineTo(cx - eyeSpacing + 4 * s, eyeY - 5 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpacing + 7 * s, eyeY - 8 * s);
    ctx.lineTo(cx + eyeSpacing - 4 * s, eyeY - 5 * s);
    ctx.stroke();

    // Nasolabial creases (age detail)
    ctx.strokeStyle = "rgba(160, 120, 80, 0.35)";
    ctx.lineWidth = Math.max(0.5, 0.8 * s);
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, eyeY + 8 * s);
    ctx.quadraticCurveTo(cx - 10 * s, faceY + 14 * s, cx - 11 * s, faceY + 20 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8 * s, eyeY + 8 * s);
    ctx.quadraticCurveTo(cx + 10 * s, faceY + 14 * s, cx + 11 * s, faceY + 20 * s);
    ctx.stroke();

    // Nose (slightly broader)
    ctx.strokeStyle = "#a07a54";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + 4 * s);
    ctx.lineTo(cx - 3 * s, eyeY + 13 * s);
    ctx.lineTo(cx + 3 * s, eyeY + 13 * s);
    ctx.stroke();

    // Firm mouth
    ctx.strokeStyle = "#7a4a30";
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 9 * s, faceY + 18 * s);
    ctx.lineTo(cx + 9 * s, faceY + 18 * s);
    ctx.stroke();

    // Chin crease
    ctx.strokeStyle = "#a08060";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * s, faceY + 24 * s);
    ctx.quadraticCurveTo(cx, faceY + 26 * s, cx + 4 * s, faceY + 24 * s);
    ctx.stroke();

    // ADM badge on chest
    const badgeY = shoulderY + 8 * s;
    ctx.fillStyle = "#c8a832";
    ctx.beginPath();
    ctx.roundRect(cx - 10 * s, badgeY, 20 * s, 10 * s, 2);
    ctx.fill();
    ctx.fillStyle = "#1a2844";
    ctx.font = `bold ${6 * s}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ADM", cx, badgeY + 5 * s);
  }

  static renderSensor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    ctx.save();

    const frameX = x - 4;
    const frameY = y - 4;
    const frameW = size + 8;
    const frameH = size * 1.2 + 8;

    ctx.strokeStyle = "rgba(220, 180, 60, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180, 140, 40, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 1.2, 4);
    ctx.clip();

    HQPortrait.renderRadar(ctx, x, y, size, elapsed);

    ctx.restore();
  }

  static renderRadar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    const s = size / 100;
    const cx = x + size / 2;
    const cy = y + (size * 1.2) / 2;

    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(x, y, size, size * 1.2);

    ctx.fillStyle = "rgba(40, 60, 30, 0.08)";
    for (let ly = 0; ly < size * 1.2; ly += 3 * s) {
      ctx.fillRect(x, y + ly, size, 1 * s);
    }

    const sweepAngle = (elapsed * 1.2) % (Math.PI * 2);
    const radarR = 30 * s;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarR);
    grad.addColorStop(0, "rgba(80, 200, 60, 0.15)");
    grad.addColorStop(1, "rgba(80, 200, 60, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(80, 200, 60, 0.25)";
    ctx.lineWidth = 1 * s;
    for (let r = 10; r <= 30; r += 10) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(80, 200, 60, 0.2)";
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 32 * s, cy);
    ctx.lineTo(cx + 32 * s, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 38 * s);
    ctx.lineTo(cx, cy + 38 * s);
    ctx.stroke();

    const sweepEndX = cx + Math.cos(sweepAngle) * radarR;
    const sweepEndY = cy + Math.sin(sweepAngle) * radarR;
    ctx.strokeStyle = "rgba(100, 255, 80, 0.6)";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepEndX, sweepEndY);
    ctx.stroke();

    ctx.fillStyle = "rgba(80, 200, 60, 0.12)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarR, sweepAngle - 0.5, sweepAngle);
    ctx.closePath();
    ctx.fill();

    const blipPulse = Math.sin(elapsed * 3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(100, 255, 80, ${blipPulse * 0.8})`;
    ctx.beginPath();
    ctx.arc(cx + 12 * s, cy - 8 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - 16 * s, cy + 5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5 * s, cy + 18 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(220, 180, 60, 0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(220, 180, 60, 0.7)";
    ctx.font = `bold ${8 * s}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("SENSOR", cx, y + 6 * s);

    const barX = x + size - 18 * s;
    const barBaseY = y + size * 1.2 - 10 * s;
    const barBlink = elapsed % 2 < 1.7;
    ctx.fillStyle = barBlink
      ? "rgba(100, 255, 80, 0.6)"
      : "rgba(100, 255, 80, 0.3)";
    for (let i = 0; i < 4; i++) {
      const bh = (i + 1) * 3 * s;
      ctx.fillRect(barX + i * 3.5 * s, barBaseY - bh, 2 * s, bh);
    }
  }
}
