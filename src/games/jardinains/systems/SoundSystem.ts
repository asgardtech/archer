import { AudioManager } from "../../../shared/AudioManager";
import { JardinainsSoundEvent, JardinainsGameState } from "../types";

const DEBOUNCE_MS = 50;

export class SoundSystem {
  private lastPlayTime: Record<string, number> = {};
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicActive = false;

  constructor(private audio: AudioManager) {}

  play(event: JardinainsSoundEvent): void {
    if (this.audio.disabled) return;

    const now = performance.now();
    const last = this.lastPlayTime[event];
    if (last !== undefined && now - last < DEBOUNCE_MS) return;
    this.lastPlayTime[event] = now;

    this.audio.ensureContext();

    switch (event) {
      case "ball_launch":
        this.playBallLaunch();
        break;
      case "ball_paddle":
        this.playBallPaddle();
        break;
      case "brick_hit":
        this.playBrickHit();
        break;
      case "brick_destroy":
        this.playBrickDestroy();
        break;
      case "gnome_fall":
        this.playGnomeFall();
        break;
      case "gnome_catch":
        this.playGnomeCatch();
        break;
      case "pot_throw":
        this.playPotThrow();
        break;
      case "pot_hit":
        this.playPotHit();
        break;
      case "power_up_collect":
        this.playPowerUpCollect();
        break;
      case "ball_lost":
        this.playBallLost();
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
    }
  }

  private playBallLaunch(): void {
    this.audio.playToneSwept(400, 900, 0.1, "sine", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.4,
      release: 0.03,
    });
  }

  private playBallPaddle(): void {
    const freq = 600 + Math.random() * 100;
    this.audio.playTone(freq, 0.07, "sine", {
      attack: 0.003,
      decay: 0.01,
      sustain: 0.3,
      release: 0.02,
    });
  }

  private playBrickHit(): void {
    this.audio.playTone(180, 0.08, "triangle", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.4,
      release: 0.03,
    });
  }

  private playBrickDestroy(): void {
    this.audio.playTone(300, 0.06, "square", {
      attack: 0.003,
      decay: 0.01,
      sustain: 0.3,
      release: 0.02,
    });
    this.audio.playNoise(0.08, 5000);
  }

  private playGnomeFall(): void {
    this.audio.playToneSwept(900, 300, 0.25, "sine", {
      attack: 0.01,
      decay: 0.03,
      sustain: 0.4,
      release: 0.08,
    });
  }

  private playGnomeCatch(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.2, type: "sine" },
        { frequency: 659, duration: 0.2, type: "sine" },
        { frequency: 784, duration: 0.3, type: "sine" },
      ],
      300
    );
  }

  private playPotThrow(): void {
    this.audio.playTone(250, 0.05, "square", {
      attack: 0.003,
      decay: 0.01,
      sustain: 0.3,
      release: 0.01,
    });
    this.audio.playNoise(0.03, 6000);
  }

  private playPotHit(): void {
    this.audio.playTone(90, 0.12, "sawtooth", {
      attack: 0.005,
      decay: 0.02,
      sustain: 0.4,
      release: 0.04,
    });
    this.audio.playNoise(0.1, 2000);
  }

  private playPowerUpCollect(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.2, type: "sine" },
        { frequency: 659, duration: 0.2, type: "sine" },
        { frequency: 784, duration: 0.2, type: "sine" },
        { frequency: 1047, duration: 0.3, type: "sine" },
      ],
      280
    );
  }

  private playBallLost(): void {
    this.audio.playToneSwept(500, 200, 0.3, "sine", {
      attack: 0.01,
      decay: 0.03,
      sustain: 0.4,
      release: 0.1,
    });
  }

  private playLevelComplete(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.3, type: "sine" },
        { frequency: 659, duration: 0.3, type: "sine" },
        { frequency: 784, duration: 0.3, type: "sine" },
        { frequency: 1047, duration: 0.6, type: "sine" },
      ],
      220
    );
  }

  private playGameOver(): void {
    this.audio.playSequence(
      [
        { frequency: 392, duration: 0.6, type: "sine" },
        { frequency: 349, duration: 0.6, type: "sine" },
        { frequency: 330, duration: 0.6, type: "sine" },
        { frequency: 294, duration: 1.0, type: "sine" },
      ],
      100
    );
  }

  private playVictory(): void {
    this.audio.playSequence(
      [
        { frequency: 523, duration: 0.25, type: "sine" },
        { frequency: 587, duration: 0.25, type: "sine" },
        { frequency: 659, duration: 0.25, type: "sine" },
        { frequency: 698, duration: 0.25, type: "sine" },
        { frequency: 784, duration: 0.25, type: "sine" },
        { frequency: 880, duration: 0.25, type: "sine" },
        { frequency: 988, duration: 0.25, type: "sine" },
        { frequency: 1047, duration: 0.8, type: "sine" },
      ],
      240
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

  startMusic(state: JardinainsGameState, level = 0): void {
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
      this.audio.playTone(130.81, 2.5, "sine", {
        attack: 0.4,
        decay: 0.3,
        sustain: 0.25,
        release: 0.6,
      });
      this.audio.playNoise(2.5, 350);
    };
    playDrone();
    this.musicInterval = setInterval(playDrone, 3000);
  }

  private startPlayingMusic(level: number): void {
    this.musicActive = true;
    const bpm = Math.min(140, 80 + level * 8);
    const beatMs = (60 / bpm) * 1000;

    const bassNotes = [130.81, 146.83, 164.81, 130.81, 110, 146.83, 164.81, 174.61];
    let noteIdx = 0;

    const playBeat = () => {
      if (!this.musicActive) return;
      const freq = bassNotes[noteIdx % bassNotes.length];
      this.audio.playTone(freq, (beatMs / 1000) * 0.8, "triangle", {
        attack: 0.01,
        decay: 0.03,
        sustain: 0.2,
        release: 0.05,
      });

      if (noteIdx % 2 === 0) {
        this.audio.playNoise(0.03, 7000);
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
