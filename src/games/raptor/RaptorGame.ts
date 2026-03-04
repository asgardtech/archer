import { RaptorGameState, RaptorLevelConfig } from "./types";
import { InputManager } from "./systems/InputManager";
import { CollisionSystem } from "./systems/CollisionSystem";
import { EnemySpawner } from "./systems/EnemySpawner";
import { PowerUpManager } from "./systems/PowerUpManager";
import { SoundSystem } from "./systems/SoundSystem";
import { Player } from "./entities/Player";
import { Bullet } from "./entities/Bullet";
import { Enemy } from "./entities/Enemy";
import { EnemyBullet } from "./entities/EnemyBullet";
import { Explosion } from "./entities/Explosion";
import { PowerUp, POWERUP_SPRITE_KEYS } from "./entities/PowerUp";
import { HUD } from "./rendering/HUD";
import { AssetLoader } from "./rendering/AssetLoader";
import { SpriteSheet, generateExplosionSheet, generateThrustSheet } from "./rendering/SpriteSheet";
import { VFXManager } from "./rendering/VFXManager";
import { ASSET_MANIFEST } from "./rendering/assets";
import { LEVELS } from "./levels";
import { IGame } from "../../shared/types";
import { AudioManager } from "../../shared/AudioManager";

const DT_CAP = 0.1;
const MAX_PLAYER_BULLETS = 50;
const MAX_ENEMY_BULLETS = 30;
const MAX_EXPLOSIONS = 20;

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  brightness: number;
}

interface BackgroundLayer {
  image: HTMLImageElement;
  scrollY: number;
  scrollSpeed: number;
  opacity: number;
}

interface PlanetAccent {
  image: HTMLImageElement;
  x: number;
  y: number;
  speed: number;
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
  private totalScore = 0;

  private player: Player;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUp[] = [];
  private fireTimer = 0;

  private input: InputManager;
  private collisions: CollisionSystem;
  private spawner: EnemySpawner;
  private powerUpManager: PowerUpManager;
  private hud: HUD;
  private audio: AudioManager;
  private sound: SoundSystem;

  private assets: AssetLoader;
  private vfx: VFXManager;
  private explosionSheet: SpriteSheet | null = null;
  private thrustSheet: SpriteSheet | null = null;

  private stars: Star[] = [];
  private starsNear: Star[] = [];
  private bgLayers: BackgroundLayer[] = [];
  private planetAccents: PlanetAccent[] = [];

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
    this.hud = new HUD(this.input.isTouchDevice);
    this.audio = new AudioManager();
    this.sound = new SoundSystem(this.audio);
    this.player = new Player(width, height);
    this.assets = new AssetLoader();
    this.vfx = new VFXManager();

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
    this.state = "loading";
    this.lastTime = performance.now();
    this.loadAssets();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private async loadAssets(): Promise<void> {
    try {
      await this.assets.loadAll(ASSET_MANIFEST);
    } catch (e) {
      console.warn("[RaptorGame] Asset loading error:", e);
    }

    this.generateProceduralAssets();
    this.hud.setAssets(this.assets);

    const playerSprite = this.assets.getOptional("player");
    if (playerSprite) this.player.setSprite(playerSprite);
    if (this.thrustSheet) this.player.setThrustSheet(this.thrustSheet);

    this.state = "menu";
  }

  private generateProceduralAssets(): void {
    try {
      const explosionCanvas = generateExplosionSheet(8, 64);
      this.explosionSheet = new SpriteSheet(explosionCanvas, 64, 64, 8);

      const thrustCanvas = generateThrustSheet(4, 16, 24);
      this.thrustSheet = new SpriteSheet(thrustCanvas, 16, 24, 4);
    } catch (e) {
      console.warn("[RaptorGame] Failed to generate procedural assets:", e);
    }
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
    if (this.state === "loading") {
      this.input.consume();
      return;
    }

    if (this.handleMuteClick()) return;

    this.vfx.update(dt);

    switch (this.state) {
      case "menu":
        this.updateStars(dt);
        this.updateBackgroundLayers(dt);
        if (this.input.wasClicked) {
          this.audio.ensureContext();
          this.sound.play("menu_start");
          this.resetGame();
          this.state = "playing";
          this.sound.startMusic("playing", 0);
        }
        break;

      case "playing":
        this.updatePlaying(dt);
        break;

      case "level_complete":
        this.updateStars(dt);
        this.updateBackgroundLayers(dt);
        if (this.input.wasClicked) {
          this.startLevel(this.currentLevel + 1);
          this.state = "playing";
          this.sound.startMusic("playing", this.currentLevel);
        }
        break;

      case "gameover":
        this.updateStars(dt);
        this.updateBackgroundLayers(dt);
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
        this.updateStars(dt);
        this.updateBackgroundLayers(dt);
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
    this.input.updateFromKeyboard(dt, this.width, this.height);
    this.player.update(dt, this.input.targetX, this.input.targetY, this.width, this.height);
    this.updateStars(dt);
    this.updateBackgroundLayers(dt);
    this.updatePlanetAccents(dt);
    this.powerUpManager.update(dt);

    const config = this.currentLevelConfig;
    const rapidFire = this.powerUpManager.hasUpgrade("rapid-fire");
    const fireInterval = 1 / (config.autoFireRate * (rapidFire ? 2 : 1));
    this.fireTimer += dt;
    if (this.fireTimer >= fireInterval && this.bullets.length < MAX_PLAYER_BULLETS) {
      this.fireTimer -= fireInterval;
      const spreadShot = this.powerUpManager.hasUpgrade("spread-shot");
      if (spreadShot) {
        this.spawnBullet(this.player.pos.x, this.player.top, -0.2);
        this.spawnBullet(this.player.pos.x, this.player.top, 0);
        this.spawnBullet(this.player.pos.x, this.player.top, 0.2);
      } else {
        this.spawnBullet(this.player.pos.x, this.player.top);
      }
      this.vfx.triggerMuzzleFlash(this.player.pos.x, this.player.top);
      this.sound.play("player_shoot");
    }

    const newEnemies = this.spawner.update(dt, this.width);
    for (const e of newEnemies) {
      this.assignEnemySprite(e);
      this.enemies.push(e);
    }

    if (this.spawner.shouldSpawnBoss()) {
      const boss = this.spawner.spawnBoss(this.width);
      if (boss) {
        this.assignEnemySprite(boss);
        this.enemies.push(boss);
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.height);

      if (enemy.canFire() && this.enemyBullets.length < MAX_ENEMY_BULLETS) {
        const eb = new EnemyBullet(enemy.pos.x, enemy.bottom, this.player.pos.x, this.player.pos.y);
        const ebSprite = this.assets.getOptional("bullet_enemy");
        if (ebSprite) eb.setSprite(ebSprite);
        this.enemyBullets.push(eb);
        enemy.resetFireCooldown(1 / config.enemyFireRateMultiplier);
        this.sound.play("enemy_shoot");
      }
    }

    for (const bullet of this.bullets) {
      bullet.update(dt, this.width);
      this.vfx.addTrail(bullet.pos.x, bullet.pos.y + 4, "rgba(255, 220, 0, 0.4)", 1.5);
    }
    for (const eb of this.enemyBullets) {
      eb.update(dt, this.width, this.height);
    }
    for (const exp of this.explosions) {
      exp.update(dt);
    }
    for (const pu of this.powerUps) {
      pu.update(dt, this.height);
    }

    const enemyHits = this.collisions.checkBulletsEnemies(this.bullets, this.enemies);
    for (const hit of enemyHits) {
      if (hit.destroyed) {
        this.score += hit.enemy.scoreValue;
        const explosionSize = hit.enemy.variant === "boss" ? 3 : hit.enemy.variant === "bomber" ? 2 : 1;
        this.addExplosion(new Explosion(hit.enemy.pos.x, hit.enemy.pos.y, explosionSize));

        if (hit.enemy.variant === "boss") {
          this.sound.play("boss_destroy");
          this.spawner.markBossDefeated();
          this.vfx.triggerScreenShake(10, 0.5);
        } else {
          this.sound.play("enemy_destroy");
          if (Math.random() < config.powerUpDropChance) {
            this.spawnPowerUp(hit.enemy.pos.x, hit.enemy.pos.y);
          }
        }
      } else {
        if (hit.enemy.variant === "boss") {
          this.sound.play("boss_hit");
        } else {
          this.sound.play("enemy_hit");
        }
      }
    }

    const bulletPlayerHits = this.collisions.checkEnemyBulletsPlayer(this.enemyBullets, this.player);
    for (const _hit of bulletPlayerHits) {
      const dead = this.player.takeDamage(25);
      if (dead) {
        this.sound.play("player_destroy");
        this.addExplosion(new Explosion(this.player.pos.x, this.player.pos.y, 3));
        this.vfx.triggerScreenShake(8, 0.4);
      } else {
        this.sound.play("player_hit");
        this.vfx.triggerScreenShake(3, 0.15);
      }
    }

    const enemyPlayerHits = this.collisions.checkPlayerEnemies(this.player, this.enemies);
    for (const hit of enemyPlayerHits) {
      const explosionSize = hit.enemy.variant === "boss" ? 3 : 2;
      this.addExplosion(new Explosion(hit.enemy.pos.x, hit.enemy.pos.y, explosionSize));
      this.score += hit.enemy.scoreValue;
      if (hit.enemy.variant === "boss") {
        this.sound.play("boss_destroy");
        this.spawner.markBossDefeated();
        this.vfx.triggerScreenShake(10, 0.5);
      } else {
        this.sound.play("enemy_destroy");
        if (Math.random() < config.powerUpDropChance) {
          this.spawnPowerUp(hit.enemy.pos.x, hit.enemy.pos.y);
        }
      }
      const dead = this.player.takeDamage(50);
      if (dead) {
        this.sound.play("player_destroy");
        this.addExplosion(new Explosion(this.player.pos.x, this.player.pos.y, 3));
        this.vfx.triggerScreenShake(8, 0.4);
      } else {
        this.sound.play("player_hit");
        this.vfx.triggerScreenShake(4, 0.2);
      }
    }

    const puHits = this.collisions.checkPlayerPowerUps(this.player, this.powerUps);
    for (const hit of puHits) {
      this.sound.play("power_up_collect");
      switch (hit.powerUp.type) {
        case "spread-shot":
        case "rapid-fire":
          this.powerUpManager.activate(hit.powerUp.type);
          break;
        case "shield-restore":
          this.player.shield = 100;
          break;
        case "bonus-life":
          this.player.lives++;
          break;
      }
    }

    this.bullets = this.bullets.filter((b) => b.alive);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.enemyBullets = this.enemyBullets.filter((eb) => eb.alive);
    this.explosions = this.explosions.filter((e) => e.alive);
    this.powerUps = this.powerUps.filter((p) => p.alive);

    if (!this.player.alive) {
      this.totalScore += this.score;
      this.sound.stopMusic();
      this.sound.play("game_over");
      this.state = "gameover";
      return;
    }

    if (this.spawner.isLevelComplete && this.enemies.length === 0) {
      this.totalScore += this.score;
      this.bullets = [];
      this.enemyBullets = [];
      this.powerUps = [];
      this.sound.stopMusic();

      if (this.currentLevel >= LEVELS.length - 1) {
        this.state = "victory";
        this.sound.play("victory");
      } else {
        this.state = "level_complete";
        this.sound.play("level_complete");
      }
    }
  }

  private spawnBullet(x: number, y: number, angle = 0): void {
    const bullet = new Bullet(x, y, angle);
    const sprite = this.assets.getOptional("bullet_player");
    if (sprite) bullet.setSprite(sprite);
    this.bullets.push(bullet);
  }

  private spawnPowerUp(x: number, y: number): void {
    const pu = new PowerUp(x, y);
    const spriteKey = POWERUP_SPRITE_KEYS[pu.type];
    const sprite = this.assets.getOptional(spriteKey);
    if (sprite) pu.setSprite(sprite);
    this.powerUps.push(pu);
  }

  private assignEnemySprite(enemy: Enemy): void {
    const spriteMap: Record<string, string> = {
      scout: "enemy_scout",
      fighter: "enemy_fighter",
      bomber: "enemy_bomber",
      boss: "enemy_boss",
    };
    const key = spriteMap[enemy.variant];
    if (key) {
      const sprite = this.assets.getOptional(key);
      if (sprite) enemy.setSprite(sprite);
    }
  }

  private resetGame(): void {
    this.totalScore = 0;
    this.vfx.reset();
    this.startLevel(0, true);
  }

  private startLevel(levelIndex: number, fullReset = false): void {
    this.currentLevel = levelIndex;
    this.score = 0;
    this.fireTimer = 0;
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.explosions = [];
    this.powerUps = [];
    this.player.reset(this.width, this.height, fullReset);

    const playerSprite = this.assets.getOptional("player");
    if (playerSprite) this.player.setSprite(playerSprite);
    if (this.thrustSheet) this.player.setThrustSheet(this.thrustSheet);

    this.spawner.configure(this.currentLevelConfig);
    this.powerUpManager.reset();
    this.vfx.reset();
    this.initStars(this.currentLevelConfig.starDensity);
    this.initBackgroundLayers();
    this.initPlanetAccents();
  }

  private addExplosion(explosion: Explosion): void {
    if (this.explosionSheet) {
      explosion.setSpriteSheet(this.explosionSheet);
    }
    if (this.explosions.length >= MAX_EXPLOSIONS) {
      this.explosions.shift();
    }
    this.explosions.push(explosion);
  }

  private initStars(density: number): void {
    this.stars = [];
    this.starsNear = [];
    for (let i = 0; i < density; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 20 + Math.random() * 30,
        size: 0.5 + Math.random() * 1,
        brightness: 0.3 + Math.random() * 0.4,
      });
    }
    for (let i = 0; i < Math.floor(density / 3); i++) {
      this.starsNear.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 60 + Math.random() * 60,
        size: 1 + Math.random() * 1.5,
        brightness: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private initBackgroundLayers(): void {
    this.bgLayers = [];
    const config = this.currentLevelConfig;
    if (!config.backgroundLayers) return;

    for (const layerCfg of config.backgroundLayers) {
      const img = this.assets.getOptional(layerCfg.asset);
      if (img) {
        this.bgLayers.push({
          image: img,
          scrollY: 0,
          scrollSpeed: layerCfg.scrollSpeed,
          opacity: layerCfg.opacity,
        });
      }
    }
  }

  private initPlanetAccents(): void {
    this.planetAccents = [];
    const config = this.currentLevelConfig;
    if (!config.planetAssets) return;

    for (const assetKey of config.planetAssets) {
      const img = this.assets.getOptional(assetKey);
      if (img) {
        this.planetAccents.push({
          image: img,
          x: 50 + Math.random() * (this.width - 100),
          y: -100 - Math.random() * 300,
          speed: 10 + Math.random() * 15,
        });
      }
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
    for (const star of this.starsNear) {
      star.y += star.speed * dt;
      if (star.y > this.height) {
        star.y = -2;
        star.x = Math.random() * this.width;
      }
    }
  }

  private updateBackgroundLayers(dt: number): void {
    for (const layer of this.bgLayers) {
      layer.scrollY += layer.scrollSpeed * 30 * dt;
      if (layer.scrollY >= this.height) {
        layer.scrollY -= this.height;
      }
    }
  }

  private updatePlanetAccents(dt: number): void {
    for (const planet of this.planetAccents) {
      planet.y += planet.speed * dt;
      if (planet.y > this.height + 150) {
        planet.y = -150 - Math.random() * 200;
        planet.x = 50 + Math.random() * (this.width - 100);
      }
    }
  }

  private render(): void {
    if (this.state === "loading") {
      this.hud.renderLoadingScreen(this.ctx, this.assets.progress, this.width, this.height);
      return;
    }

    this.vfx.applyPreRender(this.ctx);

    this.renderBackground();

    if (
      this.state === "playing" ||
      this.state === "gameover" ||
      this.state === "level_complete"
    ) {
      this.vfx.renderTrails(this.ctx);
      this.vfx.renderMuzzleFlashes(this.ctx);

      for (const pu of this.powerUps) {
        pu.render(this.ctx);
      }
      for (const enemy of this.enemies) {
        enemy.render(this.ctx);
      }
      for (const bullet of this.bullets) {
        bullet.render(this.ctx);
      }
      for (const eb of this.enemyBullets) {
        eb.render(this.ctx);
      }
      for (const exp of this.explosions) {
        exp.render(this.ctx);
      }

      this.player.render(this.ctx);
    }

    this.vfx.applyPostRender(this.ctx);

    const config = this.currentLevelConfig;
    const displayScore = this.state === "playing" ? this.score : this.totalScore;
    this.hud.render(
      this.ctx,
      this.state,
      displayScore,
      this.player.lives,
      this.player.shield,
      config.level,
      config.name,
      this.width,
      this.height,
      this.powerUpManager.getActive()
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

    for (const layer of this.bgLayers) {
      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;
      const y1 = layer.scrollY;
      const y2 = layer.scrollY - this.height;
      this.ctx.drawImage(layer.image, 0, y1, this.width, this.height);
      this.ctx.drawImage(layer.image, 0, y2, this.width, this.height);
      this.ctx.restore();
    }

    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    for (const planet of this.planetAccents) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.25;
      const pSize = 80;
      this.ctx.drawImage(planet.image, planet.x - pSize / 2, planet.y - pSize / 2, pSize, pSize);
      this.ctx.restore();
    }

    for (const star of this.starsNear) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }
}

export { RaptorGame as Game };
