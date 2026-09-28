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
  | 'JUMP'
  | 'JUMP_SLASH'
  | 'HEAD_STOMP'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'HEAVY_CHARGE'
  | 'HEAVY_STRIKE'
  | 'GUARD'
  | 'DEFLECT_REACT'
  | 'DEFLECT_PARRY'
  | 'MIKIRI_COUNTER'
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

  // Locomotion & Physics
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public moveDirection: THREE.Vector3 = new THREE.Vector3();
  public facingAngle: number = 0;
  private dodgeDirection: THREE.Vector3 = new THREE.Vector3();
  public verticalVelocity: number = 0;
  public isAirborne: boolean = false;
  private jumpHorizontalVelocity: THREE.Vector3 = new THREE.Vector3();

  // Attack Tracking
  public isAttackActiveWindow: boolean = false;
  public hasHitCurrentSwing: boolean = false;
  public executionTarget: Combatant | null = null;

  constructor(scene: THREE.Scene) {
    this.rig = new CharacterRig('player');
    scene.add(this.rig.root);

    this.animator = new ProceduralAnimator(this.rig);
    this.swordTrail = new SwordTrail(scene, 18, 0x64b5f6);

    this.hurtbox = {
      center: new THREE.Vector3(),
      radius: 0.6,
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

      case 'JUMP':
        this.handleJumpState(delta, input, camera, enemies, combatEngine, particles, buffered);
        break;

      case 'JUMP_SLASH':
        this.handleJumpSlashState(delta, enemies, combatEngine);
        break;

      case 'HEAD_STOMP':
        this.handleHeadStompState(delta);
        break;

      case 'GUARD':
        this.handleGuardState(delta, input, camera, buffered);
        break;

      case 'ATTACK_1':
        this.handleAttackCombo(
          delta, input, 'ATTACK_2', 0.38, 0.08, 0.28,
          COMBAT_CONFIG.ATTACK_1_DAMAGE, COMBAT_CONFIG.ATTACK_1_POSTURE,
          enemies, combatEngine, buffered, camera
        );
        break;

      case 'ATTACK_2':
        this.handleAttackCombo(
          delta, input, 'ATTACK_3', 0.40, 0.08, 0.28,
          COMBAT_CONFIG.ATTACK_2_DAMAGE, COMBAT_CONFIG.ATTACK_2_POSTURE,
          enemies, combatEngine, buffered, camera
        );
        break;

      case 'ATTACK_3':
        this.handleAttackCombo(
          delta, input, null, 0.50, 0.14, 0.36,
          COMBAT_CONFIG.ATTACK_3_DAMAGE, COMBAT_CONFIG.ATTACK_3_POSTURE,
          enemies, combatEngine, buffered, camera
        );
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

      case 'DEFLECT_PARRY':
        // Allow immediate cancel into riposte counter attack
        if (input.state.attackPressed || buffered === 'attack') {
          this.transitionTo('ATTACK_1');
          return;
        }
        if (this.stateTimer >= 0.28) {
          this.transitionTo(input.state.guardHeld ? 'GUARD' : 'IDLE');
        }
        break;

      case 'MIKIRI_COUNTER':
        // Player holds enemy blade pinned to floor
        if (this.stateTimer >= 0.75) {
          this.transitionTo('IDLE');
        }
        break;

      case 'STAGGER':
        if (this.stateTimer >= 0.38) {
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
    // 1. Guard / Deflect [Right Mouse]
    if (input.state.guardHeld || bufferedAction === 'guard') {
      this.isGuarding = true;
      this.guardWindowTimer = 0;
      this.transitionTo('GUARD');
      return;
    }

    // 2. Attack [Left Mouse]
    if (input.state.attackPressed || bufferedAction === 'attack') {
      if (input.state.attackHeld && input.state.attackHoldDuration > 0.25) {
        this.transitionTo('HEAVY_CHARGE');
        return;
      }
      this.transitionTo('ATTACK_1');
      return;
    }

    // 3. Special Attack [R]
    if ((input.state.specialPressed || bufferedAction === 'special') && this.specialPips >= 1) {
      this.specialPips--;
      this.transitionTo('SPECIAL');
      return;
    }

    // 4. Heal Flask [1]
    if (input.state.healPressed && this.healCharges > 0 && this.health < this.maxHealth) {
      this.healCharges--;
      this.health = Math.min(this.maxHealth, this.health + COMBAT_CONFIG.PLAYER_HEAL_AMOUNT);
      AudioEngine.playHeal();
      this.transitionTo('HEAL');
      return;
    }

    // 5. Dodge [Space]
    if (input.state.dodgePressed || bufferedAction === 'dodge') {
      this.startDodge(camera, input, particles);
      return;
    }

    // 6. Jump [F]
    if (input.state.jumpPressed || bufferedAction === 'jump') {
      this.startJump(camera, input, particles);
      return;
    }

    // 6. WASD Movement
    const moveZ = (input.state.forward ? 1 : 0) - (input.state.backward ? 1 : 0);
    const moveX = (input.state.right ? 1 : 0) - (input.state.left ? 1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      const camYaw = camera.yaw;
      const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
      const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

      this.moveDirection.copy(fwd.multiplyScalar(moveZ).add(right.multiplyScalar(moveX))).normalize();

      const speed = input.state.sprint ? COMBAT_CONFIG.SPRINT_SPEED : COMBAT_CONFIG.RUN_SPEED;
      this.velocity.copy(this.moveDirection).multiplyScalar(speed);
      this.position.addScaledVector(this.velocity, delta);

      // Facing
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
      this.dodgeDirection.copy(fwd.negate()).normalize();
    }

    this.isDodging = true;
    this.dodgeIFrameTimer = 0.25;
    AudioEngine.playDodge();
    particles.spawnDodgeDust(this.position, this.dodgeDirection);

    this.facingAngle = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z);
    this.rig.root.rotation.y = this.facingAngle;

    this.transitionTo('DODGE');
  }

  private handleDodgeState(delta: number): void {
    const progress = Math.min(1.0, this.stateTimer / 0.38);
    const speed = COMBAT_CONFIG.DODGE_SPEED * (1.0 - progress * 0.7);

    this.position.addScaledVector(this.dodgeDirection, speed * delta);

    if (this.stateTimer >= 0.38) {
      this.isDodging = false;
      this.transitionTo('IDLE');
    }
  }

  private startJump(camera: CombatCamera, input: InputManager, particles: ParticleSystem): void {
    const moveZ = (input.state.forward ? 1 : 0) - (input.state.backward ? 1 : 0);
    const moveX = (input.state.right ? 1 : 0) - (input.state.left ? 1 : 0);

    const camYaw = camera.yaw;
    const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

    if (moveX !== 0 || moveZ !== 0) {
      this.jumpHorizontalVelocity.copy(fwd.multiplyScalar(moveZ).add(right.multiplyScalar(moveX))).normalize();
      const speed = input.state.sprint ? COMBAT_CONFIG.SPRINT_SPEED * 0.95 : COMBAT_CONFIG.RUN_SPEED * 0.9;
      this.jumpHorizontalVelocity.multiplyScalar(speed);
      this.facingAngle = Math.atan2(this.jumpHorizontalVelocity.x, this.jumpHorizontalVelocity.z);
      this.rig.root.rotation.y = this.facingAngle;
    } else {
      this.jumpHorizontalVelocity.set(0, 0, 0);
    }

    this.isAirborne = true;
    this.verticalVelocity = 9.2;
    AudioEngine.playWhoosh();
    particles.spawnDodgeDust(this.position, new THREE.Vector3(0, 0, 1));
    this.transitionTo('JUMP');
  }

  private handleJumpState(
    delta: number,
    input: InputManager,
    camera: CombatCamera,
    enemies: Combatant[],
    combatEngine: CombatEngine,
    particles: ParticleSystem,
    bufferedAction: string | null
  ): void {
    // 1. Gravity & vertical integration
    this.verticalVelocity -= 26.0 * delta;
    this.position.y += this.verticalVelocity * delta;

    // 2. Horizontal drift
    this.position.addScaledVector(this.jumpHorizontalVelocity, delta);

    // 3. Animation update
    if (this.verticalVelocity > 0) {
      this.animator.setState('jump_rise');
    } else {
      this.animator.setState('jump_fall');
    }

    // 4. Air Slash cancel
    if (input.state.attackPressed || bufferedAction === 'attack') {
      this.transitionTo('JUMP_SLASH');
      return;
    }

    // 5. Head Stomp counter detection
    const wantsStomp = input.state.jumpPressed || bufferedAction === 'jump' || (this.verticalVelocity < 0 && this.position.y <= 1.8 && this.position.y >= 0.2);
    if (wantsStomp) {
      for (const enemy of enemies) {
        if (enemy.isDead || enemy.isExecuting) continue;
        const horizDist = new THREE.Vector2(this.position.x - enemy.position.x, this.position.z - enemy.position.z).length();
        const isEnemySweeping = (enemy as any).currentAttackType === 'sweep' && (enemy as any).aiState === 'ATTACK';
        if (horizDist < 2.2 && (isEnemySweeping || input.state.jumpPressed || bufferedAction === 'jump')) {
          this.performHeadStomp(enemy, combatEngine, particles, camera);
          return;
        }
      }
    }

    // 6. Touchdown
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.verticalVelocity = 0;
      this.isAirborne = false;
      AudioEngine.playFootstep();
      particles.spawnDodgeDust(this.position, new THREE.Vector3(0, 0, 1));
      this.transitionTo('IDLE');
    }
  }

  private handleJumpSlashState(
    delta: number,
    enemies: Combatant[],
    combatEngine: CombatEngine
  ): void {
    this.verticalVelocity -= 26.0 * delta;
    this.position.y += this.verticalVelocity * delta;
    this.position.addScaledVector(this.jumpHorizontalVelocity, delta * 0.7);

    // Active hit frames
    if (this.stateTimer >= 0.08 && this.stateTimer <= 0.32) {
      if (!this.isAttackActiveWindow) {
        this.isAttackActiveWindow = true;
        this.swordTrail.setActive(true);
        AudioEngine.playSwordSwing();
      }
      this.checkAirHit(enemies, combatEngine);
    } else {
      this.isAttackActiveWindow = false;
    }

    if (this.position.y <= 0) {
      this.position.y = 0;
      this.verticalVelocity = 0;
      this.isAirborne = false;
      this.swordTrail.setActive(false);
      this.transitionTo('IDLE');
    }
  }

  private checkAirHit(enemies: Combatant[], combatEngine: CombatEngine): void {
    if (this.hasHitCurrentSwing) return;
    this.checkWeaponHits(35, 30, 'heavy', enemies, combatEngine);
  }

  public performHeadStomp(
    enemy: Combatant,
    combatEngine: CombatEngine,
    particles: ParticleSystem,
    camera: CombatCamera
  ): void {
    const toEnemy = enemy.position.clone().sub(this.position).setY(0);
    this.facingAngle = Math.atan2(toEnemy.x, toEnemy.z);
    this.rig.root.rotation.y = this.facingAngle;

    this.position.x = enemy.position.x - Math.sin(this.facingAngle) * 0.4;
    this.position.z = enemy.position.z - Math.cos(this.facingAngle) * 0.4;
    this.position.y = 1.6;
    this.verticalVelocity = 7.5;
    this.isAirborne = true;

    combatEngine.triggerSweepHeadStomp(this, enemy, new THREE.Vector3(enemy.position.x, enemy.position.y + 1.7, enemy.position.z));
    this.transitionTo('HEAD_STOMP');
  }

  private handleHeadStompState(delta: number): void {
    this.verticalVelocity -= 24.0 * delta;
    this.position.y += this.verticalVelocity * delta;

    if (this.position.y <= 0) {
      this.position.y = 0;
      this.verticalVelocity = 0;
      this.isAirborne = false;
      this.transitionTo('IDLE');
    }
  }

  private handleGuardState(delta: number, input: InputManager, camera: CombatCamera, bufferedAction: string | null): void {
    if (camera.getLockTarget()) {
      const dir = camera.getLockTarget()!.position.clone().sub(this.position).setY(0).normalize();
      this.facingAngle = Math.atan2(dir.x, dir.z);
      this.rig.root.rotation.y = this.facingAngle;
    }

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
    bufferedAction: string | null,
    camera: CombatCamera
  ): void {
    // 1. Magnetic Lunge: Step smoothly forward during attack startup
    if (this.stateTimer < activeStart) {
      // If locked-on, orient towards target
      if (camera.getLockTarget()) {
        const toTarget = camera.getLockTarget()!.position.clone().sub(this.position).setY(0).normalize();
        this.facingAngle = Math.atan2(toTarget.x, toTarget.z);
        this.rig.root.rotation.y = this.facingAngle;
      }

      const stepDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
      this.position.addScaledVector(stepDir, 4.0 * delta); // Strong forward step into strike
    }

    // 2. Active Strike Window
    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (!this.isAttackActiveWindow) {
        this.isAttackActiveWindow = true;
        this.hasHitCurrentSwing = false;
        this.swordTrail.setActive(true);
        AudioEngine.playSwordSwing(1.2);
      }

      if (!this.hasHitCurrentSwing) {
        this.checkWeaponHits(damage, postureDmg, 'normal', enemies, combatEngine);
      }
    } else {
      if (this.isAttackActiveWindow) {
        this.isAttackActiveWindow = false;
        this.swordTrail.setActive(false);
      }
    }

    // 3. Fluid Combo Chaining
    if (this.stateTimer > activeEnd * 0.85 && nextComboState) {
      if (input.state.attackPressed || bufferedAction === 'attack') {
        this.transitionTo(nextComboState);
        return;
      }
    }

    // Cancel into dodge during recovery
    if (this.stateTimer > activeEnd && (input.state.dodgePressed || bufferedAction === 'dodge')) {
      this.transitionTo('IDLE');
      return;
    }

    if (this.stateTimer >= duration) {
      this.transitionTo('IDLE');
    }
  }

  private handleHeavyCharge(delta: number, input: InputManager, camera: CombatCamera): void {
    if (camera.getLockTarget()) {
      const toTarget = camera.getLockTarget()!.position.clone().sub(this.position).setY(0).normalize();
      this.facingAngle = Math.atan2(toTarget.x, toTarget.z);
      this.rig.root.rotation.y = this.facingAngle;
    }

    if (!input.state.attackHeld) {
      this.transitionTo('HEAVY_STRIKE');
    }
  }

  private handleHeavyStrike(delta: number, enemies: Combatant[], combatEngine: CombatEngine): void {
    const activeStart = 0.12;
    const activeEnd = 0.32;
    const duration = 0.45;

    // Massive supersonic forward surge
    if (this.stateTimer < activeStart) {
      const stepDir = new THREE.Vector3(Math.sin(this.facingAngle), 0, Math.cos(this.facingAngle));
      this.position.addScaledVector(stepDir, 8.5 * delta);
    }

    if (this.stateTimer >= activeStart && this.stateTimer <= activeEnd) {
      if (!this.isAttackActiveWindow) {
        this.isAttackActiveWindow = true;
        this.hasHitCurrentSwing = false;
        this.swordTrail.setActive(true);
        this.swordTrail.setColor(0xff922b, 0.95);
        AudioEngine.playSwordSwing(1.4);
      }

      if (!this.hasHitCurrentSwing) {
        this.checkWeaponHits(COMBAT_CONFIG.HEAVY_ATTACK_DAMAGE, COMBAT_CONFIG.HEAVY_ATTACK_POSTURE, 'heavy', enemies, combatEngine);
      }
    } else {
      if (this.isAttackActiveWindow) {
        this.isAttackActiveWindow = false;
        this.swordTrail.setActive(false);
        this.swordTrail.setColor(0x64b5f6, 0.7);
      }
    }

    if (this.stateTimer >= duration) {
      this.transitionTo('IDLE');
    }
  }

  private handleSpecialAttack(delta: number, enemies: Combatant[], combatEngine: CombatEngine): void {
    const duration = 0.85;

    if (this.stateTimer < 0.08) {
      this.swordTrail.setActive(true);
      this.swordTrail.setColor(0x00e5ff, 0.95);
      AudioEngine.playSpecialAttack();
    }

    // 3 rapid hits during whirlwind
    const hitTimes = [0.18, 0.38, 0.58];
    for (const ht of hitTimes) {
      if (Math.abs(this.stateTimer - ht) < delta * 1.5) {
        this.checkWeaponHits(26, 28, 'special', enemies, combatEngine);
      }
    }

    if (this.stateTimer >= duration) {
      this.swordTrail.setActive(false);
      this.swordTrail.setColor(0x64b5f6, 0.7);
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

  public performExecutionOn(target: Combatant): void {
    this.isExecuting = true;
    this.executionTarget = target;
    target.isExecuting = true;

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

      const hit = this.weaponTrace.checkMeleeHit(
        this.position,
        this.facingAngle,
        tip,
        base,
        hurtbox,
        2.9, // Generous 2.9 unit melee range
        75,  // 75 degree forward cone
        contact
      );

      if (hit) {
        this.hasHitCurrentSwing = true;
        combatEngine.resolveStrike(this, enemy, attackType, damage, postureDmg, contact);
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
      case 'JUMP': anim = this.verticalVelocity > 0 ? 'jump_rise' : 'jump_fall'; break;
      case 'JUMP_SLASH': anim = 'jump_slash'; this.hasHitCurrentSwing = false; break;
      case 'HEAD_STOMP': anim = 'head_stomp'; break;
      case 'GUARD': anim = 'guard'; break;
      case 'DEFLECT_REACT': anim = 'deflect_parry_player'; break;
      case 'DEFLECT_PARRY': anim = 'deflect_parry_player'; break;
      case 'MIKIRI_COUNTER': anim = 'mikiri_stomp'; break;
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

  public onTakeDamage(amount: number, postureAmount: number, isCleanHit: boolean): void {
    if (isCleanHit) {
      this.transitionTo('STAGGER');
    }
  }

  public onDeflectSuccess(): void {
    this.transitionTo('DEFLECT_PARRY');
    this.addSpecialProgress(COMBAT_CONFIG.PLAYER_SPECIAL_PER_DEFLECT);
  }

  public performMikiriCounter(enemy: Combatant, particles: ParticleSystem, camera: CombatCamera): void {
    const toEnemy = enemy.position.clone().sub(this.position).setY(0);
    this.facingAngle = Math.atan2(toEnemy.x, toEnemy.z);
    this.rig.root.rotation.y = this.facingAngle;

    // Surge forward right onto the oncoming blade
    const lungeDist = Math.max(0.5, toEnemy.length() - 1.0);
    const step = toEnemy.clone().normalize().multiplyScalar(lungeDist);
    this.position.add(step);

    this.isDodging = true;
    this.dodgeIFrameTimer = 0.8;
    this.transitionTo('MIKIRI_COUNTER');

    AudioEngine.playThrustCounter();
    camera.addTrauma(COMBAT_CONFIG.SHAKE_HEAVY);
    camera.pulseZoom(3.2, 350);
    particles.spawnCounterImpact(this.position.clone().add(new THREE.Vector3(0, 0.15, 0)));
  }

  public onDeflectedByOpponent(): void {
    this.transitionTo('DEFLECT_REACT');
  }

  public onPostureBreak(): void {
    this.transitionTo('POSTURE_BREAK');
  }
}
