import { GameState } from "./types";
import { InputManager } from "./systems/InputManager";
import { Spawner } from "./systems/Spawner";
import { CollisionSystem } from "./systems/CollisionSystem";
import { Balloon } from "./entities/Balloon";
import { Arrow } from "./entities/Arrow";
import { Bow } from "./entities/Bow";
import { HUD } from "./rendering/HUD";

const MAX_ARROWS = 20;
const DT_CAP = 0.1;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private running = false;

  private state: GameState = "menu";
  private score = 0;
  private arrowsRemaining = MAX_ARROWS;
  private balloonsEscaped = 0;

  private balloons: Balloon[] = [];
  private arrows: Arrow[] = [];
  private bow: Bow;

  private input: InputManager;
  private spawner: Spawner;
  private collisions: CollisionSystem;
  private hud: HUD;

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

    this.input = new InputManager(this.canvas);
    this.spawner = new Spawner();
    this.collisions = new CollisionSystem();
    this.hud = new HUD();
    this.bow = new Bow(width, height);
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

    const dt = Math.min((time - this.lastTime) / 1000, DT_CAP);
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    switch (this.state) {
      case "menu":
        if (this.input.wasClicked) {
          this.resetGame();
          this.state = "playing";
        }
        break;

      case "playing":
        this.updatePlaying(dt);
        break;

      case "gameover":
        if (this.input.wasClicked) {
          this.state = "menu";
        }
        break;
    }
    this.input.consume();
  }

  private updatePlaying(dt: number): void {
    // Bow aiming
    this.bow.update(this.input.mousePos);

    // Shooting
    if (this.input.wasClicked && this.arrowsRemaining > 0) {
      const arrow = new Arrow(
        { x: this.bow.pos.x, y: this.bow.pos.y },
        this.bow.angle
      );
      this.arrows.push(arrow);
      this.arrowsRemaining--;
    }

    // Spawner
    const newBalloon = this.spawner.update(dt, this.width, this.height);
    if (newBalloon) {
      this.balloons.push(newBalloon);
    }

    // Update entities
    for (const balloon of this.balloons) {
      const wasAlive = balloon.alive;
      balloon.update(dt);
      if (wasAlive && !balloon.alive) {
        this.balloonsEscaped++;
      }
    }
    for (const arrow of this.arrows) {
      arrow.update(dt, this.width, this.height);
    }

    // Collisions
    const hits = this.collisions.check(this.arrows, this.balloons);
    this.score += hits.length;

    // Cleanup dead entities
    this.balloons = this.balloons.filter((b) => b.alive);
    this.arrows = this.arrows.filter((a) => a.alive);

    // Game-over check
    if (this.arrowsRemaining <= 0 && this.arrows.length === 0) {
      this.state = "gameover";
    }
  }

  private resetGame(): void {
    this.score = 0;
    this.arrowsRemaining = MAX_ARROWS;
    this.balloonsEscaped = 0;
    this.balloons = [];
    this.arrows = [];
    this.bow = new Bow(this.width, this.height);
    this.spawner.reset();
  }

  private render(): void {
    this.renderSky();

    if (this.state === "playing" || this.state === "gameover") {
      for (const balloon of this.balloons) {
        balloon.render(this.ctx);
      }
      for (const arrow of this.arrows) {
        arrow.render(this.ctx);
      }
      this.bow.render(this.ctx, this.arrowsRemaining > 0);

      // Ground strip
      this.ctx.fillStyle = "#3a7d44";
      this.ctx.fillRect(0, this.height - 15, this.width, 15);
    }

    this.hud.render(
      this.ctx,
      this.state,
      this.score,
      this.arrowsRemaining,
      this.width,
      this.height
    );
  }

  private renderSky(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, "#87CEEB");
    grad.addColorStop(1, "#4682B4");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Simple clouds
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    this.drawCloud(this.ctx, 120, 80, 50);
    this.drawCloud(this.ctx, 350, 130, 40);
    this.drawCloud(this.ctx, 600, 60, 55);
    this.drawCloud(this.ctx, 700, 170, 35);
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.4, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x - r * 0.5, y + r * 0.1, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
