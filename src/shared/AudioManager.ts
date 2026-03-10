export interface EnvelopeParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface NoteSpec {
  frequency: number;
  duration: number;
  type?: OscillatorType;
}

const DEFAULT_ENVELOPE: EnvelopeParams = {
  attack: 0.01,
  decay: 0.05,
  sustain: 0.6,
  release: 0.1,
};

function tryGetStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function trySetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export type AudioCategory = "music" | "sfx";

interface BufferEntry {
  buffer: AudioBuffer;
  activeSource: AudioBufferSourceNode | null;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _musicGain: GainNode | null = null;
  private _sfxGain: GainNode | null = null;
  private _muted: boolean;
  private _volume: number;
  private _musicVolume: number;
  private _sfxVolume: number;
  private _disabled = false;
  private scheduledNodes: AudioScheduledSourceNode[] = [];
  private buffers: Map<string, BufferEntry> = new Map();

  constructor() {
    this._muted = tryGetStorage("audio_muted", "false") === "true";
    this._volume = parseFloat(tryGetStorage("audio_volume", "0.5"));
    if (isNaN(this._volume) || this._volume < 0 || this._volume > 1) {
      this._volume = 0.5;
    }
    this._musicVolume = parseFloat(tryGetStorage("audio_music_volume", "0.5"));
    if (isNaN(this._musicVolume) || this._musicVolume < 0 || this._musicVolume > 1) {
      this._musicVolume = 0.5;
    }
    this._sfxVolume = parseFloat(tryGetStorage("audio_sfx_volume", "0.25"));
    if (isNaN(this._sfxVolume) || this._sfxVolume < 0 || this._sfxVolume > 1) {
      this._sfxVolume = 0.25;
    }
  }

  ensureContext(): AudioContext {
    if (this._disabled) return this.ctx!;
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        this._disabled = true;
        return null as unknown as AudioContext;
      }
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);

      this._musicGain = this.ctx.createGain();
      this._musicGain.gain.value = this._musicVolume;
      this._musicGain.connect(this.masterGain);

      this._sfxGain = this.ctx.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this.masterGain);

      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      this._disabled = true;
    }

    return this.ctx!;
  }

  get musicGain(): GainNode | null {
    return this._musicGain;
  }

  get sfxGain(): GainNode | null {
    return this._sfxGain;
  }

  get disabled(): boolean {
    return this._disabled;
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(v: boolean) {
    this._muted = v;
    trySetStorage("audio_muted", String(v));
    this.applyVolume();
  }

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    trySetStorage("audio_volume", String(this._volume));
    this.applyVolume();
  }

  get musicVolume(): number {
    return this._musicVolume;
  }

  set musicVolume(v: number) {
    this._musicVolume = Math.max(0, Math.min(1, v));
    trySetStorage("audio_music_volume", String(this._musicVolume));
    if (this._musicGain) {
      this._musicGain.gain.value = this._musicVolume;
    }
  }

  get sfxVolume(): number {
    return this._sfxVolume;
  }

  set sfxVolume(v: number) {
    this._sfxVolume = Math.max(0, Math.min(1, v));
    trySetStorage("audio_sfx_volume", String(this._sfxVolume));
    if (this._sfxGain) {
      this._sfxGain.gain.value = this._sfxVolume;
    }
  }

  toggleMute(): void {
    this.muted = !this._muted;
  }

  private applyVolume(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
    }
  }

  playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    envelope: EnvelopeParams = DEFAULT_ENVELOPE,
    routeNode?: AudioNode
  ): void {
    if (this._disabled || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;

    const { attack, decay, sustain, release } = envelope;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.setValueAtTime(sustain, now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(routeNode ?? this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      const idx = this.scheduledNodes.indexOf(osc);
      if (idx !== -1) this.scheduledNodes.splice(idx, 1);
    };
    this.scheduledNodes.push(osc);
  }

  playToneSwept(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = "sine",
    envelope: EnvelopeParams = DEFAULT_ENVELOPE,
    routeNode?: AudioNode
  ): void {
    if (this._disabled || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);

    const { attack, decay, sustain, release } = envelope;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.setValueAtTime(sustain, now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(routeNode ?? this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      const idx = this.scheduledNodes.indexOf(osc);
      if (idx !== -1) this.scheduledNodes.splice(idx, 1);
    };
    this.scheduledNodes.push(osc);
  }

  playNoise(duration: number, filterFreq = 3000, routeNode?: AudioNode): void {
    if (this._disabled || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(routeNode ?? this.masterGain);

    source.start(now);
    source.stop(now + duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      const idx = this.scheduledNodes.indexOf(source);
      if (idx !== -1) this.scheduledNodes.splice(idx, 1);
    };
    this.scheduledNodes.push(source);
  }

  playSequence(notes: NoteSpec[], bpm: number, routeNode?: AudioNode): void {
    if (this._disabled || !this.ctx || !this.masterGain) return;
    const beatDuration = 60 / bpm;
    let offset = 0;
    for (const note of notes) {
      const dur = note.duration * beatDuration;
      this.playToneDelayed(note.frequency, dur, offset, note.type || "sine", routeNode);
      offset += dur;
    }
  }

  private playToneDelayed(
    frequency: number,
    duration: number,
    delay: number,
    type: OscillatorType,
    routeNode?: AudioNode
  ): void {
    if (this._disabled || !this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
    gain.gain.setValueAtTime(0.6, now + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(routeNode ?? this.masterGain!);

    osc.start(now);
    osc.stop(now + duration + 0.01);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      const idx = this.scheduledNodes.indexOf(osc);
      if (idx !== -1) this.scheduledNodes.splice(idx, 1);
    };
    this.scheduledNodes.push(osc);
  }

  async loadAudioBuffer(key: string, url: string): Promise<void> {
    try {
      this.ensureContext();
      if (this._disabled || !this.ctx) return;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[AudioManager] Failed to fetch audio "${key}": ${response.status}`);
        return;
      }
      const arrayBuf = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuf);
      this.buffers.set(key, { buffer: audioBuffer, activeSource: null });
    } catch (e) {
      console.warn(`[AudioManager] Failed to load audio buffer "${key}":`, e);
    }
  }

  hasBuffer(key: string): boolean {
    return this.buffers.has(key);
  }

  playBuffer(
    key: string,
    options?: { loop?: boolean; volume?: number; category?: AudioCategory }
  ): AudioBufferSourceNode | null {
    if (this._disabled || !this.ctx || !this.masterGain) return null;
    const entry = this.buffers.get(key);
    if (!entry) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.loop = options?.loop ?? false;

    const gain = this.ctx.createGain();
    gain.gain.value = options?.volume ?? 1;
    source.connect(gain);

    let dest: AudioNode = this.masterGain;
    if (options?.category === "music" && this._musicGain) {
      dest = this._musicGain;
    } else if (options?.category === "sfx" && this._sfxGain) {
      dest = this._sfxGain;
    }
    gain.connect(dest);

    source.start(0);

    if (options?.loop) {
      entry.activeSource = source;
    }

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (entry.activeSource === source) {
        entry.activeSource = null;
      }
    };

    return source;
  }

  stopBuffer(key: string): void {
    const entry = this.buffers.get(key);
    if (!entry?.activeSource) return;
    try {
      entry.activeSource.stop();
    } catch {
      // already stopped
    }
    entry.activeSource = null;
  }

  destroy(): void {
    for (const [, entry] of this.buffers) {
      if (entry.activeSource) {
        try {
          entry.activeSource.stop();
          entry.activeSource.disconnect();
        } catch {
          // already stopped
        }
      }
    }
    this.buffers.clear();

    for (const node of this.scheduledNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // already stopped
      }
    }
    this.scheduledNodes = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this._musicGain = null;
      this._sfxGain = null;
    }
  }
}
