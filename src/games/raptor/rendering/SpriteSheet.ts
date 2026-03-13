export class SpriteSheet {
  private image: HTMLImageElement | HTMLCanvasElement;
  private fw: number;
  private fh: number;
  private cols: number;
  private _frameCount: number;
  private dpr: number;

  constructor(
    image: HTMLImageElement | HTMLCanvasElement,
    frameWidth: number,
    frameHeight: number,
    totalFrames?: number,
    dpr = 1
  ) {
    this.image = image;
    this.fw = frameWidth;
    this.fh = frameHeight;
    this.dpr = dpr;
    this.cols = Math.floor(image.width / (frameWidth * dpr));
    const rows = Math.floor(image.height / (frameHeight * dpr));
    this._frameCount = totalFrames ?? this.cols * rows;
  }

  get frameCount(): number {
    return this._frameCount;
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    frame: number,
    x: number,
    y: number,
    w?: number,
    h?: number
  ): void {
    const f = Math.max(0, Math.min(frame, this._frameCount - 1));
    const col = f % this.cols;
    const row = Math.floor(f / this.cols);
    const srcW = this.fw * this.dpr;
    const srcH = this.fh * this.dpr;
    const sx = col * srcW;
    const sy = row * srcH;
    const dw = w ?? this.fw;
    const dh = h ?? this.fh;

    ctx.drawImage(this.image, sx, sy, srcW, srcH, x - dw / 2, y - dh / 2, dw, dh);
  }
}

export function generateExplosionSheet(frames = 8, frameSize = 64, dpr = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frameSize * frames * dpr;
  canvas.height = frameSize * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  for (let f = 0; f < frames; f++) {
    const cx = f * frameSize + frameSize / 2;
    const cy = frameSize / 2;
    const progress = f / (frames - 1);

    const maxR = (frameSize / 2) * 0.9;

    if (progress < 0.5) {
      const t = progress * 2;
      const r = maxR * (0.3 + t * 0.7);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${1 - t * 0.3})`);
      grad.addColorStop(0.3, `rgba(255, 220, 50, ${0.9 - t * 0.2})`);
      grad.addColorStop(0.6, `rgba(255, 120, 0, ${0.8 - t * 0.2})`);
      grad.addColorStop(1, `rgba(200, 40, 0, ${0.6 - t * 0.3})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const t = (progress - 0.5) * 2;
      const r = maxR * (1 - t * 0.2);
      const alpha = 1 - t;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.6})`);
      grad.addColorStop(0.4, `rgba(255, 100, 0, ${alpha * 0.5})`);
      grad.addColorStop(0.7, `rgba(180, 40, 0, ${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(80, 20, 0, ${alpha * 0.1})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      const sparks = 6 + Math.floor(t * 4);
      for (let i = 0; i < sparks; i++) {
        const a = (i / sparks) * Math.PI * 2 + f * 0.5;
        const dist = r * (0.5 + t * 0.5);
        const sx = cx + Math.cos(a) * dist;
        const sy = cy + Math.sin(a) * dist;
        const sr = 2 + (1 - t) * 3;

        ctx.fillStyle = `rgba(255, ${150 + Math.floor(Math.random() * 100)}, 0, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return canvas;
}

export function generateThrustSheet(frames = 4, frameWidth = 16, frameHeight = 24, dpr = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth * frames * dpr;
  canvas.height = frameHeight * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  for (let f = 0; f < frames; f++) {
    const cx = f * frameWidth + frameWidth / 2;
    const intensity = 0.6 + Math.sin((f / frames) * Math.PI * 2) * 0.4;
    const flameH = frameHeight * 0.8 * intensity;

    const grad = ctx.createLinearGradient(cx, 0, cx, flameH);
    grad.addColorStop(0, `rgba(255, 200, 50, ${0.8 * intensity})`);
    grad.addColorStop(0.4, `rgba(255, 140, 0, ${0.7 * intensity})`);
    grad.addColorStop(1, `rgba(255, 60, 0, ${0.1 * intensity})`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - frameWidth * 0.35, 0);
    ctx.quadraticCurveTo(cx - frameWidth * 0.2, flameH * 0.6, cx, flameH);
    ctx.quadraticCurveTo(cx + frameWidth * 0.2, flameH * 0.6, cx + frameWidth * 0.35, 0);
    ctx.fill();

    const innerGrad = ctx.createLinearGradient(cx, 0, cx, flameH * 0.6);
    innerGrad.addColorStop(0, `rgba(255, 255, 200, ${0.9 * intensity})`);
    innerGrad.addColorStop(1, `rgba(255, 200, 50, ${0.2 * intensity})`);
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(cx - frameWidth * 0.15, 0);
    ctx.quadraticCurveTo(cx - frameWidth * 0.08, flameH * 0.3, cx, flameH * 0.6);
    ctx.quadraticCurveTo(cx + frameWidth * 0.08, flameH * 0.3, cx + frameWidth * 0.15, 0);
    ctx.fill();
  }

  return canvas;
}
