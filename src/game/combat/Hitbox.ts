import * as THREE from 'three';

export interface Hurtbox {
  center: THREE.Vector3;
  radius: number;
  height: number;
}

export class WeaponTrace {
  private lastTip: THREE.Vector3 = new THREE.Vector3();
  private lastBase: THREE.Vector3 = new THREE.Vector3();
  private hasPrevious: boolean = false;

  public reset(): void {
    this.hasPrevious = false;
  }

  public checkSegmentIntersection(
    currentTip: THREE.Vector3,
    currentBase: THREE.Vector3,
    hurtbox: Hurtbox,
    outContactPoint?: THREE.Vector3
  ): boolean {
    if (!this.hasPrevious) {
      this.lastTip.copy(currentTip);
      this.lastBase.copy(currentBase);
      this.hasPrevious = true;
      return false;
    }

    // Check cylinder/capsule hurtbox collision with current weapon line segment
    const hit = this.intersectSegmentWithCylinder(currentBase, currentTip, hurtbox, outContactPoint);

    this.lastTip.copy(currentTip);
    this.lastBase.copy(currentBase);
    return hit;
  }

  private intersectSegmentWithCylinder(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    cylinder: Hurtbox,
    outContactPoint?: THREE.Vector3
  ): boolean {
    const bottom = cylinder.center.clone();
    bottom.y -= cylinder.height / 2;
    const top = cylinder.center.clone();
    top.y += cylinder.height / 2;

    // Sample along weapon blade from base to tip (4 points)
    const samples = 4;
    for (let i = 0; i <= samples; i++) {
      const alpha = i / samples;
      const testPoint = new THREE.Vector3().lerpVectors(p1, p2, alpha);

      // Check vertical bounds
      if (testPoint.y >= bottom.y && testPoint.y <= top.y) {
        // Check horizontal radial distance
        const dx = testPoint.x - cylinder.center.x;
        const dz = testPoint.z - cylinder.center.z;
        const distSq = dx * dx + dz * dz;

        if (distSq <= cylinder.radius * cylinder.radius) {
          if (outContactPoint) {
            outContactPoint.copy(testPoint);
          }
          return true;
        }
      }
    }

    return false;
  }
}
