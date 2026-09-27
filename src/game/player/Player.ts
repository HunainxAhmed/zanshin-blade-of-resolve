import * as THREE from 'three';
import { CharacterRig } from '../animation/CharacterRig';
import { ProceduralAnimator, AnimState } from '../animation/ProceduralAnimator';
import { SwordTrail } from '../effects/SwordTrail';
import { WeaponTrace, Hurtbox } from '../combat/Hitbox';
import { Combatant, CombatEngine } from '../combat/CombatEngine';
import { COMBAT_CONFIG } from '../data/CombatConfig';
import { InputManager } from '../input/InputManager';
import { CombatCamera } from '../camera/CombatCamera';
import { AudioEngine } from '../audio/SoundManager';
import { ParticleSystem } from '../effects/ParticleSystem';
import { EventBus } from '../core/EventBus';

export type PlayerCombatState =
  | 'IDLE'
  | 'MOVE'
  | 'SPRINT'
  | 'DODGE'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'HEAVY_CHARGE'
  | 'HEAVY_STRIKE'
  | 'GUARD'
  | 'DEFLECT_REACT'
  | 'STAGGER'
  | 'POSTURE_BREAK'
  | 'EXECUTION'
  | 'SPECIAL'
  | 'HEAL'
  | 'DEAD';

export class Player implements Combatant {
  public isPlayer: boolean = true;
  public name: string = 'Ronin';

  // Scene & Visuals
  public rig: CharacterRig;
  public animator: ProceduralAnimator;
  public swordTrail: SwordTrail;
  public weaponTrace: WeaponTrace = new WeaponTrace();
  public hurtbox: Hurtbox;

  // Stats
  public health: number = COMBAT_CONFIG.PLAYER_MAX_HEALTH;
  public maxHealth: number = COMBAT_CONFIG.PLAYER_MAX_HEALTH;
  public posture: number = 0;
  public maxPosture: number = COMBAT_CONFIG.PLAYER_MAX_POSTURE;
  public specialPips: number = 0;
  public maxSpecialPips: number = COMBAT_CONFIG.PLAYER_MAX_SPECIAL_PIPS;
  public specialChargeProgress: number = 0;
  public healCharges: number = COMBAT_CONFIG.PLAYER_HEAL_CHARGES_MAX;

  // State Machine
  public state: PlayerCombatState = 'IDLE';
  public stateTimer: number = 0;

  // Combatant Flags
  public isPostureBroken: boolean = false;
  public isGuarding: boolean = false;
  public guardWindowTimer: number = 0;
  public isDodging: boolean = false;
  public dodgeIFrameTimer: number = 0;
  public isExecuting: boolean = false;
  public isDead: boolean = false;

  // Locomotion
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public moveDirection: THREE.Vector3 = new THREE.Vector3();
  public facingAngle: number = 0;
  private dodgeDirection: THREE.Vector3 = new THREE.Vector3();

  // Attack Tracking
  public isAttackActiveWindow: boolean = false;
  public hasHitCurrentSwing: boolean = false;

  // Execution target reference
  public executionTarget: Combatant | null = null;

  constructor(scene: THREE.Scene) {
    this.rig = new CharacterRig('player');
    scene.add(this.rig.root);

    this.animator = new ProceduralAnimator(this.rig);
    this.swordTrail = new SwordTrail(scene, 16, 0x4dabf7);

    this.hurtbox = {
      center: new THREE.Vector3(),
      radius: 0.45,
      height: 1.8,
    };
  }

  public get position(): THREE.Vector3 {
    return this.rig.root.position;
  }

  public set position(v: THREE.Vector3) {
    this.rig.root.position.copy(v);
  }

  public update(
    delta: number,
    input: InputManager,
    camera: CombatCamera,
    combatEngine: CombatEngine,
    particles: ParticleSystem,
    enemies: Combatant[]
  ): void {
    if (this.isDead) {
      this.animator.setState('dead');
      this.animator.update(delta);
      return;
    }

    this.stateTimer += delta;
    this.updateHurtbox();

    // Guard Window Timer
    if (this.isGuarding) {
      this.guardWindowTimer += delta;
    }

    // Dodge i-frames
    if (this.dodgeIFrameTimer > 0) {
      this.dodgeIFrameTimer -= delta;
    }

    // Check buffered inputs
    const buffered = input.consumeBufferedAction();

    // Handle State Machine
    switch (this.state) {
      case 'IDLE':
      case 'MOVE':
      case 'SPRINT':
        this.handleLocomotionState(delta, input, camera, particles, buffered);
        break;

      case 'DODGE':
        this.handleDodgeState(delta);
        break;

      case 'GUARD':
        this.handleGuardState(delta, input, camera, buffered);
        break;

      case 'ATTACK_1':
        this.handleAttackCombo(delta, input, 'ATTACK_2', 0.42, 0.12, 0.28, COMBAT_CONFIG.ATTACK_1_DAMAGE, COMBAT_CONFIG.ATTACK_1_POSTURE, enemies, combatEngine, buffered);
        break;

      case 'ATTACK_2':
        this.handleAttackCombo(delta, input, 'ATTACK_3', 0.44, 0.12, 0.30, COMBAT_CONFIG.ATTACK_2_DAMAGE, COMBAT_CONFIG.ATTACK_2_POSTURE, enemies, combatEngine, buffered);
        break;

      case 'ATTACK_3':
        this.handleAttackCombo(delta, input, null, 0.55, 0.18, 0.38, COMBAT_CONFIG.ATTACK_3_DAMAGE, COMBAT_CONFIG.ATTACK_3_POSTURE, enemies, combatEngine, buffered);
        break;

      case 'HEAVY_CHARGE':
        this.handleHeavyCharge(delta, input, camera);
        break;

      case 'HEAVY_STRIKE':
        this.handleHeavyStrike(delta, enemies, combatEngine);
        break;

      case 'DEFLECT_REACT':
        if (this.stateTimer >= 0.22) {
          this.transitionTo(input.state.guardHeld ? 'GUARD' : 'IDLE');
        }
        break;

      case 'STAGGER':
        if (this.stateTimer >= 0.4) {
          this.transitionTo('IDLE');
        }
        break;

      case 'POSTURE_BREAK':
        if (this.stateTimer >= 3.5) {
          this.isPostureBroken = false;
          this.posture = 0;
          this.transitionTo('IDLE');
        }
        break;

      case 'EXECUTION':
        this.handleExecution(delta);
        break;

      case 'SPECIAL':
        this.handleSpecialAttack(delta, enemies, combatEngine);
        break;

      case 'HEAL':
        if (this.stateTimer >= 0.8) {
          this.transitionTo('IDLE');
        }
        break;
    }

    // Natural Posture Recovery
    const inAction = this.state.startsWith('ATTACK') || this.state === 'DODGE' || this.state === 'STAGGER';
    combatEngine.updatePostureRecovery(this, delta, inAction);

    // Update Sword Trail
    const tip = this.rig.getWeaponTipWorld();
    const base = this.rig.getWeaponBaseWorld();
    this.swordTrail.updateTrail(tip, base);

    // Update Animator & Springs
    this.animator.update(delta);
    this.rig.updateSprings(delta, this.velocity);
  }

  private updateHurtbox(): void {
    this.hurtbox.center.copy(this.position);
    this.hurtbox.center.y += 0.9;
  }

  private handleLocomotionState(
    delta: number,
    input: InputManager,
    camera: CombatCamera,
    particles: ParticleSystem,
    bufferedAction: string | null
  ): void {
    // 1. Check Execution Opportunity [E]
    if (input.state.actionPressed) {
      if (this.tryTriggerExecution()) return;
    }

    // 2. Check Guard / Deflect [Right Mouse]
    if (input.state.guardHeld || bufferedAction === 'guard') {
      this.isGuarding = true;
      this.guardWindowTimer = 0;
      this.transitionTo('GUARD');
      return;
    }

    // 3. Check Attack [Left Mouse]
    if (input.state.attackPressed || bufferedAction === 'attack') {
      // Check if user is starting a charge
      if (input.state.attackHeld && input.state.attackHoldDuration > 0.25) {
        this.transitionTo('HEAVY_CHARGE');
        return;
      }
      this.transitionTo('ATTACK_1');
      return;
    }

    // 4. Check Special Attack [R]
    if ((input.state.specialPressed || bufferedAction === 'special') && this.specialPips >= 1) {
      this.specialPips--;
      this.transitionTo('SPECIAL');
      return;
    }

    // 5. Check Heal Flask [1]
    if (input.state.healPressed && this.healCharges > 0 && this.health < this.maxHealth) {
      this.healCharges--;
      this.health = Math.min(this.maxHealth, this.health + COMBAT_CONFIG.PLAYER_HEAL_AMOUNT);
      AudioEngine.playHeal();
      this.transitionTo('HEAL');
      return;
    }

    // 6. Check Dodge [Space]
    if (input.state.dodgePressed || bufferedAction === 'dodge') {
      this.startDodge(camera, input, particles);
      return;
    }

    // 7. Locomotion Movement (WASD relative to camera look)
    const moveZ = (input.state.forward ? 1 : 0) - (input.state.backward ? 1 : 0);
    const moveX = (input.state.right ? 1 : 0) - (input.state.left ? 1 : 0);

    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      // Camera forward & right vectors
      const camYaw = camera.yaw;
      const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

      this.moveDirection.copy(fwd.multiplyScalar(moveZ).add(right.multiplyScalar(moveX))).normalize();

      const speed = input.state.sprint ? COMBAT_CONFIG.SPRINT_SPEED : COMBAT_CONFIG.RUN_SPEED;
      this.velocity.copy(this.moveDirection).multiplyScalar(speed);
      this.position.addScaledVector(this.velocity, delta);

      // Rotate player towards movement direction or lock-on target
      if (camera.getLockTarget()) {
        const targetPos = camera.getLockTarget()!.position;
        const dir = targetPos.clone().sub(this.position).setY(0).normalize();
        this.facingAngle = Math.atan2(dir.x, dir.z);
      } else {
        this.facingAngle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      }

      this.rig.root.rotation.y = this.facingAngle;

      const anim = input.state.sprint ? 'sprint' : 'run';
      this.animator.setState(anim);
      this.state = input.state.sprint ? 'SPRINT' : 'MOVE';
    } else {
      this.velocity.set(0, 0, 0);

      // If locked on, face target even while idle
      if (camera.getLockTarget()) {
        const targetPos = camera.getLockTarget()!.position;
        const dir = targetPos.clone().sub(this.position).setY(0).normalize();
        this.facingAngle = Math.atan2(dir.x, dir.z);
        this.rig.root.rotation.y = this.facingAngle;
      }

      this.animator.setState('idle');
      this.state = 'IDLE';
    }
  }

  private startDodge(camera: CombatCamera, input: InputManager, particles: ParticleSystem): void {
    const moveZ = (input.state.forward ? 1 : 0) - (input.state.backward ? 1 : 0);
    const moveX = (input.state.right ? 1 : 0) - (input.state.left ? 1 : 0);

    const camYaw = camera.yaw;
    const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

    if (moveX !== 0 || moveZ !== 0) {
      this.dodgeDirection.copy(fwd.multiplyScalar(moveZ).add(right.multiplyScalar(moveX))).normalize();
    } else {
      // Neutral backward dodge
      this.dodgeDirection.copy(fwd.negate()).normalize();
    }

    this.isDodging = true;
    this.dodgeIFrameTimer = 0.25; // 250ms i-frames
    AudioEngine.playDodge();
    particles.spawnDodgeDust(this.position, this.dodgeDirection);

    this.facingAngle = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z);
    this.rig.root.rotation.y = this.facingAngle;

    this.transitionTo('DODGE');
  }

  private handleDodgeState(delta: number): void {
    const progress = Math.min(1.0, this.stateTimer / 0.4);
    const speed = COMBAT_CONFIG.DODGE_SPEED * (1.0 - progress * 0.7);

    this.position.addScaledVector(this.dodgeDirection, speed * delta);

    if (this.stateTimer >= 0.4) {
      this.isDodging = false;
      this.transitionTo('IDLE');
    }
  }

  private handleGuardState(delta: number, input: InputManager, camera: CombatCamera, bufferedAction: string | null): void {
    // Face lock target if present
    if (camera.getLockTarget()) {
      const dir = camera.getLockTarget()!.position.clone().sub(this.position).setY(0).normalize();
      this.facingAngle = Math.atan2(dir.x, dir.z);
      this.rig.root.rotation.y = this.facingAngle;
    }

    // Cancel guard into attack or dodge
    if (input.state.attackPressed || bufferedAction === 'attack') {
      this.isGuarding = false;
      this.transitionTo('ATTACK_1');
      return;
    }
    if (input.state.dodgePressed || bufferedAction === 'dodge') {
      this.isGuarding = false;
      this.startDodge(camera, input, null as any);
      return;
    }

    if (!input.state.guardHeld) {
      this.isGuarding = false;
      this.transitionTo('IDLE');
    }
  }

  private handleAttackCombo(
    delta: number,
    input: InputManager,
    nextComboState: PlayerCombatState | null,
    duration: number,
    activeStart: number,
    activeEnd: number,
    damage: number,
    postureDmg: number,
    enemies: Combatant[],
    combatEngine: CombatEngine,
    bufferedAction: string | null
  ): void {
    // Minor forward step during attack
    if (this.stateTimer < activeStart) {
      const stepDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
      this.position.addScaledVector(stepDir, 1.8 * delta);
    }

    // Active Window
    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (!this.isAttackActiveWindow) {
        this.isAttackActiveWindow = true;
        this.hasHitCurrentSwing = false;
        this.swordTrail.setActive(true);
        AudioEngine.playSwordSwing(1.1);
      }

      // Check hit collision
      if (!this.hasHitCurrentSwing) {
        this.checkWeaponHits(damage, postureDmg, 'normal', enemies, combatEngine);
      }
    } else {
      if (this.isAttackActiveWindow) {
        this.isAttackActiveWindow = false;
        this.swordTrail.setActive(false);
      }
    }

    // Combo chaining window (near end of swing)
    if (this.stateTimer > activeEnd * 0.9 && nextComboState) {
      if (input.state.attackPressed || bufferedAction === 'attack') {
        this.transitionTo(nextComboState);
        return;
      }
    }

    // Allow cancel into dodge
    if (this.stateTimer > activeEnd && (input.state.dodgePressed || bufferedAction === 'dodge')) {
      this.transitionTo('IDLE');
      return;
    }

    if (this.stateTimer >= duration) {
      this.transitionTo('IDLE');
    }
  }

  private handleHeavyCharge(delta: number, input: InputManager, camera: CombatCamera): void {
    if (!input.state.attackHeld) {
      // Release charged heavy strike!
      this.transitionTo('HEAVY_STRIKE');
    }
  }

  private handleHeavyStrike(delta: number, enemies: Combatant[], combatEngine: CombatEngine): void {
    const activeStart = 0.16;
    const activeEnd = 0.38;
    const duration = 0.52;

    if (this.stateTimer < activeStart) {
      const stepDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
      this.position.addScaledVector(stepDir, 4.5 * delta);
    }

    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (!this.isAttackActiveWindow) {
        this.isAttackActiveWindow = true;
        this.hasHitCurrentSwing = false;
        this.swordTrail.setActive(true);
        this.swordTrail.setColor(0xff922b, 0.85);
        AudioEngine.playSwordSwing(1.3);
      }

      if (!this.hasHitCurrentSwing) {
        this.checkWeaponHits(COMBAT_CONFIG.HEAVY_ATTACK_DAMAGE, COMBAT_CONFIG.HEAVY_ATTACK_POSTURE, 'heavy', enemies, combatEngine);
      }
    } else {
      if (this.isAttackActiveWindow) {
        this.isAttackActiveWindow = false;
        this.swordTrail.setActive(false);
        this.swordTrail.setColor(0x4dabf7, 0.65);
      }
    }

    if (this.stateTimer >= duration) {
      this.transitionTo('IDLE');
    }
  }

  private handleSpecialAttack(delta: number, enemies: Combatant[], combatEngine: CombatEngine): void {
    const duration = 0.85;

    if (this.stateTimer < 0.1) {
      this.swordTrail.setActive(true);
      this.swordTrail.setColor(0x00e5ff, 0.95);
      AudioEngine.playSpecialAttack();
    }

    // 3 rapid hits during whirlwind
    const hitTimes = [0.22, 0.44, 0.66];
    for (const ht of hitTimes) {
      if (Math.abs(this.stateTimer - ht) < delta * 1.5) {
        this.checkWeaponHits(22, 25, 'special', enemies, combatEngine);
      }
    }

    if (this.stateTimer >= duration) {
      this.swordTrail.setActive(false);
      this.swordTrail.setColor(0x4dabf7, 0.65);
      this.transitionTo('IDLE');
    }
  }

  private handleExecution(delta: number): void {
    if (this.stateTimer >= 1.25) {
      this.isExecuting = false;
      this.executionTarget = null;
      this.transitionTo('IDLE');
    }
  }

  private tryTriggerExecution(): boolean {
    // Find nearby posture-broken enemy
    // Handled in coordination with Game loop
    return false;
  }

  public performExecutionOn(target: Combatant): void {
    this.isExecuting = true;
    this.executionTarget = target;
    target.isExecuting = true;

    // Face each other
    const dir = target.position.clone().sub(this.position).setY(0).normalize();
    this.facingAngle = Math.atan2(dir.x, dir.z);
    this.rig.root.rotation.y = this.facingAngle;

    this.transitionTo('EXECUTION');
    AudioEngine.playExecutionSlash();
  }

  private checkWeaponHits(
    damage: number,
    postureDmg: number,
    attackType: 'normal' | 'heavy' | 'special',
    enemies: Combatant[],
    combatEngine: CombatEngine
  ): void {
    const tip = this.rig.getWeaponTipWorld();
    const base = this.rig.getWeaponBaseWorld();
    const contact = new THREE.Vector3();

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const hurtbox = (enemy as any).hurtbox;
      if (!hurtbox) continue;

      const hit = this.weaponTrace.checkSegmentIntersection(tip, base, hurtbox, contact);
      if (hit) {
        this.hasHitCurrentSwing = true;
        combatEngine.resolveStrike(this, enemy, attackType, damage, postureDmg, contact);

        // Increase special meter on clean hit
        this.addSpecialProgress(COMBAT_CONFIG.PLAYER_SPECIAL_PER_HIT);
        break;
      }
    }
  }

  public addSpecialProgress(amount: number): void {
    if (this.specialPips >= this.maxSpecialPips) return;
    this.specialChargeProgress += amount;
    if (this.specialChargeProgress >= 1.0) {
      this.specialChargeProgress -= 1.0;
      this.specialPips = Math.min(this.maxSpecialPips, this.specialPips + 1);
    }
  }

  public transitionTo(newState: PlayerCombatState): void {
    this.state = newState;
    this.stateTimer = 0;

    let anim: AnimState = 'idle';
    switch (newState) {
      case 'IDLE': anim = 'idle'; break;
      case 'MOVE': anim = 'run'; break;
      case 'SPRINT': anim = 'sprint'; break;
      case 'DODGE': anim = 'dodge'; break;
      case 'GUARD': anim = 'guard'; break;
      case 'DEFLECT_REACT': anim = 'deflect_react'; break;
      case 'ATTACK_1': anim = 'attack1'; break;
      case 'ATTACK_2': anim = 'attack2'; break;
      case 'ATTACK_3': anim = 'attack3'; break;
      case 'HEAVY_CHARGE': anim = 'heavy_charge'; break;
      case 'HEAVY_STRIKE': anim = 'heavy_strike'; break;
      case 'STAGGER': anim = 'stagger'; break;
      case 'POSTURE_BREAK': anim = 'posture_broken'; break;
      case 'EXECUTION': anim = 'execution_attacker'; break;
      case 'SPECIAL': anim = 'special_slash'; break;
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
    this.addSpecialProgress(COMBAT_CONFIG.PLAYER_SPECIAL_PER_DEFLECT);
  }

  public onDeflectedByOpponent(): void {
    this.transitionTo('DEFLECT_REACT');
  }

  public onPostureBreak(): void {
    this.transitionTo('POSTURE_BREAK');
  }
}
