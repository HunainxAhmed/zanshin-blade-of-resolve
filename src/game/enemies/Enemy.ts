import * as THREE from 'three';
import { CharacterRig, CharacterArchetype } from '../animation/CharacterRig';
import { ProceduralAnimator, AnimState } from '../animation/ProceduralAnimator';
import { SwordTrail } from '../effects/SwordTrail';
import { WeaponTrace, Hurtbox } from '../combat/Hitbox';
import { Combatant, CombatEngine } from '../combat/CombatEngine';
import { AudioEngine } from '../audio/SoundManager';
import { EventBus } from '../core/EventBus';

export type EnemyAIState =
  | 'IDLE'
  | 'APPROACH'
  | 'CIRCLE'
  | 'ATTACK'
  | 'DEFEND'
  | 'DODGE'
  | 'STAGGER'
  | 'POSTURE_BREAK'
  | 'EXECUTION_VICTIM'
  | 'RETREAT'
  | 'DEAD';

export interface EnemyConfig {
  name: string;
  archetype: CharacterArchetype;
  maxHealth: number;
  maxPosture: number;
  walkSpeed: number;
  runSpeed: number;
  attackRange: number;
  attackCooldown: number;
  parryChance: number;
  canThrust: boolean;
  canSweep: boolean;
  trailColor: number;
}

export class Enemy implements Combatant {
  public isPlayer: boolean = false;
  public name: string;
  public config: EnemyConfig;

  // 3D Visuals & Animation
  public rig: CharacterRig;
  public animator: ProceduralAnimator;
  public swordTrail: SwordTrail;
  public weaponTrace: WeaponTrace = new WeaponTrace();
  public hurtbox: Hurtbox;

  // Stats
  public health: number;
  public maxHealth: number;
  public posture: number = 0;
  public maxPosture: number;

  // AI & State Machine
  public aiState: EnemyAIState = 'IDLE';
  public stateTimer: number = 0;
  public attackCooldownTimer: number = 0;
  public comboStep: number = 0;
  public maxComboSteps: number = 2;
  public currentAttackType: 'normal' | 'heavy' | 'thrust' | 'sweep' | 'grab' = 'normal';

  // Combatant Flags
  public isPostureBroken: boolean = false;
  public isGuarding: boolean = false;
  public guardWindowTimer: number = 0;
  public isDodging: boolean = false;
  public dodgeIFrameTimer: number = 0;
  public isExecuting: boolean = false;
  public isDead: boolean = false;

  // Movement & Facing
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public facingAngle: number = 0;
  private circleDirection: number = 1;
  private dodgeDir: THREE.Vector3 = new THREE.Vector3();

  // Attack frame window
  public isAttackActiveWindow: boolean = false;
  public hasHitCurrentSwing: boolean = false;

  constructor(scene: THREE.Scene, config: EnemyConfig, spawnPos: THREE.Vector3) {
    this.config = config;
    this.name = config.name;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.maxPosture = config.maxPosture;

    this.rig = new CharacterRig(config.archetype);
    this.rig.root.position.copy(spawnPos);
    scene.add(this.rig.root);

    this.animator = new ProceduralAnimator(this.rig);
    this.swordTrail = new SwordTrail(scene, 14, config.trailColor);

    this.hurtbox = {
      center: new THREE.Vector3(),
      radius: config.archetype === 'heavy' ? 0.65 : 0.45,
      height: config.archetype === 'heavy' ? 2.1 : 1.8,
    };

    this.attackCooldownTimer = 1.0 + Math.random() * 0.8;
  }

  public get position(): THREE.Vector3 {
    return this.rig.root.position;
  }

  public set position(v: THREE.Vector3) {
    this.rig.root.position.copy(v);
  }

  public update(
    delta: number,
    player: Combatant,
    combatEngine: CombatEngine
  ): void {
    if (this.isDead) {
      this.animator.setState('dead');
      this.animator.update(delta);
      return;
    }

    this.stateTimer += delta;
    this.attackCooldownTimer -= delta;
    this.updateHurtbox();

    if (this.isGuarding) {
      this.guardWindowTimer += delta;
    }
    if (this.dodgeIFrameTimer > 0) {
      this.dodgeIFrameTimer -= delta;
    }

    // AI Decision Tree
    switch (this.aiState) {
      case 'IDLE':
      case 'APPROACH':
      case 'CIRCLE':
      case 'RETREAT':
        this.updateTacticalMovement(delta, player);
        break;

      case 'ATTACK':
        this.updateAttackState(delta, player, combatEngine);
        break;

      case 'DEFEND':
        this.updateDefendState(delta, player);
        break;

      case 'DODGE':
        this.updateDodgeState(delta);
        break;

      case 'STAGGER':
        if (this.stateTimer >= 0.38) {
          this.transitionTo('IDLE');
        }
        break;

      case 'POSTURE_BREAK':
        if (this.stateTimer >= 4.0) {
          this.isPostureBroken = false;
          this.posture = 0;
          this.transitionTo('IDLE');
        }
        break;

      case 'EXECUTION_VICTIM':
        this.animator.setState('execution_victim');
        break;
    }

    // Natural Posture Recovery
    const inAction = this.aiState === 'ATTACK' || this.aiState === 'STAGGER';
    combatEngine.updatePostureRecovery(this, delta, inAction);

    // Update Sword Trail & Rig
    const tip = this.rig.getWeaponTipWorld();
    const base = this.rig.getWeaponBaseWorld();
    this.swordTrail.updateTrail(tip, base);

    this.animator.update(delta);
    this.rig.updateSprings(delta, this.velocity);
  }

  private updateHurtbox(): void {
    this.hurtbox.center.copy(this.position);
    this.hurtbox.center.y += 0.9;
  }

  private updateTacticalMovement(delta: number, player: Combatant): void {
    const toPlayer = player.position.clone().sub(this.position).setY(0);
    const dist = toPlayer.length();
    const dir = toPlayer.clone().normalize();

    // Face player
    this.facingAngle = Math.atan2(dir.x, dir.z);
    this.rig.root.rotation.y = this.facingAngle;

    // Check if ready to initiate an attack
    if (this.attackCooldownTimer <= 0 && dist <= this.config.attackRange + 0.8) {
      this.startAttackSequence();
      return;
    }

    // Tactical Positioning
    if (dist > this.config.attackRange + 1.2) {
      // Approach player
      this.velocity.copy(dir).multiplyScalar(this.config.runSpeed);
      this.position.addScaledVector(this.velocity, delta);
      this.animator.setState('run');
      this.aiState = 'APPROACH';
    } else if (dist < 1.4) {
      // Too close: back off slightly
      this.velocity.copy(dir).negate().multiplyScalar(this.config.walkSpeed * 0.8);
      this.position.addScaledVector(this.velocity, delta);
      this.animator.setState('walk');
      this.aiState = 'RETREAT';
    } else {
      // Medium range: Circle strafe & threaten
      const tangent = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(this.circleDirection);
      this.velocity.copy(tangent).multiplyScalar(this.config.walkSpeed);
      this.position.addScaledVector(this.velocity, delta);

      // Randomly reverse strafe direction
      if (Math.random() < 0.01) {
        this.circleDirection *= -1;
      }

      this.animator.setState('walk');
      this.aiState = 'CIRCLE';

      // Chance to enter defensive guard if player attacks frequently
      if (Math.random() < this.config.parryChance * 0.02) {
        this.transitionTo('DEFEND');
      }
    }
  }

  private startAttackSequence(): void {
    this.comboStep = 1;
    this.chooseAttackType();
    this.transitionTo('ATTACK');
  }

  private chooseAttackType(): void {
    const rand = Math.random();
    if (this.config.canThrust && rand < 0.28) {
      this.currentAttackType = 'thrust';
      EventBus.emit('perilous_warning', { attackType: 'thrust', attacker: this });
    } else if (this.config.canSweep && rand < 0.48) {
      this.currentAttackType = 'sweep';
      EventBus.emit('perilous_warning', { attackType: 'sweep', attacker: this });
    } else if (rand < 0.75) {
      this.currentAttackType = 'normal';
    } else {
      this.currentAttackType = 'heavy';
    }
  }

  private updateAttackState(delta: number, player: Combatant, combatEngine: CombatEngine): void {
    let duration = 0.55;
    let activeStart = 0.18;
    let activeEnd = 0.38;
    let damage = 20;
    let postureDmg = 18;

    if (this.currentAttackType === 'thrust') {
      duration = 0.65;
      activeStart = 0.32; // Long telegraph for Mikiri counter!
      activeEnd = 0.48;
      damage = 32;
      postureDmg = 30;
      this.animator.setState('thrust');
    } else if (this.currentAttackType === 'sweep') {
      duration = 0.72;
      activeStart = 0.35;
      activeEnd = 0.58;
      damage = 35;
      postureDmg = 35;
      this.animator.setState('sweep');
    } else if (this.currentAttackType === 'heavy') {
      duration = 0.68;
      activeStart = 0.28;
      activeEnd = 0.46;
      damage = 30;
      postureDmg = 28;
      this.animator.setState('heavy_strike');
    } else {
      // Normal combo slash
      const anim: AnimState = this.comboStep === 1 ? 'attack1' : 'attack2';
      this.animator.setState(anim);
    }

    // Step forward during startup
    if (this.stateTimer < activeStart) {
      const fwd = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
      this.position.addScaledVector(fwd, 2.0 * delta);
    }

    // Active Strike Window
    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (!this.isAttackActiveWindow) {
        this.isAttackActiveWindow = true;
        this.hasHitCurrentSwing = false;
        this.swordTrail.setActive(true);
        AudioEngine.playSwordSwing(1.0);
      }

      if (!this.hasHitCurrentSwing) {
        this.checkStrikeAgainstPlayer(damage, postureDmg, player, combatEngine);
      }
    } else {
      if (this.isAttackActiveWindow) {
        this.isAttackActiveWindow = false;
        this.swordTrail.setActive(false);
      }
    }

    // End of swing: check combo continuation or cooldown
    if (this.stateTimer >= duration) {
      if (this.comboStep < this.maxComboSteps && this.currentAttackType === 'normal' && Math.random() < 0.65) {
        this.comboStep++;
        this.stateTimer = 0;
        this.hasHitCurrentSwing = false;
        this.chooseAttackType();
      } else {
        // Finish combo
        this.attackCooldownTimer = this.config.attackCooldown * (0.8 + Math.random() * 0.4);
        this.transitionTo('IDLE');
      }
    }
  }

  private checkStrikeAgainstPlayer(
    damage: number,
    postureDmg: number,
    player: Combatant,
    combatEngine: CombatEngine
  ): void {
    const tip = this.rig.getWeaponTipWorld();
    const base = this.rig.getWeaponBaseWorld();
    const contact = new THREE.Vector3();

    const hurtbox = (player as any).hurtbox;
    if (!hurtbox) return;

    const hit = this.weaponTrace.checkSegmentIntersection(tip, base, hurtbox, contact);
    if (hit) {
      this.hasHitCurrentSwing = true;
      combatEngine.resolveStrike(this, player, this.currentAttackType, damage, postureDmg, contact);
    }
  }

  private updateDefendState(delta: number, player: Combatant): void {
    this.isGuarding = true;
    this.animator.setState('guard');

    // Face player
    const toPlayer = player.position.clone().sub(this.position).setY(0).normalize();
    this.facingAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.rig.root.rotation.y = this.facingAngle;

    if (this.stateTimer >= 0.8) {
      this.isGuarding = false;
      this.transitionTo('IDLE');
    }
  }

  private updateDodgeState(delta: number): void {
    this.position.addScaledVector(this.dodgeDir, 8.0 * delta);
    if (this.stateTimer >= 0.35) {
      this.isDodging = false;
      this.transitionTo('IDLE');
    }
  }

  public transitionTo(newState: EnemyAIState): void {
    this.aiState = newState;
    this.stateTimer = 0;
    this.isGuarding = false;
    this.isAttackActiveWindow = false;
    this.swordTrail.setActive(false);

    let anim: AnimState = 'idle';
    switch (newState) {
      case 'IDLE': anim = 'idle'; break;
      case 'APPROACH': anim = 'run'; break;
      case 'CIRCLE': anim = 'walk'; break;
      case 'DEFEND': anim = 'guard'; break;
      case 'DODGE': anim = 'dodge'; break;
      case 'STAGGER': anim = 'stagger'; break;
      case 'POSTURE_BREAK': anim = 'posture_broken'; break;
      case 'DEAD': anim = 'dead'; break;
    }
    this.animator.setState(anim);
  }

  // Combatant callbacks
  public onTakeDamage(amount: number, postureAmount: number, isCleanHit: boolean): void {
    if (isCleanHit) {
      this.transitionTo('STAGGER');
    }
  }

  public onDeflectSuccess(): void {
    this.animator.setState('deflect_react');
  }

  public onDeflectedByOpponent(): void {
    this.transitionTo('STAGGER');
  }

  public onPostureBreak(): void {
    this.transitionTo('POSTURE_BREAK');
  }

  public onCounterSuccess(): void {
    this.animator.setState('counter_react');
    this.stateTimer = 0;
  }
}
