import { AudioManager } from "../../../shared/AudioManager";
import { RaptorGameState, RaptorSoundEvent } from "../types";

const DEBOUNCE_MS = 50;

export class SoundSystem {
  private lastPlayTime: Record<string, number> = {};
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicActive = false;

  constructor(private audio: AudioManager) {}

  play(event: RaptorSoundEvent): void {
    if (this.audio.disabled) return;

    const now = performance.now();
    const last = this.lastPlayTime[event];
    if (last !== undefined && now - last < DEBOUNCE_MS) return;
    this.lastPlayTime[event] = now;

    this.audio.ensureContext();

    switch (event) {
      case "player_shoot": this.playPlayerShoot(); break;
      case "enemy_shoot": this.playEnemyShoot(); break;
      case "enemy_hit": this.playEnemyHit(); break;
      case "enemy_destroy": this.playEnemyDestroy(); break;
      case "player_hit": this.playPlayerHit(); break;
      case "player_destroy": this.playPlayerDestroy(); break;
      case "boss_hit": this.playBossHit(); break;
      case "boss_destroy": this.playBossDestroy(); break;
      case "power_up_collect": this.playPowerUpCollect(); break;
      case "level_complete": this.playLevelComplete(); break;
      case "game_over": this.playGameOver(); break;
      case "victory": this.playVictory(); break;
      case "menu_start": this.playMenuStart(); break;
    }
  }

  private playPlayerShoot(): void {
    this.audio.playToneSwept(900, 400, 0.06, "sine", {
      attack: 0.003, decay: 0.01, sustain: 0.3, release: 0.02,
    });
  }

  private playEnemyShoot(): void {
    this.audio.playToneSwept(300, 600, 0.08, "square", {
      attack: 0.003, decay: 0.01, sustain: 0.2, release: 0.02,
    });
  }

  private playEnemyHit(): void {
    this.audio.playTone(200, 0.06, "triangle", {
      attack: 0.003, decay: 0.01, sustain: 0.3, release: 0.02,
    });
  }

  private playEnemyDestroy(): void {
    this.audio.playTone(350, 0.05, "square", {
      attack: 0.003, decay: 0.01, sustain: 0.3, release: 0.02,
    });
    this.audio.playNoise(0.08, 4000);
  }

  private playPlayerHit(): void {
    this.audio.playToneSwept(600, 200, 0.15, "sawtooth", {
      attack: 0.005, decay: 0.02, sustain: 0.4, release: 0.05,
    });
    this.audio.playNoise(0.1, 2000);
  }

  private playPlayerDestroy(): void {
    this.audio.playToneSwept(400, 80, 0.4, "sawtooth", {
      attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.15,
    });
    this.audio.playNoise(0.35, 2500);
  }

  private playBossHit(): void {
    this.audio.playTone(100, 0.1, "sine", {
      attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.04,
    });
    this.audio.playNoise(0.08, 1500);
  }

  private playBossDestroy(): void {
    this.audio.playToneSwept(200, 50, 0.5, "sawtooth", {
      attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.2,
    });
    this.audio.playNoise(0.4, 3000);
  }

  private playPowerUpCollect(): void {
    this.audio.playSequence([
      { frequency: 523, duration: 0.2, type: "sine" },
      { frequency: 659, duration: 0.2, type: "sine" },
      { frequency: 784, duration: 0.2, type: "sine" },
      { frequency: 1047, duration: 0.3, type: "sine" },
    ], 280);
  }

  private playLevelComplete(): void {
    this.audio.playSequence([
      { frequency: 523, duration: 0.3, type: "sine" },
      { frequency: 659, duration: 0.3, type: "sine" },
      { frequency: 784, duration: 0.3, type: "sine" },
      { frequency: 1047, duration: 0.6, type: "sine" },
    ], 220);
  }

  private playGameOver(): void {
    this.audio.playSequence([
      { frequency: 392, duration: 0.6, type: "sine" },
      { frequency: 349, duration: 0.6, type: "sine" },
      { frequency: 330, duration: 0.6, type: "sine" },
      { frequency: 294, duration: 1.0, type: "sine" },
    ], 100);
  }

  private playVictory(): void {
    this.audio.playSequence([
      { frequency: 523, duration: 0.25, type: "sine" },
      { frequency: 587, duration: 0.25, type: "sine" },
      { frequency: 659, duration: 0.25, type: "sine" },
      { frequency: 698, duration: 0.25, type: "sine" },
      { frequency: 784, duration: 0.25, type: "sine" },
      { frequency: 880, duration: 0.25, type: "sine" },
      { frequency: 988, duration: 0.25, type: "sine" },
      { frequency: 1047, duration: 0.8, type: "sine" },
    ], 240);
  }

  private playMenuStart(): void {
    this.audio.playTone(1200, 0.1, "sine", {
      attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.04,
    });
  }

  startMusic(state: RaptorGameState, level = 0): void {
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
      this.audio.playTone(82.41, 2.5, "sine", {
        attack: 0.4, decay: 0.3, sustain: 0.2, release: 0.6,
      });
      this.audio.playNoise(2.5, 300);
    };
    playDrone();
    this.musicInterval = setInterval(playDrone, 3000);
  }

  private startPlayingMusic(level: number): void {
    this.musicActive = true;
    const bpm = Math.min(150, 100 + level * 10);
    const beatMs = (60 / bpm) * 1000;

    const bassNotes = [82.41, 98, 110, 82.41, 73.42, 98, 110, 123.47];
    let noteIdx = 0;

    const playBeat = () => {
      if (!this.musicActive) return;
      const freq = bassNotes[noteIdx % bassNotes.length];
      this.audio.playTone(freq, (beatMs / 1000) * 0.8, "triangle", {
        attack: 0.01, decay: 0.03, sustain: 0.2, release: 0.05,
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
  }
}
