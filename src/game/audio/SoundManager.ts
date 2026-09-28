export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = false;

  private inCombat: boolean = false;
  private combatIntensity: number = 0; // 0 to 1
  private musicClockTimer: number | null = null;
  private beatStep: number = 0;

  private masterVolume: number = 0.9;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.55;

  // Japanese Hirajoshi Pentatonic Scale frequencies (Hz) for koto/ambient plucks
  private hirajoshiNotes: number[] = [220, 246.94, 261.63, 329.63, 349.23, 440, 493.88, 523.25, 659.25, 698.46, 880];

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

      this.startInteractiveMusicEngine();
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
  // COMBAT SFX WITH PITCH LADDER
  // ==========================================

  /**
   * Signature Sekiro-style Perfect Deflection Clash with Pitch Ladder:
   * As deflection chains connect (streak 1, 2, 3+), pitch climbs dynamically!
   */
  public playPerfectDeflect(streak: number = 1): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = Math.min(1.0, this.combatIntensity + 0.35);

    // Multi-pitch climbing overtone
    const pitchMultiplier = Math.pow(1.12, Math.min(6, streak - 1));
    const baseFreq = 1860 * pitchMultiplier;

    // 1. Crystal Harmonic Bell
    const bellOsc = this.ctx!.createOscillator();
    const bellGain = this.ctx!.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(baseFreq, now);
    bellOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + 0.7);

    bellGain.gain.setValueAtTime(1.0, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    bellOsc.connect(bellGain);
    bellGain.connect(this.sfxGain!);
    bellOsc.start(now);
    bellOsc.stop(now + 0.7);

    // 2. High Ring Modulator Overtone
    const ringOsc = this.ctx!.createOscillator();
    const ringGain = this.ctx!.createGain();
    ringOsc.type = 'triangle';
    ringOsc.frequency.setValueAtTime(baseFreq * 1.5, now);
    ringOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.55);

    ringGain.gain.setValueAtTime(0.9, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    ringOsc.connect(ringGain);
    ringGain.connect(this.sfxGain!);
    ringOsc.start(now);
    ringOsc.stop(now + 0.55);

    // 3. Steel Blade Crack (High-velocity noise transient)
    this.playNoiseBurst(0.09, 5000, 1.0);

    // 4. Heavy Kinetic Bass Thud
    const subOsc = this.ctx!.createOscillator();
    const subGain = this.ctx!.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(240, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain!);
    subOsc.start(now);
    subOsc.stop(now + 0.18);
  }

  /**
   * Normal Block / Guard Clash
   */
  public playNormalBlock(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = Math.min(1.0, this.combatIntensity + 0.15);

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.22);

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

  public playHitFlesh(isHeavy: boolean = false): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = Math.min(1.0, this.combatIntensity + 0.25);

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
   * Mikiri Thrust Counter Stomp
   */
  public playThrustCounter(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = 1.0;

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
   * Aerial Sweep Counter: Head-Stomp Vault
   */
  public playHeadStomp(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = 1.0;

    // Crunching vault stomp
    const stomp = this.ctx!.createOscillator();
    const stompGain = this.ctx!.createGain();
    stomp.type = 'triangle';
    stomp.frequency.setValueAtTime(320, now);
    stomp.frequency.exponentialRampToValueAtTime(45, now + 0.28);
    stompGain.gain.setValueAtTime(1.0, now);
    stompGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    stomp.connect(stompGain);
    stompGain.connect(this.sfxGain!);
    stomp.start(now);
    stomp.stop(now + 0.3);

    // Vault whoosh
    this.playNoiseBurst(0.18, 1400, 0.7);
  }

  public playPostureBreak(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = 1.0;

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

  public playExecutionSlash(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;
    this.combatIntensity = 1.0;

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

  public playThunderClap(): void {
    if (!this.ensureContext()) return;
    const now = this.ctx!.currentTime;

    const crack = this.ctx!.createOscillator();
    const crackGain = this.ctx!.createGain();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(450, now);
    crack.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    crackGain.gain.setValueAtTime(1.0, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    crack.connect(crackGain);
    crackGain.connect(this.sfxGain!);
    crack.start(now);
    crack.stop(now + 0.9);

    this.playNoiseBurst(0.7, 1800, 0.9);
  }

  public playDodge(): void {
    if (!this.ensureContext()) return;
    this.playNoiseBurst(0.12, 1100, 0.45);
  }

  public playWhoosh(): void {
    if (!this.ensureContext()) return;
    this.playNoiseBurst(0.14, 1200, 0.45);
  }

  public playFootstep(): void {
    if (!this.ensureContext()) return;
    this.playNoiseBurst(0.06, 800, 0.25);
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

  // ==========================================
  // PROCEDURAL DYNAMIC COMBAT MUSIC SYSTEM
  // ==========================================

  public setInCombat(inCombat: boolean): void {
    this.inCombat = inCombat;
  }

  private startInteractiveMusicEngine(): void {
    if (this.musicClockTimer) return;

    // 16th-note clock at 112 BPM (approx 134ms per 16th note)
    const intervalMs = 134;

    this.musicClockTimer = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;

      this.beatStep = (this.beatStep + 1) % 32;

      // Naturally decay combat intensity over time
      if (this.combatIntensity > 0) {
        this.combatIntensity = Math.max(0, this.combatIntensity - 0.012);
      }

      // 1. Bass Taiko Kick (Downbeats on steps 0, 8, 16, 24)
      if (this.beatStep % 8 === 0) {
        this.synthTaikoDrum(60, 0.45 * (0.4 + this.combatIntensity * 0.6));
      }

      // 2. High Shime-Daiko Rolls (Accents during combat on syncopated steps)
      if (this.inCombat && (this.beatStep === 4 || this.beatStep === 12 || this.beatStep === 20 || this.beatStep === 28 || (this.combatIntensity > 0.5 && this.beatStep % 2 === 0))) {
        this.synthShimeDrum(240, 0.25 * (0.3 + this.combatIntensity * 0.7));
      }

      // 3. Mystical Hirajoshi Koto Pluck (every 16 beats or on intensity shifts)
      if (this.beatStep % 16 === 0 || (this.inCombat && this.beatStep === 6)) {
        const noteIndex = Math.floor(Math.random() * this.hirajoshiNotes.length);
        this.synthKotoNote(this.hirajoshiNotes[noteIndex]);
      }
    }, intervalMs);
  }

  private synthTaikoDrum(freq: number, volume: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq + 20, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 0.32);

    gain.gain.setValueAtTime(volume * this.musicVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  private synthShimeDrum(freq: number, volume: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    gain.gain.setValueAtTime(volume * this.musicVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  private synthKotoNote(freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Koto sharp attack with long wooden resonance decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18 * this.musicVolume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 1.2);
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
