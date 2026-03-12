import { RaptorGameState, RaptorLevelConfig, Projectile, RaptorPowerUpType, WeaponType, RaptorSaveData, EnemyVariant, ENEMY_CONFIGS, ENEMY_WEAPON_CONFIGS } from "./types";
import { InputManager } from "./systems/InputManager";
import { DevConsole } from "./systems/DevConsole";
import { CollisionSystem } from "./systems/CollisionSystem";
import { EnemySpawner } from "./systems/EnemySpawner";
import { PowerUpManager } from "./systems/PowerUpManager";
import { SoundSystem } from "./systems/SoundSystem";
import { WeaponSystem } from "./systems/WeaponSystem";
import { EnemyWeaponSystem } from "./systems/EnemyWeaponSystem";
import { SaveSystem } from "./systems/SaveSystem";
import { CommandRegistry, CommandContext, registerLevelCommands, registerWeaponCommands, registerPowerUpCommands, registerPlayerCommands, registerCombatCommands } from "./systems/CommandRegistry";
import { Player } from "./entities/Player";
import { Bullet } from "./entities/Bullet";
import { Missile } from "./entities/Missile";
import { TrackingBullet } from "./entities/TrackingBullet";
import { PlasmaBolt } from "./entities/PlasmaBolt";
import { IonBolt } from "./entities/IonBolt";
import { Rocket } from "./entities/Rocket";
import { Enemy } from "./entities/Enemy";
import { EnemyBullet } from "./entities/EnemyBullet";
import { EnemyMissile } from "./entities/EnemyMissile";
import { Explosion } from "./entities/Explosion";
import { PowerUp, POWERUP_SPRITE_KEYS } from "./entities/PowerUp";
import { HUD } from "./rendering/HUD";
import { AssetLoader } from "./rendering/AssetLoader";
import { SpriteSheet, generateExplosionSheet, generateThrustSheet } from "./rendering/SpriteSheet";
import { VFXManager } from "./rendering/VFXManager";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { StoryRenderer } from "./rendering/StoryRenderer";
import { ASSET_MANIFEST } from "./rendering/assets";
import { AUDIO_MANIFEST } from "./rendering/audioAssets";
import { LEVELS } from "./levels";
import { GAME_STORY } from "./story";
import { IGame } from "../../shared/types";
import { AudioManager } from "../../shared/AudioManager";

const DT_CAP = 0.1;
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
  private settingsOpen = false;
  private draggingSlider: "music" | "sfx" | null = null;
  private currentLevel = 0;
  private score = 0;
  private totalScore = 0;

  private showFps = false;
  private frameTimes: number[] = new Array(60).fill(16.67);
  private frameTimeIndex = 0;

  private player: Player;
  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private explosions: Explosion[] = [];
  private powerUps: PowerUp[] = [];

  private input: InputManager;
  private devConsole: DevConsole;
  private collisions: CollisionSystem;
  private spawner: EnemySpawner;
  private powerUpManager: PowerUpManager;
  private weaponSystem: WeaponSystem;
  private enemyWeaponSystem: EnemyWeaponSystem;
  private hud: HUD;
  private audio: AudioManager;
  private sound: SoundSystem;
  private commandRegistry: CommandRegistry;

  private assets: AssetLoader;
  private vfx: VFXManager;
  private explosionSheet: SpriteSheet | null = null;
  private thrustSheet: SpriteSheet | null = null;

  private stars: Star[] = [];
  private starsNear: Star[] = [];
  private bgLayers: BackgroundLayer[] = [];
  private planetAccents: PlanetAccent[] = [];
  private terrainRenderer: TerrainRenderer;
  private terrainActive = false;
  private storyRenderer = new StoryRenderer();

  private boundResize: (() => void) | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | undefined;
  private dpr = 1;
  private enemyLaserHitSoundCooldown = 0;
  private levelElapsed = 0;
  private nextStoryMessageIndex = 0;

  public onExit: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, private width = 800, private height = 600) {
    this.canvas = canvas;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D rendering context");
    this.ctx = ctx;

    this.input = new InputManager(this.canvas, width, height);
    this.devConsole = new DevConsole();
    this.commandRegistry = new CommandRegistry();
    registerLevelCommands(this.commandRegistry);
    registerWeaponCommands(this.commandRegistry);
    registerPowerUpCommands(this.commandRegistry);
    registerPlayerCommands(this.commandRegistry);
    registerCombatCommands(this.commandRegistry);
    this.devConsole.onSubmit = (cmd) => {
      this.devConsole.log(`> ${cmd}`);
      const output = this.commandRegistry.dispatch(cmd, this.buildCommandContext());
      for (const line of output) {
        this.devConsole.log(line);
      }
    };
    this.collisions = new CollisionSystem();
    this.spawner = new EnemySpawner();
    this.powerUpManager = new PowerUpManager();
    this.weaponSystem = new WeaponSystem();
    this.enemyWeaponSystem = new EnemyWeaponSystem();
    this.hud = new HUD(this.input.isTouchDevice);
    this.audio = new AudioManager();
    this.sound = new SoundSystem(this.audio);
    this.player = new Player(width, height);
    this.assets = new AssetLoader();
    this.vfx = new VFXManager();
    this.terrainRenderer = new TerrainRenderer(width, height, this.assets);

    this.initStars(60);
    this.setupResize();
  }

  private get currentLevelConfig(): RaptorLevelConfig {
    return LEVELS[this.currentLevel];
  }

  private setupResize(): void {
    const resize = () => {
      const oldDpr = this.dpr;
      this.dpr = window.devicePixelRatio || 1;

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

      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);

      if (oldDpr !== this.dpr) {
        this.generateProceduralAssets();
        if (this.thrustSheet) this.player.setThrustSheet(this.thrustSheet);
      }
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

    const audioEntries = [
      ...Object.entries(AUDIO_MANIFEST.sfx),
      ...Object.entries(AUDIO_MANIFEST.music),
    ];
    await Promise.allSettled(
      audioEntries.map(([key, url]) => this.audio.loadAudioBuffer(key, url))
    );

    this.generateProceduralAssets();
    this.hud.setAssets(this.assets);

    const playerSprite = this.assets.getOptional("player");
    if (playerSprite) this.player.setSprite(playerSprite);
    if (this.thrustSheet) this.player.setThrustSheet(this.thrustSheet);

    this.state = "menu";
  }

  private generateProceduralAssets(): void {
    try {
      const explosionCanvas = generateExplosionSheet(8, 64, this.dpr);
      this.explosionSheet = new SpriteSheet(explosionCanvas, 64, 64, 8, this.dpr);

      const thrustCanvas = generateThrustSheet(4, 16, 24, this.dpr);
      this.thrustSheet = new SpriteSheet(thrustCanvas, 16, 24, 4, this.dpr);
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
    this.devConsole.destroy();
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

    const elapsed = time - this.lastTime;
    const dt = Math.min(elapsed / 1000, DT_CAP);
    this.lastTime = time;

    this.frameTimes[this.frameTimeIndex] = elapsed;
    this.frameTimeIndex = (this.frameTimeIndex + 1) % this.frameTimes.length;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private handleUIClicks(): boolean {
    if (this.settingsOpen) {
      return this.handleSettingsInput();
    }

    if (!this.input.wasClicked) return false;

    if (this.hud.isSettingsButtonHit(this.input.mouseX, this.input.mouseY, this.width)) {
      this.settingsOpen = true;
      this.input.consume();
      return true;
    }

    if (this.hud.isMuteButtonHit(this.input.mouseX, this.input.mouseY, this.width)) {
      this.audio.ensureContext();
      this.audio.toggleMute();
      this.input.consume();
      return true;
    }

    return false;
  }

  private handleSettingsInput(): boolean {
    if (this.draggingSlider) {
      const val = this.hud.getSliderValueFromPosition(
        this.input.mouseX, this.draggingSlider, this.width, this.height
      );
      if (this.draggingSlider === "music") {
        this.audio.musicVolume = val;
      } else {
        this.audio.sfxVolume = val;
      }
      if (!this.input.isMouseDown) {
        this.draggingSlider = null;
      }
      this.input.consume();
      return true;
    }

    if (!this.input.wasClicked) return true;

    const mx = this.input.mouseX;
    const my = this.input.mouseY;

    if (this.hud.isCloseButtonHit(mx, my, this.width, this.height)) {
      this.settingsOpen = false;
      this.input.consume();
      return true;
    }

    if (this.hud.isSliderHit(mx, my, "music", this.width, this.height)) {
      this.draggingSlider = "music";
      this.audio.musicVolume = this.hud.getSliderValueFromPosition(mx, "music", this.width, this.height);
      this.input.consume();
      return true;
    }

    if (this.hud.isSliderHit(mx, my, "sfx", this.width, this.height)) {
      this.draggingSlider = "sfx";
      this.audio.sfxVolume = this.hud.getSliderValueFromPosition(mx, "sfx", this.width, this.height);
      this.input.consume();
      return true;
    }

    if (this.hud.isMuteButtonHit(mx, my, this.width)) {
      this.audio.ensureContext();
      this.audio.toggleMute();
      this.input.consume();
      return true;
    }

    if (this.hud.isClearSaveButtonHit(mx, my, this.width, this.height)) {
      SaveSystem.clear();
      this.input.consume();
      return true;
    }

    if (!this.hud.isSettingsPanelHit(mx, my, this.width, this.height)) {
      this.settingsOpen = false;
      this.input.consume();
      return true;
    }

    this.input.consume();
    return true;
  }

  private update(dt: number): void {
    if (this.state === "loading") {
      this.input.consume();
      return;
    }

    if (this.input.wasConsoleToggled) {
      this.devConsole.toggle();
      this.input.consume();
      return;
    }

    if (this.devConsole.isOpen) {
      if (this.input.wasEscPressed) {
        this.devConsole.close();
      }
      this.devConsole.update(dt);
      this.input.consume();
      return;
    }

    if (this.settingsOpen && this.input.wasEscPressed) {
      this.settingsOpen = false;
      this.input.consume();
      return;
    }

    if (this.handleUIClicks()) return;

    if (this.state === "playing" && this.input.wasEscPressed) {
      this.weaponSystem.laserBeam.active = false;
      this.sound.stopMusic();
      this.state = "menu";
      this.input.consume();
      return;
    }

    this.vfx.update(dt);

    switch (this.state) {
      case "menu":
        this.updateBackground(dt);
        if (this.input.wasClicked) {
          const hasSave = this.hasSaveData;
          if (hasSave) {
            if (this.hud.isContinueButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
              this.audio.ensureContext();
              this.sound.play("menu_start");
              this.continueGame();
              this.state = "playing";
              this.sound.startMusic("playing", this.currentLevel);
            } else if (this.hud.isNewGameButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
              this.audio.ensureContext();
              this.sound.play("menu_start");
              SaveSystem.clear();
              this.resetGame();
              this.storyRenderer.show(GAME_STORY.opening, "center");
              this.state = "story_intro";
              this.sound.startMusic("playing", 0);
            }
          } else {
            this.audio.ensureContext();
            this.sound.play("menu_start");
            this.resetGame();
            this.storyRenderer.show(GAME_STORY.opening, "center");
            this.state = "story_intro";
            this.sound.startMusic("playing", 0);
          }
        }
        break;

      case "story_intro":
        this.updateBackground(dt);
        this.storyRenderer.update(dt);

        if (this.input.wasEscPressed || this.storyRenderer.isComplete || !this.storyRenderer.isActive) {
          this.enterBriefing();
          break;
        }

        if (this.input.wasClicked) {
          this.storyRenderer.advance();
        }
        break;

      case "briefing":
        this.updateBackground(dt);
        this.storyRenderer.update(dt);

        if (this.input.wasEscPressed || this.storyRenderer.isComplete || !this.storyRenderer.isActive) {
          this.state = "playing";
          this.sound.startMusic("playing", this.currentLevel);
          break;
        }

        if (this.input.wasClicked) {
          this.storyRenderer.advance();
        }
        break;

      case "playing":
        this.updatePlaying(dt);
        break;

      case "level_complete":
        this.updateBackground(dt);
        if (this.input.wasClicked) {
          this.startLevel(this.currentLevel + 1);
          this.enterBriefing();
        }
        break;

      case "gameover":
        this.updateBackground(dt);
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
        this.updateBackground(dt);
        this.storyRenderer.update(dt);

        if (this.storyRenderer.isActive) {
          if (this.input.wasEscPressed) {
            this.storyRenderer = new StoryRenderer();
            this.hud.setVictoryStoryActive(false);
          } else if (this.input.wasClicked) {
            this.storyRenderer.advance();
          }
        } else {
          if (this.hud.victoryStoryActive) {
            this.hud.setVictoryStoryActive(false);
          }
          if (this.input.wasClicked) {
            this.sound.stopMusic();
            if (this.onExit) {
              this.onExit();
            } else {
              this.state = "menu";
            }
          }
        }
        break;
    }
    this.input.consume();
  }

  private updateBackground(dt: number): void {
    if (this.terrainActive) {
      this.terrainRenderer.update(dt);
    } else {
      this.updateStars(dt);
      this.updateBackgroundLayers(dt);
      this.updatePlanetAccents(dt);
    }
  }

  private updatePlaying(dt: number): void {
    this.levelElapsed += dt;
    this.input.updateFromKeyboard(dt, this.width, this.height);
    this.player.update(dt, this.input.targetX, this.input.targetY, this.width, this.height);
    this.updateBackground(dt);
    this.powerUpManager.update(dt);

    const config = this.currentLevelConfig;

    if (this.input.wasClicked && this.hud.isBombButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
      this.input.wasBombPressed = true;
    } else if (this.input.wasClicked && this.storyRenderer.isActive) {
      this.storyRenderer.advance();
    }

    if (this.input.wasBombPressed && this.player.bombs > 0) {
      this.player.bombs--;
      this.sound.play("mega_bomb_fire");
      this.vfx.triggerMegaBombFlash(this.width, this.height);
      this.vfx.triggerScreenShake(12, 0.6);
      for (const enemy of this.enemies) {
        if (enemy.alive) {
          const destroyed = enemy.hit(10);
          if (destroyed) {
            this.handleEnemyDestroyed(enemy, config);
          }
        }
      }
    }

    this.weaponSystem.setWeapon(this.powerUpManager.currentWeapon);

    const { newProjectiles, soundEvent } = this.weaponSystem.update(
      dt, this.player, config, this.powerUpManager,
      this.width, this.projectiles
    );

    for (const proj of newProjectiles) {
      this.assignProjectileSprite(proj);
      this.projectiles.push(proj);
    }
    if (newProjectiles.length > 0) {
      this.vfx.triggerMuzzleFlash(this.player.pos.x, this.player.top);
    }
    if (soundEvent) {
      this.sound.play(soundEvent);
    }

    const laserHits = this.collisions.checkBeamEnemies(
      this.weaponSystem.laserBeam, this.enemies, dt
    );
    const laserSoundEvent = this.weaponSystem.getLaserSoundEvent(dt, laserHits.length > 0);
    if (laserSoundEvent) {
      this.sound.play(laserSoundEvent);
    }
    for (const enemy of laserHits) {
      if (!enemy.alive) {
        this.handleEnemyDestroyed(enemy, config);
      } else {
        this.vfx.addLaserSpark(enemy.pos.x, enemy.pos.y);
      }
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

    const storyMessages = config.story?.inGameMessages;
    if (storyMessages && this.nextStoryMessageIndex < storyMessages.length) {
      const msg = storyMessages[this.nextStoryMessageIndex];
      if (this.levelElapsed >= msg.triggerTime) {
        this.storyRenderer.showQuick(msg.text, msg.duration, "bottom");
        this.nextStoryMessageIndex++;
      }
    }

    this.storyRenderer.update(dt);

    for (const enemy of this.enemies) {
      enemy.update(dt, this.height, this.player.pos.x);

      if (enemy.canFire()) {
        const weaponConfig = ENEMY_WEAPON_CONFIGS[enemy.weaponType];

        if (enemy.weaponType === "laser") {
          const result = this.enemyWeaponSystem.fire(enemy, this.player.pos.x, this.player.pos.y);
          if (result.laserActivated) {
            const totalCycle = (weaponConfig.beamWarmupDuration ?? 0.5)
              + (weaponConfig.beamActiveDuration ?? 2.5)
              + (weaponConfig.beamCooldownDuration ?? 3.0);
            enemy.resetFireCooldown(totalCycle * enemy.fireRate);
          }
        } else if (this.enemyBullets.length + weaponConfig.projectileCount <= MAX_ENEMY_BULLETS) {
          const result = this.enemyWeaponSystem.fire(enemy, this.player.pos.x, this.player.pos.y);
          for (const eb of result.bullets) {
            const sprite = this.assets.getOptional(eb.spriteKey);
            if (sprite) eb.setSprite(sprite);
            this.enemyBullets.push(eb);
          }
          if (result.bullets.length > 0) {
            enemy.resetFireCooldown(
              (1 / config.enemyFireRateMultiplier) * (1 / weaponConfig.fireRateMultiplier)
            );
            if (result.soundEvent) {
              this.sound.play(result.soundEvent);
            }
          }
        }
      }

      if (enemy.shouldDropMine() && this.enemyBullets.length < MAX_ENEMY_BULLETS) {
        const mine = new EnemyBullet(
          enemy.pos.x, enemy.pos.y,
          enemy.pos.x, enemy.pos.y,
          {
            damage: 30,
            speed: 0,
            radius: 8,
            ttl: 8.0,
            isMine: true,
            fallbackColor: "#ffcc00",
          }
        );
        this.enemyBullets.push(mine);
      }
    }

    const laserSoundEvents = this.enemyWeaponSystem.updateLasers(dt, this.player.pos.x);
    for (const evt of laserSoundEvents) {
      this.sound.play(evt);
    }

    for (const proj of this.projectiles) {
      if (proj instanceof TrackingBullet) {
        proj.update(dt, this.width, this.height, this.enemies);
        this.vfx.addTrail(proj.pos.x, proj.pos.y + 3, "rgba(168, 224, 108, 0.4)", 1.5);
      } else if (proj instanceof Bullet) {
        proj.update(dt, this.width);
        this.vfx.addTrail(proj.pos.x, proj.pos.y + 4, "rgba(255, 220, 0, 0.4)", 1.5);
      } else if (proj instanceof Missile) {
        proj.update(dt, this.width, this.height, this.enemies);
        this.vfx.addMissileTrail(proj.pos.x, proj.pos.y + 6);
      } else if (proj instanceof PlasmaBolt) {
        proj.update(dt, this.width);
        this.vfx.addPlasmaTrail(proj.pos.x, proj.pos.y + 3);
      } else if (proj instanceof IonBolt) {
        proj.update(dt, this.width);
        this.vfx.addTrail(proj.pos.x, proj.pos.y + 4, "rgba(0, 188, 212, 0.5)", 2);
      } else if (proj instanceof Rocket) {
        proj.update(dt, this.width, this.height);
        this.vfx.addRocketTrail(proj.pos.x, proj.pos.y + 8);
      }
    }
    for (const eb of this.enemyBullets) {
      eb.update(dt, this.width, this.height, this.player.pos);
      if (eb instanceof EnemyMissile) {
        this.vfx.addMissileTrail(eb.pos.x, eb.pos.y);
      }
    }
    for (const exp of this.explosions) {
      exp.update(dt);
    }
    for (const pu of this.powerUps) {
      pu.update(dt, this.height);
    }

    const enemyHits = this.collisions.checkBulletsEnemies(this.projectiles, this.enemies);
    for (const hit of enemyHits) {
      if (hit.splash) {
        if (hit.destroyed) {
          this.handleEnemyDestroyed(hit.enemy, config);
        }
        continue;
      }

      if (hit.destroyed) {
        this.handleEnemyDestroyed(hit.enemy, config);
        if (hit.bullet instanceof Missile) {
          this.sound.play("missile_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 25);
        } else if (hit.bullet instanceof PlasmaBolt) {
          this.sound.play("plasma_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 20);
        } else if (hit.bullet instanceof IonBolt) {
          this.sound.play("ion_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 22);
        } else if (hit.bullet instanceof Rocket) {
          this.sound.play("missile_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 30);
        }
      } else {
        if (hit.bullet instanceof Missile) {
          this.sound.play("missile_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 15);
        } else if (hit.bullet instanceof PlasmaBolt) {
          this.sound.play("plasma_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 12);
        } else if (hit.bullet instanceof IonBolt) {
          this.sound.play("ion_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 14);
        } else if (hit.bullet instanceof Rocket) {
          this.sound.play("missile_hit");
          this.vfx.triggerExplosionFlash(hit.enemy.pos.x, hit.enemy.pos.y, 20);
        } else if (hit.enemy.variant === "boss") {
          this.sound.play("boss_hit");
        } else {
          this.sound.play("enemy_hit");
        }
      }
    }

    const bulletPlayerHits = this.collisions.checkEnemyBulletsPlayer(this.enemyBullets, this.player);
    for (const hit of bulletPlayerHits) {
      const dead = this.player.takeDamage(hit.bullet.damage);
      if (dead) {
        this.sound.play("player_destroy");
        this.addExplosion(new Explosion(this.player.pos.x, this.player.pos.y, 3));
        this.vfx.triggerScreenShake(8, 0.4);
        this.weaponSystem.laserBeam.active = false;
      } else {
        this.sound.play("player_hit");
        this.vfx.triggerScreenShake(3, 0.15);
        if (hit.bullet instanceof EnemyMissile) {
          this.sound.play("enemy_missile_hit");
          this.vfx.triggerExplosionFlash(hit.bullet.pos.x, hit.bullet.pos.y, 15);
        }
      }
    }

    this.enemyLaserHitSoundCooldown = Math.max(0, this.enemyLaserHitSoundCooldown - dt);
    const beamHits = this.collisions.checkEnemyBeamPlayer(
      this.enemyWeaponSystem.getActiveLasers(), this.player, this.height, dt
    );
    for (const hit of beamHits) {
      const dead = this.player.takeDamage(hit.damage);
      if (dead) {
        this.sound.play("player_destroy");
        this.addExplosion(new Explosion(this.player.pos.x, this.player.pos.y, 3));
        this.vfx.triggerScreenShake(8, 0.4);
        this.weaponSystem.laserBeam.active = false;
      } else if (this.enemyLaserHitSoundCooldown <= 0) {
        this.sound.play("enemy_laser_hit");
        this.vfx.triggerScreenShake(1, 0.05);
        this.enemyLaserHitSoundCooldown = 0.15;
      }
    }

    const enemyPlayerHits = this.collisions.checkPlayerEnemies(this.player, this.enemies);
    for (const hit of enemyPlayerHits) {
      const explosionSize = (hit.enemy.variant === "boss" || hit.enemy.variant === "juggernaut") ? 3
        : (hit.enemy.variant === "bomber" || hit.enemy.variant === "gunship" || hit.enemy.variant === "cruiser" || hit.enemy.variant === "destroyer" || hit.enemy.variant === "minelayer") ? 2
        : 1;
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
        this.weaponSystem.laserBeam.active = false;
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
        case "weapon-missile":
          this.handleWeaponPickup("missile");
          break;
        case "weapon-laser":
          this.handleWeaponPickup("laser");
          break;
        case "weapon-plasma":
          this.handleWeaponPickup("plasma");
          break;
        case "weapon-ion":
          this.handleWeaponPickup("ion-cannon");
          break;
        case "weapon-autogun":
          this.handleWeaponPickup("auto-gun");
          break;
        case "weapon-rocket":
          this.handleWeaponPickup("rocket");
          break;
        case "mega-bomb":
          if (this.player.bombs < this.player.maxBombs) {
            this.player.bombs++;
          }
          break;
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.enemyBullets = this.enemyBullets.filter((eb) => eb.alive);
    this.explosions = this.explosions.filter((e) => e.alive);
    this.powerUps = this.powerUps.filter((p) => p.alive);

    if (!this.player.alive) {
      this.totalScore += this.score;
      this.weaponSystem.laserBeam.active = false;
      this.sound.stopMusic();
      this.sound.play("game_over");
      this.state = "gameover";
      return;
    }

    if (this.spawner.isLevelComplete && this.enemies.length === 0) {
      this.totalScore += this.score;
      this.projectiles = [];
      this.enemyBullets = [];
      this.powerUps = [];
      this.weaponSystem.laserBeam.active = false;
      this.enemyWeaponSystem.resetLasers();
      this.sound.stopMusic();

      if (this.currentLevel >= LEVELS.length - 1) {
        this.state = "victory";
        this.sound.play("victory");
        SaveSystem.clear();
        this.storyRenderer.show(GAME_STORY.ending, "center");
        this.hud.setVictoryStoryActive(true);
      } else {
        this.state = "level_complete";
        this.sound.play("level_complete");
        this.hud.setCompletionText(this.currentLevelConfig.story?.completionText ?? null);
        SaveSystem.save({
          version: 1,
          levelReached: this.currentLevel + 1,
          totalScore: this.totalScore,
          lives: this.player.lives,
          weapon: this.powerUpManager.currentWeapon,
          savedAt: new Date().toISOString(),
          bombs: this.player.bombs,
          weaponTier: this.powerUpManager.weaponTier,
        });
      }
    }
  }

  private handleEnemyDestroyed(enemy: Enemy, config: RaptorLevelConfig): void {
    this.score += enemy.scoreValue;
    const explosionSize = (enemy.variant === "boss" || enemy.variant === "juggernaut") ? 3
      : (enemy.variant === "bomber" || enemy.variant === "gunship" || enemy.variant === "cruiser" || enemy.variant === "destroyer" || enemy.variant === "minelayer") ? 2
      : 1;
    this.addExplosion(new Explosion(enemy.pos.x, enemy.pos.y, explosionSize));

    if (enemy.variant === "boss") {
      this.sound.play("boss_destroy");
      this.spawner.markBossDefeated();
      this.vfx.triggerScreenShake(10, 0.5);
    } else if (enemy.variant === "juggernaut") {
      this.sound.play("enemy_destroy");
      this.vfx.triggerScreenShake(8, 0.4);
      if (Math.random() < config.powerUpDropChance) {
        this.spawnPowerUp(enemy.pos.x, enemy.pos.y);
      }
    } else {
      this.sound.play("enemy_destroy");
      if (Math.random() < config.powerUpDropChance) {
        this.spawnPowerUp(enemy.pos.x, enemy.pos.y);
      }
    }
  }

  private handleWeaponPickup(weaponType: WeaponType): void {
    const result = this.powerUpManager.setWeapon(weaponType);
    if (result === "switched") {
      this.sound.play("weapon_switch");
    } else if (result === "upgraded") {
      this.sound.play("weapon_upgrade");
      this.vfx.triggerTierUpFlash(this.player.pos.x, this.player.top);
      this.hud.triggerTierFlash();
    }
  }

  private assignProjectileSprite(proj: Projectile): void {
    if (proj instanceof TrackingBullet) {
      const sprite = this.assets.getOptional("bullet_autogun");
      if (sprite) proj.setSprite(sprite);
    } else if (proj instanceof Bullet) {
      const sprite = this.assets.getOptional("bullet_player");
      if (sprite) proj.setSprite(sprite);
    } else if (proj instanceof Missile) {
      const sprite = this.assets.getOptional("missile_player");
      if (sprite) proj.setSprite(sprite);
    } else if (proj instanceof PlasmaBolt) {
      const sprite = this.assets.getOptional("bullet_plasma");
      if (sprite) proj.setSprite(sprite);
    } else if (proj instanceof IonBolt) {
      const sprite = this.assets.getOptional("bullet_ion");
      if (sprite) proj.setSprite(sprite);
    } else if (proj instanceof Rocket) {
      const sprite = this.assets.getOptional("bullet_rocket");
      if (sprite) proj.setSprite(sprite);
    }
  }

  private static readonly WEAPON_DROP_MAP: Record<WeaponType, RaptorPowerUpType> = {
    "machine-gun": "weapon-missile",
    missile: "weapon-missile",
    laser: "weapon-laser",
    plasma: "weapon-plasma",
    "ion-cannon": "weapon-ion",
    "auto-gun": "weapon-autogun",
    rocket: "weapon-rocket",
  };

  private spawnPowerUp(x: number, y: number): void {
    const config = this.currentLevelConfig;
    const weaponDrops = config.weaponDrops;
    let type: RaptorPowerUpType | undefined;

    if (weaponDrops && weaponDrops.length > 0 && Math.random() < 0.30) {
      let weaponType: WeaponType;
      const currentWeapon = this.powerUpManager.currentWeapon;
      if (weaponDrops.includes(currentWeapon) && Math.random() < 0.40) {
        weaponType = currentWeapon;
      } else {
        weaponType = weaponDrops[Math.floor(Math.random() * weaponDrops.length)];
      }
      type = RaptorGame.WEAPON_DROP_MAP[weaponType];
    }

    const pu = new PowerUp(x, y, type);
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
      interceptor: "enemy_interceptor",
      dart: "enemy_dart",
      drone: "enemy_drone",
      swarmer: "enemy_swarmer",
      gunship: "enemy_gunship",
      cruiser: "enemy_cruiser",
      destroyer: "enemy_destroyer",
      juggernaut: "enemy_juggernaut",
      stealth: "enemy_stealth",
      minelayer: "enemy_minelayer",
    };
    const key = spriteMap[enemy.variant];
    if (key) {
      const sprite = this.assets.getOptional(key);
      if (sprite) enemy.setSprite(sprite);
    }
  }

  get hasSaveData(): boolean {
    return SaveSystem.hasSave();
  }

  private resetGame(): void {
    this.totalScore = 0;
    this.vfx.reset();
    this.hud.setCompletionText(null);
    this.hud.setVictoryStoryActive(false);
    this.startLevel(0, true);
  }

  private continueGame(): void {
    const data = SaveSystem.load();
    if (!data) {
      this.resetGame();
      return;
    }
    this.totalScore = data.totalScore;
    this.vfx.reset();
    this.startLevel(data.levelReached, false);
    this.player.lives = data.lives;
    this.player.bombs = data.bombs ?? 0;
    // Order matters: setWeapon() may transiently bump the tier (e.g. "upgraded"
    // when restoring the default machine-gun), so setTier() must come second to
    // overwrite with the saved value.
    this.powerUpManager.setWeapon(data.weapon);
    this.powerUpManager.setTier(data.weaponTier ?? 1);
  }

  private enterBriefing(): void {
    const config = this.currentLevelConfig;
    const briefingText = config.story?.briefing;

    if (!briefingText) {
      this.state = "playing";
      this.sound.startMusic("playing", this.currentLevel);
      return;
    }

    this.storyRenderer.show([briefingText], "center");
    this.state = "briefing";
  }

  private renderBriefingHeader(): void {
    const config = this.currentLevelConfig;
    const ctx = this.ctx;
    const headerText = `LEVEL ${config.level} \u2014 ${config.name.toUpperCase()}`;

    ctx.save();
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.fillStyle = "#8EAADC";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(headerText, this.width / 2, this.height / 2 - 50);
    ctx.restore();
  }

  private buildCommandContext(): CommandContext {
    return {
      currentLevel: this.currentLevel,
      levelCount: LEVELS.length,
      levels: LEVELS,
      startLevel: (idx: number) => {
        this.startLevel(idx);
      },
      setState: (state: "playing") => {
        this.state = state;
      },
      startMusic: (levelIndex: number) => {
        this.sound.startMusic("playing", levelIndex);
      },
      stopMusic: () => {
        this.sound.stopMusic();
      },
      gameState: this.state,
      player: this.player,
      canvasWidth: this.width,
      canvasHeight: this.height,
      powerUpManager: this.powerUpManager,
      weaponSystem: this.weaponSystem,

      score: this.score,
      totalScore: this.totalScore,
      setScore: (value: number) => {
        this.score = value;
      },
      addScore: (value: number) => {
        this.score += value;
        return this.score;
      },
      enemies: this.enemies,
      enemyBullets: this.enemyBullets,
      spawnEnemy: (variant: EnemyVariant) => {
        const margin = 50;
        const x = margin + Math.random() * (this.width - 2 * margin);
        const enemy = new Enemy(x, -30, variant);
        this.assignEnemySprite(enemy);
        this.enemies.push(enemy);
        return enemy;
      },
      destroyAllEnemies: () => {
        const count = this.enemies.length;
        for (const enemy of this.enemies) {
          enemy.alive = false;
        }
        this.enemyBullets.length = 0;
        return count;
      },
      showFps: this.showFps,
      toggleFps: () => {
        this.showFps = !this.showFps;
        return this.showFps;
      },
    };
  }

  private startLevel(levelIndex: number, fullReset = false): void {
    this.currentLevel = levelIndex;
    this.score = 0;
    this.projectiles = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.explosions = [];
    this.powerUps = [];
    this.player.reset(this.width, this.height, fullReset);

    this.enemyWeaponSystem.resetLasers();

    if (fullReset) {
      this.weaponSystem.reset();
      this.powerUpManager.reset();
    } else {
      this.weaponSystem.resetForNewLevel();
    }

    const playerSprite = this.assets.getOptional("player");
    if (playerSprite) this.player.setSprite(playerSprite);
    if (this.thrustSheet) this.player.setThrustSheet(this.thrustSheet);

    this.levelElapsed = 0;
    this.nextStoryMessageIndex = 0;
    this.hud.setCompletionText(null);
    this.hud.setVictoryStoryActive(false);

    this.spawner.configure(this.currentLevelConfig);
    this.vfx.reset();

    const levelCfg = this.currentLevelConfig;
    if (levelCfg.terrain) {
      this.terrainActive = true;
      this.terrainRenderer.configure(levelCfg.terrain);
      this.stars = [];
      this.starsNear = [];
      this.bgLayers = [];
      this.planetAccents = [];
    } else {
      this.terrainActive = false;
      this.terrainRenderer.reset();
      this.initStars(levelCfg.starDensity);
      this.initBackgroundLayers();
      this.initPlanetAccents();
    }
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
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.state === "loading") {
      this.hud.renderLoadingScreen(this.ctx, this.assets.progress, this.width, this.height);
      return;
    }

    this.vfx.applyPreRender(this.ctx);

    this.renderBackground();

    if (this.state === "story_intro") {
      this.storyRenderer.render(this.ctx, this.width, this.height);
    }

    if (this.state === "briefing") {
      this.renderBriefingHeader();
      this.storyRenderer.render(this.ctx, this.width, this.height);
    }

    if (
      this.state === "playing" ||
      this.state === "gameover" ||
      this.state === "level_complete"
    ) {
      this.vfx.renderTrails(this.ctx);
      this.vfx.renderMuzzleFlashes(this.ctx);

      this.weaponSystem.renderLaser(this.ctx);

      for (const pu of this.powerUps) {
        pu.render(this.ctx);
      }
      for (const enemy of this.enemies) {
        enemy.render(this.ctx);
      }
      for (const proj of this.projectiles) {
        proj.render(this.ctx);
      }
      for (const eb of this.enemyBullets) {
        eb.render(this.ctx);
      }
      for (const beam of this.enemyWeaponSystem.getActiveLasers()) {
        beam.render(this.ctx, this.height);
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
      this.powerUpManager.getActive(),
      this.weaponSystem.currentWeapon,
      this.hasSaveData,
      this.weaponSystem.chargeLevel,
      this.player.bombs,
      this.powerUpManager.weaponTier
    );
    this.hud.renderMuteButton(this.ctx, this.audio.muted, this.width);
    this.hud.renderSettingsButton(this.ctx, this.width);

    if (this.state === "playing" || (this.state === "victory" && this.storyRenderer.isActive)) {
      this.storyRenderer.render(this.ctx, this.width, this.height);
    }

    if (this.settingsOpen) {
      this.hud.renderSettingsPanel(
        this.ctx, this.width, this.height,
        this.audio.musicVolume, this.audio.sfxVolume,
        this.hasSaveData
      );
    }

    if (this.showFps) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = Math.round(1000 / avgFrameTime);
      this.ctx.font = "10px monospace";
      this.ctx.fillStyle = "rgba(0, 255, 65, 0.8)";
      this.ctx.fillText(`FPS: ${fps}`, 30, 60);
    }

    this.devConsole.render(this.ctx, this.width, this.height);
  }

  private renderBackground(): void {
    const config = this.currentLevelConfig;

    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, config.skyGradient[0]);
    grad.addColorStop(1, config.skyGradient[1]);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.terrainActive) {
      this.terrainRenderer.render(this.ctx);
      return;
    }

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
