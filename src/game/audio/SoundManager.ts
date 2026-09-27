export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private ambientInterval: number | null = null;
  private inCombat: boolean = false;

  private masterVolume: number = 0.8;
  private sfxVolume: number = 0.9;
  private musicVolume: number = 0.5;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startAmbientLoop();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  private ensureContext(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return !!this.ctx && !!this.sfxGain;
  }

  public setVolumes(master: number, sfx: number, music: number): void {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.ctx && this.masterGain && this.sfxGain && this.musicGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : master, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(music, this.ctx.currentTime);
    }
  }

  // ==========================================
  // COMBAT SFX SYNTHESIS
  // ==========================================

  /**
   * The signature Sekiro-style Perfect Deflection clash:
   * Piercing bell overtone + sharp metallic transient + sub punch
   */
  public playPerfectDeflect(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // 1. High Crystal Bell / Harmonics (1800Hz & 3600Hz)
    const bellOsc = this.ctx!.createOscillator();
    const bellGain = this.ctx!.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1760, now); // A6
    bellOsc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

    bellGain.gain.setValueAtTime(0.8, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain!);
    bellOsc.start(now);
    bellOsc.stop(now + 0.5);

    // 2. High Ring Modulator / Metallic Resonance
    const ringOsc = this.ctx!.createOscillator();
    const ringGain = this.ctx!.createGain();
    ringOsc.type = 'triangle';
    ringOsc.frequency.setValueAtTime(2450, now);
    ringOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

    ringGain.gain.setValueAtTime(0.6, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    ringOsc.connect(ringGain);
    ringGain.connect(this.sfxGain!);
    ringOsc.start(now);
    ringOsc.stop(now + 0.4);

    // 3. Steel Blade Crack / White Noise Transient
    this.playNoiseBurst(0.06, 3000, 0.9);

    // 4. Low Impact Thud (Sub punch)
    const subOsc = this.ctx!.createOscillator();
    const subGain = this.ctx!.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain!);
    subOsc.start(now);
    subOsc.stop(now + 0.12);
  }

  /**
   * Normal Block: Dull metal clatter / guarded strike
   */
  public playNormalBlock(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.14);

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.15);
    this.playNoiseBurst(0.04, 1200, 0.4);
  }

  /**
   * Sword Swing / Whoosh
   */
  public playSwordSwing(speedMultiplier: number = 1.0): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    const duration = 0.18 / speedMultiplier;

    const bufferSize = Math.floor(this.ctx!.sampleRate * duration);
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1600 * speedMultiplier, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(250, now + duration);
    filter.Q.value = 3.0;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Flesh Hit / Slicing Impact
   */
  public playHitFlesh(isHeavy: boolean = false): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // Bass impact
    const subOsc = this.ctx!.createOscillator();
    const subGain = this.ctx!.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(isHeavy ? 140 : 180, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + (isHeavy ? 0.22 : 0.14));

    subGain.gain.setValueAtTime(isHeavy ? 0.9 : 0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.22 : 0.14));
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain!);
    subOsc.start(now);
    subOsc.stop(now + (isHeavy ? 0.22 : 0.14));

    // Wet / Crunchy blade slice noise
    this.playNoiseBurst(isHeavy ? 0.12 : 0.07, isHeavy ? 1800 : 2600, isHeavy ? 0.7 : 0.5);
  }

  /**
   * Thrust Counter (Mikiri-style): Deep ground-pinning crunch + blade stomp
   */
  public playThrustCounter(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // Heavy foot stomp
    const stompOsc = this.ctx!.createOscillator();
    const stompGain = this.ctx!.createGain();
    stompOsc.type = 'sawtooth';
    stompOsc.frequency.setValueAtTime(220, now);
    stompOsc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    stompGain.gain.setValueAtTime(1.0, now);
    stompGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    stompOsc.connect(stompGain);
    stompGain.connect(this.sfxGain!);
    stompOsc.start(now);
    stompOsc.stop(now + 0.3);

    // Blade Pin Chime
    const ping = this.ctx!.createOscillator();
    const pingGain = this.ctx!.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1200, now);
    ping.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    pingGain.gain.setValueAtTime(0.7, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    ping.connect(pingGain);
    pingGain.connect(this.sfxGain!);
    ping.start(now);
    ping.stop(now + 0.4);
  }

  /**
   * Posture Break: Deep temple gong + shattering glass chime
   */
  public playPostureBreak(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // Resonant Gong
    [110, 220, 330, 440].forEach((freq, i) => {
      const gong = this.ctx!.createOscillator();
      const gongGain = this.ctx!.createGain();
      gong.type = i % 2 === 0 ? 'sine' : 'triangle';
      gong.frequency.setValueAtTime(freq, now);

      gongGain.gain.setValueAtTime(0.4 / (i + 1), now);
      gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      gong.connect(gongGain);
      gongGain.connect(this.sfxGain!);
      gong.start(now);
      gong.stop(now + 1.2);
    });

    // Glass / Ice Shatter burst
    this.playNoiseBurst(0.25, 4500, 0.8);
  }

  /**
   * Execution Finishing Slash: Dramatic pause into tearing slash
   */
  public playExecutionSlash(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // High velocity razor edge
    const slash = this.ctx!.createOscillator();
    const slashGain = this.ctx!.createGain();
    slash.type = 'sawtooth';
    slash.frequency.setValueAtTime(800, now);
    slash.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    slashGain.gain.setValueAtTime(1.0, now);
    slashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    slash.connect(slashGain);
    slashGain.connect(this.sfxGain!);
    slash.start(now);
    slash.stop(now + 0.4);

    // Deep sub detonation
    const boom = this.ctx!.createOscillator();
    const boomGain = this.ctx!.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(120, now);
    boom.frequency.exponentialRampToValueAtTime(25, now + 0.5);
    boomGain.gain.setValueAtTime(0.9, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    boom.connect(boomGain);
    boomGain.connect(this.sfxGain!);
    boom.start(now);
    boom.stop(now + 0.5);

    this.playNoiseBurst(0.2, 2800, 0.85);
  }

  /**
   * Perilous Danger Warning: Piercing high Japanese chime + low drone
   */
  public playDangerWarning(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const dangerPing = this.ctx!.createOscillator();
    const pingGain = this.ctx!.createGain();
    dangerPing.type = 'sine';
    dangerPing.frequency.setValueAtTime(950, now);
    dangerPing.frequency.setValueAtTime(1425, now + 0.08);

    pingGain.gain.setValueAtTime(0.7, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    dangerPing.connect(pingGain);
    pingGain.connect(this.sfxGain!);
    dangerPing.start(now);
    dangerPing.stop(now + 0.45);
  }

  /**
   * Quick Dodge whoosh
   */
  public playDodge(): void {
    if (!this.ensureContext()) return;
    this.playNoiseBurst(0.12, 900, 0.35);
  }

  /**
   * Special Attack Release
   */
  public playSpecialAttack(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  /**
   * Healing Gourd Flask
   */
  public playHeal(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.06 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  }

  // ==========================================
  // AMBIENT & COMBAT BACKGROUND DRONE
  // ==========================================

  public setInCombat(inCombat: boolean): void {
    this.inCombat = inCombat;
  }

  private startAmbientLoop(): void {
    if (this.ambientInterval) return;

    // Periodically pulse subtle taiko drum / low drone
    this.ambientInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      if (this.inCombat) {
        this.playTaikoBeat();
      }
    }, 1800);
  }

  private playTaikoBeat(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    gain.gain.setValueAtTime(0.25 * this.musicVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  private playNoiseBurst(duration: number, cutoff: number, volume: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration);
  }
}

export const AudioEngine = new SoundManager();
