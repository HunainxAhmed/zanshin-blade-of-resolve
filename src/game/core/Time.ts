export class Time {
  public static delta: number = 0;
  public static unscaledDelta: number = 0;
  public static time: number = 0;
  public static timeScale: number = 1.0;
  
  private static lastTimestamp: number = 0;
  private static hitStopDuration: number = 0;
  private static slowMoDuration: number = 0;
  private static targetSlowMoScale: number = 1.0;

  public static init(): void {
    this.lastTimestamp = performance.now();
    this.delta = 0;
    this.unscaledDelta = 0;
    this.time = 0;
    this.timeScale = 1.0;
  }

  public static update(currentTimestamp: number): void {
    if (!this.lastTimestamp) {
      this.lastTimestamp = currentTimestamp;
    }

    const rawDelta = (currentTimestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = currentTimestamp;
    
    // Clamp delta to prevent huge jumps when switching tabs or pausing
    this.unscaledDelta = Math.min(rawDelta, 0.1);

    // Handle Hit-Stop (Micro-freeze on heavy impacts / perfect deflects)
    if (this.hitStopDuration > 0) {
      this.hitStopDuration -= this.unscaledDelta;
      if (this.hitStopDuration <= 0) {
        this.hitStopDuration = 0;
      }
      this.delta = 0;
      return;
    }

    // Handle Slow-Motion effects
    if (this.slowMoDuration > 0) {
      this.slowMoDuration -= this.unscaledDelta;
      if (this.slowMoDuration <= 0) {
        this.slowMoDuration = 0;
        this.timeScale = 1.0;
      } else {
        this.timeScale = this.targetSlowMoScale;
      }
    }

    this.delta = this.unscaledDelta * this.timeScale;
    this.time += this.delta;
  }

  /**
   * Triggers micro-freeze hit-stop effect in milliseconds (Sekiro style: 60ms-120ms)
   */
  public static triggerHitStop(durationMs: number): void {
    this.hitStopDuration = Math.max(this.hitStopDuration, durationMs / 1000);
  }

  /**
   * Triggers slow-motion for dramatic moments (e.g. execution, posture break)
   */
  public static triggerSlowMotion(durationSeconds: number, scale: number = 0.25): void {
    this.slowMoDuration = durationSeconds;
    this.targetSlowMoScale = scale;
    this.timeScale = scale;
  }

  public static reset(): void {
    this.hitStopDuration = 0;
    this.slowMoDuration = 0;
    this.timeScale = 1.0;
  }
}
