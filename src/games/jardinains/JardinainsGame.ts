import { IGame } from "../../shared/types";
import { JardinainsGameState, JardinainsLevelConfig, PowerUpType } from "./types";
import { LEVELS } from "./levels";
import { Paddle } from "./entities/Paddle";
import { Ball } from "./entities/Ball";
import { Brick, BRICK_OFFSET_LEFT, BRICK_WIDTH, BRICK_PADDING, BRICK_HEIGHT, BRICK_OFFSET_TOP } from "./entities/Brick";
import { Gnome } from "./entities/Gnome";
import { FlowerPot } from "./entities/FlowerPot";
import { PowerUp } from "./entities/PowerUp";
import { InputManager } from "./systems/InputManager";
import { CollisionSystem } from "./systems/CollisionSystem";
import { GnomeAI } from "./systems/GnomeAI";
import { PowerUpManager } from "./systems/PowerUpManager";
import { HUD } from "./rendering/HUD";

const DT_CAP = 0.1;
const SCORE_BRICK_STANDARD = 1;
const SCORE_BRICK_TOUGH = 3;
const SCORE_GNOME_CATCH = 5;
const SCORE_LEVEL_CLEAR = 10;
const POWER_UP_TYPES: PowerUpType[] = ["wide-paddle", "multi-ball", "sticky", "extra-life"];

export class JardinainsGame implements IGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private running = false;
  private destroyed = false;
  private rafId = 0;

  private state: JardinainsGameState = "menu";
  private currentLevel = 0;
  private score = 0;
  private lives = 3;

  private paddle: Paddle;
  private balls: Ball[] = [];
  private bricks: Brick[] = [];
  private gnomes: Gnome[] = [];
  private flowerPots: FlowerPot[] = [];
  private powerUps: PowerUp[] = [];

  private input: InputManager;
  private collisions: CollisionSystem;
  private gnomeAI: GnomeAI;
  private powerUpManager: PowerUpManager;
  private hud: HUD;

  private boundResize: (() => void) | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;

  public onExit: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, private width = 800, private height = 600) {
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");
    this.ctx = ctx;

    this.input = new InputManager(this.canvas);
    this.collisions = new CollisionSystem();
    this.gnomeAI = new GnomeAI();
    this.powerUpManager = new PowerUpManager();
    this.hud = new HUD(this.input.isTouchDevice);
    this.paddle = new Paddle(width, height);

    this.setupResize();
  }

  private get currentLevelConfig(): JardinainsLevelConfig {
    return LEVELS[this.currentLevel];
  }

  private setupResize(): void {
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
    this.boundResize = () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(resize, 100);
    };
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("orientationchange", this.boundResize);
    resize();
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.resizeTimer);

    this.input.destroy();

    if (this.boundResize) {
      window.removeEventListener("resize", this.boundResize);
      window.removeEventListener("orientationchange", this.boundResize);
      this.boundResize = null;
    }
  }

  private loop(time: number): void {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, DT_CAP);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
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

      case "level_complete":
        if (this.input.wasClicked) {
          if (this.currentLevel >= LEVELS.length - 1) {
            this.state = "victory";
          } else {
            this.startLevel(this.currentLevel + 1);
            this.state = "playing";
          }
        }
        break;

      case "gameover":
        if (this.input.wasClicked) {
          if (this.onExit) {
            this.onExit();
          } else {
            this.state = "menu";
          }
        }
        break;

      case "victory":
        if (this.input.wasClicked) {
          if (this.onExit) {
            this.onExit();
          } else {
            this.state = "menu";
          }
        }
        break;
    }
    this.input.consume();
  }

  private updatePlaying(dt: number): void {
    const config = this.currentLevelConfig;

    this.paddle.update(dt, this.input.mouseX, this.width);
    this.powerUpManager.update(dt);

    if (this.powerUpManager.isWidePaddleActive() && this.paddle.wideTimer <= 0) {
      this.paddle.applyWide();
    }

    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.pos.x = this.paddle.x + ball.stuckOffset;
        ball.pos.y = this.paddle.top - ball.radius;
        if (this.input.wasClicked) {
          ball.launch(config.ballSpeed);
          this.powerUpManager.consumeSticky();
        }
        continue;
      }

      ball.update(dt, this.width, this.height);

      this.collisions.checkBallPaddle(ball, this.paddle, this.powerUpManager.stickyActive);

      const hitBricks = this.collisions.checkBallBricks(ball, this.bricks);
      for (const brick of hitBricks) {
        const destroyed = brick.hit();
        if (destroyed) {
          if (brick.maxHitPoints >= 3) {
            this.score += SCORE_BRICK_TOUGH;
          } else {
            this.score += SCORE_BRICK_STANDARD;
          }

          if (brick.hasGnome) {
            for (const gnome of this.gnomes) {
              if (gnome.brickCol === brick.col && gnome.brickRow === brick.row) {
                gnome.startFalling();
              }
            }
          }

          if (brick.hasPowerUp && brick.powerUpType) {
            this.powerUps.push(new PowerUp(brick.centerX, brick.centerY, brick.powerUpType));
          }
        }
      }
    }

    const deadBalls = this.balls.filter((b) => !b.alive);
    this.balls = this.balls.filter((b) => b.alive);
    if (deadBalls.length > 0 && this.balls.length === 0) {
      this.lives--;
      if (this.lives <= 0) {
        this.state = "gameover";
        return;
      }
      this.spawnBallOnPaddle();
      this.paddle.reset(this.width);
      this.powerUpManager.reset();
    }

    const newPots = this.gnomeAI.update(
      this.gnomes, this.balls, dt,
      config.potThrowMinInterval, config.potThrowMaxInterval
    );
    for (const pot of newPots) {
      this.flowerPots.push(pot);
    }

    for (const gnome of this.gnomes) {
      gnome.update(dt);

      if (gnome.state === "falling") {
        if (this.collisions.checkGnomePaddle(gnome, this.paddle)) {
          gnome.catch();
          this.score += SCORE_GNOME_CATCH;
        }
      }

      gnome.isGone(this.height);
    }
    this.gnomes = this.gnomes.filter((g) => g.state !== "gone");

    for (const pot of this.flowerPots) {
      pot.update(dt, this.height);
      if (pot.alive && this.collisions.checkPotPaddle(pot, this.paddle)) {
        pot.alive = false;
        this.paddle.applyShrink();
      }
    }
    this.flowerPots = this.flowerPots.filter((p) => p.alive);

    for (const pu of this.powerUps) {
      pu.update(dt, this.height);
      if (pu.alive && this.collisions.checkPowerUpPaddle(pu, this.paddle)) {
        pu.alive = false;
        const result = this.powerUpManager.activate(pu.type);
        if (result.spawnMultiBall) {
          this.spawnMultiBalls();
        }
        if (result.extraLife) {
          this.lives++;
        }
        if (pu.type === "wide-paddle") {
          this.paddle.applyWide();
        }
      }
    }
    this.powerUps = this.powerUps.filter((p) => p.alive);

    const allBricksDestroyed = this.bricks.every((b) => !b.alive);
    if (allBricksDestroyed) {
      this.score += SCORE_LEVEL_CLEAR;
      this.state = "level_complete";
    }
  }

  private resetGame(): void {
    this.score = 0;
    this.lives = 3;
    this.startLevel(0);
  }

  private startLevel(levelIndex: number): void {
    this.currentLevel = levelIndex;
    const config = this.currentLevelConfig;

    this.bricks = [];
    this.gnomes = [];
    this.flowerPots = [];
    this.powerUps = [];
    this.balls = [];
    this.powerUpManager.reset();

    const layout = config.brickLayout;
    for (let row = 0; row < layout.length; row++) {
      for (let col = 0; col < layout[row].length; col++) {
        const hp = layout[row][col];
        if (hp > 0) {
          const brick = new Brick(col, row, hp);

          if (Math.random() < config.powerUpChance) {
            brick.hasPowerUp = true;
            brick.powerUpType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
          }

          this.bricks.push(brick);
        }
      }
    }

    for (const [col, row] of config.gnomePositions) {
      const brickX = BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_WIDTH / 2;
      const brickY = BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING);
      const gnome = new Gnome(
        brickX, brickY, col, row,
        config.potThrowMinInterval + Math.random() * (config.potThrowMaxInterval - config.potThrowMinInterval)
      );
      this.gnomes.push(gnome);

      const brick = this.bricks.find((b) => b.col === col && b.row === row);
      if (brick) brick.hasGnome = true;
    }

    this.paddle.reset(this.width);
    this.spawnBallOnPaddle();
  }

  private spawnBallOnPaddle(): void {
    const ball = new Ball(this.paddle.x, this.paddle.top - 6);
    ball.stuck = true;
    ball.stuckOffset = 0;
    this.balls.push(ball);
  }

  private spawnMultiBalls(): void {
    const existing = this.balls.find((b) => b.alive && !b.stuck);
    if (!existing) return;

    const speed = existing.getSpeed();
    for (let i = 0; i < 2; i++) {
      const newBall = new Ball(existing.pos.x, existing.pos.y);
      newBall.stuck = false;
      const angle = -Math.PI / 2 + (i === 0 ? -0.5 : 0.5);
      newBall.vel = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      };
      newBall.ensureMinVerticalSpeed();
      this.balls.push(newBall);
    }
  }

  private render(): void {
    this.renderBackground();

    if (this.state === "playing" || this.state === "level_complete") {
      for (const brick of this.bricks) {
        brick.render(this.ctx);
      }
      for (const gnome of this.gnomes) {
        gnome.render(this.ctx);
      }
      for (const pot of this.flowerPots) {
        pot.render(this.ctx);
      }
      for (const pu of this.powerUps) {
        pu.render(this.ctx);
      }
      for (const ball of this.balls) {
        ball.render(this.ctx);
      }
      this.paddle.render(this.ctx);

      this.renderGrass();
    }

    const config = this.currentLevelConfig;
    this.hud.render(
      this.ctx, this.state, this.score, this.lives,
      config.level, config.name,
      this.width, this.height
    );
  }

  private renderBackground(): void {
    const config = this.currentLevelConfig;
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, config.skyGradient[0]);
    grad.addColorStop(1, config.skyGradient[1]);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    this.drawCloud(150, 80, 40);
    this.drawCloud(400, 120, 35);
    this.drawCloud(650, 60, 45);
  }

  private drawCloud(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
    this.ctx.arc(x + r * 1.4, y, r * 0.6, 0, Math.PI * 2);
    this.ctx.arc(x - r * 0.5, y + r * 0.1, r * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderGrass(): void {
    this.ctx.fillStyle = "#3a7d44";
    this.ctx.fillRect(0, this.height - 10, this.width, 10);
  }
}
