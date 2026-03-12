export class PilotPortrait {
  static render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    const s = size / 100;
    const cx = x + size / 2;

    ctx.save();

    const frameX = x - 4;
    const frameY = y - 4;
    const frameW = size + 8;
    const frameH = size * 1.2 + 8;

    ctx.strokeStyle = "rgba(80, 130, 220, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(60, 100, 180, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 1.2, 4);
    ctx.clip();

    ctx.fillStyle = "#0f1a2e";
    ctx.fillRect(x, y, size, size * 1.2);

    // Shoulders / flight suit
    const shoulderY = y + 85 * s;
    ctx.fillStyle = "#1a2a4a";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 20 * s, 45 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar / suit neckline
    ctx.fillStyle = "#152240";
    ctx.beginPath();
    ctx.moveTo(cx - 15 * s, shoulderY);
    ctx.lineTo(cx + 15 * s, shoulderY);
    ctx.lineTo(cx + 10 * s, shoulderY + 15 * s);
    ctx.lineTo(cx - 10 * s, shoulderY + 15 * s);
    ctx.closePath();
    ctx.fill();

    // Suit shoulder patches
    ctx.fillStyle = "#b89a4a";
    ctx.beginPath();
    ctx.roundRect(x + 5 * s, shoulderY + 2 * s, 14 * s, 6 * s, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 81 * s, shoulderY + 2 * s, 14 * s, 6 * s, 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY - 2 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    const faceY = y + 42 * s;
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.ellipse(cx, faceY, 28 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jaw
    ctx.fillStyle = "#c89a68";
    ctx.beginPath();
    ctx.moveTo(cx - 22 * s, faceY + 10 * s);
    ctx.lineTo(cx, faceY + 32 * s);
    ctx.lineTo(cx + 22 * s, faceY + 10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.ellipse(cx, faceY + 5 * s, 26 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet shell
    ctx.fillStyle = "#1a2a4a";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 20 * s, 34 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#132040";
    ctx.beginPath();
    ctx.arc(cx, faceY - 24 * s, 26 * s, Math.PI, 0);
    ctx.fill();

    // Helmet rim
    ctx.fillStyle = "#0e1830";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 14 * s, 32 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Visor (gold-tinted)
    ctx.fillStyle = "rgba(200, 170, 60, 0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 4 * s, 24 * s, 10 * s, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 170, 60, 0.5)";
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // Eyes (visible through visor) - blinking
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

      ctx.fillStyle = "#1a3a6a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows
    ctx.strokeStyle = "#4a3a2a";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpacing - 6 * s, eyeY - 7 * s);
    ctx.lineTo(cx - eyeSpacing + 4 * s, eyeY - 5.5 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpacing + 6 * s, eyeY - 7 * s);
    ctx.lineTo(cx + eyeSpacing - 4 * s, eyeY - 5.5 * s);
    ctx.stroke();

    // Oxygen mask outline
    ctx.strokeStyle = "#0e1830";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * s, faceY + 8 * s);
    ctx.quadraticCurveTo(cx, faceY + 26 * s, cx + 10 * s, faceY + 8 * s);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = "#b88a5a";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + 4 * s);
    ctx.lineTo(cx - 2 * s, eyeY + 12 * s);
    ctx.lineTo(cx + 2 * s, eyeY + 12 * s);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = "#8a5a3a";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, faceY + 17 * s);
    ctx.quadraticCurveTo(cx, faceY + 15 * s, cx + 8 * s, faceY + 17 * s);
    ctx.stroke();

    // R-1 badge on chest
    const badgeY = shoulderY + 8 * s;
    ctx.fillStyle = "#b89a4a";
    ctx.beginPath();
    ctx.roundRect(cx - 10 * s, badgeY, 20 * s, 10 * s, 2);
    ctx.fill();
    ctx.fillStyle = "#0e1830";
    ctx.font = `bold ${6 * s}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("R-1", cx, badgeY + 5 * s);

    ctx.restore();
  }
}
