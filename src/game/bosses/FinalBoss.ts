import * as THREE from 'three';
import { Enemy, EnemyConfig } from '../enemies/Enemy';
import { Combatant, CombatEngine } from '../combat/CombatEngine';
import { EventBus } from '../core/EventBus';
import { AudioEngine } from '../audio/SoundManager';
import { COMBAT_CONFIG } from '../data/CombatConfig';

export class FinalBoss extends Enemy {
  public maxDeathNodes: number = 3;
  public deathNodesRemaining: number = 3;
  public phase: number = 1;
  public bossTitle: string = 'Sovereign of the Severed Wind';

  private signatureCooldown: number = 4.0;
  private specialSubtype: 'thunder_plunge' | 'wind_flurry' = 'wind_flurry';
  private targetLandingPos: THREE.Vector3 = new THREE.Vector3();
  private hasImpactedThisSpecial: boolean = false;

  constructor(scene: THREE.Scene, spawnPos: THREE.Vector3) {
    const bossConfig: EnemyConfig = {
      name: 'LORD GENJIRO',
      archetype: 'boss',
      maxHealth: 240,
      maxPosture: 190,
      walkSpeed: 4.2,
      runSpeed: 8.4,
      attackRange: 2.9,
      attackCooldown: 0.72,
      parryChance: 0.78,
      canThrust: true,
      canSweep: true,
      trailColor: 0xff1744,
    };

    super(scene, bossConfig, spawnPos);
    this.maxComboSteps = 3;
  }

  public override update(delta: number, player: Combatant, combatEngine: CombatEngine): void {
    super.update(delta, player, combatEngine);

    if (this.isDead || this.isPostureBroken) return;

    this.signatureCooldown -= delta;

    // Phase-specific adjustments
    if (this.phase === 2) {
      this.config.attackCooldown = 0.58;
      this.maxComboSteps = 4;
      this.swordTrail.setColor(0xff3d00, 0.9);
      this.bossTitle = 'The Ashen Gale';

      // Phase 2 Signature Trigger: Wind Flurry
      if (this.signatureCooldown <= 0 && (this.aiState === 'APPROACH' || this.aiState === 'CIRCLE')) {
        this.triggerWindFlurry(player);
      }
    } else if (this.phase === 3) {
      this.config.attackCooldown = 0.42;
      this.maxComboSteps = 5;
      this.swordTrail.setColor(0x00e5ff, 0.95); // Lightning-infused
      this.bossTitle = 'Way of Tomoe: Lightning Sovereign';

      // Phase 3 Signature Trigger: Thunder Plunge
      if (this.signatureCooldown <= 0 && (this.aiState === 'APPROACH' || this.aiState === 'CIRCLE')) {
        this.triggerThunderPlunge(player);
      }
    }
  }

  private triggerWindFlurry(player: Combatant): void {
    this.signatureCooldown = 10.0;
    this.specialSubtype = 'wind_flurry';
    this.hasImpactedThisSpecial = false;

    // Face player & warn
    const toPlayer = player.position.clone().sub(this.position).setY(0).normalize();
    this.facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.rig.root.rotation.y = this.facingAngle;

    EventBus.emit('perilous_warning', { attackType: 'sweep', attacker: this });
    AudioEngine.playDangerWarning();

    this.transitionTo('SPECIAL_ATTACK');
  }

  private triggerThunderPlunge(player: Combatant): void {
    this.signatureCooldown = 12.0;
    this.specialSubtype = 'thunder_plunge';
    this.hasImpactedThisSpecial = false;
    this.targetLandingPos.copy(player.position);

    const toPlayer = player.position.clone().sub(this.position).setY(0).normalize();
    this.facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.rig.root.rotation.y = this.facingAngle;

    EventBus.emit('perilous_warning', { attackType: 'thrust', attacker: this });
    AudioEngine.playDangerWarning();

    this.transitionTo('SPECIAL_ATTACK');
  }

  protected override updateSpecialAttack(delta: number, player: Combatant, combatEngine: CombatEngine): void {
    if (this.specialSubtype === 'thunder_plunge') {
      this.updateThunderPlunge(delta, player, combatEngine);
    } else {
      this.updateWindFlurry(delta, player, combatEngine);
    }
  }

  private updateThunderPlunge(delta: number, player: Combatant, combatEngine: CombatEngine): void {
    // Stage 1: Wind-up crouch & lightning gather (0.0s - 0.35s)
    if (this.stateTimer < 0.35) {
      this.animator.setState('heavy_charge');
      this.swordTrail.setActive(true);
    }
    // Stage 2: Skyward leap (0.35s - 0.75s)
    else if (this.stateTimer >= 0.35 && this.stateTimer < 0.75) {
      const progress = (this.stateTimer - 0.35) / 0.4;
      this.position.y = Math.sin(progress * Math.PI * 0.5) * 4.8;
      this.animator.setState('jump_rise');
      // Track towards target landing
      this.position.lerp(new THREE.Vector3(this.targetLandingPos.x, this.position.y, this.targetLandingPos.z), 0.08);
    }
    // Stage 3: High speed plunge (0.75s - 1.05s)
    else if (this.stateTimer >= 0.75 && this.stateTimer < 1.05) {
      const fallProgress = (this.stateTimer - 0.75) / 0.3;
      this.position.y = Math.max(0, 4.8 * (1.0 - fallProgress));
      this.animator.setState('jump_slash');

      // Dive downward onto target
      this.position.lerp(new THREE.Vector3(this.targetLandingPos.x, this.position.y, this.targetLandingPos.z), 0.15);
    }
    // Stage 4: Thunder impact (1.05s)
    else if (this.stateTimer >= 1.05 && !this.hasImpactedThisSpecial) {
      this.hasImpactedThisSpecial = true;
      this.position.y = 0;
      this.animator.setState('heavy_strike');
      this.swordTrail.setActive(false);

      // Play Thunderclap & Shockwave
      AudioEngine.playThunderClap();

      // Check damage on player
      const dist = this.position.distanceTo(player.position);
      if (dist < 3.4) {
        const contact = player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        combatEngine.resolveStrike(this, player, 'special', 46, 44, contact);
      }
    }
    // Stage 5: Recovery (1.05s - 1.45s)
    else if (this.stateTimer >= 1.45) {
      this.position.y = 0;
      this.transitionTo('IDLE');
    }
  }

  private updateWindFlurry(delta: number, player: Combatant, combatEngine: CombatEngine): void {
    // Multi-hit forward dashing slashes
    const stepDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
    this.position.addScaledVector(stepDir, 5.2 * delta);

    if (this.stateTimer < 0.28) {
      this.animator.setState('attack1');
      this.swordTrail.setActive(true);
    } else if (this.stateTimer < 0.56) {
      this.animator.setState('attack2');
    } else if (this.stateTimer < 0.88) {
      this.animator.setState('attack3');
    } else if (this.stateTimer < 1.25) {
      this.animator.setState('heavy_strike');
      if (!this.hasImpactedThisSpecial) {
        this.hasImpactedThisSpecial = true;
        const dist = this.position.distanceTo(player.position);
        if (dist < 2.8) {
          const contact = player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
          combatEngine.resolveStrike(this, player, 'sweep', 38, 38, contact);
        }
      }
    } else {
      this.swordTrail.setActive(false);
      this.transitionTo('IDLE');
    }
  }

  /**
   * When an execution deathblow is performed on the boss
   */
  public executeDeathblow(): boolean {
    this.deathNodesRemaining--;
    EventBus.emit('boss_phase_change', { phase: 4 - this.deathNodesRemaining });

    if (this.deathNodesRemaining > 0) {
      // Enter next phase!
      this.phase = 4 - this.deathNodesRemaining;
      this.health = this.maxHealth;
      this.posture = 0;
      this.isPostureBroken = false;
      this.isExecuting = false;
      this.signatureCooldown = 3.5;

      // Knockback and reset
      this.transitionTo('STAGGER');
      AudioEngine.playPostureBreak();
      return false; // Not fully dead
    } else {
      // Final defeat
      this.isDead = true;
      this.transitionTo('DEAD');
      return true; // Fully defeated
    }
  }
}
