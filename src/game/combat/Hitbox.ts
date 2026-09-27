import * as THREE from 'three';

export interface Hurtbox {
  center: THREE.Vector3;
  radius: number;
  height: number;
}

export class WeaponTrace {
  /**
   * High-reliability melee hit check.
   * Combines forward cone/sector evaluation with blade distance.
   */
  public checkMeleeHit(
    attackerPos: THREE.Vector3,
    attackerFacingAngle: number,
    weaponTipWorld: THREE.Vector3,
    weaponBaseWorld: THREE.Vector3,
    targetHurtbox: Hurtbox,
    maxRange: number = 2.8,
    coneAngleDeg: number = 75,
    outContactPoint?: THREE.Vector3
  ): boolean {
    const toTarget = targetHurtbox.center.clone().sub(attackerPos);
    toTarget.y = 0;
    const dist = toTarget.length();

    // 1. Out of range check (with generous buffer)
    if (dist > maxRange + targetHurtbox.radius) {
      return false;
    }

    // 2. Forward cone angle check
    const attackerFwd = new THREE.Vector3(Math.sin(attackerFacingAngle), 0, Math.cos(attackerFacingAngle));
    const toTargetNorm = toTarget.clone().normalize();
    const dot = attackerFwd.dot(toTargetNorm);
    const cosLimit = Math.cos((coneAngleDeg * Math.PI) / 180);

    // If target is within forward cone and in distance
    if (dot >= cosLimit && dist <= maxRange + targetHurtbox.radius) {
      if (outContactPoint) {
        // Place contact point at intersection near weapon tip/midpoint
        const midBlade = new THREE.Vector3().lerpVectors(weaponBaseWorld, weaponTipWorld, 0.7);
        outContactPoint.copy(midBlade).lerp(targetHurtbox.center, 0.4);
        outContactPoint.y = Math.max(0.8, Math.min(1.5, outContactPoint.y));
      }
      return true;
    }

    // 3. Proximity fallback: if blade tip or base is directly within target hurtbox radius
    const tipDist = weaponTipWorld.distanceTo(targetHurtbox.center);
    if (tipDist <= targetHurtbox.radius + 0.6) {
      if (outContactPoint) {
        outContactPoint.copy(weaponTipWorld);
      }
      return true;
    }

    return false;
  }
}
