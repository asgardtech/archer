import { GameState, ObstacleType, UpgradeType } from "./types";
import { InputManager } from "./systems/InputManager";
import { Spawner } from "./systems/Spawner";
import { CollisionSystem } from "./systems/CollisionSystem";
import { UpgradeManager } from "./systems/UpgradeManager";
import { SoundSystem } from "./systems/SoundSystem";
import { Balloon } from "./entities/Balloon";
import { Arrow } from "./entities/Arrow";
import { Obstacle } from "./entities/Obstacle";
import { Bow } from "./entities/Bow";
import { Landmark } from "./entities/Landmark";
import { HUD } from "./rendering/HUD";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { LEVELS, LevelConfig } from "./levels";
import { IGame } from "../../shared/types";
import { AudioManager } from "../../shared/AudioManager";
import { AssetLoader } from "../../shared/AssetLoader";
import { ARCHER_ASSET_MANIFEST } from "./rendering/assets";

const DT_CAP = 0.1;
const UPGRADE_BALLOON_SCORE = 3;
const BOSS_BALLOON_SCORE = 10;
const MILESTONE_INTERVAL = 25;
const MILESTONE_AMMO_BONUS = 5;
const BOSS_KILL_AMMO_BONUS = 15;

const UPGRADE_ICON_KEYS: Record<UpgradeType, string> = {
  "multi-shot": "powerup_multishot",
  "piercing": "powerup_piercing",
  "rapid-fire": "powerup_rapidfire",
  "bonus-arrows": "powerup_bonusarrows",
};

const OBSTACLE_PENALTIES: Record<ObstacleType, { score: number; arrows: number }> = {
  bird: { score: 3, arrows: 2 },
  airplane: { score: 5, arrows: 3 },
  ufo: { score: 8, arrows: 5 },
};

export class ArcherGame implements IGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime = 0;
  private running = false;
  private destroyed = false;
  private dt = 0;
  private rafId = 0;

  private state: GameState = "loading";
  private currentLevel = 0;
  private score = 0;
  private totalScore = 0;
  private arrowsRemaining = 0;
  private balloonsEscaped = 0;
  private nextAmmoMilestone = MILESTONE_INTERVAL;

  private balloons: Balloon[] = [];
  private arrows: Arrow[] = [];
  private obstacles: Obstacle[] = [];
  private bow: Bow;
  private landmark: Landmark | null = null;

  private input: InputManager;
  private spawner: Spawner;
  private collisions: CollisionSystem;
  private upgradeManager: UpgradeManager;
  private hud: HUD;
  private audio: AudioManager;
  private sound: SoundSystem;
  private assetLoader: AssetLoader;
  private lowAmmoTriggered = false;

  private boundResize: (() => void) | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;

  public onExit: (() => void) | null = null;

  constructor(canvasOrId: string | HTMLCanvasElement, private width = 800, private height = 600) {
    if (typeof canvasOrId === "string") {
      const el = document.getElementById(canvasOrId);
      if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas element "${canvasOrId}" not found`);
      }
      this.canvas = el;
    } else {
      this.canvas = canvasOrId;
    }
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
    this.audio = new AudioManager();
    this.sound = new SoundSystem(this.audio);
    this.assetLoader = new AssetLoader();

    this.setupResize();
  }

  private get currentLevelConfig(): LevelConfig {
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
    this.rafId = requestAnimationFrame((t) => this.loop(t));

    this.assetLoader.loadAll(ARCHER_ASSET_MANIFEST).then(() => {
      if (this.destroyed) return;
      this.distributeSprites();
      this.state = "menu";
    });
  }

  private distributeSprites(): void {
    const bowSprites = new Map<string, HTMLImageElement>();
    for (const key of ["bow_default", "bow_multishot", "bow_piercing", "bow_rapidfire"]) {
      const img = this.assetLoader.getOptional(key);
      if (img) bowSprites.set(key, img);
    }
    this.bow.setSprites(bowSprites);
  }

  private getArrowSprite(piercing: boolean): HTMLImageElement | null {
    return this.assetLoader.getOptional(piercing ? "arrow_piercing" : "arrow_default");
  }

  private getUpgradeIcon(upgradeType: UpgradeType): HTMLImageElement | null {
    const key = UPGRADE_ICON_KEYS[upgradeType];
    return key ? this.assetLoader.getOptional(key) : null;
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

    this.dt = Math.min((time - this.lastTime) / 1000, DT_CAP);
    this.lastTime = time;

    this.update(this.dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private handleMuteClick(): boolean {
    if (!this.input.wasClicked) return false;
    if (this.hud.isMuteButtonHit(this.input.mousePos.x, this.input.mousePos.y, this.width)) {
      this.audio.ensureContext();
      this.audio.toggleMute();
      this.input.consume();
      return true;
    }
    return false;
  }

  private update(dt: number): void {
    if (this.state === "loading") {
      this.hud.loadingProgress = this.assetLoader.progress;
      this.input.consume();
      return;
    }

    if (this.handleMuteClick()) return;

    switch (this.state) {
      case "menu":
        if (this.input.wasClicked) {
          this.audio.ensureContext();
          this.sound.play("menu_start");
          this.resetGame();
          this.state = "level_intro";
        }
        break;

      case "level_intro":
        if (this.input.wasClicked) {
          this.state = "playing";
          this.sound.startMusic("playing", this.currentLevel);
        }
        break;

      case "playing":
        this.updatePlaying(dt);
        break;

      case "level_complete":
        if (this.landmark) {
          this.landmark.update(dt);
        }
        if (this.input.wasClicked) {
          this.startLevel(this.currentLevel + 1);
          this.state = "level_intro";
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
        if (this.landmark) {
          this.landmark.update(dt);
        }
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
    this.bow.update(this.input.mousePos);
    this.upgradeManager.update(dt);
    if (this.landmark) {
      this.landmark.update(dt);
      this.landmark.setSiegeProgress(
        Math.min(1, this.score / this.currentLevelConfig.targetScore)
      );
    }

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
        const arrowSprite = this.getArrowSprite(isPiercing);
        if (arrowSprite) arrow.setSprite(arrowSprite);
        this.arrows.push(arrow);
      }

      if (!isRapidFire) {
        this.arrowsRemaining--;
      }

      this.sound.play("arrow_shoot");
    }

    const newBalloons = this.spawner.update(dt, this.width, this.height);
    for (const b of newBalloons) {
      if (b.upgradeType) {
        const icon = this.getUpgradeIcon(b.upgradeType);
        if (icon) b.setUpgradeIcon(icon);
      }
      this.balloons.push(b);
    }

    const newObstacles = this.spawner.updateObstacles(dt, this.width, this.height);
    for (const o of newObstacles) {
      this.obstacles.push(o);
    }

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
    for (const obstacle of this.obstacles) {
      obstacle.update(dt);
    }

    const obstacleHits = this.collisions.checkObstacles(this.arrows, this.obstacles);
    for (const hit of obstacleHits) {
      const penalty = OBSTACLE_PENALTIES[hit.obstacle.obstacleType];
      this.score = Math.max(0, this.score - penalty.score);
      this.arrowsRemaining = Math.max(0, this.arrowsRemaining - penalty.arrows);
      this.hud.showPenalty(penalty.score);
      this.sound.play("obstacle_hit");
    }

    const hits = this.collisions.check(this.arrows, this.balloons);
    for (const hit of hits) {
      if (hit.isBossKill) {
        this.score += BOSS_BALLOON_SCORE;
        this.arrowsRemaining += BOSS_KILL_AMMO_BONUS;
        this.hud.showAmmoGain(BOSS_KILL_AMMO_BONUS);
        this.sound.play("boss_kill");
      } else if (hit.balloon.variant === "boss") {
        this.sound.play("boss_hit");
      } else if (hit.balloon.variant === "upgrade") {
        this.score += UPGRADE_BALLOON_SCORE;
        this.sound.play("upgrade_pop");
      } else {
        this.score += 1;
        this.sound.play("balloon_pop");
      }

      if (hit.grantedUpgrade) {
        this.upgradeManager.activate(hit.grantedUpgrade, (amount: number) => {
          this.arrowsRemaining += amount;
          this.hud.showAmmoGain(amount);
          this.sound.play("ammo_gain");
        });
        this.sound.play("upgrade_activate");
      }
    }

    while (this.score >= this.nextAmmoMilestone) {
      this.arrowsRemaining += MILESTONE_AMMO_BONUS;
      this.hud.showAmmoGain(MILESTONE_AMMO_BONUS);
      this.sound.play("ammo_gain");
      this.nextAmmoMilestone += MILESTONE_INTERVAL;
    }

    this.balloons = this.balloons.filter((b) => b.alive);
    this.arrows = this.arrows.filter((a) => a.alive);
    this.obstacles = this.obstacles.filter((o) => o.alive);

    if (this.arrowsRemaining <= 5 && this.arrowsRemaining > 0) {
      if (!this.lowAmmoTriggered) {
        this.lowAmmoTriggered = true;
        this.sound.play("low_ammo");
      }
    } else {
      if (this.lowAmmoTriggered) {
        this.lowAmmoTriggered = false;
        this.sound.stopLowAmmoWarning();
      }
    }

    if (this.score >= this.currentLevelConfig.targetScore) {
      if (this.landmark) {
        this.landmark.celebrate();
      }
      this.totalScore += this.score;
      this.balloons = [];
      this.arrows = [];
      this.obstacles = [];
      this.sound.stopLowAmmoWarning();
      this.lowAmmoTriggered = false;
      this.sound.stopMusic();
      this.sound.play("landmark_liberated");
      if (this.currentLevel >= LEVELS.length - 1) {
        this.state = "victory";
        this.sound.play("victory");
      } else {
        this.state = "level_complete";
        this.sound.play("level_complete");
      }
      return;
    }

    if (this.arrowsRemaining <= 0 && this.arrows.length === 0) {
      this.totalScore += this.score;
      this.sound.stopLowAmmoWarning();
      this.lowAmmoTriggered = false;
      this.sound.stopMusic();
      this.sound.play("game_over");
      this.state = "gameover";
    }
  }

  private resetGame(): void {
    this.totalScore = 0;
    this.arrowsRemaining = 0;
    this.lowAmmoTriggered = false;
    this.sound.stopLowAmmoWarning();
    this.upgradeManager.resetAll();
    this.startLevel(0);
  }

  private startLevel(levelIndex: number): void {
    this.currentLevel = levelIndex;
    const config = this.currentLevelConfig;

    this.score = 0;
    this.arrowsRemaining += config.arrowsGranted;
    this.balloonsEscaped = 0;
    this.nextAmmoMilestone = MILESTONE_INTERVAL;
    this.balloons = [];
    this.arrows = [];
    this.obstacles = [];
    this.bow = new Bow(this.width, this.height, this.input.isTouchDevice ? 60 : 30);
    this.distributeSprites();
    this.spawner.configure(config);
    this.upgradeManager.resetForNewLevel();
    this.hud.reset();
    this.landmark = new Landmark(config.landmark, this.width, this.height);
  }

  private render(): void {
    this.renderSky();

    const config = this.currentLevelConfig;
    const isGameplay = this.state === "playing" || this.state === "gameover" || this.state === "level_complete" || this.state === "level_intro";

    if (isGameplay || this.state === "victory") {
      TerrainRenderer.render(this.ctx, this.width, this.height, config.terrain);
    }

    if (this.landmark && (isGameplay || this.state === "victory")) {
      this.landmark.render(this.ctx);
    }

    if (isGameplay) {
      for (const obstacle of this.obstacles) {
        obstacle.render(this.ctx);
      }
      for (const balloon of this.balloons) {
        balloon.render(this.ctx);
      }
      for (const arrow of this.arrows) {
        arrow.render(this.ctx);
      }
      this.bow.render(this.ctx, this.arrowsRemaining > 0, this.upgradeManager.getActive());
    }

    this.hud.render(
      this.ctx,
      this.state,
      this.score,
      this.arrowsRemaining,
      this.width,
      this.height,
      this.upgradeManager.getActive(),
      this.dt,
      config.level,
      config.name,
      this.totalScore + (this.state === "playing" ? this.score : 0),
      this.upgradeManager.getPermanentUpgrades(),
      this.upgradeManager.getCollectionCounts(),
      config.landmark.label,
      config.landmark.description
    );
    this.hud.renderMuteButton(this.ctx, this.audio.muted, this.width);
  }

  private renderSky(): void {
    const config = this.currentLevelConfig;
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, config.skyGradient[0]);
    grad.addColorStop(1, config.skyGradient[1]);
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

export { ArcherGame as Game };
