export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export interface CombatTimingConfig {
  perfectDeflectWindow: number; // in seconds
  normalBlockWindow: number;    // in seconds
  thrustCounterWindow: number;  // in seconds
  dodgeInvulnerability: number; // in seconds
  dodgeDuration: number;        // in seconds
  postureBreakDuration: number; // in seconds
}

export const DIFFICULTY_SETTINGS: Record<DifficultyLevel, CombatTimingConfig> = {
  easy: {
    perfectDeflectWindow: 0.22,  // 220ms generous deflect window
    normalBlockWindow: 0.50,
    thrustCounterWindow: 0.35,
    dodgeInvulnerability: 0.35,
    dodgeDuration: 0.45,
    postureBreakDuration: 6.0,
  },
  normal: {
    perfectDeflectWindow: 0.15,  // 150ms authentic Sekiro-style window
    normalBlockWindow: 0.40,
    thrustCounterWindow: 0.26,
    dodgeInvulnerability: 0.25,
    dodgeDuration: 0.40,
    postureBreakDuration: 4.5,
  },
  hard: {
    perfectDeflectWindow: 0.09,  // 90ms strict master window
    normalBlockWindow: 0.30,
    thrustCounterWindow: 0.18,
    dodgeInvulnerability: 0.18,
    dodgeDuration: 0.35,
    postureBreakDuration: 3.2,
  },
};

export const COMBAT_CONFIG = {
  // Hit-stop durations (milliseconds)
  HIT_STOP_NORMAL: 65,
  HIT_STOP_PERFECT_DEFLECT: 110,
  HIT_STOP_HEAVY: 140,
  HIT_STOP_EXECUTION: 280,

  // Camera Shake Intensities
  SHAKE_LIGHT: 0.15,
  SHAKE_MEDIUM: 0.35,
  SHAKE_HEAVY: 0.70,
  SHAKE_EXPLOSIVE: 1.1,

  // Player Stats
  PLAYER_MAX_HEALTH: 100,
  PLAYER_MAX_POSTURE: 100,
  PLAYER_MAX_SPECIAL_PIPS: 3,
  PLAYER_SPECIAL_PER_DEFLECT: 0.35,
  PLAYER_SPECIAL_PER_HIT: 0.25,
  PLAYER_HEAL_CHARGES_MAX: 3,
  PLAYER_HEAL_AMOUNT: 60,

  // Attack Damage Defaults
  ATTACK_1_DAMAGE: 16,
  ATTACK_1_POSTURE: 14,
  ATTACK_2_DAMAGE: 20,
  ATTACK_2_POSTURE: 18,
  ATTACK_3_DAMAGE: 28,
  ATTACK_3_POSTURE: 26,
  HEAVY_ATTACK_DAMAGE: 45,
  HEAVY_ATTACK_POSTURE: 40,

  // Deflect Posture Damage Dealt to Attacker
  PERFECT_DEFLECT_POSTURE_DAMAGE: 22,
  NORMAL_BLOCK_POSTURE_TAKEN: 12,

  // Posture Recovery Rates (points per second)
  POSTURE_RECOVERY_HIGH_HP: 24,  // When HP > 75%
  POSTURE_RECOVERY_MID_HP: 14,   // When HP 40% - 75%
  POSTURE_RECOVERY_LOW_HP: 5,    // When HP < 40%
  POSTURE_RECOVERY_DELAY: 1.2,   // seconds without taking damage/blocking before recovery starts

  // Movement Speeds
  WALK_SPEED: 4.8,
  RUN_SPEED: 7.2,
  SPRINT_SPEED: 10.5,
  DODGE_SPEED: 14.0,

  // Distances
  LOCKON_MAX_DISTANCE: 22.0,
  LOCKON_LOSE_DISTANCE: 28.0,
  MELEE_RANGE: 2.4,
  THRUST_COUNTER_MAX_RANGE: 3.5,
};
