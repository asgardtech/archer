import { GameDescriptor, IGame } from "../shared/types";
import { GAME_REGISTRY } from "./registry";

const CARD_WIDTH = 260;
const CARD_HEIGHT = 180;
const CARD_GAP = 30;
const CARD_RADIUS = 14;
const TITLE_HEIGHT = 100;

interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
  descriptor: GameDescriptor;
}

export class Launcher {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private running = false;
  private rafId = 0;
  private cards: CardRect[] = [];
  private hoverIndex = -1;
  private activeGame: IGame | null = null;
  private transitioning = false;
  private errorMessage = "";
  private errorTimer = 0;

  private boundMouseMove: (e: MouseEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundResize: () => void;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private lastTime = 0;

  constructor(canvasId: string) {
    const el = document.getElementById(canvasId);
    if (!el || !(el instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    this.canvas = el;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");
    this.ctx = ctx;

    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundClick = (e) => this.onClick(e);
    this.boundTouchStart = (e) => this.onTouchStart(e);
    this.boundResize = () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.resize(), 100);
    };

    this.layoutCards();
  }

  start(): void {
    this.running = true;
    this.attachListeners();
    this.resize();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private attachListeners(): void {
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("click", this.boundClick);
    this.canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("orientationchange", this.boundResize);
  }

  private detachListeners(): void {
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("click", this.boundClick);
    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("orientationchange", this.boundResize);
  }

  private resize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetRatio = this.width / this.height;
    let cssW: number, cssH: number;
    if (vw / vh < targetRatio) {
      cssW = vw;
      cssH = vw / targetRatio;
    } else {
      cssH = vh;
      cssW = vh * targetRatio;
    }
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
  }

  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private layoutCards(): void {
    const registry = GAME_REGISTRY;
    this.cards = [];

    const cols = Math.max(1, Math.floor((this.width + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    const totalWidth = cols * CARD_WIDTH + (cols - 1) * CARD_GAP;
    const startX = (this.width - totalWidth) / 2;
    const startY = TITLE_HEIGHT + 40;

    for (let i = 0; i < registry.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.cards.push({
        x: startX + col * (CARD_WIDTH + CARD_GAP),
        y: startY + row * (CARD_HEIGHT + CARD_GAP),
        w: CARD_WIDTH,
        h: CARD_HEIGHT,
        descriptor: registry[i],
      });
    }
  }

  private hitTest(x: number, y: number): number {
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i];
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        return i;
      }
    }
    return -1;
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.toCanvasCoords(e.clientX, e.clientY);
    this.hoverIndex = this.hitTest(x, y);
    this.canvas.style.cursor = this.hoverIndex >= 0 ? "pointer" : "default";
  }

  private onClick(e: MouseEvent): void {
    const { x, y } = this.toCanvasCoords(e.clientX, e.clientY);
    this.selectAt(x, y);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const { x, y } = this.toCanvasCoords(touch.clientX, touch.clientY);
    this.selectAt(x, y);
  }

  private selectAt(x: number, y: number): void {
    if (this.transitioning) return;
    const idx = this.hitTest(x, y);
    if (idx < 0) return;
    this.launchGame(this.cards[idx].descriptor);
  }

  private launchGame(descriptor: GameDescriptor): void {
    this.transitioning = true;
    this.detachListeners();
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.resizeTimer);

    let game: IGame;
    try {
      game = descriptor.createGame(this.canvas);
    } catch (err) {
      console.error(`Failed to launch game "${descriptor.id}":`, err);
      this.errorMessage = `Failed to launch ${descriptor.name}`;
      this.errorTimer = 3;
      this.transitioning = false;
      this.attachListeners();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    this.activeGame = game;

    game.onExit = () => {
      if (!this.activeGame) return;
      this.activeGame.destroy();
      this.activeGame = null;
      this.transitioning = false;
      this.hoverIndex = -1;
      this.canvas.style.cursor = "default";
      this.attachListeners();
      this.resize();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
    };

    game.start();
  }

  private loop(time: number): void {
    if (!this.running) return;
    const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;
    this.render(dt);
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private render(dt: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1a1a2e");
    grad.addColorStop(1, "#16213e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#e94560";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("Game Collection", w / 2, 55);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px sans-serif";
    ctx.fillText("Choose a game to play", w / 2, 90);

    ctx.restore();

    if (this.cards.length === 0) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "22px sans-serif";
      ctx.fillText("No games available", w / 2, h / 2);
      ctx.restore();
      return;
    }

    for (let i = 0; i < this.cards.length; i++) {
      this.renderCard(ctx, this.cards[i], i === this.hoverIndex);
    }

    if (this.errorMessage && this.errorTimer > 0) {
      this.errorTimer -= dt;
      const alpha = Math.min(1, this.errorTimer);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(this.errorMessage, w / 2, h - 40);
      ctx.restore();
    }
  }

  private renderCard(ctx: CanvasRenderingContext2D, card: CardRect, hover: boolean): void {
    const { x, y, w, h, descriptor } = card;

    ctx.save();

    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, CARD_RADIUS);
    ctx.fillStyle = descriptor.thumbnailColor;
    ctx.fill();

    if (hover) {
      ctx.strokeStyle = "#e94560";
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    this.roundRect(ctx, x, y + h - 70, w, 70, CARD_RADIUS);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(descriptor.name, x + w / 2, y + h - 48);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px sans-serif";
    const maxDescWidth = w - 20;
    const desc = this.truncateText(ctx, descriptor.description, maxDescWidth);
    ctx.fillText(desc, x + w / 2, y + h - 22);

    ctx.restore();
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "...";
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
