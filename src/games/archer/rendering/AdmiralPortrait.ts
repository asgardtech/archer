export class AdmiralPortrait {
  static render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number,
    image?: HTMLImageElement | null
  ): void {
    if (image) {
      AdmiralPortrait.renderFromImage(ctx, x, y, size, image);
    } else {
      AdmiralPortrait.renderProcedural(ctx, x, y, size, elapsed);
    }
  }

  private static renderFromImage(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    image: HTMLImageElement
  ): void {
    const frameX = x - 4;
    const frameY = y - 4;
    const frameW = size + 8;
    const frameH = size * 1.2 + 8;

    ctx.save();

    // Clip inside the frame and draw the image
    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 1.2, 4);
    ctx.clip();
    ctx.drawImage(image, x, y, size, size * 1.2);

    ctx.restore();

    // Gold decorative frame border (drawn on top of image)
    ctx.strokeStyle = "rgba(180, 150, 80, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(140, 110, 50, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 8);
    ctx.stroke();
  }

  private static renderProcedural(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    elapsed: number
  ): void {
    const s = size / 100;
    const cx = x + size / 2;

    ctx.save();

    // Frame border (gold/bronze decorative)
    const frameX = x - 4;
    const frameY = y - 4;
    const frameW = size + 8;
    const frameH = size * 1.2 + 8;

    ctx.strokeStyle = "rgba(180, 150, 80, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 6);
    ctx.stroke();

    ctx.strokeStyle = "rgba(140, 110, 50, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(frameX - 2, frameY - 2, frameW + 4, frameH + 4, 8);
    ctx.stroke();

    // Clip inside the frame
    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 1.2, 4);
    ctx.clip();

    // Background
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(x, y, size, size * 1.2);

    // Shoulders / uniform
    const shoulderY = y + 85 * s;
    ctx.fillStyle = "#3a4a2a";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY + 20 * s, 45 * s, 25 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar
    ctx.fillStyle = "#2d3a1f";
    ctx.beginPath();
    ctx.moveTo(cx - 15 * s, shoulderY);
    ctx.lineTo(cx + 15 * s, shoulderY);
    ctx.lineTo(cx + 10 * s, shoulderY + 15 * s);
    ctx.lineTo(cx - 10 * s, shoulderY + 15 * s);
    ctx.closePath();
    ctx.fill();

    // Epaulettes (left)
    ctx.fillStyle = "#b89a4a";
    ctx.beginPath();
    ctx.roundRect(x + 5 * s, shoulderY + 2 * s, 14 * s, 8 * s, 2);
    ctx.fill();

    // Epaulettes (right)
    ctx.beginPath();
    ctx.roundRect(x + 81 * s, shoulderY + 2 * s, 14 * s, 8 * s, 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.ellipse(cx, shoulderY - 2 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face shape
    const faceY = y + 42 * s;
    ctx.fillStyle = "#d4a574";
    ctx.beginPath();
    ctx.ellipse(cx, faceY, 28 * s, 32 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jaw (more angular/stern)
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

    // Eyes - blinking animation
    const blinkCycle = elapsed % 4;
    const isBlinking = blinkCycle > 3.8;
    const eyeY = faceY - 2 * s;
    const eyeSpacing = 12 * s;

    if (isBlinking) {
      ctx.strokeStyle = "#3a2a1a";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx - eyeSpacing - 6 * s, eyeY);
      ctx.lineTo(cx - eyeSpacing + 6 * s, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + eyeSpacing - 6 * s, eyeY);
      ctx.lineTo(cx + eyeSpacing + 6 * s, eyeY);
      ctx.stroke();
    } else {
      // Eye whites
      ctx.fillStyle = "#f0e8d8";
      ctx.beginPath();
      ctx.ellipse(cx - eyeSpacing, eyeY, 6 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + eyeSpacing, eyeY, 6 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = "#2a1a0a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeSpacing + 1 * s, eyeY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows (stern, angled)
    ctx.strokeStyle = "#4a3a2a";
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpacing - 7 * s, eyeY - 8 * s);
    ctx.lineTo(cx - eyeSpacing + 5 * s, eyeY - 6 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpacing + 7 * s, eyeY - 8 * s);
    ctx.lineTo(cx + eyeSpacing - 5 * s, eyeY - 6 * s);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = "#b88a5a";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + 4 * s);
    ctx.lineTo(cx - 3 * s, eyeY + 14 * s);
    ctx.lineTo(cx + 3 * s, eyeY + 14 * s);
    ctx.stroke();

    // Mouth (stern frown)
    ctx.strokeStyle = "#8a5a3a";
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * s, faceY + 18 * s);
    ctx.quadraticCurveTo(cx, faceY + 16 * s, cx + 10 * s, faceY + 18 * s);
    ctx.stroke();

    // Beret / helmet
    ctx.fillStyle = "#2a3a1a";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 25 * s, 32 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e2e14";
    ctx.beginPath();
    ctx.arc(cx, faceY - 28 * s, 22 * s, Math.PI, 0);
    ctx.fill();

    // Beret badge
    ctx.fillStyle = "#b89a4a";
    ctx.beginPath();
    ctx.arc(cx, faceY - 26 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();

    // Beret rim
    ctx.fillStyle = "#1a2a10";
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 22 * s, 30 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rank stars on chest area
    const starY = shoulderY + 10 * s;
    AdmiralPortrait.drawStar(ctx, cx - 6 * s, starY, 3 * s, "#b89a4a");
    AdmiralPortrait.drawStar(ctx, cx + 6 * s, starY, 3 * s, "#b89a4a");

    ctx.restore();
  }

  private static drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}
