import { AudioManager } from "../../../shared/AudioManager";
import { LEVELS } from "../levels";
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

    if (this.audio.playBuffer(event, { category: "sfx" })) return;

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
      case "missile_fire": this.playMissileFire(); break;
      case "missile_hit": this.playMissileHit(); break;
      case "laser_fire": this.playLaserFire(); break;
      case "laser_hit": this.playLaserHit(); break;
      case "weapon_switch": this.playWeaponSwitch(); break;
      case "enemy_spread_fire": this.playEnemySpreadFire(); break;
      case "enemy_missile_fire": this.playEnemyMissileFire(); break;
      case "enemy_laser_fire": this.playEnemyLaserFire(); break;
      case "enemy_missile_hit": this.playEnemyMissileHit(); break;
      case "enemy_laser_hit": this.playEnemyLaserHit(); break;
      case "plasma_fire": this.playPlasmaFire(); break;
      case "plasma_hit": this.playPlasmaHit(); break;
      case "mega_bomb_fire": this.playMegaBombFire(); break;
      case "dodge": this.playDodge(); break;
    }
  }

  private get sfxNode(): AudioNode | undefined {
    return this.audio.sfxGain ?? undefined;
  }

  private playPlayerShoot(): void {
    this.audio.playToneSwept(900, 400, 0.06, "sine", {
      attack: 0.003, decay: 0.01, sustain: 0.3, release: 0.02,
    }, this.sfxNode);
  }

  private playEnemyShoot(): void {
    this.audio.playToneSwept(300, 600, 0.08, "square", {
      attack: 0.003, decay: 0.01, sustain: 0.2, release: 0.02,
    }, this.sfxNode);
  }

  private playEnemyHit(): void {
    this.audio.playTone(200, 0.06, "triangle", {
      attack: 0.003, decay: 0.01, sustain: 0.3, release: 0.02,
    }, this.sfxNode);
  }

  private playEnemyDestroy(): void {
    this.audio.playTone(350, 0.05, "square", {
      attack: 0.003, decay: 0.01, sustain: 0.3, release: 0.02,
    }, this.sfxNode);
    this.audio.playNoise(0.08, 4000, this.sfxNode);
  }

  private playPlayerHit(): void {
    this.audio.playToneSwept(600, 200, 0.15, "sawtooth", {
      attack: 0.005, decay: 0.02, sustain: 0.4, release: 0.05,
    }, this.sfxNode);
    this.audio.playNoise(0.1, 2000, this.sfxNode);
  }

  private playPlayerDestroy(): void {
    this.audio.playToneSwept(400, 80, 0.4, "sawtooth", {
      attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.15,
    }, this.sfxNode);
    this.audio.playNoise(0.35, 2500, this.sfxNode);
  }

  private playBossHit(): void {
    this.audio.playTone(100, 0.1, "sine", {
      attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.04,
    }, this.sfxNode);
    this.audio.playNoise(0.08, 1500, this.sfxNode);
  }

  private playBossDestroy(): void {
    this.audio.playToneSwept(200, 50, 0.5, "sawtooth", {
      attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.2,
    }, this.sfxNode);
    this.audio.playNoise(0.4, 3000, this.sfxNode);
  }

  private playPowerUpCollect(): void {
    this.audio.playSequence([
      { frequency: 523, duration: 0.2, type: "sine" },
      { frequency: 659, duration: 0.2, type: "sine" },
      { frequency: 784, duration: 0.2, type: "sine" },
      { frequency: 1047, duration: 0.3, type: "sine" },
    ], 280, this.sfxNode);
  }

  private playLevelComplete(): void {
    this.audio.playSequence([
      { frequency: 523, duration: 0.3, type: "sine" },
      { frequency: 659, duration: 0.3, type: "sine" },
      { frequency: 784, duration: 0.3, type: "sine" },
      { frequency: 1047, duration: 0.6, type: "sine" },
    ], 220, this.sfxNode);
  }

  private playGameOver(): void {
    this.audio.playSequence([
      { frequency: 392, duration: 0.6, type: "sine" },
      { frequency: 349, duration: 0.6, type: "sine" },
      { frequency: 330, duration: 0.6, type: "sine" },
      { frequency: 294, duration: 1.0, type: "sine" },
    ], 100, this.sfxNode);
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
    ], 240, this.sfxNode);
  }

  private playMenuStart(): void {
    this.audio.playTone(1200, 0.1, "sine", {
      attack: 0.005, decay: 0.02, sustain: 0.5, release: 0.04,
    }, this.sfxNode);
  }

  private playMissileFire(): void {
    this.audio.playToneSwept(200, 80, 0.15, "sawtooth", {
      attack: 0.01, decay: 0.03, sustain: 0.4, release: 0.06,
    }, this.sfxNode);
    this.audio.playNoise(0.1, 1500, this.sfxNode);
  }

  private playMissileHit(): void {
    this.audio.playToneSwept(300, 60, 0.2, "sawtooth", {
      attack: 0.005, decay: 0.03, sustain: 0.5, release: 0.1,
    }, this.sfxNode);
    this.audio.playNoise(0.15, 3000, this.sfxNode);
  }

  private playLaserFire(): void {
    this.audio.playTone(440, 0.05, "sine", {
      attack: 0.002, decay: 0.01, sustain: 0.2, release: 0.02,
    }, this.sfxNode);
  }

  private playLaserHit(): void {
    this.audio.playTone(600, 0.04, "triangle", {
      attack: 0.002, decay: 0.01, sustain: 0.2, release: 0.01,
    }, this.sfxNode);
  }

  private playWeaponSwitch(): void {
    this.audio.playSequence([
      { frequency: 800, duration: 0.08, type: "sine" },
      { frequency: 1200, duration: 0.12, type: "sine" },
    ], 350, this.sfxNode);
  }

  private playEnemySpreadFire(): void {
    this.audio.playToneSwept(250, 500, 0.06, "square", {
      attack: 0.003, decay: 0.01, sustain: 0.2, release: 0.02,
    }, this.sfxNode);
  }

  private playEnemyMissileFire(): void {
    this.audio.playToneSwept(150, 60, 0.15, "sawtooth", {
      attack: 0.01, decay: 0.03, sustain: 0.4, release: 0.06,
    }, this.sfxNode);
    this.audio.playNoise(0.1, 1500, this.sfxNode);
  }

  private playEnemyLaserFire(): void {
    this.audio.playTone(880, 0.05, "sine", {
      attack: 0.002, decay: 0.01, sustain: 0.2, release: 0.02,
    }, this.sfxNode);
  }

  private playEnemyMissileHit(): void {
    this.audio.playToneSwept(250, 50, 0.2, "sawtooth", {
      attack: 0.005, decay: 0.03, sustain: 0.5, release: 0.1,
    }, this.sfxNode);
    this.audio.playNoise(0.15, 3000, this.sfxNode);
  }

  private playEnemyLaserHit(): void {
    this.audio.playTone(1200, 0.04, "triangle", {
      attack: 0.002, decay: 0.01, sustain: 0.2, release: 0.01,
    }, this.sfxNode);
  }

  private playPlasmaFire(): void {
    this.audio.playToneSwept(600, 1200, 0.1, "sine", {
      attack: 0.005, decay: 0.02, sustain: 0.3, release: 0.03,
    }, this.sfxNode);
    this.audio.playTone(150, 0.08, "triangle", {
      attack: 0.003, decay: 0.02, sustain: 0.2, release: 0.03,
    }, this.sfxNode);
  }

  private playPlasmaHit(): void {
    this.audio.playToneSwept(400, 100, 0.18, "sawtooth", {
      attack: 0.005, decay: 0.03, sustain: 0.4, release: 0.08,
    }, this.sfxNode);
    this.audio.playNoise(0.12, 2500, this.sfxNode);
  }

  private playMegaBombFire(): void {
    this.audio.playToneSwept(100, 40, 0.5, "sawtooth", {
      attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.2,
    }, this.sfxNode);
    this.audio.playNoise(0.4, 4000, this.sfxNode);
  }

  private playDodge(): void {
    this.audio.playToneSwept(1400, 600, 0.12, "sine", {
      attack: 0.005, decay: 0.02, sustain: 0.3, release: 0.04,
    }, this.sfxNode);
    this.audio.playNoise(0.06, 5000, this.sfxNode);
  }

  private get musicNode(): AudioNode | undefined {
    return this.audio.musicGain ?? undefined;
  }

  startMusic(state: RaptorGameState, level = 0): void {
    this.stopMusic();
    if (this.audio.disabled) return;
    this.audio.ensureContext();

    if (state === "playing") {
      const musicKey = `level_${level + 1}`;
      if (this.audio.hasBuffer(musicKey)) {
        this.audio.playBuffer(musicKey, { loop: true, category: "music" });
        return;
      }
      this.startPlayingMusic(level);
    } else if (state === "menu") {
      if (this.audio.hasBuffer("menu")) {
        this.audio.playBuffer("menu", { loop: true, category: "music" });
        return;
      }
      this.startMenuMusic();
    }
  }

  private startMenuMusic(): void {
    this.musicActive = true;
    const playDrone = () => {
      if (!this.musicActive) return;
      this.audio.playTone(82.41, 2.5, "sine", {
        attack: 0.4, decay: 0.3, sustain: 0.2, release: 0.6,
      }, this.musicNode);
      this.audio.playNoise(2.5, 300, this.musicNode);
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
      }, this.musicNode);
      if (noteIdx % 2 === 0) {
        this.audio.playNoise(0.03, 8000, this.musicNode);
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
    this.audio.stopBuffer("menu");
    for (let i = 1; i <= LEVELS.length; i++) {
      this.audio.stopBuffer(`level_${i}`);
    }
  }

  destroy(): void {
    this.stopMusic();
  }
}
