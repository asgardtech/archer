import { AudioManager } from "../../../shared/AudioManager";
import { SoundEvent, GameState } from "../types";

const DEBOUNCE_MS = 50;

export class SoundSystem {
  private lastPlayTime: Record<string, number> = {};
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicActive = false;
  private lowAmmoActive = false;
  private lowAmmoInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private audio: AudioManager) {}

  play(event: SoundEvent): void {
    if (this.audio.disabled) return;

    const now = performance.now();
    const last = this.lastPlayTime[event];
    if (last !== undefined && now - last < DEBOUNCE_MS) return;
    this.lastPlayTime[event] = now;

    this.audio.ensureContext();

    switch (event) {
      case "arrow_shoot":
        this.playArrowShoot();
        break;
      case "balloon_pop":
        this.playBalloonPop();
        break;
      case "upgrade_pop":
        this.playUpgradePop();
        break;
      case "boss_hit":
        this.playBossHit();
        break;
      case "boss_kill":
        this.playBossKill();
        break;
      case "obstacle_hit":
        this.playObstacleHit();
        break;
      case "upgrade_activate":
        this.playUpgradeActivate();
        break;
      case "ammo_gain":
        this.playAmmoGain();
        break;
      case "level_complete":
        this.playLevelComplete();
        break;
      case "game_over":
        this.playGameOver();
        break;
      case "victory":
        this.playVictory();
        break;
      case "menu_start":
        this.playMenuStart();
        break;
      case "low_ammo":
        this.startLowAmmoWarning();
        break;
      case "landmark_liberated":
        this.playLandmarkLiberated();
        break;
    }
  }

  stopLowAmmoWarning(): void {
    this.lowAmmoActive = false;
    if (this.lowAmmoInterval) {
      clearInterval(this.lowAmmoInterval);
      this.lowAmmoInterval = null;
    }
  }

  private playArrowShoot(): void {
    this.audio.playToneSwept(800, 200, 0.08, "sine", {
      attack: 0.005,
      decay: 0.01,
      sustain: 0.4,
      release: 0.03,
    });
  }

  private playBalloonPop(): void {
    this.audio.playNoise(0.06, 4000);
    const freq = 800 + Math.random() * 400;
    this.audio.playTone(freq, 0.08, "sine", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.3,
      release: 0.03,
    });
  }

  private playUpgradePop(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.3, type: "square" },
        { frequency: 659, duration: 0.3, type: "square" },
        { frequency: 784, duration: 0.4, type: "square" },
      ],
      240
    );
  }

  private playBossHit(): void {
    this.audio.playTone(80, 0.1, "sine", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.5,
      release: 0.04,
    });
    this.audio.playNoise(0.08, 1500);
  }

  private playBossKill(): void {
    this.audio.playToneSwept(150, 75, 0.4, "sawtooth", {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.6,
      release: 0.15,
    });
    this.audio.playNoise(0.35, 2000);
  }

  private playObstacleHit(): void {
    this.audio.playTone(150, 0.12, "sawtooth", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.5,
      release: 0.04,
    });
    this.audio.playNoise(0.1, 2500);
  }

  private playUpgradeActivate(): void {
    this.audio.playSequence(
      [
        { frequency: 400, duration: 0.25, type: "sine" },
        { frequency: 800, duration: 0.25, type: "sine" },
        { frequency: 1200, duration: 0.35, type: "sine" },
      ],
      300
    );
  }

  private playAmmoGain(): void {
    this.audio.playTone(1000, 0.03, "sine", {
      attack: 0.003,
      decay: 0.005,
      sustain: 0.4,
      release: 0.01,
    });
    setTimeout(() => {
      this.audio.playTone(1000, 0.03, "sine", {
        attack: 0.003,
        decay: 0.005,
        sustain: 0.4,
        release: 0.01,
      });
    }, 60);
  }

  private playLevelComplete(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.4, type: "sine" },
        { frequency: 659, duration: 0.4, type: "sine" },
        { frequency: 784, duration: 0.4, type: "sine" },
        { frequency: 1047, duration: 0.8, type: "sine" },
      ],
      200
    );
  }

  private playGameOver(): void {
    this.audio.playSequence(
      [
        { frequency: 392, duration: 0.8, type: "sine" },
        { frequency: 349, duration: 0.8, type: "sine" },
        { frequency: 294, duration: 1.2, type: "sine" },
      ],
      100
    );
  }

  private playVictory(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.3, type: "sine" },
        { frequency: 587, duration: 0.3, type: "sine" },
        { frequency: 659, duration: 0.3, type: "sine" },
        { frequency: 698, duration: 0.3, type: "sine" },
        { frequency: 784, duration: 0.3, type: "sine" },
        { frequency: 880, duration: 0.3, type: "sine" },
        { frequency: 988, duration: 0.3, type: "sine" },
        { frequency: 1047, duration: 1.0, type: "sine" },
      ],
      220
    );
  }

  private playMenuStart(): void {
    this.audio.playTone(1200, 0.1, "sine", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.5,
      release: 0.04,
    });
  }

  private playLandmarkLiberated(): void {
    this.audio.playSequence(
      [
        { frequency: 523,  duration: 0.3, type: "sine" },
        { frequency: 659,  duration: 0.3, type: "sine" },
        { frequency: 784,  duration: 0.3, type: "sine" },
        { frequency: 1047, duration: 0.6, type: "sine" },
      ],
      180
    );
  }

  private startLowAmmoWarning(): void {
    if (this.lowAmmoActive) return;
    this.lowAmmoActive = true;
    const tick = () => {
      if (!this.lowAmmoActive) return;
      this.audio.playTone(200, 0.06, "sine", {
        attack: 0.005,
        decay: 0.01,
        sustain: 0.2,
        release: 0.02,
      });
    };
    tick();
    this.lowAmmoInterval = setInterval(tick, 500);
  }

  startMusic(state: GameState, level = 0): void {
    this.stopMusic();
    if (this.audio.disabled) return;
    this.audio.ensureContext();

    if (state === "playing") {
      this.startPlayingMusic(level);
    } else if (state === "menu") {
      this.startMenuMusic();
    }
  }

  private startMenuMusic(): void {
    this.musicActive = true;
    const playDrone = () => {
      if (!this.musicActive) return;
      this.audio.playTone(110, 2.5, "sine", {
        attack: 0.3,
        decay: 0.3,
        sustain: 0.3,
        release: 0.5,
      });
      this.audio.playNoise(2.5, 400);
    };
    playDrone();
    this.musicInterval = setInterval(playDrone, 3000);
  }

  private startPlayingMusic(level: number): void {
    this.musicActive = true;
    const bpm = Math.min(130, 90 + level * 10);
    const beatMs = (60 / bpm) * 1000;

    const bassNotes = [110, 130.81, 146.83, 110, 98, 130.81, 146.83, 164.81];
    let noteIdx = 0;

    const playBeat = () => {
      if (!this.musicActive) return;
      const freq = bassNotes[noteIdx % bassNotes.length];
      this.audio.playTone(freq, (beatMs / 1000) * 0.8, "triangle", {
        attack: 0.01,
        decay: 0.03,
        sustain: 0.25,
        release: 0.05,
      });

      if (noteIdx % 2 === 0) {
        this.audio.playNoise(0.03, 8000);
      }
      noteIdx++;
    };

    playBeat();
    this.musicInterval = setInterval(playBeat, beatMs);
  }

  stopMusic(): void {
    this.musicActive = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  destroy(): void {
    this.stopMusic();
    this.stopLowAmmoWarning();
  }
}
