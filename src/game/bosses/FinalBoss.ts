import * as THREE from 'three';
import { Enemy, EnemyConfig } from '../enemies/Enemy';
import { Combatant, CombatEngine } from '../combat/CombatEngine';
import { EventBus } from '../core/EventBus';
import { AudioEngine } from '../audio/SoundManager';

export class FinalBoss extends Enemy {
  public maxDeathNodes: number = 3;
  public deathNodesRemaining: number = 3;
  public phase: number = 1;
  public bossTitle: string = 'Sovereign of the Severed Wind';

  constructor(scene: THREE.Scene, spawnPos: THREE.Vector3) {
    const bossConfig: EnemyConfig = {
      name: 'LORD GENJIRO',
      archetype: 'boss',
      maxHealth: 220,
      maxPosture: 180,
      walkSpeed: 4.2,
      runSpeed: 8.2,
      attackRange: 2.8,
      attackCooldown: 0.75,
      parryChance: 0.75,
      canThrust: true,
      canSweep: true,
      trailColor: 0xff1744,
    };

    super(scene, bossConfig, spawnPos);
    this.maxComboSteps = 3;
  }

  public update(delta: number, player: Combatant, combatEngine: CombatEngine): void {
    super.update(delta, player, combatEngine);

    // Phase-specific adjustments
    if (this.phase === 2) {
      this.config.attackCooldown = 0.6;
      this.maxComboSteps = 4;
      this.swordTrail.setColor(0xff3d00, 0.9);
    } else if (this.phase === 3) {
      this.config.attackCooldown = 0.45;
      this.maxComboSteps = 4;
      this.swordTrail.setColor(0x00e5ff, 0.95); // Lightning infused
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
