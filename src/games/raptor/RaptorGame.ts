import { RaptorGameState, RaptorLevelConfig, Projectile, RaptorPowerUpType, WeaponType, RaptorSaveData, EnemyVariant, ENEMY_CONFIGS, ENEMY_WEAPON_CONFIGS, SpeakerType, WEAPON_SLOT_ORDER, HUD_BAR_HEIGHT, HUD_LEFT_PANEL_WIDTH, HUD_RIGHT_PANEL_WIDTH, HUD_TOP_BAR_HEIGHT, SAVE_FORMAT_VERSION, MAX_SAVE_SLOTS, MAX_WEAPON_TIER } from "./types";
import { detectSpeaker } from "./rendering/StoryRenderer";
import { InputManager } from "./systems/InputManager";
import { DevConsole } from "./systems/DevConsole";
import { CollisionSystem } from "./systems/CollisionSystem";
import { EnemySpawner } from "./systems/EnemySpawner";
import { PowerUpManager } from "./systems/PowerUpManager";
import { SoundSystem } from "./systems/SoundSystem";
import { WeaponSystem } from "./systems/WeaponSystem";
import { EnemyWeaponSystem } from "./systems/EnemyWeaponSystem";
import { SaveSystem } from "./systems/SaveSystem";
import { PerformanceManager } from "./systems/PerformanceManager";
import { PlayerStatsTracker } from "./systems/achievements/PlayerStatsTracker";
import { AchievementManager } from "./systems/achievements/AchievementManager";
import { CommandRegistry, CommandContext, registerLevelCommands, registerWeaponCommands, registerPowerUpCommands, registerPlayerCommands, registerCombatCommands } from "./systems/CommandRegistry";
import { registerAchievementCommands } from "./systems/achievements/achievementCommands";
import { Player } from "./entities/Player";
import { Bullet } from "./entities/Bullet";
import { Missile } from "./entities/Missile";
import { TrackingBullet } from "./entities/TrackingBullet";
import { PlasmaBolt } from "./entities/PlasmaBolt";
import { IonBolt } from "./entities/IonBolt";
import { Rocket } from "./entities/Rocket";
import { Enemy, isBossVariant } from "./entities/Enemy";
import { EnemyBullet } from "./entities/EnemyBullet";
import { EnemyMissile } from "./entities/EnemyMissile";
import { Explosion } from "./entities/Explosion";
import { PowerUp, POWERUP_SPRITE_KEYS } from "./entities/PowerUp";
import { HUD } from "./rendering/HUD";
import { AchievementNotification } from "./rendering/AchievementNotification";
import { AchievementGallery } from "./rendering/AchievementGallery";
import { AssetLoader } from "./rendering/AssetLoader";
import { SpriteSheet, generateExplosionSheet, generateThrustSheet } from "./rendering/SpriteSheet";
import { ShipRenderer } from "./rendering/ShipRenderer";
import { VFXManager } from "./rendering/VFXManager";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { StoryRenderer } from "./rendering/StoryRenderer";
import { ASSET_MANIFEST } from "./rendering/assets";
import { AUDIO_MANIFEST } from "./rendering/audioAssets";
import { LEVELS } from "./levels";
import { GAME_STORY, getActForLevel } from "./story";
import { IGame } from "../../shared/types";
import { AudioManager } from "../../shared/AudioManager";
import { SettingsStorage } from "../../shared/storage";
import { AchievementStorage } from "./systems/achievements/AchievementStorage";

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
  private perfManager: PerformanceManager;
  private statsTracker = new PlayerStatsTracker();
  private achievementManager: AchievementManager;
  private achievementNotification: AchievementNotification;
  private achievementGallery: AchievementGallery;
  private achievementGalleryOpen = false;
  private achievementCheckTimer = 0;
  private skyGradientCanvas: HTMLCanvasElement | null = null;
  private cachedSkyGradient: [string, string] | null = null;
  private playTimeSeconds = 0;
  private lastAutoSaveTime = 0;
  private lastCompletedWaveCount = 0;

  public onExit: (() => void) | null = null;
  private activeSlot = 0;
  private _hasSaveData = false;
  private slotData: (RaptorSaveData | null)[] = [null, null, null];
  private slotDataLoaded = false;
  private slotLoadingInProgress = false;

  get saveSlot(): number {
    return this.activeSlot;
  }

  set saveSlot(slot: number) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_SAVE_SLOTS) return;
    this.activeSlot = slot;
  }

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
    registerAchievementCommands(this.commandRegistry);
    this.devConsole.onSubmit = (cmd) => {
      this.devConsole.log(`> ${cmd}`);
      const output = this.commandRegistry.dispatch(cmd, this.buildCommandContext());
      for (const line of output) {
        this.devConsole.log(line);
      }
    };
    this.collisions = new CollisionSystem(width, height);
    this.spawner = new EnemySpawner();
    this.powerUpManager = new PowerUpManager();
    this.weaponSystem = new WeaponSystem();
    this.enemyWeaponSystem = new EnemyWeaponSystem();
    this.hud = new HUD(this.input.isTouchDevice);
    this.audio = new AudioManager();
    this.sound = new SoundSystem(this.audio);
    this.player = new Player(this.gameAreaWidth, this.gameAreaHeight, this.gameAreaX, this.gameAreaY);
    this.assets = new AssetLoader();
    this.vfx = new VFXManager();
    this.terrainRenderer = new TerrainRenderer(width, height, this.assets);

    this.perfManager = new PerformanceManager();
    this.achievementManager = new AchievementManager(this.statsTracker);
    this.achievementNotification = new AchievementNotification();
    this.achievementGallery = new AchievementGallery();
    this.achievementManager.onUnlock = (a) => {
      this.sound.play("achievement_unlock");
      this.vfx.triggerAchievementFlash(this.width, this.height);
      this.achievementNotification.show(a);
      this.saveAchievements();
    };
    this.initStars(60);
    this.setupResize();
  }

  private get currentLevelConfig(): RaptorLevelConfig {
    return LEVELS[this.currentLevel];
  }

  get gameAreaX(): number { return HUD_LEFT_PANEL_WIDTH; }
  get gameAreaY(): number { return HUD_TOP_BAR_HEIGHT; }
  get gameAreaWidth(): number { return this.width - HUD_LEFT_PANEL_WIDTH - HUD_RIGHT_PANEL_WIDTH; }
  get gameAreaHeight(): number { return this.height - HUD_TOP_BAR_HEIGHT - HUD_BAR_HEIGHT; }

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

      this.player.dpr = this.dpr;
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

    this.perfManager.onVisibilityChange((hidden) => {
      if (hidden) {
        cancelAnimationFrame(this.rafId);
        this.audio.suspendContext();
      } else if (this.running) {
        this.lastTime = performance.now();
        this.audio.resumeContext();
        this.rafId = requestAnimationFrame((t) => this.loop(t));
      }
    });

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
    this.storyRenderer.setAssets(this.assets);

    const playerSprite = this.assets.getOptional("player");
    if (playerSprite) this.player.setSprite(playerSprite);
    if (this.thrustSheet) this.player.setThrustSheet(this.thrustSheet);

    const settings = await SettingsStorage.load();
    this.audio.musicVolume = settings.musicVolume;
    this.audio.sfxVolume = settings.sfxVolume;
    if (settings.muted) this.audio.muted = true;
    this.showFps = settings.showFps;

    const achievementData = await AchievementStorage.load();
    this.achievementManager.loadUnlocked(achievementData.unlockedAchievements);
    this.statsTracker.deserialize(achievementData.playerStats);

    await this.refreshSaveStatus();
    this.state = "menu";
    this.hideLoadingOverlay();
  }

  private updateLoadingOverlay(progress: number): void {
    const fill = document.getElementById("loading-progress-fill");
    const pct = document.getElementById("loading-percent");
    if (fill) fill.style.width = `${Math.floor(progress * 100)}%`;
    if (pct) pct.textContent = `${Math.floor(progress * 100)}%`;
  }

  private hideLoadingOverlay(): void {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
    overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
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
    this.perfManager.destroy();

    this.canvas.style.cursor = "";

    if (this.boundResize) {
      window.removeEventListener("resize", this.boundResize);
      window.removeEventListener("orientationchange", this.boundResize);
      this.boundResize = null;
    }
  }

  private loop(time: number): void {
    if (!this.running || this.perfManager.isHidden) return;

    if (!this.perfManager.shouldRenderFrame(time)) {
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    const elapsed = time - this.lastTime;
    const dt = Math.min(elapsed / 1000, DT_CAP);
    this.lastTime = time;

    ShipRenderer.frameTime = time;

    this.frameTimes[this.frameTimeIndex] = elapsed;
    this.frameTimeIndex = (this.frameTimeIndex + 1) % this.frameTimes.length;

    this.perfManager.trackFrameTime(elapsed);

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private handleUIClicks(): boolean {
    if (this.settingsOpen) {
      return this.handleSettingsInput();
    }

    if (!this.input.wasClicked) return false;

    if (this.state !== "playing" && this.state !== "paused" && !this.slotLoadingInProgress) {
      if (this.hud.isSettingsButtonHit(this.input.mouseX, this.input.mouseY, this.width, HUD_RIGHT_PANEL_WIDTH)) {
        this.settingsOpen = true;
        this.input.consume();
        return true;
      }

      if (this.hud.isMuteButtonHit(this.input.mouseX, this.input.mouseY, this.width, HUD_RIGHT_PANEL_WIDTH)) {
        this.audio.ensureContext();
        this.audio.toggleMute();
        this.persistSettings();
        this.input.consume();
        return true;
      }
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
        this.persistSettings();
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

    if (this.hud.isMuteButtonHit(mx, my, this.width, HUD_RIGHT_PANEL_WIDTH)) {
      this.audio.ensureContext();
      this.audio.toggleMute();
      this.persistSettings();
      this.input.consume();
      return true;
    }

    if (this.hud.isClearSaveButtonHit(mx, my, this.width, this.height)) {
      SaveSystem.clear(this.activeSlot)
        .then(() => this.refreshSaveStatus())
        .catch(console.error);
      this._hasSaveData = false;
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
    this.updateCursorVisibility();

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

    if (this.achievementGalleryOpen) {
      if (this.input.wasEscPressed) {
        this.achievementGalleryOpen = false;
        this.achievementGallery.hide();
        this.input.consume();
        return;
      }
      if (this.input.wasClicked) {
        const result = this.achievementGallery.handleClick(
          this.input.mouseX, this.input.mouseY, this.width, this.height,
        );
        if (result.action === "close") {
          this.achievementGalleryOpen = false;
          this.achievementGallery.hide();
        }
        this.input.consume();
        return;
      }
      if (this.input.scrollDelta !== 0) {
        this.achievementGallery.handleScroll(this.input.scrollDelta);
      }
      this.achievementGallery.update(dt);
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
      this.state = "paused";
      this.input.consume();
      return;
    }

    if (this.state === "paused" && this.input.wasEscPressed) {
      this.state = "playing";
      this.input.consume();
      return;
    }

    this.vfx.update(dt);

    switch (this.state) {
      case "menu":
        this.updateBackground(dt);
        if (this.input.wasClicked) {
          if (this.hud.isMenuAchievementsButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.openAchievementGallery();
            break;
          }
          if (this.hud.isPlayButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.audio.ensureContext();
            this.sound.play("menu_start");
            this.slotDataLoaded = false;
            this.state = "slot_select";
            SaveSystem.listSlots().then(slots => {
              this.slotData = slots;
              this.slotDataLoaded = true;
            }).catch(e => {
              console.error(e);
              this.slotData = [null, null, null];
              this.slotDataLoaded = true;
            });
          }
        }
        break;

      case "slot_select":
        this.updateBackground(dt);
        if (this.input.wasEscPressed) {
          if (this.hud.deleteConfirmActive !== null) {
            this.hud.setDeleteConfirm(null);
          } else {
            this.state = "menu";
          }
          break;
        }
        if (!this.input.wasClicked || !this.slotDataLoaded || this.slotLoadingInProgress) break;

        {
          const mx = this.input.mouseX;
          const my = this.input.mouseY;

          if (this.hud.deleteConfirmActive !== null) {
            const confirmSlot = this.hud.deleteConfirmActive;
            if (this.hud.isDeleteConfirmYesHit(mx, my, this.width, this.height)) {
              SaveSystem.clear(confirmSlot).then(() => {
                this.slotData[confirmSlot] = null;
                this.hud.setDeleteConfirm(null);
                this.refreshSaveStatus().catch(console.error);
              }).catch(console.error);
            } else if (this.hud.isDeleteConfirmNoHit(mx, my, this.width, this.height)) {
              this.hud.setDeleteConfirm(null);
            }
            break;
          }

          if (this.hud.isBackButtonHit(mx, my, this.width, this.height)) {
            this.state = "menu";
            break;
          }

          for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
            if (this.hud.isSlotDeleteHit(mx, my, i, this.width, this.height) && this.slotData[i]) {
              this.hud.setDeleteConfirm(i);
              break;
            }
            if (this.hud.isSlotCardHit(mx, my, i, this.width, this.height)) {
              this.activeSlot = i;
              if (this.slotData[i]) {
                this.slotLoadingInProgress = true;
                this.continueGame().then(() => {
                  this.state = "playing";
                  this.sound.startMusic("playing", this.currentLevel);
                  this.slotLoadingInProgress = false;
                }).catch(e => {
                  console.error(e);
                  this.slotLoadingInProgress = false;
                });
              } else {
                this.resetGame();
                const act = getActForLevel(0);
                this.storyRenderer.show([act.opening.join(" ")], "center", "pilot");
                this.state = "story_intro";
                this.sound.startMusic("playing", 0);
              }
              break;
            }
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

      case "paused":
        if (this.input.wasClicked) {
          if (this.hud.isPauseAchievementsButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.openAchievementGallery();
            break;
          }
          if (this.hud.isResumeButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.state = "playing";
          } else if (this.hud.isPauseMuteButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.audio.ensureContext();
            this.audio.toggleMute();
            this.persistSettings();
          } else if (this.hud.isPauseSettingsButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.settingsOpen = true;
          } else if (this.hud.isQuitButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
            this.weaponSystem.laserBeam.active = false;
            this.sound.stopMusic();
            this.state = "menu";
            this.refreshSaveStatus().catch(console.error);
          }
        }
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
            this.storyRenderer.setAssets(this.assets);
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

  private updateCursorVisibility(): void {
    const shouldHide =
      this.state === "playing" &&
      !this.settingsOpen &&
      !this.achievementGalleryOpen &&
      !this.devConsole.isOpen;

    this.canvas.style.cursor = shouldHide ? "none" : "";
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
    this.playTimeSeconds += dt;
    this.statsTracker.addPlayTime(dt);
    this.achievementCheckTimer += dt;
    if (this.achievementCheckTimer >= 5) {
      this.achievementCheckTimer = 0;
      this.achievementManager.checkAchievements();
    }
    this.hud.updateWingmanTimer(dt);
    this.achievementNotification.update(dt);
    this.input.updateFromKeyboard(dt, this.gameAreaWidth, this.gameAreaHeight, this.gameAreaX, this.gameAreaY);
    this.player.update(dt, this.input.targetX, this.input.targetY, this.gameAreaWidth, this.gameAreaHeight, this.gameAreaX, this.gameAreaY);
    if (this.player.alive) {
      this.vfx.addEngineTrail(this.player.pos.x, this.player.pos.y + this.player.height / 2, ShipRenderer.getEngineSpacing(this.player.width));
    }
    this.updateBackground(dt);
    this.powerUpManager.update(dt);
    this.player.deflectorActive = this.powerUpManager.hasUpgrade("deflector");

    const config = this.currentLevelConfig;

    if (this.input.wasClicked && this.hud.isWeaponCycleButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
      this.input.wasCycleNextPressed = true;
    } else if (this.input.wasClicked && this.hud.isBombButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
      this.input.wasBombPressed = true;
    } else if (this.input.wasClicked && this.storyRenderer.isActive) {
      this.storyRenderer.advance();
    }

    if (this.input.wasClicked
        && this.hud.isDodgeButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
      this.input.wasDodgePressed = true;
    }

    if (this.input.wasClicked
        && this.hud.isEmpButtonHit(this.input.mouseX, this.input.mouseY, this.width, this.height)) {
      this.input.wasEmpPressed = true;
    }

    if (this.input.wasDodgePressed) {
      const dodged = this.player.dodge();
      if (dodged) {
        this.sound.play("dodge");
        this.statsTracker.recordDodge();
      }
    }

    if (this.input.wasEmpPressed) {
      const fired = this.player.emp();
      if (fired) {
        this.enemyBullets.length = 0;
        this.enemyWeaponSystem.resetLasers();
        this.vfx.triggerEmpPulse(this.player.pos.x, this.player.pos.y, Math.max(this.width, this.height));
        this.sound.play("emp_burst");
        this.statsTracker.recordEmp();
      }
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

    if (this.input.weaponSlotPressed !== null) {
      const type = WEAPON_SLOT_ORDER[this.input.weaponSlotPressed - 1];
      if (type && this.powerUpManager.switchWeapon(type)) {
        this.weaponSystem.setWeapon(this.powerUpManager.currentWeapon);
        this.sound.play("weapon_switch");
      }
    }
    if (this.input.wasCycleNextPressed) {
      const prev = this.powerUpManager.currentWeapon;
      this.powerUpManager.cycleWeapon(1);
      if (this.powerUpManager.currentWeapon !== prev) {
        this.weaponSystem.setWeapon(this.powerUpManager.currentWeapon);
        this.sound.play("weapon_switch");
      }
    }
    if (this.input.wasCyclePrevPressed) {
      const prev = this.powerUpManager.currentWeapon;
      this.powerUpManager.cycleWeapon(-1);
      if (this.powerUpManager.currentWeapon !== prev) {
        this.weaponSystem.setWeapon(this.powerUpManager.currentWeapon);
        this.sound.play("weapon_switch");
      }
    }

    this.weaponSystem.setWeapon(this.powerUpManager.currentWeapon);

    const { newProjectiles, soundEvent } = this.weaponSystem.update(
      dt, this.player, config, this.powerUpManager,
      this.gameAreaWidth + this.gameAreaX, this.projectiles
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

    const newEnemies = this.spawner.update(dt, this.gameAreaWidth, this.gameAreaX);
    for (const e of newEnemies) {
      this.assignEnemySprite(e);
      this.enemies.push(e);
    }

    if (this.spawner.shouldSpawnBoss()) {
      const boss = this.spawner.spawnBoss(this.gameAreaWidth, this.gameAreaX);
      if (boss) {
        this.assignEnemySprite(boss);
        this.enemies.push(boss);
      }
    }

    const currentCompletedWaves = this.spawner.completedWaveCount;
    if (currentCompletedWaves > this.lastCompletedWaveCount) {
      this.lastCompletedWaveCount = currentCompletedWaves;
      const AUTO_SAVE_INTERVAL = 30;
      if (this.levelElapsed - this.lastAutoSaveTime >= AUTO_SAVE_INTERVAL) {
        this.lastAutoSaveTime = this.levelElapsed;
        SaveSystem.autoSave(
          this.activeSlot,
          this.buildSaveData({ waveIndex: currentCompletedWaves })
        ).catch(console.error);
      }
    }

    const storyMessages = config.story?.inGameMessages;
    if (storyMessages && this.nextStoryMessageIndex < storyMessages.length) {
      const msg = storyMessages[this.nextStoryMessageIndex];
      if (this.levelElapsed >= msg.triggerTime) {
        const speaker: SpeakerType = msg.speaker ?? detectSpeaker(msg.text);
        const duration = msg.duration ?? 3;
        this.hud.setWingmanMessage(speaker, msg.text, duration);
        this.nextStoryMessageIndex++;
      }
    }

    this.storyRenderer.update(dt);

    for (const enemy of this.enemies) {
      enemy.update(dt, this.gameAreaHeight, this.player.pos.x, this.gameAreaWidth, this.gameAreaX, this.gameAreaY);

      if (enemy.canFire()) {
        const weaponConfig = ENEMY_WEAPON_CONFIGS[enemy.weaponType];

        if (enemy.weaponType === "laser") {
          let result;
          let firedPhase: "A" | "B" | null = null;
          if (enemy.variant === "boss_fortress") {
            firedPhase = enemy.fortressAttackPhase;
            result = this.enemyWeaponSystem.fireFortressLaser(enemy, this.player.pos.x, this.width);
          } else {
            result = this.enemyWeaponSystem.fire(enemy, this.player.pos.x, this.player.pos.y);
          }
          if (result.laserActivated) {
            let totalCycle: number;
            if (enemy.variant === "boss_fortress" && firedPhase) {
              totalCycle = firedPhase === "A"
                ? (0.7 + 3.0 + 2.5)
                : (0.5 + 2.0 + 2.5);
            } else {
              totalCycle = (weaponConfig.beamWarmupDuration ?? 0.5)
                + (weaponConfig.beamActiveDuration ?? 2.5)
                + (weaponConfig.beamCooldownDuration ?? 3.0);
            }
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

      if (enemy.variant === "boss_dreadnought" && enemy.hasPendingBurst()) {
        if (this.enemyBullets.length < MAX_ENEMY_BULLETS) {
          const { offsetX, offsetY } = enemy.consumeBurstTick();
          const result = this.enemyWeaponSystem.fireMissileFrom(
            enemy, this.player.pos.x, this.player.pos.y, offsetX, offsetY
          );
          for (const eb of result.bullets) {
            const sprite = this.assets.getOptional(eb.spriteKey);
            if (sprite) eb.setSprite(sprite);
            this.enemyBullets.push(eb);
          }
          if (result.soundEvent) {
            this.sound.play(result.soundEvent);
          }
        }
      }

      if (enemy.variant === "boss_carrier" && enemy.shouldSpawnDrones()) {
        const MAX_ACTIVE_DRONES = 8;
        const activeDrones = this.enemies.filter(
          e => e.alive && (e.variant === "drone" || e.variant === "swarmer")
        ).length;
        if (activeDrones < MAX_ACTIVE_DRONES) {
          const spawnVariant = enemy.getDroneSpawnVariant();
          const spawnPositions = enemy.getDroneSpawnPositions();
          const spawnCount = Math.min(
            2 + Math.floor(Math.random() * 2),
            MAX_ACTIVE_DRONES - activeDrones
          );
          for (let i = 0; i < spawnCount; i++) {
            const spawnPos = spawnPositions[i % spawnPositions.length];
            const drone = new Enemy(spawnPos.x, spawnPos.y, spawnVariant);
            this.assignEnemySprite(drone);
            this.enemies.push(drone);
          }
        }
      }
    }

    const laserSoundEvents = this.enemyWeaponSystem.updateLasers(dt, this.player.pos.x);
    for (const evt of laserSoundEvents) {
      this.sound.play(evt);
    }

    for (const proj of this.projectiles) {
      if (proj instanceof TrackingBullet) {
        proj.update(dt, this.width, this.height, this.enemies);
        const exhaust = proj.getExhaustPosition();
        this.vfx.addTrail(exhaust.x, exhaust.y, "rgba(168, 224, 108, 0.4)", 1.5);
      } else if (proj instanceof Bullet) {
        proj.update(dt, this.width);
        this.vfx.addTrail(proj.pos.x, proj.pos.y + 4, "rgba(255, 220, 0, 0.4)", 1.5);
      } else if (proj instanceof Missile) {
        proj.update(dt, this.width, this.height, this.enemies);
        const exhaust = proj.getExhaustPosition();
        this.vfx.addMissileTrail(exhaust.x, exhaust.y, proj.heading);
      } else if (proj instanceof PlasmaBolt) {
        proj.update(dt, this.width);
        this.vfx.addPlasmaTrail(proj.pos.x, proj.pos.y + 3);
      } else if (proj instanceof IonBolt) {
        proj.update(dt, this.width);
        this.vfx.addTrail(proj.pos.x, proj.pos.y + 4, "rgba(0, 188, 212, 0.5)", 2);
      } else if (proj instanceof Rocket) {
        proj.update(dt, this.width, this.height);
        const exhaust = proj.getExhaustPosition();
        this.vfx.addRocketTrail(exhaust.x, exhaust.y, proj.heading);
      }
    }
    for (const eb of this.enemyBullets) {
      eb.update(dt, this.gameAreaWidth + this.gameAreaX, this.gameAreaHeight + this.gameAreaY, this.player.pos);
      if (eb instanceof EnemyMissile) {
        this.vfx.addMissileTrail(eb.pos.x, eb.pos.y, eb.heading);
      }
    }
    for (const exp of this.explosions) {
      exp.update(dt);
    }
    for (const pu of this.powerUps) {
      pu.update(dt, this.gameAreaHeight + this.gameAreaY);
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
        } else if (isBossVariant(hit.enemy.variant)) {
          this.sound.play("boss_hit");
        } else {
          this.sound.play("enemy_hit");
        }
      }
    }

    const missileInterceptHits = this.collisions.checkProjectilesEnemyMissiles(
      this.projectiles, this.enemyBullets
    );
    for (const hit of missileInterceptHits) {
      this.vfx.triggerExplosionFlash(hit.missile.pos.x, hit.missile.pos.y, 12);
      this.sound.play("enemy_missile_hit");
    }

    const beamMissileKills = this.collisions.checkBeamEnemyMissiles(
      this.weaponSystem.laserBeam, this.enemyBullets, dt
    );
    for (const missile of beamMissileKills) {
      this.vfx.triggerExplosionFlash(missile.pos.x, missile.pos.y, 12);
      this.sound.play("enemy_missile_hit");
    }

    const bulletPlayerHits = this.collisions.checkEnemyBulletsPlayer(this.enemyBullets, this.player);
    for (const hit of bulletPlayerHits) {
      if (hit.reflected) {
        this.sound.play("deflect");
        this.statsTracker.recordReflect();
        continue;
      }
      const dead = this.player.takeDamage(hit.bullet.damage);
      this.statsTracker.recordDamageTaken(hit.bullet.damage, this.player.armor);
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
        if (this.player.armor > 0 && this.player.armor < this.player.maxArmor * 0.1) {
          this.achievementManager.fireEvent("armor_below_10pct");
        }
      }
    }

    const reflectedHits = this.collisions.checkReflectedBulletsEnemies(this.enemyBullets, this.enemies);
    for (const hit of reflectedHits) {
      if (hit.destroyed) {
        this.handleEnemyDestroyed(hit.enemy, config);
      } else {
        if (isBossVariant(hit.enemy.variant)) {
          this.sound.play("boss_hit");
        } else {
          this.sound.play("enemy_hit");
        }
      }
    }

    this.enemyLaserHitSoundCooldown = Math.max(0, this.enemyLaserHitSoundCooldown - dt);
    const beamHits = this.collisions.checkEnemyBeamPlayer(
      this.enemyWeaponSystem.getActiveLasers(), this.player, this.height, dt
    );
    for (const hit of beamHits) {
      const dead = this.player.takeDamage(hit.damage);
      this.statsTracker.recordDamageTaken(hit.damage, this.player.armor);
      if (dead) {
        this.sound.play("player_destroy");
        this.addExplosion(new Explosion(this.player.pos.x, this.player.pos.y, 3));
        this.vfx.triggerScreenShake(8, 0.4);
        this.weaponSystem.laserBeam.active = false;
      } else {
        if (this.enemyLaserHitSoundCooldown <= 0) {
          this.sound.play("enemy_laser_hit");
          this.vfx.triggerScreenShake(1, 0.05);
          this.enemyLaserHitSoundCooldown = 0.15;
        }
        if (this.player.armor > 0 && this.player.armor < this.player.maxArmor * 0.1) {
          this.achievementManager.fireEvent("armor_below_10pct");
        }
      }
    }

    const enemyPlayerHits = this.collisions.checkPlayerEnemies(this.player, this.enemies);
    for (const hit of enemyPlayerHits) {
      const explosionSize = (isBossVariant(hit.enemy.variant) || hit.enemy.variant === "juggernaut") ? 3
        : (hit.enemy.variant === "bomber" || hit.enemy.variant === "gunship" || hit.enemy.variant === "cruiser" || hit.enemy.variant === "destroyer" || hit.enemy.variant === "minelayer") ? 2
        : 1;
      this.addExplosion(new Explosion(hit.enemy.pos.x, hit.enemy.pos.y, explosionSize));
      this.score += hit.enemy.scoreValue;
      this.statsTracker.recordRamKill(hit.enemy.variant, hit.enemy.scoreValue, isBossVariant(hit.enemy.variant));
      this.statsTracker.updateScore(this.score, this.totalScore + this.score);
      this.achievementManager.fireEvent("ram_kill");
      this.achievementManager.checkAchievements();
      if (isBossVariant(hit.enemy.variant)) {
        this.sound.play("boss_destroy");
        this.spawner.markBossDefeated();
        this.vfx.triggerScreenShake(10, 0.5);
      } else {
        this.sound.play("enemy_destroy");
        if (Math.random() < config.powerUpDropChance) {
          this.spawnPowerUp(hit.enemy.pos.x, hit.enemy.pos.y);
        }
      }
      const dead = this.player.takeDamage(100);
      this.statsTracker.recordDamageTaken(100, this.player.armor);
      if (dead) {
        this.sound.play("player_destroy");
        this.addExplosion(new Explosion(this.player.pos.x, this.player.pos.y, 3));
        this.vfx.triggerScreenShake(8, 0.4);
        this.weaponSystem.laserBeam.active = false;
      } else {
        this.sound.play("player_hit");
        this.vfx.triggerScreenShake(4, 0.2);
        if (this.player.armor > 0 && this.player.armor < this.player.maxArmor * 0.1) {
          this.achievementManager.fireEvent("armor_below_10pct");
        }
      }
    }

    const puHits = this.collisions.checkPlayerPowerUps(this.player, this.powerUps);
    for (const hit of puHits) {
      this.sound.play("power_up_collect");
      this.statsTracker.recordPowerUpCollected(hit.powerUp.type);
      switch (hit.powerUp.type) {
        case "spread-shot":
        case "rapid-fire":
          this.powerUpManager.activate(hit.powerUp.type);
          break;
        case "repair-kit":
          if (this.player.armor >= this.player.maxArmor) {
            this.player.lives++;
          } else {
            this.player.armor = Math.min(this.player.maxArmor, this.player.armor + 100);
          }
          break;
        case "shield-restore":
          this.player.energy = this.player.maxEnergy;
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
          if (this.player.bombs >= this.player.maxBombs) {
            this.achievementManager.fireEvent("bombs_at_max");
          }
          break;
        case "shield-battery":
          if (this.player.shieldBattery >= this.player.maxShieldBattery) {
            this.player.energy = this.player.maxEnergy;
          } else {
            this.player.shieldBattery = Math.min(
              this.player.maxShieldBattery,
              this.player.shieldBattery + 100
            );
          }
          break;
        case "deflector":
          this.powerUpManager.activate("deflector");
          break;
      }
      this.achievementManager.checkAchievements();
    }

    RaptorGame.compactAlive(this.projectiles);
    RaptorGame.compactAlive(this.enemies);
    RaptorGame.compactAlive(this.enemyBullets);
    RaptorGame.compactAlive(this.explosions);
    RaptorGame.compactAlive(this.powerUps);

    this.player.updateEnergyRegen(dt);
    this.player.updateDodge(dt);
    this.player.updateEmp(dt);

    if (!this.player.alive) {
      this.statsTracker.recordDeath();
      this.totalScore += this.score;
      this.weaponSystem.laserBeam.active = false;
      this.saveAchievements();
      this.sound.stopMusic();
      this.sound.play("game_over");
      SaveSystem.clearAutoSave(this.activeSlot).catch(console.error);
      this.state = "gameover";
      return;
    }

    if (this.spawner.isLevelComplete && this.enemies.length === 0) {
      this.totalScore += this.score;
      this.statsTracker.updateScore(this.score, this.totalScore);
      this.statsTracker.recordLevelComplete(this.currentLevel, this.levelElapsed, 0);

      this.achievementManager.fireEvent("level_complete");
      if (this.statsTracker.getStats().damageTakenThisLevel === 0) {
        this.achievementManager.fireEvent("no_damage_level");
      }
      if (this.levelElapsed < 120) {
        this.achievementManager.fireEvent("level_under_2min");
      }
      this.achievementManager.checkAchievements();
      this.saveAchievements();

      this.projectiles = [];
      this.enemyBullets = [];
      this.powerUps = [];
      this.weaponSystem.laserBeam.active = false;
      this.enemyWeaponSystem.resetLasers();
      this.sound.stopMusic();

      if (this.currentLevel >= LEVELS.length - 1) {
        const act = getActForLevel(this.currentLevel);
        this.state = "victory";
        this.sound.play("victory");
        if (act.isFinal) {
          SaveSystem.clear(this.activeSlot).catch(console.error);
          this._hasSaveData = false;
        } else {
          SaveSystem.save(
            this.buildSaveData({ levelReached: this.currentLevel + 1 }),
            this.activeSlot
          ).catch(console.error);
          SaveSystem.clearAutoSave(this.activeSlot).catch(console.error);
          this._hasSaveData = true;
        }
        this.storyRenderer.show([act.ending.join(" ")], "center", "pilot");
        this.hud.setVictoryStoryActive(true);
        this.hud.setActEnd(act.isFinal ? null : act);
      } else {
        this.state = "level_complete";
        this.sound.play("level_complete");
        this.hud.setCompletionText(this.currentLevelConfig.story?.completionText ?? null);
        SaveSystem.save(
          this.buildSaveData({ levelReached: this.currentLevel + 1 }),
          this.activeSlot
        ).catch(console.error);
        SaveSystem.clearAutoSave(this.activeSlot).catch(console.error);
        this._hasSaveData = true;
      }
    }
  }

  private handleEnemyDestroyed(enemy: Enemy, config: RaptorLevelConfig): void {
    this.score += enemy.scoreValue;
    this.statsTracker.recordKill(enemy.variant, enemy.scoreValue, isBossVariant(enemy.variant));
    this.statsTracker.updateScore(this.score, this.totalScore + this.score);
    const explosionSize = (isBossVariant(enemy.variant) || enemy.variant === "juggernaut") ? 3
      : (enemy.variant === "bomber" || enemy.variant === "gunship" || enemy.variant === "cruiser" || enemy.variant === "destroyer" || enemy.variant === "minelayer") ? 2
      : 1;
    this.addExplosion(new Explosion(enemy.pos.x, enemy.pos.y, explosionSize));

    if (isBossVariant(enemy.variant)) {
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

    this.achievementManager.checkAchievements();
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
    this.statsTracker.recordWeaponUpgrade(weaponType, this.powerUpManager.weaponTier);
    if (this.powerUpManager.weaponTier >= MAX_WEAPON_TIER) {
      this.achievementManager.fireEvent("weapon_tier_5");
    }
    this.achievementManager.checkAchievements();
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
    if (pu.type === "shield-battery" && config.level < 2) {
      pu.type = "shield-restore";
    }
    if (pu.type === "deflector" && config.level < 5) {
      pu.type = "shield-restore";
    }
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
      boss_gunship: "enemy_boss_gunship",
      boss_dreadnought: "enemy_boss_dreadnought",
      boss_fortress: "enemy_boss_fortress",
      boss_carrier: "enemy_boss_carrier",
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
    return this._hasSaveData;
  }

  private async refreshSaveStatus(): Promise<void> {
    this._hasSaveData = await SaveSystem.hasSave(this.activeSlot);
  }

  private persistSettings(): void {
    SettingsStorage.save({
      musicVolume: this.audio.musicVolume,
      sfxVolume: this.audio.sfxVolume,
      muted: this.audio.muted,
      showFps: this.showFps,
    }).catch(() => {});
  }

  private openAchievementGallery(): void {
    const achievements = this.achievementManager.getAllAchievements();
    const unlockDates = this.achievementManager.getUnlocked();
    this.achievementGallery.show(achievements, unlockDates);
    this.achievementGalleryOpen = true;
  }

  private saveAchievements(): void {
    AchievementStorage.save(
      this.achievementManager.getUnlocked(),
      this.statsTracker.serialize(),
    ).catch(console.error);
  }

  private resetGame(): void {
    this.totalScore = 0;
    this.playTimeSeconds = 0;
    this.statsTracker.resetLevelStats();
    this.vfx.reset();
    this.hud.setCompletionText(null);
    this.hud.setVictoryStoryActive(false);
    this.startLevel(0, true);
  }

  private async continueGame(): Promise<void> {
    const data = await SaveSystem.loadBest(this.activeSlot);
    if (!data) {
      this.resetGame();
      return;
    }
    this.totalScore = data.totalScore;
    this.playTimeSeconds = data.playTimeSeconds ?? 0;
    this.vfx.reset();
    this.startLevel(data.levelReached, false);
    this.player.lives = data.lives;
    this.player.bombs = data.bombs ?? 0;
    this.player.shieldBattery = data.shieldBattery ?? 0;
    this.player.armor = data.armor ?? 200;
    this.player.energy = data.energy ?? 200;

    if (data.isAutoSave && data.waveIndex !== undefined && data.waveIndex > 0) {
      this.spawner.skipToWave(data.waveIndex);
    }

    if (data.weaponInventory) {
      const inv = new Map<WeaponType, number>();
      for (const [key, val] of Object.entries(data.weaponInventory)) {
        inv.set(key as WeaponType, val);
      }
      if (!inv.has("machine-gun")) {
        inv.set("machine-gun", 1);
      }
      this.powerUpManager.setInventory(inv);
      this.powerUpManager.setActiveWeapon(data.weapon);
    } else {
      const inv = new Map<WeaponType, number>([["machine-gun", 1]]);
      const tier = data.weaponTier ?? 1;
      if (data.weapon !== "machine-gun") {
        inv.set(data.weapon, tier);
      } else {
        inv.set("machine-gun", tier);
      }
      this.powerUpManager.setInventory(inv);
      this.powerUpManager.setActiveWeapon(data.weapon);
    }
  }

  private enterBriefing(): void {
    const config = this.currentLevelConfig;
    const briefingText = config.story?.briefing;

    if (!briefingText) {
      this.state = "playing";
      this.sound.startMusic("playing", this.currentLevel);
      return;
    }

    this.storyRenderer.show([briefingText], "center", "pilot");
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
        const x = this.gameAreaX + margin + Math.random() * (this.gameAreaWidth - 2 * margin);
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
        this.persistSettings();
        return this.showFps;
      },

      achievementManager: this.achievementManager,
      statsTracker: this.statsTracker,
      saveAchievements: () => this.saveAchievements(),
    };
  }

  private buildSaveData(overrides?: Partial<RaptorSaveData>): RaptorSaveData {
    const inventoryRecord: Record<string, number> = {};
    for (const [w, t] of this.powerUpManager.inventory) {
      inventoryRecord[w] = t;
    }
    return {
      version: SAVE_FORMAT_VERSION,
      levelReached: this.currentLevel,
      totalScore: this.totalScore,
      lives: this.player.lives,
      weapon: this.powerUpManager.currentWeapon,
      savedAt: new Date().toISOString(),
      bombs: this.player.bombs,
      shieldBattery: this.player.shieldBattery,
      armor: this.player.armor,
      energy: this.player.energy,
      weaponTier: this.powerUpManager.weaponTier,
      weaponInventory: inventoryRecord,
      playTimeSeconds: this.playTimeSeconds,
      ...overrides,
    };
  }

  private startLevel(levelIndex: number, fullReset = false): void {
    this.currentLevel = levelIndex;
    this.score = 0;
    this.statsTracker.resetLevelStats();
    this.projectiles = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.explosions = [];
    this.powerUps = [];
    this.player.reset(this.gameAreaWidth, this.gameAreaHeight, fullReset, this.gameAreaX, this.gameAreaY);

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
    this.achievementCheckTimer = 0;
    this.nextStoryMessageIndex = 0;
    this.hud.setCompletionText(null);
    this.hud.setVictoryStoryActive(false);

    this.cachedSkyGradient = null;
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

    this.lastAutoSaveTime = 0;
    this.lastCompletedWaveCount = 0;
    SaveSystem.autoSave(
      this.activeSlot,
      this.buildSaveData({ waveIndex: 0 })
    ).catch(console.error);
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
      this.updateLoadingOverlay(this.assets.progress);
      this.hud.renderLoadingScreen(this.ctx, this.assets.progress, this.width, this.height);
      return;
    }

    this.vfx.applyPreRender(this.ctx);

    this.renderBackground();

    this.renderSidePanelBackgrounds();

    if (this.state === "slot_select") {
      this.hud.renderSlotSelect(
        this.ctx, this.slotData, this.width, this.height,
        this.input.mouseX, this.input.mouseY
      );
    }

    if (this.state === "story_intro") {
      this.storyRenderer.render(this.ctx, this.width, this.height);
    }

    if (this.state === "briefing") {
      this.renderBriefingHeader();
      this.storyRenderer.render(this.ctx, this.width, this.height);
    }

    if (
      this.state === "playing" ||
      this.state === "paused" ||
      this.state === "gameover" ||
      this.state === "level_complete"
    ) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(this.gameAreaX, this.gameAreaY, this.gameAreaWidth, this.gameAreaHeight);
      this.ctx.clip();

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

      this.ctx.restore();
    }

    this.vfx.applyPostRender(this.ctx);

    const config = this.currentLevelConfig;
    const displayScore = (this.state === "playing" || this.state === "paused") ? this.score : this.totalScore;
    this.hud.render(
      this.ctx,
      this.state,
      displayScore,
      this.player.lives,
      this.player.armor,
      config.level,
      config.name,
      this.width,
      this.height,
      this.powerUpManager.getActive(),
      this.weaponSystem.currentWeapon,
      this.hasSaveData,
      this.weaponSystem.chargeLevel,
      this.player.bombs,
      this.powerUpManager.weaponTier,
      this.player.isEnergyRegenerating,
      this.player.dodgeCooldownFraction,
      this.powerUpManager.inventory,
      this.player.shieldBattery,
      this.player.empCooldownFraction,
      this.player.energy
    );
    if (this.state !== "playing" && this.state !== "paused" && !this.slotLoadingInProgress) {
      this.hud.renderMuteButton(this.ctx, this.audio.muted, this.width, HUD_RIGHT_PANEL_WIDTH);
      this.hud.renderSettingsButton(this.ctx, this.width, HUD_RIGHT_PANEL_WIDTH);
    }

    if (this.state === "playing" || this.state === "paused" || (this.state === "victory" && this.storyRenderer.isActive)) {
      this.storyRenderer.render(this.ctx, this.width, this.height);
    }

    if (this.state === "paused") {
      this.hud.renderPauseMenu(this.ctx, this.width, this.height, this.audio.muted);
    }

    if (this.settingsOpen) {
      this.hud.renderSettingsPanel(
        this.ctx, this.width, this.height,
        this.audio.musicVolume, this.audio.sfxVolume,
        this.hasSaveData
      );
    }

    if (this.achievementGalleryOpen) {
      this.achievementGallery.render(this.ctx, this.width, this.height);
    }

    this.achievementNotification.render(this.ctx, this.width, this.height);

    if (this.showFps) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = Math.round(1000 / avgFrameTime);
      this.ctx.font = "10px monospace";
      this.ctx.fillStyle = "rgba(0, 255, 65, 0.8)";
      this.ctx.fillText(`FPS: ${fps}`, this.gameAreaX + 10, this.gameAreaY + 16);
    }

    this.devConsole.render(this.ctx, this.width, this.height);
  }

  private static compactAlive<T extends { alive: boolean }>(arr: T[]): void {
    let writeIdx = 0;
    for (let readIdx = 0; readIdx < arr.length; readIdx++) {
      if (arr[readIdx].alive) {
        if (writeIdx !== readIdx) {
          arr[writeIdx] = arr[readIdx];
        }
        writeIdx++;
      }
    }
    arr.length = writeIdx;
  }

  private ensureSkyGradientCache(config: RaptorLevelConfig): void {
    if (
      this.cachedSkyGradient &&
      this.cachedSkyGradient[0] === config.skyGradient[0] &&
      this.cachedSkyGradient[1] === config.skyGradient[1]
    ) {
      return;
    }
    if (!this.skyGradientCanvas) {
      this.skyGradientCanvas = document.createElement("canvas");
    }
    this.skyGradientCanvas.width = 1;
    this.skyGradientCanvas.height = this.height;
    const offCtx = this.skyGradientCanvas.getContext("2d");
    if (!offCtx) return;
    const grad = offCtx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, config.skyGradient[0]);
    grad.addColorStop(1, config.skyGradient[1]);
    offCtx.fillStyle = grad;
    offCtx.fillRect(0, 0, 1, this.height);
    this.cachedSkyGradient = [config.skyGradient[0], config.skyGradient[1]];
  }

  private renderSidePanelBackgrounds(): void {
    const ctx = this.ctx;
    const panelTop = HUD_TOP_BAR_HEIGHT;
    const panelBottom = this.height - HUD_BAR_HEIGHT;
    const panelHeight = panelBottom - panelTop;

    // Left panel
    const leftGrad = ctx.createLinearGradient(0, panelTop, 0, panelBottom);
    leftGrad.addColorStop(0, "rgb(0, 10, 30)");
    leftGrad.addColorStop(1, "rgb(0, 5, 15)");
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, panelTop, HUD_LEFT_PANEL_WIDTH, panelHeight);

    ctx.strokeStyle = "rgba(100, 160, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(HUD_LEFT_PANEL_WIDTH, panelTop);
    ctx.lineTo(HUD_LEFT_PANEL_WIDTH, panelBottom);
    ctx.stroke();

    // Right panel
    const rightX = this.width - HUD_RIGHT_PANEL_WIDTH;
    const rightGrad = ctx.createLinearGradient(0, panelTop, 0, panelBottom);
    rightGrad.addColorStop(0, "rgb(0, 10, 30)");
    rightGrad.addColorStop(1, "rgb(0, 5, 15)");
    ctx.fillStyle = rightGrad;
    ctx.fillRect(rightX, panelTop, HUD_RIGHT_PANEL_WIDTH, panelHeight);

    ctx.strokeStyle = "rgba(100, 160, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(rightX, panelTop);
    ctx.lineTo(rightX, panelBottom);
    ctx.stroke();
  }

  private renderBackground(): void {
    const config = this.currentLevelConfig;

    this.ensureSkyGradientCache(config);
    if (this.skyGradientCanvas) {
      this.ctx.drawImage(this.skyGradientCanvas, 0, 0, this.width, this.height);
    }

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
