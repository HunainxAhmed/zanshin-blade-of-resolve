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
  | 'deflect_react'
  | 'stagger'
  | 'posture_broken'
  | 'thrust'
  | 'sweep'
  | 'counter_react'
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
    const j = this.rig.joints;

    switch (this.currentState) {
      case 'idle':
        this.animateIdle(t);
        break;
      case 'walk':
        this.animateLocomotion(t, 4.5, 0.4, 0.35);
        break;
      case 'run':
        this.animateLocomotion(t, 7.5, 0.65, 0.55);
        break;
      case 'sprint':
        this.animateLocomotion(t, 10.5, 0.9, 0.75, 0.35);
        break;
      case 'dodge':
        this.animateDodge(t);
        break;
      case 'guard':
        this.animateGuard(t);
        break;
      case 'deflect_react':
        this.animateDeflectReact(t);
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
      case 'counter_react':
        this.animateCounterReact(t);
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
    const breath = Math.sin(t * 2.2) * 0.03;

    j.hips.position.y = 0.95 + breath;
    j.spine.rotation.set(0.05, 0, 0);
    j.chest.rotation.set(0.04 + breath * 0.5, 0, 0);
    j.head.rotation.set(-0.08, 0, 0);

    // Martial ready stance
    j.leftShoulder.rotation.set(0.3, 0.2, 0.1);
    j.leftArm.rotation.set(0.2, 0, -0.2);
    j.leftForearm.rotation.set(-0.7, 0, 0.4);

    j.rightShoulder.rotation.set(0.3, -0.4, -0.1);
    j.rightArm.rotation.set(0.4, -0.2, 0.2);
    j.rightForearm.rotation.set(-0.9, 0, -0.3);

    // Sword resting stance ready to draw or parry
    j.weapon.rotation.set(-0.6, 0.2, 0.4);

    // Legs slightly bent
    j.leftThigh.rotation.set(-0.1, 0, -0.05);
    j.leftShin.rotation.set(0.2, 0, 0);
    j.rightThigh.rotation.set(0.1, 0, 0.05);
    j.rightShin.rotation.set(0.15, 0, 0);
  }

  private animateLocomotion(t: number, freq: number, legSwing: number, armSwing: number, forwardLean: number = 0.18): void {
    const j = this.rig.joints;
    const phase = t * freq;
    const sinP = Math.sin(phase);
    const cosP = Math.cos(phase);

    j.hips.position.y = 0.95 + Math.abs(sinP) * 0.06;
    j.spine.rotation.set(forwardLean, 0, -cosP * 0.08);
    j.chest.rotation.set(0.05, cosP * 0.12, 0);
    j.head.rotation.set(-forwardLean * 0.7, -cosP * 0.08, 0);

    // Legs
    j.leftThigh.rotation.set(sinP * legSwing, 0, 0);
    j.leftShin.rotation.set(sinP > 0 ? sinP * legSwing * 1.2 : 0.1, 0, 0);

    j.rightThigh.rotation.set(-sinP * legSwing, 0, 0);
    j.rightShin.rotation.set(-sinP > 0 ? -sinP * legSwing * 1.2 : 0.1, 0, 0);

    // Arms
    j.leftArm.rotation.set(-sinP * armSwing, 0, -0.1);
    j.leftForearm.rotation.set(-0.5 + Math.max(0, -sinP * 0.4), 0, 0);

    j.rightArm.rotation.set(sinP * armSwing * 0.6, -0.2, 0.2);
    j.rightForearm.rotation.set(-0.6, 0, 0);
    j.weapon.rotation.set(-0.4, 0.3, 0.2);
  }

  private animateDodge(t: number): void {
    const j = this.rig.joints;
    const progress = Math.min(1.0, t / 0.4);

    // Low agile quick-step slide
    const dip = Math.sin(progress * Math.PI) * 0.35;
    j.hips.position.y = 0.95 - dip;
    j.spine.rotation.set(0.4, Math.sin(progress * Math.PI) * 0.3, 0);

    j.leftThigh.rotation.set(-0.6, 0, -0.3);
    j.leftShin.rotation.set(1.1, 0, 0);
    j.rightThigh.rotation.set(0.4, 0, 0.3);
    j.rightShin.rotation.set(0.8, 0, 0);

    j.rightArm.rotation.set(-0.4, 0.5, 0.3);
    j.weapon.rotation.set(-0.9, 0.6, 0.2);
  }

  private animateGuard(t: number): void {
    const j = this.rig.joints;
    // Two-handed raised katana guard across chest
    j.hips.position.y = 0.92;
    j.spine.rotation.set(0.1, 0.15, 0);
    j.chest.rotation.set(0.08, 0.2, 0);

    j.leftArm.rotation.set(0.7, 0.5, -0.2);
    j.leftForearm.rotation.set(-1.4, 0.2, 0.5);

    j.rightArm.rotation.set(0.6, -0.4, 0.3);
    j.rightForearm.rotation.set(-1.5, -0.3, -0.4);

    // Blade angled diagonally across chest
    j.weapon.rotation.set(0.6, -0.8, 0.7);

    // Firm rooted stance
    j.leftThigh.rotation.set(-0.25, 0, -0.15);
    j.leftShin.rotation.set(0.4, 0, 0);
    j.rightThigh.rotation.set(0.2, 0, 0.15);
    j.rightShin.rotation.set(0.3, 0, 0);
  }

  private animateDeflectReact(t: number): void {
    const j = this.rig.joints;
    const progress = Math.min(1.0, t / 0.22);
    const snap = Math.sin(progress * Math.PI);

    // Sharp weapon clash recoil
    j.hips.position.y = 0.93 + snap * 0.04;
    j.spine.rotation.set(-snap * 0.2, snap * 0.15, 0);
    j.chest.rotation.set(-snap * 0.25, snap * 0.2, 0);

    j.rightArm.rotation.set(0.8 - snap * 0.3, -0.4, 0.3);
    j.rightForearm.rotation.set(-1.6 + snap * 0.4, -0.3, -0.4);
    j.weapon.rotation.set(0.8 - snap * 0.4, -0.7, 0.8 + snap * 0.3);
  }

  /**
   * Attack 1: Horizontal Slash (Right to Left)
   */
  private animateAttack1(t: number): void {
    const j = this.rig.joints;
    const duration = 0.42;
    const p = Math.min(1.0, t / duration);

    if (p < 0.25) {
      // Wind up
      const sub = p / 0.25;
      j.spine.rotation.set(0.05, -0.6 * sub, 0);
      j.rightArm.rotation.set(0.2, -0.8 * sub, 0.6 * sub);
      j.rightForearm.rotation.set(-1.1, 0, 0);
      j.weapon.rotation.set(-0.3, -0.5 * sub, 0.8 * sub);
    } else if (p < 0.65) {
      // Powerful horizontal swing
      const sub = (p - 0.25) / 0.4;
      j.spine.rotation.set(0.1, -0.6 + 1.2 * sub, 0);
      j.rightArm.rotation.set(0.1, -0.8 + 1.4 * sub, 0.3 - 0.5 * sub);
      j.rightForearm.rotation.set(-0.6, 0.5 * sub, -0.3 * sub);
      j.weapon.rotation.set(-0.2, -0.5 + 1.6 * sub, 0.2);
    } else {
      // Recovery
      const sub = (p - 0.65) / 0.35;
      j.spine.rotation.set(0.1 - 0.05 * sub, 0.6 - 0.4 * sub, 0);
      j.rightArm.rotation.set(0.1 + 0.1 * sub, 0.6 - 0.3 * sub, -0.2);
    }
  }

  /**
   * Attack 2: Diagonal Rising Slash (Left to Right)
   */
  private animateAttack2(t: number): void {
    const j = this.rig.joints;
    const duration = 0.44;
    const p = Math.min(1.0, t / duration);

    if (p < 0.22) {
      // Low left coil
      const sub = p / 0.22;
      j.spine.rotation.set(0.2 * sub, 0.5 * sub, 0);
      j.rightArm.rotation.set(-0.3 * sub, 0.7 * sub, -0.3 * sub);
      j.weapon.rotation.set(-0.8 * sub, 0.4 * sub, -0.4 * sub);
    } else if (p < 0.65) {
      // Rising diagonal cleave
      const sub = (p - 0.22) / 0.43;
      j.spine.rotation.set(0.2 - 0.3 * sub, 0.5 - 1.1 * sub, 0);
      j.rightArm.rotation.set(-0.3 + 1.4 * sub, 0.7 - 1.2 * sub, 0.5 * sub);
      j.weapon.rotation.set(-0.8 + 1.6 * sub, 0.4 - 1.0 * sub, 0.6 * sub);
    } else {
      // Recovery
      const sub = (p - 0.65) / 0.35;
      j.spine.rotation.set(-0.1 + 0.1 * sub, -0.6 + 0.4 * sub, 0);
    }
  }

  /**
   * Attack 3: Overhead Cleave Finisher
   */
  private animateAttack3(t: number): void {
    const j = this.rig.joints;
    const duration = 0.55;
    const p = Math.min(1.0, t / duration);

    if (p < 0.3) {
      // Raise high above head
      const sub = p / 0.3;
      j.hips.position.y = 0.95 + 0.08 * sub;
      j.spine.rotation.set(-0.25 * sub, 0, 0);
      j.rightArm.rotation.set(1.5 * sub, 0, 0.2 * sub);
      j.rightForearm.rotation.set(-0.4 * sub, 0, 0);
      j.weapon.rotation.set(1.2 * sub, 0, 0);
    } else if (p < 0.65) {
      // Brutal downward slam
      const sub = (p - 0.3) / 0.35;
      j.hips.position.y = 1.03 - 0.22 * sub;
      j.spine.rotation.set(-0.25 + 0.65 * sub, 0, 0);
      j.rightArm.rotation.set(1.5 - 1.8 * sub, 0, 0);
      j.rightForearm.rotation.set(-0.4 - 0.6 * sub, 0, 0);
      j.weapon.rotation.set(1.2 - 2.4 * sub, 0, 0);
    } else {
      // Impact follow-through
      const sub = (p - 0.65) / 0.35;
      j.hips.position.y = 0.81 + 0.14 * sub;
      j.spine.rotation.set(0.4 - 0.35 * sub, 0, 0);
    }
  }

  private animateHeavyCharge(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 1.0);
    const shake = Math.sin(t * 30) * 0.02 * p;

    // Deep crouched coil
    j.hips.position.y = 0.82;
    j.spine.rotation.set(0.3, -0.7, 0);
    j.head.rotation.set(-0.2, 0.6, 0);

    j.rightArm.rotation.set(0.3 + shake, -0.9, 0.7);
    j.rightForearm.rotation.set(-1.2, 0, 0);
    j.weapon.rotation.set(-0.5, -0.8, 1.0);

    j.leftThigh.rotation.set(-0.4, 0, -0.2);
    j.leftShin.rotation.set(0.8, 0, 0);
    j.rightThigh.rotation.set(0.5, 0, 0.2);
    j.rightShin.rotation.set(0.6, 0, 0);
  }

  private animateHeavyStrike(t: number): void {
    const j = this.rig.joints;
    const duration = 0.48;
    const p = Math.min(1.0, t / duration);

    // Explosive forward step and heavy rotational strike
    const lunge = Math.sin(p * Math.PI * 0.8);
    j.hips.position.y = 0.85 + lunge * 0.1;
    j.spine.rotation.set(0.2, -0.7 + 1.4 * p, 0);

    j.rightArm.rotation.set(0.3, -0.9 + 1.8 * p, 0.3);
    j.weapon.rotation.set(-0.5, -0.8 + 2.2 * p, 0.2);
  }

  /**
   * Thrust Attack (For Spear / Boss / Swordsman thrusts)
   */
  private animateThrust(t: number): void {
    const j = this.rig.joints;
    const duration = 0.55;
    const p = Math.min(1.0, t / duration);

    if (p < 0.35) {
      // Pull back to prepare thrust (telegraph window)
      const sub = p / 0.35;
      j.spine.rotation.set(0.1, -0.3 * sub, 0);
      j.rightArm.rotation.set(0.4 * sub, -0.6 * sub, 0);
      j.weapon.rotation.set(0, 0, 0);
    } else if (p < 0.65) {
      // Piercing straight forward thrust
      const sub = (p - 0.35) / 0.3;
      j.spine.rotation.set(0.25, 0.2 * sub, 0);
      j.rightArm.rotation.set(0.8, 0, 0);
      j.rightForearm.rotation.set(0, 0, 0);
      j.weapon.rotation.set(0.1, 0, 0);
    } else {
      // Recoil
      const sub = (p - 0.65) / 0.35;
      j.rightArm.rotation.set(0.8 - 0.5 * sub, 0, 0);
    }
  }

  /**
   * Sweep Attack (Unblockable low circle)
   */
  private animateSweep(t: number): void {
    const j = this.rig.joints;
    const duration = 0.65;
    const p = Math.min(1.0, t / duration);

    // Low rotational sweep around feet
    j.hips.position.y = 0.78;
    j.spine.rotation.set(0.35, p * Math.PI * 2, 0);
    j.rightArm.rotation.set(0.1, 0, 0);
    j.weapon.rotation.set(-0.9, 0, 0); // Point blade towards ground
  }

  private animateCounterReact(t: number): void {
    const j = this.rig.joints;
    // Thrust pinned to ground by player
    j.hips.position.y = 0.75;
    j.spine.rotation.set(0.4, 0, 0);
    j.rightArm.rotation.set(0.8, 0, 0);
    j.weapon.rotation.set(-1.1, 0, 0); // blade pinned down
  }

  private animateStagger(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 0.45);
    const snap = Math.sin(p * Math.PI);

    // Flinch backward
    j.hips.position.y = 0.92 - snap * 0.05;
    j.spine.rotation.set(-0.35 * snap, snap * 0.2, 0);
    j.head.rotation.set(-0.4 * snap, 0, 0);

    j.leftArm.rotation.set(-0.4 * snap, 0, -0.3);
    j.rightArm.rotation.set(-0.5 * snap, -0.3, 0.4);
  }

  private animatePostureBroken(t: number): void {
    const j = this.rig.joints;
    // Dropped to one knee, completely open to execution deathblow
    const p = Math.min(1.0, t / 0.5);
    const pant = Math.sin(t * 4.0) * 0.05;

    j.hips.position.y = 0.65 - (1.0 - p) * 0.3;
    j.spine.rotation.set(0.45 + pant, 0, 0);
    j.head.rotation.set(0.3, 0, 0); // Head lowered

    j.leftThigh.rotation.set(-1.2, 0, 0);
    j.leftShin.rotation.set(1.4, 0, 0);
    j.rightThigh.rotation.set(0.6, 0, 0.2);
    j.rightShin.rotation.set(1.5, 0, 0);

    // Weapon resting on ground
    j.rightArm.rotation.set(0.3, 0, 0);
    j.weapon.rotation.set(-0.9, 0, 0);
  }

  private animateExecutionAttacker(t: number): void {
    const j = this.rig.joints;
    const duration = 1.2;
    const p = Math.min(1.0, t / duration);

    if (p < 0.35) {
      // Step in and prepare execution plunge
      const sub = p / 0.35;
      j.hips.position.y = 0.95;
      j.spine.rotation.set(0.2, 0, 0);
      j.rightArm.rotation.set(1.4 * sub, -0.2, 0.2);
      j.weapon.rotation.set(1.2 * sub, 0, 0);
    } else if (p < 0.65) {
      // Fatal downward thrust/decapitation stroke
      const sub = (p - 0.35) / 0.3;
      j.hips.position.y = 0.95 - 0.2 * sub;
      j.spine.rotation.set(0.45, 0, 0);
      j.rightArm.rotation.set(1.4 - 1.6 * sub, 0, 0);
      j.weapon.rotation.set(1.2 - 2.2 * sub, 0, 0);
    } else {
      // Sheath / flourish return
      j.hips.position.y = 0.95;
      j.spine.rotation.set(0.1, 0, 0);
    }
  }

  private animateExecutionVictim(t: number): void {
    const j = this.rig.joints;
    const p = Math.min(1.0, t / 1.2);

    if (p < 0.4) {
      this.animatePostureBroken(t);
    } else {
      // Slump to ground
      const sub = (p - 0.4) / 0.6;
      j.hips.position.y = 0.3 - sub * 0.15;
      j.spine.rotation.set(0.8 + sub * 0.4, 0, 0);
      j.head.rotation.set(0.5, 0, 0);
    }
  }

  private animateSpecial(t: number): void {
    const j = this.rig.joints;
    const duration = 0.85;
    const p = Math.min(1.0, t / duration);

    // Rapid 3-hit whirlwind slice
    const spin = p * Math.PI * 4;
    j.hips.position.y = 0.95 + Math.sin(p * Math.PI) * 0.25;
    j.spine.rotation.set(0.1, spin, 0);
    j.rightArm.rotation.set(0.6, 0, 0.4);
    j.weapon.rotation.set(-0.2, 0.8, 0.5);
  }

  private animateDead(t: number): void {
    const j = this.rig.joints;
    j.hips.position.y = 0.15;
    j.spine.rotation.set(Math.PI / 2, 0, 0);
    j.head.rotation.set(0, 0, 0);
    j.leftThigh.rotation.set(0, 0, 0);
    j.leftShin.rotation.set(0, 0, 0);
    j.rightThigh.rotation.set(0, 0, 0);
    j.rightShin.rotation.set(0, 0, 0);
  }
}
