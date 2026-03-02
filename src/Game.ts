export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private running = false;

  constructor(canvasId: string, private width = 800, private height = 600) {
    const el = document.getElementById(canvasId);
    if (!el || !(el instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element "${canvasId}" not found`);
    }
    this.canvas = el;
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");
    this.ctx = ctx;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
  }

  private loop(time: number): void {
    if (!this.running) return;

    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(_dt: number): void {
    // Game logic goes here
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = "#0f3460";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = "#e94560";
    this.ctx.font = "32px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("Archer", this.width / 2, this.height / 2);

    this.ctx.fillStyle = "#16213e";
    this.ctx.font = "16px sans-serif";
    this.ctx.fillText(
      "Game engine running",
      this.width / 2,
      this.height / 2 + 40,
    );
  }
}
