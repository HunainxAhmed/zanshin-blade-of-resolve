import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  maxLife: number;
  life: number;
  gravity: number;
  drag: number;
  shape: 'spark' | 'ring' | 'smoke' | 'blood';
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles = 800;

  // Render representations
  private sparkGeometry: THREE.BufferGeometry;
  private sparkMaterial: THREE.PointsMaterial;
  private sparkPoints: THREE.Points;

  private shockwaveMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Point cloud for sparks, blood droplets, dust
    this.sparkGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sparkGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create custom canvas texture for rounded glowing particles
    const particleTexture = this.createParticleTexture();

    this.sparkMaterial = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture,
    });

    this.sparkPoints = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);

    // Ring pool for shockwaves
    const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffe066,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.visible = false;
      this.shockwaveMeshes.push(mesh);
      this.scene.add(mesh);
    }
  }

  private createParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 230, 150, 0.8)');
    grad.addColorStop(0.8, 'rgba(255, 120, 30, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Spawn Sekiro-style Perfect Deflection clash sparks + expanding ring
   */
  public spawnDeflectBurst(pos: THREE.Vector3, isPerfect: boolean = true): void {
    const count = isPerfect ? 45 : 18;
    const speed = isPerfect ? 9.0 : 4.5;
    const baseColor = isPerfect ? new THREE.Color(1.0, 0.9, 0.4) : new THREE.Color(0.8, 0.7, 0.6);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.2) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));

      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)),
        vel,
        color: baseColor.clone().addScalar((Math.random() - 0.5) * 0.1),
        size: isPerfect ? 0.35 + Math.random() * 0.2 : 0.2,
        maxLife: isPerfect ? 0.35 : 0.22,
        life: 0,
        gravity: 4.0,
        drag: 0.94,
        shape: 'spark',
      });
    }

    if (isPerfect) {
      this.triggerShockwave(pos, 0xffeb3b, 3.2, 0.25);
    }
  }

  /**
   * Spawn blood & impact flecks when a blade connects with flesh
   */
  public spawnBloodImpact(pos: THREE.Vector3, normal?: THREE.Vector3, isHeavy: boolean = false): void {
    const count = isHeavy ? 35 : 18;
    const baseDir = normal ? normal.clone().negate() : new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const vel = baseDir.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.2) * 1.5,
        (Math.random() - 0.5) * 1.5
      )).normalize().multiplyScalar(isHeavy ? 6.5 : 4.0);

      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(0.8, 0.05, 0.05),
        size: 0.25 + Math.random() * 0.15,
        maxLife: 0.45,
        life: 0,
        gravity: 12.0,
        drag: 0.92,
        shape: 'blood',
      });
    }
  }

  /**
   * Mikiri / Thrust Counter: Ground impact dust and sparks
   */
  public spawnCounterImpact(pos: THREE.Vector3): void {
    this.spawnDeflectBurst(pos, true);
    this.triggerShockwave(pos, 0x00ffff, 4.0, 0.3);

    // Dust particles
    for (let i = 0; i < 20; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 2.5,
        (Math.random() - 0.5) * 4
      );
      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(0.5, 0.5, 0.5),
        size: 0.4,
        maxLife: 0.5,
        life: 0,
        gravity: 1.0,
        drag: 0.9,
        shape: 'smoke',
      });
    }
  }

  /**
   * Posture Break explosive shatter
   */
  public spawnPostureBreakEffect(pos: THREE.Vector3): void {
    this.triggerShockwave(pos, 0xffa500, 5.0, 0.45);
    for (let i = 0; i < 50; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.2) * 6,
        (Math.random() - 0.5) * 6
      );
      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(1.0, 0.7, 0.1),
        size: 0.35,
        maxLife: 0.6,
        life: 0,
        gravity: 2.0,
        drag: 0.95,
        shape: 'spark',
      });
    }
  }

  /**
   * Dodge / Sprint dust burst
   */
  public spawnDodgeDust(pos: THREE.Vector3, dir: THREE.Vector3): void {
    for (let i = 0; i < 8; i++) {
      const vel = dir.clone().negate().multiplyScalar(2).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.0,
        (Math.random() - 0.5) * 1.5
      ));

      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3(0, 0.1, 0)),
        vel,
        color: new THREE.Color(0.6, 0.6, 0.6),
        size: 0.3,
        maxLife: 0.35,
        life: 0,
        gravity: 0.5,
        drag: 0.9,
        shape: 'smoke',
      });
    }
  }

  /**
   * Special Attack Azure Slash Burst
   */
  public spawnSpecialBurst(pos: THREE.Vector3): void {
    this.triggerShockwave(pos, 0x00e5ff, 6.0, 0.4);
    for (let i = 0; i < 40; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.2) * 8,
        (Math.random() - 0.5) * 8
      );
      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(0.2, 0.9, 1.0),
        size: 0.35,
        maxLife: 0.5,
        life: 0,
        gravity: 1.0,
        drag: 0.94,
        shape: 'spark',
      });
    }
  }

  private triggerShockwave(pos: THREE.Vector3, colorHex: number, maxScale: number, duration: number): void {
    const mesh = this.shockwaveMeshes.find(m => !m.visible);
    if (!mesh) return;

    mesh.position.copy(pos);
    mesh.position.y += 0.2;
    mesh.scale.set(0.1, 0.1, 0.1);
    (mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
    mesh.visible = true;

    const startTime = performance.now();
    const animateRing = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = elapsed / duration;
      if (progress >= 1.0) {
        mesh.visible = false;
        return;
      }

      const s = 0.1 + progress * maxScale;
      mesh.scale.set(s, s, s);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1.0 - progress);
      requestAnimationFrame(animateRing);
    };
    animateRing();
  }

  public update(delta: number): void {
    const positions = this.sparkGeometry.attributes.position.array as Float32Array;
    const colors = this.sparkGeometry.attributes.color.array as Float32Array;
    const sizes = this.sparkGeometry.attributes.size.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vel.y -= p.gravity * delta;
      p.vel.multiplyScalar(p.drag);
      p.pos.addScaledVector(p.vel, delta);
    }

    // Update geometry buffer
    let ptr = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = 1.0 - (p.life / p.maxLife);

      positions[ptr * 3 + 0] = p.pos.x;
      positions[ptr * 3 + 1] = p.pos.y;
      positions[ptr * 3 + 2] = p.pos.z;

      colors[ptr * 3 + 0] = p.color.r * alpha;
      colors[ptr * 3 + 1] = p.color.g * alpha;
      colors[ptr * 3 + 2] = p.color.b * alpha;

      sizes[ptr] = p.size * (0.5 + alpha * 0.5);
      ptr++;
    }

    // Zero out unused slots
    for (let i = ptr; i < this.maxParticles; i++) {
      positions[i * 3 + 1] = -9999;
      sizes[i] = 0;
    }

    this.sparkGeometry.attributes.position.needsUpdate = true;
    this.sparkGeometry.attributes.color.needsUpdate = true;
    this.sparkGeometry.attributes.size.needsUpdate = true;
  }
}
