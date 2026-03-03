import { GameState } from "./types";
import { InputManager } from "./systems/InputManager";
import { Spawner } from "./systems/Spawner";
import { CollisionSystem } from "./systems/CollisionSystem";
import { UpgradeManager } from "./systems/UpgradeManager";
import { Balloon } from "./entities/Balloon";
import { Arrow } from "./entities/Arrow";
import { Bow } from "./entities/Bow";
import { HUD } from "./rendering/HUD";

const MAX_ARROWS = 100;
const DT_CAP = 0.1;
const UPGRADE_BALLOON_SCORE = 3;
const BOSS_BALLOON_SCORE = 10;
const MILESTONE_INTERVAL = 25;
const MILESTONE_AMMO_BONUS = 5;
const BOSS_KILL_AMMO_BONUS = 15;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private running = false;
  private dt = 0;

  private state: GameState = "menu";
  private score = 0;
  private arrowsRemaining = MAX_ARROWS;
  private balloonsEscaped = 0;
  private nextAmmoMilestone = MILESTONE_INTERVAL;

  private balloons: Balloon[] = [];
  private arrows: Arrow[] = [];
  private bow: Bow;

  private input: InputManager;
  private spawner: Spawner;
  private collisions: CollisionSystem;
  private upgradeManager: UpgradeManager;
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
    this.upgradeManager = new UpgradeManager();
    this.hud = new HUD(this.input.isTouchDevice);
    this.bow = new Bow(width, height, this.input.isTouchDevice ? 60 : 30);

    this.setupResize();
  }

  private setupResize(): void {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const resize = () => {
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
    };
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    };
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("orientationchange", debouncedResize);
    resize();
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

    this.dt = Math.min((time - this.lastTime) / 1000, DT_CAP);
    this.lastTime = time;

    this.update(this.dt);
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
    this.bow.update(this.input.mousePos);
    this.upgradeManager.update(dt);

    // Shooting
    if (this.input.wasClicked && this.arrowsRemaining > 0) {
      const multiShot = this.upgradeManager.hasUpgrade("multi-shot");
      const isPiercing = this.upgradeManager.hasUpgrade("piercing");
      const isRapidFire = this.upgradeManager.hasUpgrade("rapid-fire");
      const angles = this.bow.getFireAngles(multiShot);

      for (const angle of angles) {
        const arrow = new Arrow(
          { x: this.bow.pos.x, y: this.bow.pos.y },
          angle
        );
        if (isPiercing) arrow.piercing = true;
        this.arrows.push(arrow);
      }

      if (!isRapidFire) {
        this.arrowsRemaining--;
      }
    }

    // Spawner
    const newBalloons = this.spawner.update(dt, this.width, this.height);
    for (const b of newBalloons) {
      this.balloons.push(b);
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
    for (const hit of hits) {
      if (hit.isBossKill) {
        this.score += BOSS_BALLOON_SCORE;
        this.arrowsRemaining += BOSS_KILL_AMMO_BONUS;
        this.hud.showAmmoGain(BOSS_KILL_AMMO_BONUS);
      } else if (hit.balloon.variant === "boss") {
        // Boss was hit but not killed — no score
      } else if (hit.balloon.variant === "upgrade") {
        this.score += UPGRADE_BALLOON_SCORE;
      } else {
        this.score += 1;
      }

      if (hit.grantedUpgrade) {
        this.upgradeManager.activate(hit.grantedUpgrade, () => {
          this.arrowsRemaining += 10;
          this.hud.showAmmoGain(10);
        });
      }
    }

    // Ammo milestones
    while (this.score >= this.nextAmmoMilestone) {
      this.arrowsRemaining += MILESTONE_AMMO_BONUS;
      this.hud.showAmmoGain(MILESTONE_AMMO_BONUS);
      this.nextAmmoMilestone += MILESTONE_INTERVAL;
    }

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
    this.nextAmmoMilestone = MILESTONE_INTERVAL;
    this.balloons = [];
    this.arrows = [];
    this.bow = new Bow(this.width, this.height, this.input.isTouchDevice ? 60 : 30);
    this.spawner.reset();
    this.upgradeManager.reset();
    this.hud.reset();
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
      this.bow.render(this.ctx, this.arrowsRemaining > 0, this.upgradeManager.getActive());

      this.ctx.fillStyle = "#3a7d44";
      this.ctx.fillRect(0, this.height - 15, this.width, 15);
    }

    this.hud.render(
      this.ctx,
      this.state,
      this.score,
      this.arrowsRemaining,
      this.width,
      this.height,
      this.upgradeManager.getActive(),
      this.dt
    );
  }

  private renderSky(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, "#87CEEB");
    grad.addColorStop(1, "#4682B4");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    this.drawCloud(this.ctx, this.width * 0.15, this.height * 0.133, 50);
    this.drawCloud(this.ctx, this.width * 0.4375, this.height * 0.217, 40);
    this.drawCloud(this.ctx, this.width * 0.75, this.height * 0.1, 55);
    this.drawCloud(this.ctx, this.width * 0.875, this.height * 0.283, 35);
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
