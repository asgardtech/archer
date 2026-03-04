import { IGame } from "../../shared/types";
import { RaptorGameState, RaptorLevelConfig, RaptorPowerUpType } from "./types";
import { LEVELS } from "./levels";
import { Player } from "./entities/Player";
import { Bullet } from "./entities/Bullet";
import { Enemy } from "./entities/Enemy";
import { EnemyBullet } from "./entities/EnemyBullet";
import { Explosion } from "./entities/Explosion";
import { PowerUp } from "./entities/PowerUp";
import { InputManager } from "./systems/InputManager";
import { CollisionSystem } from "./systems/CollisionSystem";
import { EnemySpawner } from "./systems/EnemySpawner";
import { PowerUpManager } from "./systems/PowerUpManager";
import { SoundSystem } from "./systems/SoundSystem";
import { AudioManager } from "../../shared/AudioManager";
import { HUD } from "./rendering/HUD";

const DT_CAP = 0.1;
const MAX_PLAYER_BULLETS = 50;
const MAX_ENEMY_BULLETS = 30;
const MAX_EXPLOSIONS = 20;

const POWERUP_TYPES: RaptorPowerUpType[] = ["spread-shot", "rapid-fire", "shield-restore", "bonus-life"];

interface Star {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  size: number;
}

export class RaptorGame implements IGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private running = false;
  private destroyed = false;
  private rafId = 0;

  private state: RaptorGameState = "menu";
  private currentLevel = 0;
  private score = 0;

  private player: Player;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUp[] = [];

  private fireTimer = 0;
  private stars: Star[] = [];

  private input: InputManager;
  private collisions: CollisionSystem;
  private spawner: EnemySpawner;
  private powerUpManager: PowerUpManager;
  private audio: AudioManager;
  private sound: SoundSystem;
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
    this.spawner = new EnemySpawner();
    this.powerUpManager = new PowerUpManager();
    this.audio = new AudioManager();
    this.sound = new SoundSystem(this.audio);
    this.hud = new HUD(this.input.isTouchDevice);
    this.player = new Player(width, height);

    this.initStars(60);
    this.setupResize();
  }

  private get currentLevelConfig(): RaptorLevelConfig {
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
    this.sound.destroy();
    this.audio.destroy();

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

  private handleMuteClick(): boolean {
    if (!this.input.wasClicked) return false;
    if (this.hud.isMuteButtonHit(this.input.mouseX, this.input.mouseY, this.width)) {
      this.audio.ensureContext();
      this.audio.toggleMute();
      this.input.consume();
      return true;
    }
    return false;
  }

  private update(dt: number): void {
    if (this.handleMuteClick()) return;

    switch (this.state) {
      case "menu":
        if (this.input.wasClicked) {
          this.audio.ensureContext();
          this.sound.play("menu_start");
          this.resetGame();
          this.state = "playing";
          this.sound.startMusic("playing", this.currentLevel);
        }
        break;

      case "playing":
        this.updatePlaying(dt);
        break;

      case "level_complete":
        if (this.input.wasClicked) {
          this.startLevel(this.currentLevel + 1);
          this.state = "playing";
          this.sound.startMusic("playing", this.currentLevel);
        }
        break;

      case "gameover":
        if (this.input.wasClicked) {
          this.sound.stopMusic();
          if (this.onExit) {
            this.onExit();
          } else {
            this.state = "menu";
          }
        }
        break;

      case "victory":
        if (this.input.wasClicked) {
          this.sound.stopMusic();
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

    this.input.updateFromKeyboard(dt, this.width, this.height);
    this.player.update(dt, this.input.targetX, this.input.targetY, this.width, this.height);
    this.powerUpManager.update(dt);

    // Auto-fire
    const fireRate = this.powerUpManager.hasUpgrade("rapid-fire")
      ? config.autoFireRate * 2
      : config.autoFireRate;
    this.fireTimer += dt;
    const fireInterval = 1 / fireRate;
    if (this.fireTimer >= fireInterval && this.bullets.length < MAX_PLAYER_BULLETS) {
      this.fireTimer -= fireInterval;
      this.firePlayerBullets();
    }

    // Spawn enemies
    const newEnemies = this.spawner.update(dt, this.width);
    for (const e of newEnemies) {
      this.enemies.push(e);
    }

    // Boss spawning
    if (this.spawner.shouldSpawnBoss()) {
      const boss = this.spawner.spawnBoss(this.width);
      if (boss) this.enemies.push(boss);
    }

    // Update entities
    for (const bullet of this.bullets) {
      bullet.update(dt);
    }
    for (const enemy of this.enemies) {
      enemy.update(dt, this.height);

      if (enemy.canFire() && this.enemyBullets.length < MAX_ENEMY_BULLETS) {
        enemy.resetFireCooldown(1 / config.enemyFireRateMultiplier);
        this.enemyBullets.push(
          new EnemyBullet(enemy.pos.x, enemy.bottom, this.player.pos.x, this.player.pos.y)
        );
        this.sound.play("enemy_shoot");
      }
    }
    for (const eb of this.enemyBullets) {
      eb.update(dt, this.width, this.height);
    }
    for (const explosion of this.explosions) {
      explosion.update(dt);
    }
    for (const pu of this.powerUps) {
      pu.update(dt, this.height);
    }

    // Collisions: player bullets vs enemies
    const bulletHits = this.collisions.checkBulletsEnemies(this.bullets, this.enemies);
    for (const hit of bulletHits) {
      if (hit.destroyed) {
        this.score += hit.enemy.scoreValue;
        this.addExplosion(hit.enemy.pos.x, hit.enemy.pos.y,
          hit.enemy.variant === "boss" ? 2.5 : 1);

        if (hit.enemy.variant === "boss") {
          this.sound.play("boss_destroy");
          this.spawner.markBossDefeated();
        } else {
          this.sound.play("enemy_destroy");
        }

        if (hit.enemy.variant !== "boss" && Math.random() < config.powerUpDropChance) {
          const puType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
          this.powerUps.push(new PowerUp(hit.enemy.pos.x, hit.enemy.pos.y, puType));
        }
      } else {
        if (hit.enemy.variant === "boss") {
          this.sound.play("boss_hit");
        } else {
          this.sound.play("enemy_hit");
        }
      }
    }

    // Collisions: enemy bullets vs player
    const ebHits = this.collisions.checkEnemyBulletsPlayer(this.enemyBullets, this.player);
    for (const _hit of ebHits) {
      const dead = this.player.takeDamage(25);
      if (dead) {
        this.sound.stopMusic();
        this.sound.play("player_destroy");
        this.addExplosion(this.player.pos.x, this.player.pos.y, 2);
        this.state = "gameover";
        this.sound.play("game_over");
        return;
      }
      this.sound.play("player_hit");
    }

    // Collisions: enemies vs player
    const enemyHits = this.collisions.checkPlayerEnemies(this.player, this.enemies);
    for (const hit of enemyHits) {
      this.addExplosion(hit.enemy.pos.x, hit.enemy.pos.y, 1);
      this.score += hit.enemy.scoreValue;
      this.sound.play("enemy_destroy");

      const dead = this.player.takeDamage(50);
      if (dead) {
        this.sound.stopMusic();
        this.sound.play("player_destroy");
        this.addExplosion(this.player.pos.x, this.player.pos.y, 2);
        this.state = "gameover";
        this.sound.play("game_over");
        return;
      }
      this.sound.play("player_hit");
    }

    // Collisions: power-ups vs player
    const puHits = this.collisions.checkPlayerPowerUps(this.player, this.powerUps);
    for (const hit of puHits) {
      this.sound.play("power_up_collect");
      this.applyPowerUp(hit.powerUp.type);
    }

    // Clean up dead entities
    this.bullets = this.bullets.filter((b) => b.alive);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.enemyBullets = this.enemyBullets.filter((eb) => eb.alive);
    this.explosions = this.explosions.filter((ex) => ex.alive);
    this.powerUps = this.powerUps.filter((pu) => pu.alive);

    // Check level completion
    if (this.spawner.isLevelComplete && this.enemies.length === 0) {
      this.sound.stopMusic();
      if (this.currentLevel >= LEVELS.length - 1) {
        this.sound.play("victory");
        this.state = "victory";
      } else {
        this.sound.play("level_complete");
        this.state = "level_complete";
      }
    }
  }

  private firePlayerBullets(): void {
    const x = this.player.pos.x;
    const y = this.player.top;

    if (this.powerUpManager.hasUpgrade("spread-shot")) {
      this.bullets.push(new Bullet(x, y, 0));
      this.bullets.push(new Bullet(x, y, -0.15));
      this.bullets.push(new Bullet(x, y, 0.15));
    } else {
      this.bullets.push(new Bullet(x, y));
    }
    this.sound.play("player_shoot");
  }

  private applyPowerUp(type: RaptorPowerUpType): void {
    switch (type) {
      case "spread-shot":
      case "rapid-fire":
        this.powerUpManager.activate(type);
        break;
      case "shield-restore":
        this.player.shield = 100;
        break;
      case "bonus-life":
        this.player.lives++;
        break;
    }
  }

  private addExplosion(x: number, y: number, size: number): void {
    if (this.explosions.length >= MAX_EXPLOSIONS) {
      this.explosions.shift();
    }
    this.explosions.push(new Explosion(x, y, size));
  }

  private resetGame(): void {
    this.score = 0;
    this.player.reset(this.width, this.height);
    this.startLevel(0);
  }

  private startLevel(levelIndex: number): void {
    this.currentLevel = levelIndex;
    const config = this.currentLevelConfig;

    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.explosions = [];
    this.powerUps = [];
    this.fireTimer = 0;
    this.powerUpManager.reset();
    this.spawner.configure(config);
    this.initStars(config.starDensity);
  }

  private initStars(count: number): void {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 20 + Math.random() * 80,
        brightness: 0.3 + Math.random() * 0.7,
        size: 0.5 + Math.random() * 2,
      });
    }
  }

  private updateStars(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.height) {
        star.y = -2;
        star.x = Math.random() * this.width;
      }
    }
  }

  private render(): void {
    this.renderBackground();

    if (this.state === "playing" || this.state === "level_complete") {
      for (const pu of this.powerUps) {
        pu.render(this.ctx);
      }
      for (const enemy of this.enemies) {
        enemy.render(this.ctx);
      }
      for (const eb of this.enemyBullets) {
        eb.render(this.ctx);
      }
      for (const bullet of this.bullets) {
        bullet.render(this.ctx);
      }
      this.player.render(this.ctx);
      for (const explosion of this.explosions) {
        explosion.render(this.ctx);
      }
    }

    const config = this.currentLevelConfig;
    this.hud.render(
      this.ctx, this.state, this.score,
      this.player.lives, this.player.shield,
      config.level, config.name,
      this.width, this.height
    );
    this.hud.renderMuteButton(this.ctx, this.audio.muted, this.width);
  }

  private renderBackground(): void {
    const config = this.currentLevelConfig;
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, config.skyGradient[0]);
    grad.addColorStop(1, config.skyGradient[1]);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.state === "playing") {
      this.updateStars(1 / 60);
    }

    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
