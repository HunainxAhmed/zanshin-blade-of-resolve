import * as THREE from 'three';
import { Enemy, EnemyConfig } from '../enemies/Enemy';
import { AudioEngine } from '../audio/SoundManager';
import { EventBus } from '../core/EventBus';

export class Miniboss extends Enemy {
  public maxDeathNodes: number = 2;
  public deathNodesRemaining: number = 2;
  public bossTitle: string;

  constructor(scene: THREE.Scene, config: EnemyConfig, title: string, spawnPos: THREE.Vector3) {
    super(scene, config, spawnPos);
    this.bossTitle = title;
    this.maxComboSteps = 3;
  }

  public executeDeathblow(): boolean {
    this.deathNodesRemaining--;
    EventBus.emit('boss_phase_change', { phase: 3 - this.deathNodesRemaining });

    if (this.deathNodesRemaining > 0) {
      this.health = this.maxHealth;
      this.posture = 0;
      this.isPostureBroken = false;
      this.isExecuting = false;
      this.config.attackCooldown *= 0.8; // More aggressive in phase 2

      this.transitionTo('STAGGER');
      AudioEngine.playPostureBreak();
      return false;
    } else {
      this.isDead = true;
      this.transitionTo('DEAD');
      return true;
    }
  }
}

export function spawnMiniboss(
  scene: THREE.Scene,
  type: 'kensei' | 'juggernaut' | 'phantom',
  spawnPos: THREE.Vector3
): Miniboss {
  if (type === 'kensei') {
    const config: EnemyConfig = {
      name: 'KENSEI HIKARU',
      archetype: 'knight',
      maxHealth: 160,
      maxPosture: 140,
      walkSpeed: 3.8,
      runSpeed: 7.2,
      attackRange: 2.6,
      attackCooldown: 0.9,
      parryChance: 0.8,
      canThrust: true,
      canSweep: true,
      trailColor: 0xffd700,
    };
    return new Miniboss(scene, config, 'The Unyielding Swordmaster', spawnPos);
  } else if (type === 'juggernaut') {
    const config: EnemyConfig = {
      name: 'GOUKI THE CRUSHER',
      archetype: 'heavy',
      maxHealth: 240,
      maxPosture: 200,
      walkSpeed: 2.8,
      runSpeed: 5.5,
      attackRange: 3.0,
      attackCooldown: 1.4,
      parryChance: 0.15,
      canThrust: false,
      canSweep: true,
      trailColor: 0xff6b6b,
    };
    return new Miniboss(scene, config, 'Ironclad Juggernaut of Ash', spawnPos);
  } else {
    const config: EnemyConfig = {
      name: 'CRIMSON PHANTOM',
      archetype: 'assassin',
      maxHealth: 140,
      maxPosture: 120,
      walkSpeed: 5.0,
      runSpeed: 9.5,
      attackRange: 2.2,
      attackCooldown: 0.65,
      parryChance: 0.6,
      canThrust: true,
      canSweep: false,
      trailColor: 0xe03131,
    };
    return new Miniboss(scene, config, 'Ghost of the Midnight Lotus', spawnPos);
  }
}
