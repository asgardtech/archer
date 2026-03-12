export class WingmanPortrait {
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

    ctx.strokeStyle = "rgba(80, 180, 100, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(50, 140, 70, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 1.2, 4);
    ctx.clip();

    ctx.fillStyle = "#121e12";
    ctx.fillRect(x, y, size, size * 1.2);

    // Shoulders / flight suit
    const shoulderY = y + 85 * s;
    ctx.fillStyle = "#2a3a2a";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 20 * s, 45 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar
    ctx.fillStyle = "#223022";
    ctx.beginPath();
    ctx.moveTo(cx - 15 * s, shoulderY);
    ctx.lineTo(cx + 15 * s, shoulderY);
    ctx.lineTo(cx + 10 * s, shoulderY + 15 * s);
    ctx.lineTo(cx - 10 * s, shoulderY + 15 * s);
    ctx.closePath();
    ctx.fill();

    // Shoulder patches
    ctx.fillStyle = "#7a9a5a";
    ctx.beginPath();
    ctx.roundRect(x + 5 * s, shoulderY + 2 * s, 14 * s, 6 * s, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 81 * s, shoulderY + 2 * s, 14 * s, 6 * s, 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = "#c49464";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY - 2 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    const faceY = y + 42 * s;
    ctx.fillStyle = "#c49464";
    ctx.beginPath();
    ctx.ellipse(cx, faceY, 28 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jaw (slightly wider/rounder than pilot)
    ctx.fillStyle = "#b08454";
    ctx.beginPath();
    ctx.moveTo(cx - 24 * s, faceY + 8 * s);
    ctx.lineTo(cx, faceY + 30 * s);
    ctx.lineTo(cx + 24 * s, faceY + 8 * s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#c49464";
    ctx.beginPath();
    ctx.ellipse(cx, faceY + 5 * s, 26 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet shell (dark green)
    ctx.fillStyle = "#2a3a2a";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 20 * s, 34 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#223022";
    ctx.beginPath();
    ctx.arc(cx, faceY - 24 * s, 26 * s, Math.PI, 0);
    ctx.fill();

    // Helmet rim
    ctx.fillStyle = "#1a281a";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 14 * s, 32 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Visor (green-tinted)
    ctx.fillStyle = "rgba(80, 200, 100, 0.3)";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 4 * s, 24 * s, 10 * s, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "rgba(80, 200, 100, 0.45)";
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // Eyes - blinking
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

      ctx.fillStyle = "#2a4a1a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows (slightly more relaxed than pilot)
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpacing - 6 * s, eyeY - 6.5 * s);
    ctx.lineTo(cx - eyeSpacing + 4 * s, eyeY - 5.5 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpacing + 6 * s, eyeY - 6.5 * s);
    ctx.lineTo(cx + eyeSpacing - 4 * s, eyeY - 5.5 * s);
    ctx.stroke();

    // Oxygen mask outline
    ctx.strokeStyle = "#1a281a";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * s, faceY + 8 * s);
    ctx.quadraticCurveTo(cx, faceY + 26 * s, cx + 10 * s, faceY + 8 * s);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = "#a07a4a";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + 4 * s);
    ctx.lineTo(cx - 3 * s, eyeY + 12 * s);
    ctx.lineTo(cx + 3 * s, eyeY + 12 * s);
    ctx.stroke();

    // Mouth (slight grin)
    ctx.strokeStyle = "#7a4a2a";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 9 * s, faceY + 16 * s);
    ctx.quadraticCurveTo(cx, faceY + 19 * s, cx + 9 * s, faceY + 16 * s);
    ctx.stroke();

    // W-2 badge on chest
    const badgeY = shoulderY + 8 * s;
    ctx.fillStyle = "#7a9a5a";
    ctx.beginPath();
    ctx.roundRect(cx - 10 * s, badgeY, 20 * s, 10 * s, 2);
    ctx.fill();
    ctx.fillStyle = "#1a281a";
    ctx.font = `bold ${6 * s}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("W-2", cx, badgeY + 5 * s);

    ctx.restore();
  }
}
