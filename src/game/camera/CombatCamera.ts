import * as THREE from 'three';
import { COMBAT_CONFIG } from '../data/CombatConfig';

export class CombatCamera {
  public camera: THREE.PerspectiveCamera;
  private targetPlayer: THREE.Object3D | null = null;
  private lockedTarget: THREE.Object3D | null = null;

  // Orbit angles (radians)
  public yaw: number = 0;
  public pitch: number = 0.25; // slight downward angle
  public distance: number = 4.8;
  public currentDistance: number = 4.8;

  // Smoothing
  private currentCameraPos = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private lookOffset = new THREE.Vector3(0, 1.4, 0);

  // Settings
  public mouseSensitivity: number = 0.0022;
  public screenShakeEnabled: boolean = true;
  public lockonAssist: boolean = true;

  // Screen shake
  private shakeTrauma: number = 0;
  private shakeOffset = new THREE.Vector3();

  // Dynamic zoom effect
  private zoomTarget: number = 4.8;

  constructor(fov: number = 65, aspect: number = window.innerWidth / window.innerHeight) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 150);
    this.currentCameraPos.set(0, 2, 5);
    this.camera.position.copy(this.currentCameraPos);
  }

  public setPlayer(player: THREE.Object3D): void {
    this.targetPlayer = player;
  }

  public setLockTarget(target: THREE.Object3D | null): void {
    this.lockedTarget = target;
  }

  public getLockTarget(): THREE.Object3D | null {
    return this.lockedTarget;
  }

  public onMouseMove(movementX: number, movementY: number): void {
    // If not locked on or if user is overriding
    if (!this.lockedTarget) {
      this.yaw -= movementX * this.mouseSensitivity;
      this.pitch += movementY * this.mouseSensitivity;

      // Clamp pitch to avoid gimbal flip
      this.pitch = Math.max(-0.25, Math.min(1.2, this.pitch));
    } else {
      // Small adjustment when locked on
      this.yaw -= movementX * (this.mouseSensitivity * 0.3);
      this.pitch += movementY * (this.mouseSensitivity * 0.3);
      this.pitch = Math.max(-0.1, Math.min(0.9, this.pitch));
    }
  }

  public addTrauma(amount: number): void {
    if (!this.screenShakeEnabled) return;
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + amount);
  }

  public pulseZoom(targetDistance: number, durationMs: number = 250): void {
    this.zoomTarget = targetDistance;
    setTimeout(() => {
      this.zoomTarget = 4.8;
    }, durationMs);
  }

  public update(delta: number, arenaColliders?: THREE.Box3[]): void {
    if (!this.targetPlayer) return;

    const playerPos = this.targetPlayer.position.clone().add(this.lookOffset);

    // Lock-on Tracking
    if (this.lockedTarget) {
      const targetPos = this.lockedTarget.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const distToTarget = playerPos.distanceTo(targetPos);

      // Check break lock condition
      if (distToTarget > COMBAT_CONFIG.LOCKON_LOSE_DISTANCE) {
        this.lockedTarget = null;
      } else {
        // Frame both player and enemy
        const dirToTarget = targetPos.clone().sub(playerPos).normalize();
        const targetYaw = Math.atan2(dirToTarget.x, dirToTarget.z) + Math.PI;

        // Smoothly interpolate camera yaw towards target
        let diffYaw = targetYaw - this.yaw;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        this.yaw += diffYaw * (delta * 6.0);

        // Adjust distance dynamically based on distance to enemy
        this.zoomTarget = Math.max(4.2, Math.min(6.5, distToTarget * 0.75 + 2.0));
      }
    }

    // Smooth zoom
    this.currentDistance += (this.zoomTarget - this.currentDistance) * Math.min(1.0, delta * 8.0);

    // Compute desired spherical camera position
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const offsetDir = new THREE.Vector3(
      sinYaw * cosPitch,
      sinPitch,
      cosYaw * cosPitch
    ).normalize();

    let desiredPos = playerPos.clone().add(offsetDir.clone().multiplyScalar(this.currentDistance));

    // Collision check with environment / arena bounds
    if (desiredPos.y < 0.6) {
      desiredPos.y = 0.6;
    }

    // Raycast/box test to avoid clipping through pillars/walls
    if (arenaColliders) {
      for (const box of arenaColliders) {
        if (box.containsPoint(desiredPos)) {
          // Push camera in toward player
          desiredPos = playerPos.clone().add(offsetDir.clone().multiplyScalar(this.currentDistance * 0.5));
          break;
        }
      }
    }

    // Smooth camera motion
    const camLerpSpeed = this.lockedTarget ? 10.0 : 8.0;
    this.currentCameraPos.lerp(desiredPos, Math.min(1.0, delta * camLerpSpeed));
    this.currentLookAt.lerp(playerPos, Math.min(1.0, delta * camLerpSpeed));

    // Apply Screen Shake
    if (this.shakeTrauma > 0) {
      const shakePower = Math.pow(this.shakeTrauma, 2) * 0.5;
      const angle = Math.random() * Math.PI * 2;
      this.shakeOffset.set(
        Math.cos(angle) * shakePower,
        Math.sin(angle) * shakePower,
        (Math.random() - 0.5) * shakePower * 0.5
      );
      this.shakeTrauma = Math.max(0, this.shakeTrauma - delta * 2.2);
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    this.camera.position.copy(this.currentCameraPos).add(this.shakeOffset);
    this.camera.lookAt(this.currentLookAt);
  }

  public onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
