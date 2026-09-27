export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;
  private ambientInterval: number | null = null;
  private inCombat: boolean = false;

  private masterVolume: number = 0.9;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;

  constructor() {}

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
  // COMBAT CLASH SOUND SYNTHESIS
  // ==========================================

  /**
   * Signature Sekiro-style Perfect Deflection Clash:
   * Explosive metallic transient + high resonant singing bell + heavy sub punch
   */
  public playPerfectDeflect(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // 1. Pure Crystal Bell Harmonics (1960Hz & 3920Hz)
    const bellOsc = this.ctx!.createOscillator();
    const bellGain = this.ctx!.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1960, now);
    bellOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.65);

    bellGain.gain.setValueAtTime(1.0, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain!);
    bellOsc.start(now);
    bellOsc.stop(now + 0.65);

    // 2. High Metallic Overtone / Ring
    const ringOsc = this.ctx!.createOscillator();
    const ringGain = this.ctx!.createGain();
    ringOsc.type = 'triangle';
    ringOsc.frequency.setValueAtTime(3200, now);
    ringOsc.frequency.exponentialRampToValueAtTime(1500, now + 0.5);

    ringGain.gain.setValueAtTime(0.85, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    ringOsc.connect(ringGain);
    ringGain.connect(this.sfxGain!);
    ringOsc.start(now);
    ringOsc.stop(now + 0.5);

    // 3. Steel Blade Crack (High-velocity noise transient)
    this.playNoiseBurst(0.08, 4500, 1.0);

    // 4. Heavy Kinetic Bass Thud
    const subOsc = this.ctx!.createOscillator();
    const subGain = this.ctx!.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(220, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain!);
    subOsc.start(now);
    subOsc.stop(now + 0.16);
  }

  /**
   * Normal Block / Guard Clash: Heavy Anvil Steel Clank
   */
  public playNormalBlock(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    // Resonant Anvil Ping
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.24);

    // Low steel thud
    const sub = this.ctx!.createOscillator();
    const subGain = this.ctx!.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(180, now);
    sub.frequency.exponentialRampToValueAtTime(50, now + 0.14);
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    sub.connect(subGain);
    subGain.connect(this.sfxGain!);
    sub.start(now);
    sub.stop(now + 0.14);

    this.playNoiseBurst(0.06, 2200, 0.7);
  }

  /**
   * Sword Swing / Whoosh
   */
  public playSwordSwing(speedMultiplier: number = 1.0): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    const duration = 0.16 / speedMultiplier;

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
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2200 * speedMultiplier, now + duration * 0.45);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.value = 3.5;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.4);
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

    const subOsc = this.ctx!.createOscillator();
    const subGain = this.ctx!.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(isHeavy ? 160 : 200, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + (isHeavy ? 0.25 : 0.16));

    subGain.gain.setValueAtTime(isHeavy ? 1.0 : 0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.25 : 0.16));
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain!);
    subOsc.start(now);
    subOsc.stop(now + (isHeavy ? 0.25 : 0.16));

    this.playNoiseBurst(isHeavy ? 0.14 : 0.08, isHeavy ? 2400 : 3200, isHeavy ? 0.85 : 0.65);
  }

  /**
   * Thrust Counter (Mikiri-style): Ground-pinning stomp & blade crunch
   */
  public playThrustCounter(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const stompOsc = this.ctx!.createOscillator();
    const stompGain = this.ctx!.createGain();
    stompOsc.type = 'sawtooth';
    stompOsc.frequency.setValueAtTime(260, now);
    stompOsc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

    stompGain.gain.setValueAtTime(1.0, now);
    stompGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    stompOsc.connect(stompGain);
    stompGain.connect(this.sfxGain!);
    stompOsc.start(now);
    stompOsc.stop(now + 0.35);

    const ping = this.ctx!.createOscillator();
    const pingGain = this.ctx!.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1400, now);
    ping.frequency.exponentialRampToValueAtTime(700, now + 0.4);
    pingGain.gain.setValueAtTime(0.85, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    ping.connect(pingGain);
    pingGain.connect(this.sfxGain!);
    ping.start(now);
    ping.stop(now + 0.45);
  }

  /**
   * Posture Break
   */
  public playPostureBreak(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    [110, 220, 330, 440].forEach((freq, i) => {
      const gong = this.ctx!.createOscillator();
      const gongGain = this.ctx!.createGain();
      gong.type = i % 2 === 0 ? 'sine' : 'triangle';
      gong.frequency.setValueAtTime(freq, now);

      gongGain.gain.setValueAtTime(0.5 / (i + 1), now);
      gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      gong.connect(gongGain);
      gongGain.connect(this.sfxGain!);
      gong.start(now);
      gong.stop(now + 1.4);
    });

    this.playNoiseBurst(0.25, 4500, 0.9);
  }

  /**
   * Execution Finishing Slash
   */
  public playExecutionSlash(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const slash = this.ctx!.createOscillator();
    const slashGain = this.ctx!.createGain();
    slash.type = 'sawtooth';
    slash.frequency.setValueAtTime(900, now);
    slash.frequency.exponentialRampToValueAtTime(70, now + 0.4);

    slashGain.gain.setValueAtTime(1.0, now);
    slashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    slash.connect(slashGain);
    slashGain.connect(this.sfxGain!);
    slash.start(now);
    slash.stop(now + 0.45);

    const boom = this.ctx!.createOscillator();
    const boomGain = this.ctx!.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(140, now);
    boom.frequency.exponentialRampToValueAtTime(25, now + 0.6);
    boomGain.gain.setValueAtTime(1.0, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    boom.connect(boomGain);
    boomGain.connect(this.sfxGain!);
    boom.start(now);
    boom.stop(now + 0.6);

    this.playNoiseBurst(0.25, 3200, 1.0);
  }

  public playDangerWarning(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const dangerPing = this.ctx!.createOscillator();
    const pingGain = this.ctx!.createGain();
    dangerPing.type = 'sine';
    dangerPing.frequency.setValueAtTime(1100, now);
    dangerPing.frequency.setValueAtTime(1650, now + 0.08);

    pingGain.gain.setValueAtTime(0.85, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    dangerPing.connect(pingGain);
    pingGain.connect(this.sfxGain!);
    dangerPing.start(now);
    dangerPing.stop(now + 0.5);
  }

  public playDodge(): void {
    if (!this.ensureContext()) return;
    this.playNoiseBurst(0.12, 1100, 0.45);
  }

  public playSpecialAttack(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  public playHeal(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    [440, 554, 659, 880].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.06 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.35);
    });
  }

  public setInCombat(inCombat: boolean): void {
    this.inCombat = inCombat;
  }

  private startAmbientLoop(): void {
    if (this.ambientInterval) return;

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

    gain.gain.setValueAtTime(0.3 * this.musicVolume, now);
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
