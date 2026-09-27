import * as THREE from 'three';
import { CharacterRig } from './CharacterRig';

export type AnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sprint'
  | 'dodge'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy_charge'
  | 'heavy_strike'
  | 'guard'
  | 'deflect_parry_player'
  | 'deflect_parry_enemy'
  | 'mikiri_stomp'
  | 'mikiri_victim'
  | 'stagger'
  | 'posture_broken'
  | 'thrust'
  | 'sweep'
  | 'execution_attacker'
  | 'execution_victim'
  | 'special_slash'
  | 'dead';

export class ProceduralAnimator {
  private rig: CharacterRig;
  public currentState: AnimState = 'idle';
  public stateTime: number = 0;
  private animSpeed: number = 1.0;

  constructor(rig: CharacterRig) {
    this.rig = rig;
  }

  public setState(state: AnimState, speed: number = 1.0): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.stateTime = 0;
      this.animSpeed = speed;
    }
  }

  public update(delta: number): void {
    this.stateTime += delta * this.animSpeed;
    const t = this.stateTime;

    switch (this.currentState) {
      case 'idle':
        this.animateIdle(t);
        break;
      case 'walk':
        this.animateLocomotion(t, 5.0, 0.45, 0.4, 0.12);
        break;
      case 'run':
        this.animateLocomotion(t, 8.5, 0.8, 0.7, 0.28);
        break;
      case 'sprint':
        this.animateLocomotion(t, 11.5, 1.05, 0.9, 0.42);
        break;
      case 'dodge':
        this.animateDodge(t);
        break;
      case 'guard':
        this.animateGuard(t);
        break;
      case 'deflect_parry_player':
        this.animateDeflectParryPlayer(t);
        break;
      case 'deflect_parry_enemy':
        this.animateDeflectParryEnemy(t);
        break;
      case 'mikiri_stomp':
        this.animateMikiriStomp(t);
        break;
      case 'mikiri_victim':
        this.animateMikiriVictim(t);
        break;
      case 'attack1':
        this.animateAttack1(t);
        break;
      case 'attack2':
        this.animateAttack2(t);
        break;
      case 'attack3':
        this.animateAttack3(t);
        break;
      case 'heavy_charge':
        this.animateHeavyCharge(t);
        break;
      case 'heavy_strike':
        this.animateHeavyStrike(t);
        break;
      case 'thrust':
        this.animateThrust(t);
        break;
      case 'sweep':
        this.animateSweep(t);
        break;
      case 'stagger':
        this.animateStagger(t);
        break;
      case 'posture_broken':
        this.animatePostureBroken(t);
        break;
      case 'execution_attacker':
        this.animateExecutionAttacker(t);
        break;
      case 'execution_victim':
        this.animateExecutionVictim(t);
        break;
      case 'special_slash':
        this.animateSpecial(t);
        break;
      case 'dead':
        this.animateDead(t);
        break;
    }
  }

  private animateIdle(t: number): void {
    const j = this.rig.joints;
    const breath = Math.sin(t * 2.4) * 0.025;

    j.hips.position.y = 0.95 + breath;
    j.spine.rotation.set(0.08, 0.12, 0);
    j.chest.rotation.set(0.06 + breath * 0.5, 0, 0);
    j.head.rotation.set(-0.12, -0.1, 0);

    j.leftShoulder.rotation.set(0.3, 0.25, 0.15);
    j.leftArm.rotation.set(0.35, 0.1, -0.3);
    j.leftForearm.rotation.set(-0.9, 0.2, 0.5);

    j.rightShoulder.rotation.set(0.4, -0.4, -0.1);
    j.rightArm.rotation.set(0.45, -0.2, 0.25);
    j.rightForearm.rotation.set(-1.1, 0, -0.3);

    j.weapon.rotation.set(-0.7, 0.35, 0.4);

    j.leftThigh.rotation.set(-0.15, 0, -0.1);
    j.leftShin.rotation.set(0.3, 0, 0);
    j.rightThigh.rotation.set(0.18, 0, 0.1);
    j.rightShin.rotation.set(0.2, 0, 0);
  }

  private animateLocomotion(t: number, freq: number, legSwing: number, armSwing: number, forwardLean: number): void {
    const j = this.rig.joints;
    const phase = t * freq;
    const sinP = Math.sin(phase);
    const cosP = Math.cos(phase);

    j.hips.position.y = 0.95 + Math.abs(sinP) * 0.08;
    j.spine.rotation.set(forwardLean, 0, -cosP * 0.1);
    j.chest.rotation.set(0.05, cosP * 0.15, 0);
    j.head.rotation.set(-forwardLean * 0.75, -cosP * 0.1, 0);

    j.leftThigh.rotation.set(sinP * legSwing, 0, 0);
    j.leftShin.rotation.set(sinP > 0 ? sinP * legSwing * 1.3 : 0.15, 0, 0);

    j.rightThigh.rotation.set(-sinP * legSwing, 0, 0);
    j.rightShin.rotation.set(-sinP > 0 ? -sinP * legSwing * 1.3 : 0.15, 0, 0);

    j.leftArm.rotation.set(-sinP * armSwing, 0, -0.15);
    j.leftForearm.rotation.set(-0.6 + Math.max(0, -sinP * 0.5), 0, 0);

    j.rightArm.rotation.set(sinP * armSwing * 0.6, -0.3, 0.25);
    j.rightForearm.rotation.set(-0.8, 0, 0);
    j.weapon.rotation.set(-0.6, 0.3, 0.3);
  }

  private animateDodge(t: number): void {
    const j = this.rig.joints;
    const progress = Math.min(1.0, t / 0.38);

    const dip = Math.sin(progress * Math.PI) * 0.4;
    j.hips.position.y = 0.95 - dip;
    j.spine.rotation.set(0.5, Math.sin(progress * Math.PI) * 0.45, 0);
    j.head.rotation.set(-0.3, -Math.sin(progress * Math.PI) * 0.3, 0);

    j.leftThigh.rotation.set(-0.8, 0, -0.4);
    j.leftShin.rotation.set(1.3, 0, 0);
    j.rightThigh.rotation.set(0.5, 0, 0.4);
    j.rightShin.rotation.set(1.0, 0, 0);

    j.rightArm.rotation.set(-0.5, 0.6, 0.4);
    j.weapon.rotation.set(-1.1, 0.7, 0.2);
  }

  private animateGuard(t: number): void {
    const j = this.rig.joints;
    j.hips.position.y = 0.90;
    j.spine.rotation.set(0.12, 0.22, 0);
    j.chest.rotation.set(0.1, 0.25, 0);
    j.head.rotation.set(-0.1, -0.2, 0);

    j.leftShoulder.rotation.set(0.4, 0.4, 0);
    j.leftArm.rotation.set(0.7, 0.5, -0.2);
    j.leftForearm.rotation.set(-1.45, 0.3, 0.6);

    j.rightShoulder.rotation.set(0.3, -0.3, 0);
    j.rightArm.rotation.set(0.7, -0.4, 0.3);
    j.rightForearm.rotation.set(-1.6, -0.3, -0.4);

    j.weapon.rotation.set(0.75, -0.85, 0.8);

    j.leftThigh.rotation.set(-0.35, 0, -0.2);
    j.leftShin.rotation.set(0.5, 0, 0);
    j.rightThigh.rotation.set(0.25, 0, 0.2);
    j.rightShin.rotation.set(0.4, 0, 0);
  }

  /**
   * PLAYER PERFECT DEFLECTION PARRY
   * Sharp, aggressive upward & forward blade sweep locking arms at impact with resonant sparks!
   */
  private animateDeflectParryPlayer(t: number): void {
    const j = this.rig.joints;
    const duration = 0.28;
    const p = Math.min(1.0, t / duration);

    if (p < 0.35) {
      // 1. Violent snap forward to meet the enemy blade
      const sub = p / 0.35;
      j.hips.position.y = 0.92;
      j.spine.rotation.set(0.18, 0.35 * sub, 0);
      j.chest.rotation.set(0.15, 0.4 * sub, 0);
      j.head.rotation.set(-0.15, -0.25 * sub, 0);

      // Two hands driving blade up and out
      j.rightArm.rotation.set(0.8 + 0.4 * sub, -0.3, 0.4);
      j.rightForearm.rotation.set(-1.6 + 0.3 * sub, -0.2, -0.3);
      j.leftArm.rotation.set(0.7 + 0.3 * sub, 0.4, -0.2);
      j.leftForearm.rotation.set(-1.4, 0.2, 0.4);

      // Angled cross-blade deflection position
      j.weapon.rotation.set(0.9 + 0.3 * sub, -0.9, 0.95);
    } else {
      // 2. High-tension recoil holding ground
      const sub = (p - 0.35) / 0.65;
      j.hips.position.y = 0.92;
      j.spine.rotation.set(0.18 - 0.08 * sub, 0.35 - 0.15 * sub, 0);
      j.rightArm.rotation.set(1.2 - 0.4 * sub, -0.3, 0.4);
      j.weapon.rotation.set(1.2 - 0.4 * sub, -0.9, 0.95);
    }
  }

  /**
   * ENEMY ACTIVE GUARD & PARRY CLASH
   * Enemy firmly raises their katana in front of chest, repelling player attacks with steel sparks!
   */
  private animateDeflectParryEnemy(t: number): void {
    const j = this.rig.joints;
    const duration = 0.28;
    const p = Math.min(1.0, t / duration);

    const snap = Math.sin(p * Math.PI);
    j.hips.position.y = 0.91 - snap * 0.04;
    j.spine.rotation.set(0.15, -0.3 * snap, 0);
    j.chest.rotation.set(0.12, -0.35 * snap, 0);

    // Two-handed braced diagonal block
    j.rightArm.rotation.set(0.85, -0.5, 0.35);
    j.rightForearm.rotation.set(-1.6, -0.2, -0.3);
    j.leftArm.rotation.set(0.7, 0.4, -0.2);
    j.leftForearm.rotation.set(-1.4, 0.2, 0.4);

    j.weapon.rotation.set(0.85, -0.75, 0.85);

    j.leftThigh.rotation.set(-0.3, 0, -0.15);
    j.rightThigh.rotation.set(0.2, 0, 0.15);
  }

  /**
   * MIKIRI COUNTER: PLAYER BLADE STOMP
   * The signature Sekiro technique:
   * 1. Explosive forward dash into the enemy thrust.
   * 2. High stomping knee drive slamming lead boot down to pin the weapon flat to the earth!
   * 3. Dominant standing posture staring down the immobilized opponent.
   */
  private animateMikiriStomp(t: number): void {
    const j = this.rig.joints;
    const duration = 0.75;
    const p = Math.min(1.0, t / duration);

    if (p < 0.25) {
      // 1. Surging forward step & raising lead right leg high
      const sub = p / 0.25;
      j.hips.position.y = 0.95 + 0.15 * sub;
      j.spine.rotation.set(0.25 * sub, 0, 0);
      j.head.rotation.set(-0.25 * sub, 0, 0); // Focus gaze down on oncoming blade

      // Right leg lifts high in preparation for devastating stomp
      j.rightThigh.rotation.set(1.4 * sub, 0, 0);
      j.rightShin.rotation.set(1.5 * sub, 0, 0);

      // Support left leg bent
      j.leftThigh.rotation.set(-0.4 * sub, 0, 0);
      j.leftShin.rotation.set(0.6 * sub, 0, 0);

      // Hands ready on katana hilt at waist
      j.rightArm.rotation.set(0.3, -0.5, 0.3);
      j.rightForearm.rotation.set(-1.1, 0, 0);
      j.leftArm.rotation.set(0.3, 0.4, -0.2);
      j.leftForearm.rotation.set(-0.9, 0, 0);
      j.weapon.rotation.set(-0.5, 0.2, 0.3);
    } else if (p < 0.65) {
      // 2. THE STOMP! Lead foot crashes down onto blade, pinning it to the earth!
      const sub = (p - 0.25) / 0.4;
      const easeStomp = 1 - Math.pow(1 - sub, 4);

      j.hips.position.y = 1.10 - 0.28 * easeStomp; // Body drives down
      j.spine.rotation.set(0.35, 0, 0);
      j.head.rotation.set(-0.3, 0, 0);

      // Right foot planted firmly forward on the spear/katana
      j.rightThigh.rotation.set(1.4 - 1.8 * easeStomp, 0, 0.1);
      j.rightShin.rotation.set(1.5 - 1.3 * easeStomp, 0, 0);

      j.leftThigh.rotation.set(-0.5, 0, -0.15);
      j.leftShin.rotation.set(0.8, 0, 0);

      // Weapon poised ready for counter
      j.rightArm.rotation.set(0.5, -0.3, 0.2);
      j.weapon.rotation.set(-0.3, 0.1, 0.2);
    } else {
      // 3. Lingering dominant stance before releasing
      const sub = (p - 0.65) / 0.35;
      j.hips.position.y = 0.82 + 0.13 * sub;
      j.spine.rotation.set(0.35 - 0.25 * sub, 0, 0);
    }
  }

  /**
   * MIKIRI COUNTER: ENEMY THRUST VICTIM
   * Enemy's thrust is brutally stomped to the floor; pulled forward off-balance and pinned!
   */
  private animateMikiriVictim(t: number): void {
    const j = this.rig.joints;
    const duration = 0.75;
    const p = Math.min(1.0, t / duration);

    if (p < 0.25) {
      // Thrust is suddenly intercepted and slammed down
      const sub = p / 0.25;
      j.hips.position.y = 0.95 - 0.22 * sub;
      j.spine.rotation.set(0.2 + 0.45 * sub, 0, 0);
      j.head.rotation.set(0.4 * sub, 0, 0);

      // Arms wrenched down towards floor
      j.rightArm.rotation.set(0.8 + 0.5 * sub, 0, 0);
      j.rightForearm.rotation.set(0.4 * sub, 0, 0);
      j.weapon.rotation.set(-1.4 * sub, 0, 0); // Weapon pointed down into floor
    } else if (p < 0.7) {
      // Pinned and helpless
      j.hips.position.y = 0.73;
      j.spine.rotation.set(0.65, 0, 0);
      j.head.rotation.set(0.45, 0, 0);

      j.rightArm.rotation.set(1.3, 0, 0);
      j.weapon.rotation.set(-1.45, 0, 0);

      j.leftThigh.rotation.set(-0.6, 0, 0);
      j.leftShin.rotation.set(0.9, 0, 0);
      j.rightThigh.rotation.set(0.4, 0, 0);
      j.rightShin.rotation.set(0.5, 0, 0);
    } else {
      // Staggering back out of pin
      const sub = (p - 0.7) / 0.3;
      j.hips.position.y = 0.73 + 0.2 * sub;
      j.spine.rotation.set(0.65 - 0.4 * sub, 0, 0);
      j.weapon.rotation.set(-1.45 + 0.8 * sub, 0, 0);
    }
  }

  /**
   * ATTACK 1: Ichimonji Cleave
   */
  private animateAttack1(t: number): void {
    const j = this.rig.joints;
    const duration = 0.38;
    const p = Math.min(1.0, t / duration);

    if (p < 0.25) {
      const sub = p / 0.25;
      j.hips.position.y = 0.95 - 0.08 * sub;
      j.spine.rotation.set(0.1, -0.85 * sub, 0);
      j.chest.rotation.set(0.08, -0.95 * sub, 0);
      j.head.rotation.set(-0.1, 0.6 * sub, 0);

      j.rightArm.rotation.set(0.4 * sub, -1.1 * sub, 0.8 * sub);
      j.rightForearm.rotation.set(-1.3 * sub, 0, 0);
      j.weapon.rotation.set(-0.5 * sub, -0.7 * sub, 1.1 * sub);

      j.leftArm.rotation.set(0.2, 0.4 * sub, -0.3);
      j.leftForearm.rotation.set(-0.6, 0, 0);

      j.rightThigh.rotation.set(0.3 * sub, 0, 0.2 * sub);
      j.leftThigh.rotation.set(-0.3 * sub, 0, -0.1);
    } else if (p < 0.65) {
      const sub = (p - 0.25) / 0.4;
      const easeCut = 1 - Math.pow(1 - sub, 3);

      j.hips.position.y = 0.87 - 0.06 * Math.sin(sub * Math.PI);
      j.spine.rotation.set(0.15, -0.85 + 1.8 * easeCut, 0);
      j.chest.rotation.set(0.12, -0.95 + 2.0 * easeCut, 0);
      j.head.rotation.set(-0.1, 0.6 - 1.2 * easeCut, 0);

      j.rightArm.rotation.set(0.4 - 0.3 * easeCut, -1.1 + 2.2 * easeCut, 0.8 - 1.2 * easeCut);
      j.rightForearm.rotation.set(-1.3 + 0.8 * easeCut, 0.6 * easeCut, -0.4 * easeCut);
      j.weapon.rotation.set(-0.4, -0.7 + 2.4 * easeCut, 0.3);

      j.leftArm.rotation.set(0.2 - 0.5 * easeCut, -0.6 * easeCut, -0.5);
      j.leftForearm.rotation.set(-0.6 - 0.4 * easeCut, 0, 0);

      j.leftThigh.rotation.set(-0.3 + 0.5 * easeCut, 0, 0);
      j.rightThigh.rotation.set(0.3 - 0.5 * easeCut, 0, 0);
    } else {
      const sub = (p - 0.65) / 0.35;
      j.hips.position.y = 0.87 + 0.08 * sub;
      j.spine.rotation.set(0.15 - 0.07 * sub, 0.95 - 0.5 * sub, 0);
      j.chest.rotation.set(0.12 - 0.06 * sub, 1.05 - 0.6 * sub, 0);
      j.rightArm.rotation.set(0.1 + 0.2 * sub, 1.1 - 0.5 * sub, -0.4 + 0.3 * sub);
    }
  }

  /**
   * ATTACK 2: Rising Dragon Diagonal Cleave
   */
  private animateAttack2(t: number): void {
    const j = this.rig.joints;
    const duration = 0.40;
    const p = Math.min(1.0, t / duration);

    if (p < 0.22) {
      const sub = p / 0.22;
      j.hips.position.y = 0.95 - 0.1 * sub;
      j.spine.rotation.set(0.25 * sub, 0.75 * sub, 0);
      j.chest.rotation.set(0.2 * sub, 0.85 * sub, 0);

      j.rightArm.rotation.set(-0.4 * sub, 0.9 * sub, -0.5 * sub);
      j.rightForearm.rotation.set(-1.1 * sub, 0, 0);
      j.weapon.rotation.set(-1.0 * sub, 0.6 * sub, -0.6 * sub);
    } else if (p < 0.65) {
      const sub = (p - 0.22) / 0.43;
      const easeCut = 1 - Math.pow(1 - sub, 3);

      j.hips.position.y = 0.85 + 0.12 * easeCut;
      j.spine.rotation.set(0.25 - 0.4 * easeCut, 0.75 - 1.6 * easeCut, 0);
      j.chest.rotation.set(0.2 - 0.45 * easeCut, 0.85 - 1.8 * easeCut, 0);

      j.rightArm.rotation.set(-0.4 + 1.8 * easeCut, 0.9 - 1.6 * easeCut, -0.5 + 1.1 * easeCut);
      j.rightForearm.rotation.set(-1.1 + 0.6 * easeCut, 0, 0);
      j.weapon.rotation.set(-1.0 + 2.2 * easeCut, 0.6 - 1.4 * easeCut, 0.7);
    } else {
      const sub = (p - 0.65) / 0.35;
      j.spine.rotation.set(-0.15 + 0.15 * sub, -0.85 + 0.5 * sub, 0);
    }
  }

  /**
   * ATTACK 3: Overhead Execution Cleave
   */
  private animateAttack3(t: number): void {
    const j = this.rig.joints;
    const duration = 0.50;
    const p = Math.min(1.0, t / duration);

    if (p < 0.28) {
      const sub = p / 0.28;
      j.hips.position.y = 0.95 + 0.12 * sub;
      j.spine.rotation.set(-0.35 * sub, 0, 0);
      j.chest.rotation.set(-0.4 * sub, 0, 0);

      j.leftArm.rotation.set(1.6 * sub, 0.2 * sub, -0.2);
      j.rightArm.rotation.set(1.7 * sub, -0.2 * sub, 0.2);
      j.rightForearm.rotation.set(-0.6 * sub, 0, 0);
      j.weapon.rotation.set(1.5 * sub, 0, 0);
    } else if (p < 0.62) {
      const sub = (p - 0.28) / 0.34;
      const easeCut = 1 - Math.pow(1 - sub, 3);

      j.hips.position.y = 1.07 - 0.32 * easeCut;
      j.spine.rotation.set(-0.35 + 0.85 * easeCut, 0, 0);
      j.chest.rotation.set(-0.4 + 0.95 * easeCut, 0, 0);

      j.leftArm.rotation.set(1.6 - 2.0 * easeCut, 0.2, 0);
      j.rightArm.rotation.set(1.7 - 2.2 * easeCut, -0.2, 0);
      j.rightForearm.rotation.set(-0.6 - 0.8 * easeCut, 0, 0);
      j.weapon.rotation.set(1.5 - 3.2 * easeCut, 0, 0);

      j.leftThigh.rotation.set(-0.6 * easeCut, 0, 0);
      j.leftShin.rotation.set(1.1 * easeCut, 0, 0);
    } else {
      const sub = (p - 0.62) / 0.38;
      j.hips.position.y = 0.75 + 0.2 * sub;
      j.spine.rotation.set(0.5 - 0.42 * sub, 0, 0);
      j.weapon.rotation.set(-1.7 + 1.0 * sub, 0, 0);
    }
  }

  private animateHeavyCharge(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 0.8);
    const shake = Math.sin(t * 35) * 0.03 * p;

    j.hips.position.y = 0.80;
    j.spine.rotation.set(0.35, -0.85, 0);
    j.head.rotation.set(-0.25, 0.75, 0);

    j.rightArm.rotation.set(0.4 + shake, -1.0, 0.8);
    j.rightForearm.rotation.set(-1.3, 0, 0);
    j.weapon.rotation.set(-0.6, -0.9, 1.2);

    j.leftThigh.rotation.set(-0.5, 0, -0.2);
    j.leftShin.rotation.set(0.9, 0, 0);
    j.rightThigh.rotation.set(0.6, 0, 0.2);
    j.rightShin.rotation.set(0.7, 0, 0);
  }

  private animateHeavyStrike(t: number): void {
    const j = this.rig.joints;
    const duration = 0.45;
    const p = Math.min(1.0, t / duration);

    const lunge = Math.sin(p * Math.PI * 0.85);
    j.hips.position.y = 0.82 + lunge * 0.12;
    j.spine.rotation.set(0.25, -0.85 + 1.8 * p, 0);
    j.chest.rotation.set(0.2, -0.95 + 2.0 * p, 0);

    j.rightArm.rotation.set(0.4, -1.0 + 2.2 * p, 0.4);
    j.weapon.rotation.set(-0.6, -0.9 + 2.6 * p, 0.3);
  }

  private animateThrust(t: number): void {
    const j = this.rig.joints;
    const duration = 0.58;
    const p = Math.min(1.0, t / duration);

    if (p < 0.32) {
      const sub = p / 0.32;
      j.spine.rotation.set(0.15, -0.4 * sub, 0);
      j.rightArm.rotation.set(0.5 * sub, -0.8 * sub, 0);
      j.weapon.rotation.set(0, 0, 0);
    } else if (p < 0.65) {
      const sub = (p - 0.32) / 0.33;
      j.spine.rotation.set(0.3, 0.3 * sub, 0);
      j.rightArm.rotation.set(0.9, 0, 0);
      j.rightForearm.rotation.set(0, 0, 0);
      j.weapon.rotation.set(0.05, 0, 0);
    } else {
      const sub = (p - 0.65) / 0.35;
      j.rightArm.rotation.set(0.9 - 0.5 * sub, 0, 0);
    }
  }

  private animateSweep(t: number): void {
    const j = this.rig.joints;
    const duration = 0.65;
    const p = Math.min(1.0, t / duration);

    j.hips.position.y = 0.72;
    j.spine.rotation.set(0.4, p * Math.PI * 2, 0);
    j.rightArm.rotation.set(0.15, 0, 0);
    j.weapon.rotation.set(-1.0, 0, 0);
  }

  private animateStagger(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 0.38);
    const snap = Math.sin(p * Math.PI);

    j.hips.position.y = 0.92 - snap * 0.08;
    j.spine.rotation.set(-0.45 * snap, snap * 0.25, 0);
    j.head.rotation.set(-0.5 * snap, 0, 0);

    j.leftArm.rotation.set(-0.5 * snap, 0, -0.4);
    j.rightArm.rotation.set(-0.6 * snap, -0.4, 0.5);
  }

  private animatePostureBroken(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 0.45);
    const pant = Math.sin(t * 4.5) * 0.06;

    j.hips.position.y = 0.62 - (1.0 - p) * 0.3;
    j.spine.rotation.set(0.5 + pant, 0, 0);
    j.head.rotation.set(0.35, 0, 0);

    j.leftThigh.rotation.set(-1.3, 0, 0);
    j.leftShin.rotation.set(1.5, 0, 0);
    j.rightThigh.rotation.set(0.7, 0, 0.25);
    j.rightShin.rotation.set(1.6, 0, 0);

    j.rightArm.rotation.set(0.25, 0, 0);
    j.weapon.rotation.set(-1.0, 0, 0);
  }

  private animateExecutionAttacker(t: number): void {
    const j = this.rig.joints;
    const duration = 1.2;
    const p = Math.min(1.0, t / duration);

    if (p < 0.32) {
      const sub = p / 0.32;
      j.hips.position.y = 0.95;
      j.spine.rotation.set(0.2, 0, 0);
      j.rightArm.rotation.set(1.5 * sub, -0.2, 0.2);
      j.weapon.rotation.set(1.3 * sub, 0, 0);
    } else if (p < 0.62) {
      const sub = (p - 0.32) / 0.3;
      j.hips.position.y = 0.95 - 0.25 * sub;
      j.spine.rotation.set(0.5, 0, 0);
      j.rightArm.rotation.set(1.5 - 1.8 * sub, 0, 0);
      j.weapon.rotation.set(1.3 - 2.5 * sub, 0, 0);
    } else {
      j.hips.position.y = 0.95;
      j.spine.rotation.set(0.1, 0, 0);
    }
  }

  private animateExecutionVictim(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 1.2);

    if (p < 0.35) {
      this.animatePostureBroken(t);
    } else {
      const sub = (p - 0.35) / 0.65;
      j.hips.position.y = 0.25 - sub * 0.15;
      j.spine.rotation.set(0.9 + sub * 0.4, 0, 0);
      j.head.rotation.set(0.6, 0, 0);
    }
  }

  private animateSpecial(t: number): void {
    const j = this.rig.joints;
    const duration = 0.85;
    const p = Math.min(1.0, t / duration);

    const spin = p * Math.PI * 4;
    j.hips.position.y = 0.95 + Math.sin(p * Math.PI) * 0.3;
    j.spine.rotation.set(0.12, spin, 0);
    j.rightArm.rotation.set(0.7, 0, 0.5);
    j.weapon.rotation.set(-0.25, 0.85, 0.6);
  }

  private animateDead(t: number): void {
    const j = this.rig.joints;
    j.hips.position.y = 0.12;
    j.spine.rotation.set(Math.PI / 2, 0, 0);
    j.head.rotation.set(0, 0, 0);
    j.leftThigh.rotation.set(0, 0, 0);
    j.leftShin.rotation.set(0, 0, 0);
    j.rightThigh.rotation.set(0, 0, 0);
    j.rightShin.rotation.set(0, 0, 0);
  }
}
