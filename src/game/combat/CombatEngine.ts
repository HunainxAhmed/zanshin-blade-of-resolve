import * as THREE from 'three';
import { COMBAT_CONFIG, DIFFICULTY_SETTINGS, DifficultyLevel } from '../data/CombatConfig';
import { EventBus } from '../core/EventBus';
import { Time } from '../core/Time';
import { AudioEngine } from '../audio/SoundManager';
import { ParticleSystem } from '../effects/ParticleSystem';
import { CombatCamera } from '../camera/CombatCamera';

export interface Combatant {
  isPlayer: boolean;
  name: string;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  posture: number;
  maxPosture: number;
  isPostureBroken: boolean;
  isGuarding: boolean;
  guardWindowTimer: number; // Time since guard was pressed
  isDodging: boolean;
  dodgeIFrameTimer: number; // Remaining i-frame time
  isExecuting: boolean;
  isDead: boolean;
  onTakeDamage(amount: number, postureAmount: number, isCleanHit: boolean): void;
  onDeflectSuccess(): void;
  onDeflectedByOpponent(): void;
  onPostureBreak(): void;
  onCounterSuccess?(): void;
}

export class CombatEngine {
  private particles: ParticleSystem;
  private camera: CombatCamera;
  public difficulty: DifficultyLevel = 'normal';

  constructor(particles: ParticleSystem, camera: CombatCamera) {
    this.particles = particles;
    this.camera = camera;
  }

  public setDifficulty(diff: DifficultyLevel): void {
    this.difficulty = diff;
  }

  /**
   * Resolves a weapon strike connecting with an opponent
   */
  public resolveStrike(
    attacker: Combatant,
    defender: Combatant,
    attackType: 'normal' | 'heavy' | 'thrust' | 'sweep' | 'grab' | 'special',
    damage: number,
    postureDamage: number,
    contactPoint: THREE.Vector3
  ): void {
    if (defender.isDead || defender.isExecuting || attacker.isDead) return;

    const timings = DIFFICULTY_SETTINGS[this.difficulty];

    // 1. Check Dodge i-frames
    if (defender.isDodging && defender.dodgeIFrameTimer > 0) {
      // Clean evasion
      EventBus.emit('dodge', { defender, attacker });
      return;
    }

    // 2. Check Thrust Counter (Mikiri)
    if (attackType === 'thrust' && defender.isPlayer && !defender.isPostureBroken) {
      // Check if player executed counter
      // Handled directly via action key E when in range
    }

    // 3. Check Deflection / Guard
    if (defender.isGuarding && !defender.isPostureBroken) {
      // Sweeps & Grabs cannot be blocked or deflected
      if (attackType === 'sweep' || attackType === 'grab') {
        this.applyCleanHit(attacker, defender, damage * 1.25, postureDamage * 1.5, contactPoint, attackType);
        return;
      }

      // Check Perfect Deflect Window
      if (defender.guardWindowTimer <= timings.perfectDeflectWindow) {
        this.applyPerfectDeflect(attacker, defender, contactPoint);
        return;
      }

      // Check Normal Block Window
      if (defender.guardWindowTimer <= timings.normalBlockWindow || defender.isGuarding) {
        this.applyNormalBlock(attacker, defender, damage, postureDamage, contactPoint);
        return;
      }
    }

    // 4. Clean Hit connects
    this.applyCleanHit(attacker, defender, damage, postureDamage, contactPoint, attackType);
  }

  private applyPerfectDeflect(attacker: Combatant, defender: Combatant, hitPoint: THREE.Vector3): void {
    // 1. Audio
    AudioEngine.playPerfectDeflect();

    // 2. VFX
    this.particles.spawnDeflectBurst(hitPoint, true);

    // 3. Screen Freeze Hit-stop
    Time.triggerHitStop(COMBAT_CONFIG.HIT_STOP_PERFECT_DEFLECT);

    // 4. Camera Shake & Zoom
    this.camera.addTrauma(COMBAT_CONFIG.SHAKE_MEDIUM);
    this.camera.pulseZoom(4.0, 180);

    // 5. Posture Damage to ATTACKER
    const postureDealt = COMBAT_CONFIG.PERFECT_DEFLECT_POSTURE_DAMAGE;
    attacker.posture = Math.min(attacker.maxPosture, attacker.posture + postureDealt);

    // 6. Recoil animations
    attacker.onDeflectedByOpponent();
    defender.onDeflectSuccess();

    // Check if attacker's posture broke from deflect
    if (attacker.posture >= attacker.maxPosture && !attacker.isPostureBroken) {
      this.triggerPostureBreak(attacker);
    }

    EventBus.emit('perfect_deflect', {
      attacker,
      defender,
      hitPoint: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
      postureDamage: postureDealt,
    });
  }

  private applyNormalBlock(
    attacker: Combatant,
    defender: Combatant,
    damage: number,
    postureDamage: number,
    hitPoint: THREE.Vector3
  ): void {
    // 1. Audio
    AudioEngine.playNormalBlock();

    // 2. Sparks
    this.particles.spawnDeflectBurst(hitPoint, false);

    // 3. Hit-stop
    Time.triggerHitStop(COMBAT_CONFIG.HIT_STOP_NORMAL);

    // 4. Camera Shake
    this.camera.addTrauma(COMBAT_CONFIG.SHAKE_LIGHT);

    // 5. Posture damage to DEFENDER
    const postureCost = COMBAT_CONFIG.NORMAL_BLOCK_POSTURE_TAKEN;
    defender.posture = Math.min(defender.maxPosture, defender.posture + postureCost);

    // Defender takes 0 damage (or minimal chip for heavy)
    const chipDamage = attacker.isPlayer ? 0 : Math.floor(damage * 0.08);
    defender.onTakeDamage(chipDamage, postureCost, false);

    // Check defender posture break
    if (defender.posture >= defender.maxPosture && !defender.isPostureBroken) {
      this.triggerPostureBreak(defender);
    }

    EventBus.emit('normal_block', { attacker, defender, hitPoint: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z } });
  }

  public applyCleanHit(
    attacker: Combatant,
    defender: Combatant,
    damage: number,
    postureDamage: number,
    hitPoint: THREE.Vector3,
    attackType: string
  ): void {
    const isHeavy = attackType === 'heavy' || attackType === 'special';

    // 1. Audio
    AudioEngine.playHitFlesh(isHeavy);

    // 2. Blood / impact sparks
    this.particles.spawnBloodImpact(hitPoint, undefined, isHeavy);

    // 3. Hit-stop
    Time.triggerHitStop(isHeavy ? COMBAT_CONFIG.HIT_STOP_HEAVY : COMBAT_CONFIG.HIT_STOP_NORMAL);

    // 4. Camera Shake
    this.camera.addTrauma(isHeavy ? COMBAT_CONFIG.SHAKE_HEAVY : COMBAT_CONFIG.SHAKE_LIGHT);

    // 5. Apply Damage & Posture
    defender.health = Math.max(0, defender.health - damage);
    defender.posture = Math.min(defender.maxPosture, defender.posture + postureDamage);
    defender.onTakeDamage(damage, postureDamage, true);

    // 6. Check death or posture break
    if (defender.health <= 0) {
      defender.isDead = true;
      EventBus.emit(defender.isPlayer ? 'player_death' : 'enemy_killed', { attacker, defender });
    } else if (defender.posture >= defender.maxPosture && !defender.isPostureBroken) {
      this.triggerPostureBreak(defender);
    }

    EventBus.emit(defender.isPlayer ? 'player_damaged' : 'hit', {
      attacker,
      defender,
      damage,
      postureDamage,
      hitPoint: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
    });
  }

  public triggerThrustCounter(attacker: Combatant, defender: Combatant, contactPoint: THREE.Vector3): void {
    AudioEngine.playThrustCounter();
    this.particles.spawnCounterImpact(contactPoint);
    Time.triggerHitStop(COMBAT_CONFIG.HIT_STOP_HEAVY);
    this.camera.addTrauma(COMBAT_CONFIG.SHAKE_HEAVY);

    // Massive posture damage to thrust attacker
    const postureDamage = 45;
    attacker.posture = Math.min(attacker.maxPosture, attacker.posture + postureDamage);
    if (attacker.onCounterSuccess) {
      attacker.onCounterSuccess();
    }

    if (attacker.posture >= attacker.maxPosture && !attacker.isPostureBroken) {
      this.triggerPostureBreak(attacker);
    }

    EventBus.emit('thrust_counter', { attacker, defender });
  }

  public triggerPostureBreak(target: Combatant): void {
    target.isPostureBroken = true;
    target.posture = target.maxPosture;
    target.onPostureBreak();

    AudioEngine.playPostureBreak();
    this.particles.spawnPostureBreakEffect(target.position);
    Time.triggerSlowMotion(1.2, 0.25);
    this.camera.addTrauma(COMBAT_CONFIG.SHAKE_MEDIUM);

    EventBus.emit('posture_break', { defender: target });
  }

  /**
   * Posture Recovery Calculation:
   * Dependent on health percentage (High HP = rapid recovery, Low HP = sluggish recovery)
   */
  public updatePostureRecovery(target: Combatant, delta: number, inCombatAction: boolean): void {
    if (target.isDead || target.isPostureBroken || inCombatAction || target.posture <= 0) return;

    const hpRatio = target.health / target.maxHealth;
    let rate = COMBAT_CONFIG.POSTURE_RECOVERY_HIGH_HP;

    if (hpRatio < 0.4) {
      rate = COMBAT_CONFIG.POSTURE_RECOVERY_LOW_HP;
    } else if (hpRatio < 0.75) {
      rate = COMBAT_CONFIG.POSTURE_RECOVERY_MID_HP;
    }

    // While holding guard, posture recovers 50% faster if not hit (authentic Sekiro recovery stance)
    if (target.isGuarding) {
      rate *= 1.5;
    }

    target.posture = Math.max(0, target.posture - rate * delta);
  }
}
