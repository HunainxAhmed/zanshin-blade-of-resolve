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
  shape: 'spark' | 'ring' | 'smoke' | 'blood' | 'sakura' | 'rain' | 'ember';
}

export type WeatherType = 'sakura' | 'rain' | 'embers' | 'clear';

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles = 1600;

  private sparkGeometry: THREE.BufferGeometry;
  private sparkMaterial: THREE.PointsMaterial;
  private sparkPoints: THREE.Points;

  private shockwaveMeshes: THREE.Mesh[] = [];
  private currentWeather: WeatherType = 'sakura';
  private weatherSpawnTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.sparkGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);

    this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sparkGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleTexture = this.createParticleTexture();

    this.sparkMaterial = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture,
    });

    this.sparkPoints = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);

    // Shockwave ring pool
    const ringGeo = new THREE.RingGeometry(0.1, 0.45, 32);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfff066,
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
    grad.addColorStop(0.35, 'rgba(255, 235, 160, 0.9)');
    grad.addColorStop(0.75, 'rgba(255, 140, 40, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  public setWeather(type: WeatherType): void {
    this.currentWeather = type;
  }

  /**
   * Massive Sekiro clash spark burst
   */
  public spawnDeflectBurst(pos: THREE.Vector3, isPerfect: boolean = true): void {
    const count = isPerfect ? 65 : 32;
    const speed = isPerfect ? 13.0 : 7.0;
    const baseColor = isPerfect ? new THREE.Color(1.0, 0.95, 0.6) : new THREE.Color(0.9, 0.75, 0.5);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.2) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.8));

      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15)),
        vel,
        color: baseColor.clone().addScalar((Math.random() - 0.5) * 0.15),
        size: isPerfect ? 0.45 + Math.random() * 0.25 : 0.3,
        maxLife: isPerfect ? 0.4 : 0.26,
        life: 0,
        gravity: 5.0,
        drag: 0.93,
        shape: 'spark',
      });
    }

    if (isPerfect) {
      this.triggerShockwave(pos, 0xfff59d, 4.0, 0.28);
    } else {
      this.triggerShockwave(pos, 0xffb74d, 2.4, 0.2);
    }
  }

  public spawnBloodImpact(pos: THREE.Vector3, normal?: THREE.Vector3, isHeavy: boolean = false): void {
    const count = isHeavy ? 45 : 24;
    const baseDir = normal ? normal.clone().negate() : new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const vel = baseDir.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.2) * 1.6,
        (Math.random() - 0.5) * 1.6
      )).normalize().multiplyScalar(isHeavy ? 7.5 : 4.5);

      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(0.85, 0.05, 0.05),
        size: 0.3 + Math.random() * 0.2,
        maxLife: 0.45,
        life: 0,
        gravity: 12.0,
        drag: 0.92,
        shape: 'blood',
      });
    }
  }

  public spawnCounterImpact(pos: THREE.Vector3): void {
    this.spawnDeflectBurst(pos, true);
    this.triggerShockwave(pos, 0x00e5ff, 4.5, 0.35);

    for (let i = 0; i < 25; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 3.0,
        (Math.random() - 0.5) * 5
      );
      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(0.6, 0.6, 0.6),
        size: 0.45,
        maxLife: 0.5,
        life: 0,
        gravity: 1.0,
        drag: 0.9,
        shape: 'smoke',
      });
    }
  }

  /**
   * Aerial Sweep Counter: Head-Stomp Shockwave
   */
  public spawnHeadStompEffect(pos: THREE.Vector3): void {
    this.triggerShockwave(pos, 0xffeb3b, 4.5, 0.3);

    for (let i = 0; i < 35; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 2.5 + 0.5,
        (Math.random() - 0.5) * 6
      );
      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(1.0, 0.9, 0.3),
        size: 0.4,
        maxLife: 0.4,
        life: 0,
        gravity: 2.5,
        drag: 0.92,
        shape: 'spark',
      });
    }
  }

  public spawnPostureBreakEffect(pos: THREE.Vector3): void {
    this.triggerShockwave(pos, 0xffa500, 5.5, 0.45);
    for (let i = 0; i < 60; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 7,
        (Math.random() - 0.2) * 7,
        (Math.random() - 0.5) * 7
      );
      this.particles.push({
        pos: pos.clone(),
        vel,
        color: new THREE.Color(1.0, 0.8, 0.2),
        size: 0.4,
        maxLife: 0.6,
        life: 0,
        gravity: 2.0,
        drag: 0.95,
        shape: 'spark',
      });
    }
  }

  public spawnDodgeDust(pos: THREE.Vector3, dir: THREE.Vector3): void {
    for (let i = 0; i < 10; i++) {
      const vel = dir.clone().negate().multiplyScalar(2.2).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.0,
        (Math.random() - 0.5) * 1.5
      ));

      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3(0, 0.1, 0)),
        vel,
        color: new THREE.Color(0.6, 0.6, 0.6),
        size: 0.35,
        maxLife: 0.35,
        life: 0,
        gravity: 0.5,
        drag: 0.9,
        shape: 'smoke',
      });
    }
  }

  public spawnPostureSteam(pos: THREE.Vector3): void {
    for (let i = 0; i < 3; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        Math.random() * 1.4 + 0.6,
        (Math.random() - 0.5) * 0.8
      );
      this.particles.push({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.4)),
        vel,
        color: new THREE.Color(0.9, 0.7, 0.3),
        size: 0.3,
        maxLife: 0.4,
        life: 0,
        gravity: -0.5,
        drag: 0.96,
        shape: 'smoke',
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
    (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
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
      (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 * (1.0 - progress);
      requestAnimationFrame(animateRing);
    };
    animateRing();
  }

  public update(delta: number): void {
    // 1. Weather Spawner
    this.weatherSpawnTimer += delta;
    if (this.weatherSpawnTimer >= 0.04) {
      this.weatherSpawnTimer = 0;
      this.spawnWeatherParticles();
    }

    // 2. Physics & Life
    const positions = this.sparkGeometry.attributes.position.array as Float32Array;
    const colors = this.sparkGeometry.attributes.color.array as Float32Array;
    const sizes = this.sparkGeometry.attributes.size.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife || p.pos.y < 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Special swaying for sakura petals
      if (p.shape === 'sakura') {
        p.vel.x += Math.sin(p.life * 4.0) * 0.2;
        p.vel.z += Math.cos(p.life * 3.0) * 0.2;
      }

      p.vel.y -= p.gravity * delta;
      p.vel.multiplyScalar(p.drag);
      p.pos.addScaledVector(p.vel, delta);
    }

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

      sizes[ptr] = p.size * (0.6 + alpha * 0.4);
      ptr++;
    }

    for (let i = ptr; i < this.maxParticles; i++) {
      positions[i * 3 + 1] = -9999;
      sizes[i] = 0;
    }

    this.sparkGeometry.attributes.position.needsUpdate = true;
    this.sparkGeometry.attributes.color.needsUpdate = true;
    this.sparkGeometry.attributes.size.needsUpdate = true;
  }

  private spawnWeatherParticles(): void {
    if (this.currentWeather === 'clear' || this.particles.length >= this.maxParticles - 100) return;

    if (this.currentWeather === 'sakura') {
      // Drifting Cherry Blossom Petals
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 18;
      this.particles.push({
        pos: new THREE.Vector3(Math.cos(angle) * r, 8 + Math.random() * 4, Math.sin(angle) * r),
        vel: new THREE.Vector3(-1.2 + Math.random() * 0.5, -1.2, 0.8 + Math.random() * 0.4),
        color: new THREE.Color(1.0, 0.75, 0.85),
        size: 0.35,
        maxLife: 7.0,
        life: 0,
        gravity: 0.15,
        drag: 0.99,
        shape: 'sakura',
      });
    } else if (this.currentWeather === 'rain') {
      // Driving Storm Rain Streaks
      for (let i = 0; i < 4; i++) {
        const x = (Math.random() - 0.5) * 36;
        const z = (Math.random() - 0.5) * 36;
        this.particles.push({
          pos: new THREE.Vector3(x, 14, z),
          vel: new THREE.Vector3(-1.5, -28.0, 1.0),
          color: new THREE.Color(0.65, 0.8, 1.0),
          size: 0.22,
          maxLife: 0.6,
          life: 0,
          gravity: 2.0,
          drag: 1.0,
          shape: 'rain',
        });
      }
    } else if (this.currentWeather === 'embers') {
      // Swirling Fire Embers
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 14;
      this.particles.push({
        pos: new THREE.Vector3(Math.cos(angle) * r, 0.2, Math.sin(angle) * r),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 2.2 + 0.8, (Math.random() - 0.5) * 1.2),
        color: new THREE.Color(1.0, 0.45, 0.1),
        size: 0.25,
        maxLife: 3.5,
        life: 0,
        gravity: -0.4,
        drag: 0.98,
        shape: 'ember',
      });
    }
  }
}
