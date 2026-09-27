import * as THREE from 'three';

export interface ArenaData {
  title: string;
  objective: string;
  colliders: THREE.Box3[];
  spawnPlayerPos: THREE.Vector3;
  spawnEnemyPos: THREE.Vector3;
}

export class ArenaBuilder {
  private scene: THREE.Scene;
  private currentArenaGroup: THREE.Group | null = null;
  private colliders: THREE.Box3[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public buildArena(type: 'training' | 'forest' | 'temple' | 'rooftops' | 'boss'): ArenaData {
    if (this.currentArenaGroup) {
      this.scene.remove(this.currentArenaGroup);
      this.currentArenaGroup.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
      this.currentArenaGroup = null;
    }

    this.colliders = [];
    const group = new THREE.Group();
    this.currentArenaGroup = group;
    this.scene.add(group);

    switch (type) {
      case 'training':
        return this.buildTrainingCourtyard(group);
      case 'forest':
        return this.buildForestClearing(group);
      case 'temple':
        return this.buildSunkenTemple(group);
      case 'rooftops':
        return this.buildPagodaRooftops(group);
      case 'boss':
      default:
        return this.buildBossCourtyard(group);
    }
  }

  /**
   * Arena 1: Training Courtyard
   */
  private buildTrainingCourtyard(group: THREE.Group): ArenaData {
    // Ground
    const floorGeo = new THREE.CylinderGeometry(18, 18, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2d3238,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    group.add(floor);

    // Inner tatami / flagstone circle
    const innerGeo = new THREE.CircleGeometry(12, 32);
    innerGeo.rotateX(-Math.PI / 2);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x4a433a,
      roughness: 0.9,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 0.01;
    inner.receiveShadow = true;
    group.add(inner);

    // Torii Gate at entrance
    this.createToriiGate(group, new THREE.Vector3(0, 0, -14));

    // Wooden Training Dummies / Posts around perimeter
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * 14;
      const z = Math.sin(angle) * 14;
      this.createTrainingPost(group, new THREE.Vector3(x, 0, z));
    }

    // Outer boundary walls / bamboo fence posts
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const x = Math.cos(angle) * 17.5;
      const z = Math.sin(angle) * 17.5;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 })
      );
      post.position.set(x, 1.1, z);
      post.castShadow = true;
      group.add(post);
    }

    return {
      title: 'TRAINING COURTYARD',
      objective: 'Practice deflections, posture breaking, and thrust counters',
      colliders: this.colliders,
      spawnPlayerPos: new THREE.Vector3(0, 0, 5),
      spawnEnemyPos: new THREE.Vector3(0, 0, -3),
    };
  }

  /**
   * Arena 2: Whispering Bamboo Forest
   */
  private buildForestClearing(group: THREE.Group): ArenaData {
    const floorGeo = new THREE.CylinderGeometry(22, 22, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e281e,
      roughness: 0.95,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    group.add(floor);

    // Mossy rocks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 8;
      const rockGeo = new THREE.DodecahedronGeometry(1.2 + Math.random() * 0.8, 1);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x2b332c, roughness: 0.9 });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(Math.cos(angle) * r, 0.8, Math.sin(angle) * r);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);

      const box = new THREE.Box3().setFromObject(rock);
      this.colliders.push(box);
    }

    // Bamboo stalks around perimeter
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.7 });
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      const r = 18 + (Math.random() - 0.5) * 3;
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 10, 6),
        bambooMat
      );
      stalk.position.set(Math.cos(angle) * r, 5, Math.sin(angle) * r);
      stalk.castShadow = true;
      group.add(stalk);
    }

    return {
      title: 'WHISPERING BAMBOO FOREST',
      objective: 'Eliminate the agile duelists lurking in the mist',
      colliders: this.colliders,
      spawnPlayerPos: new THREE.Vector3(0, 0, 6),
      spawnEnemyPos: new THREE.Vector3(0, 0, -4),
    };
  }

  /**
   * Arena 3: Sunken Temple of Ash
   */
  private buildSunkenTemple(group: THREE.Group): ArenaData {
    const floorGeo = new THREE.BoxGeometry(32, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f2226,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    group.add(floor);

    // Ancient Stone Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.7 });
    const pillarPositions = [
      [-8, -8], [8, -8], [-8, 8], [8, 8],
      [-12, 0], [12, 0], [0, -12], [0, 12]
    ];

    for (const [x, z] of pillarPositions) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 7, 8), pillarMat);
      pillar.position.set(x, 3.5, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);

      const box = new THREE.Box3().setFromObject(pillar);
      this.colliders.push(box);

      // Brazier atop or next to pillars
      this.createBrazier(group, new THREE.Vector3(x * 0.75, 0, z * 0.75));
    }

    return {
      title: 'SUNKEN TEMPLE OF ASH',
      objective: 'Shatter the iron armor of the temple guardians',
      colliders: this.colliders,
      spawnPlayerPos: new THREE.Vector3(0, 0, 7),
      spawnEnemyPos: new THREE.Vector3(0, 0, -5),
    };
  }

  /**
   * Arena 4: Pagoda Rooftops
   */
  private buildPagodaRooftops(group: THREE.Group): ArenaData {
    const roofGeo = new THREE.BoxGeometry(26, 0.6, 26);
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0x141820,
      roughness: 0.4,
      metalness: 0.6,
    });
    const roof = new THREE.Mesh(roofGeo, tileMat);
    roof.position.y = -0.3;
    roof.receiveShadow = true;
    group.add(roof);

    // Ornamental Ridge Beams
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(26.4, 0.4, 0.4), ridgeMat);
    ridge.position.set(0, 0.1, 0);
    group.add(ridge);

    // Decorative Dragon/Demon finials on corners
    const corners = [[-13, -13], [13, -13], [-13, 13], [13, 13]];
    for (const [cx, cz] of corners) {
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.8, 4), ridgeMat);
      finial.position.set(cx, 0.9, cz);
      group.add(finial);
    }

    return {
      title: 'STORM-SWEPT ROOFTOPS',
      objective: 'Defeat the elite shadow shinobi in the tempest',
      colliders: this.colliders,
      spawnPlayerPos: new THREE.Vector3(0, 0, 6),
      spawnEnemyPos: new THREE.Vector3(0, 0, -5),
    };
  }

  /**
   * Arena 5: Moonlit Sovereign's Courtyard (Climactic Boss Arena)
   */
  private buildBossCourtyard(group: THREE.Group): ArenaData {
    // Grand Octagonal Stone Arena
    const arenaGeo = new THREE.CylinderGeometry(24, 24, 0.6, 8);
    const arenaMat = new THREE.MeshStandardMaterial({
      color: 0x191c21,
      roughness: 0.65,
      metalness: 0.3,
    });
    const arena = new THREE.Mesh(arenaGeo, arenaMat);
    arena.position.y = -0.3;
    arena.receiveShadow = true;
    group.add(arena);

    // Crimson Carpet / Ceremonial Walkway
    const carpetGeo = new THREE.PlaneGeometry(5, 36);
    carpetGeo.rotateX(-Math.PI / 2);
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8a1818, roughness: 0.9 });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.position.y = 0.02;
    carpet.receiveShadow = true;
    group.add(carpet);

    // Giant Torii Gate at the horizon
    this.createToriiGate(group, new THREE.Vector3(0, 0, -22), 1.6);

    // Stone Statues flanking the arena
    for (let z = -14; z <= 14; z += 9) {
      if (Math.abs(z) < 2) continue;
      this.createStatuePillar(group, new THREE.Vector3(-14, 0, z));
      this.createStatuePillar(group, new THREE.Vector3(14, 0, z));
    }

    // Massive Glowing Moon Mesh in distance skybox
    const moonGeo = new THREE.CircleGeometry(16, 32);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfff4e0,
      side: THREE.DoubleSide,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(0, 18, -48);
    group.add(moon);

    return {
      title: "MOONLIT SOVEREIGN'S COURTYARD",
      objective: 'Best Lord Genjiro in a decisive duel of blade and spirit',
      colliders: this.colliders,
      spawnPlayerPos: new THREE.Vector3(0, 0, 8),
      spawnEnemyPos: new THREE.Vector3(0, 0, -6),
    };
  }

  private createToriiGate(group: THREE.Group, pos: THREE.Vector3, scale: number = 1.0): void {
    const toriiMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.6 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

    const torii = new THREE.Group();
    torii.position.copy(pos);
    torii.scale.set(scale, scale, scale);

    // Two main pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 6, 8), toriiMat);
    p1.position.set(-3.2, 3, 0);
    p1.castShadow = true;

    const p2 = p1.clone();
    p2.position.set(3.2, 3, 0);

    // Top beams (Kasagi & Shimaki)
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.5, 0.6), blackMat);
    topBeam.position.set(0, 5.8, 0);

    const subBeam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.35, 0.4), toriiMat);
    subBeam.position.set(0, 4.8, 0);

    torii.add(p1, p2, topBeam, subBeam);
    group.add(torii);

    this.colliders.push(new THREE.Box3().setFromObject(p1));
    this.colliders.push(new THREE.Box3().setFromObject(p2));
  }

  private createTrainingPost(group: THREE.Group, pos: THREE.Vector3): void {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.8 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 2.2, 8), postMat);
    post.position.copy(pos);
    post.position.y += 1.1;
    post.castShadow = true;
    group.add(post);

    this.colliders.push(new THREE.Box3().setFromObject(post));
  }

  private createBrazier(group: THREE.Group, pos: THREE.Vector3): void {
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5, metalness: 0.8 })
    );
    stand.position.copy(pos);
    stand.position.y += 0.6;
    stand.castShadow = true;
    group.add(stand);

    // Glowing flame point light
    const fireLight = new THREE.PointLight(0xff7700, 2.5, 8);
    fireLight.position.copy(stand.position);
    fireLight.position.y += 0.7;
    group.add(fireLight);
  }

  private createStatuePillar(group: THREE.Group, pos: THREE.Vector3): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.8 });
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), mat);
    pillar.position.copy(pos);
    pillar.position.y += 2.25;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    this.colliders.push(new THREE.Box3().setFromObject(pillar));
  }
}
