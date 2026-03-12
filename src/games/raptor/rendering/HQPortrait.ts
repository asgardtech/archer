export class HQPortrait {
  static render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    const s = size / 100;
    const cx = x + size / 2;
    const cy = y + (size * 1.2) / 2;

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

    // Dark screen background
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(x, y, size, size * 1.2);

    // Subtle scan-line effect
    ctx.fillStyle = "rgba(40, 60, 30, 0.08)";
    for (let ly = 0; ly < size * 1.2; ly += 3 * s) {
      ctx.fillRect(x, y + ly, size, 1 * s);
    }

    // Radar sweep glow
    const sweepAngle = (elapsed * 1.2) % (Math.PI * 2);
    const radarR = 30 * s;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarR);
    grad.addColorStop(0, "rgba(80, 200, 60, 0.15)");
    grad.addColorStop(1, "rgba(80, 200, 60, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
    ctx.fill();

    // Radar rings
    ctx.strokeStyle = "rgba(80, 200, 60, 0.25)";
    ctx.lineWidth = 1 * s;
    for (let r = 10; r <= 30; r += 10) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cross-hairs
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

    // Sweep line
    const sweepEndX = cx + Math.cos(sweepAngle) * radarR;
    const sweepEndY = cy + Math.sin(sweepAngle) * radarR;
    ctx.strokeStyle = "rgba(100, 255, 80, 0.6)";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepEndX, sweepEndY);
    ctx.stroke();

    // Sweep fade trail
    ctx.fillStyle = "rgba(80, 200, 60, 0.12)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarR, sweepAngle - 0.5, sweepAngle);
    ctx.closePath();
    ctx.fill();

    // Blip dots (pulse with elapsed)
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

    // Center dot (own position)
    ctx.fillStyle = "rgba(220, 180, 60, 0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // "HQ" label at top of screen
    ctx.fillStyle = "rgba(220, 180, 60, 0.7)";
    ctx.font = `bold ${8 * s}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("HQ-COMM", cx, y + 6 * s);

    // Signal bars bottom-right
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

    ctx.restore();
  }
}
