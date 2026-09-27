import * as THREE from 'three';

export interface RigJoints {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  leftHand: THREE.Group;
  rightShoulder: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  rightHand: THREE.Group;
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  leftFoot: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  rightFoot: THREE.Group;
  weapon: THREE.Group;
  weaponTip: THREE.Group;
  weaponBase: THREE.Group;
  clothRibbon?: THREE.Group[];
}

export type CharacterArchetype = 
  | 'player' 
  | 'swordsman' 
  | 'duelist' 
  | 'heavy' 
  | 'spear' 
  | 'assassin' 
  | 'knight' 
  | 'monk' 
  | 'boss';

export class CharacterRig {
  public root: THREE.Group;
  public joints: RigJoints;
  public archetype: CharacterArchetype;
  private clothSprings: { obj: THREE.Object3D; targetRot: THREE.Euler; vel: THREE.Vector3 }[] = [];

  constructor(archetype: CharacterArchetype = 'player') {
    this.archetype = archetype;
    this.root = new THREE.Group();
    this.joints = this.buildSkeleton();
    this.buildMeshes();
  }

  private buildSkeleton(): RigJoints {
    const root = this.root;
    const hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
    const spine = new THREE.Group(); spine.position.y = 0.2; hips.add(spine);
    const chest = new THREE.Group(); chest.position.y = 0.25; spine.add(chest);
    const neck = new THREE.Group(); neck.position.y = 0.3; chest.add(neck);
    const head = new THREE.Group(); head.position.y = 0.12; neck.add(head);

    // Left Arm
    const leftShoulder = new THREE.Group(); leftShoulder.position.set(0.3, 0.22, 0); chest.add(leftShoulder);
    const leftArm = new THREE.Group(); leftArm.position.set(0.08, -0.05, 0); leftShoulder.add(leftArm);
    const leftForearm = new THREE.Group(); leftForearm.position.set(0, -0.28, 0); leftArm.add(leftForearm);
    const leftHand = new THREE.Group(); leftHand.position.set(0, -0.26, 0); leftForearm.add(leftHand);

    // Right Arm (Weapon Hand)
    const rightShoulder = new THREE.Group(); rightShoulder.position.set(-0.3, 0.22, 0); chest.add(rightShoulder);
    const rightArm = new THREE.Group(); rightArm.position.set(-0.08, -0.05, 0); rightShoulder.add(rightArm);
    const rightForearm = new THREE.Group(); rightForearm.position.set(0, -0.28, 0); rightArm.add(rightForearm);
    const rightHand = new THREE.Group(); rightHand.position.set(0, -0.26, 0); rightForearm.add(rightHand);

    // Weapon
    const weapon = new THREE.Group(); rightHand.add(weapon);
    const weaponBase = new THREE.Group(); weaponBase.position.set(0, 0, 0); weapon.add(weaponBase);
    const weaponTip = new THREE.Group(); weaponTip.position.set(0, 0, -1.2); weapon.add(weaponTip);

    // Left Leg
    const leftThigh = new THREE.Group(); leftThigh.position.set(0.18, -0.08, 0); hips.add(leftThigh);
    const leftShin = new THREE.Group(); leftShin.position.set(0, -0.42, 0); leftThigh.add(leftShin);
    const leftFoot = new THREE.Group(); leftFoot.position.set(0, -0.42, 0.05); leftShin.add(leftFoot);

    // Right Leg
    const rightThigh = new THREE.Group(); rightThigh.position.set(-0.18, -0.08, 0); hips.add(rightThigh);
    const rightShin = new THREE.Group(); rightShin.position.set(0, -0.42, 0); rightThigh.add(rightShin);
    const rightFoot = new THREE.Group(); rightFoot.position.set(0, -0.42, 0.05); rightShin.add(rightFoot);

    return {
      root, hips, spine, chest, neck, head,
      leftShoulder, leftArm, leftForearm, leftHand,
      rightShoulder, rightArm, rightForearm, rightHand,
      leftThigh, leftShin, leftFoot,
      rightThigh, rightShin, rightFoot,
      weapon, weaponTip, weaponBase,
    };
  }

  private buildMeshes(): void {
    const isPlayer = this.archetype === 'player';
    const isBoss = this.archetype === 'boss';
    const isHeavy = this.archetype === 'heavy';
    const isSpear = this.archetype === 'spear';
    const isKnight = this.archetype === 'knight';

    // Materials Palette
    const armorDarkMat = new THREE.MeshStandardMaterial({
      color: isPlayer ? 0x1f242d : (isBoss ? 0x111317 : (isHeavy ? 0x2b2d32 : 0x22272e)),
      roughness: 0.4,
      metalness: 0.6,
    });

    const clothMat = new THREE.MeshStandardMaterial({
      color: isPlayer ? 0xa83232 : (isBoss ? 0x8b0000 : (this.archetype === 'duelist' ? 0x225588 : 0x555b63)),
      roughness: 0.8,
      metalness: 0.1,
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xdfb15b,
      roughness: 0.3,
      metalness: 0.85,
    });

    const steelBladeMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xdd4444 : 0xe0e6ed,
      roughness: 0.2,
      metalness: 0.95,
    });

    // 1. Torso / Chest Armor
    const chestGeo = new THREE.BoxGeometry(0.52, 0.38, 0.34);
    const chestMesh = new THREE.Mesh(chestGeo, armorDarkMat);
    chestMesh.position.y = 0.12;
    chestMesh.castShadow = true;
    this.joints.chest.add(chestMesh);

    // Chest Gold Trim
    const trimGeo = new THREE.BoxGeometry(0.54, 0.08, 0.36);
    const trimMesh = new THREE.Mesh(trimGeo, goldAccentMat);
    trimMesh.position.y = 0.14;
    this.joints.chest.add(trimMesh);

    // 2. Hips & Waist Sash
    const hipsGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.24, 8);
    const hipsMesh = new THREE.Mesh(hipsGeo, clothMat);
    hipsMesh.castShadow = true;
    this.joints.hips.add(hipsMesh);

    // 3. Head & Helmet / Mask
    const headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
    const headMesh = new THREE.Mesh(headGeo, armorDarkMat);
    headMesh.castShadow = true;
    this.joints.head.add(headMesh);

    // Head Visor / Mask
    const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.08);
    const visorMat = new THREE.MeshStandardMaterial({
      color: isPlayer ? 0x00f7ff : (isBoss ? 0xff2222 : 0xffaa00),
      emissive: isPlayer ? 0x00aacc : (isBoss ? 0xaa0000 : 0x664400),
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.02, 0.12);
    this.joints.head.add(visorMesh);

    // Headwear details: Horns/Crest for Boss/Knight, Kasa Hat for Swordsman
    if (isBoss || isKnight) {
      const hornGeo = new THREE.ConeGeometry(0.04, 0.35, 4);
      hornGeo.rotateZ(0.4);
      const leftHorn = new THREE.Mesh(hornGeo, goldAccentMat);
      leftHorn.position.set(0.12, 0.25, 0.05);
      const rightHorn = leftHorn.clone();
      rightHorn.rotation.z = -0.4;
      rightHorn.position.x = -0.12;
      this.joints.head.add(leftHorn, rightHorn);
    } else if (this.archetype === 'swordsman') {
      const hatGeo = new THREE.ConeGeometry(0.38, 0.12, 12);
      const hatMesh = new THREE.Mesh(hatGeo, clothMat);
      hatMesh.position.y = 0.2;
      this.joints.head.add(hatMesh);
    }

    // 4. Limbs (Shoulders, Arms, Forearms)
    this.buildLimbSegment(this.joints.leftArm, 0.14, 0.28, 0.14, clothMat);
    this.buildLimbSegment(this.joints.leftForearm, 0.12, 0.28, 0.12, armorDarkMat);
    this.buildLimbSegment(this.joints.rightArm, 0.14, 0.28, 0.14, clothMat);
    this.buildLimbSegment(this.joints.rightForearm, 0.12, 0.28, 0.12, armorDarkMat);

    // Shoulder Sode Guards
    const sodeGeo = new THREE.BoxGeometry(0.2, 0.24, 0.08);
    const leftSode = new THREE.Mesh(sodeGeo, armorDarkMat);
    leftSode.position.set(0.12, 0.05, 0);
    this.joints.leftShoulder.add(leftSode);

    const rightSode = leftSode.clone();
    rightSode.position.set(-0.12, 0.05, 0);
    this.joints.rightShoulder.add(rightSode);

    // 5. Legs (Thighs, Shins, Boots)
    this.buildLimbSegment(this.joints.leftThigh, 0.16, 0.42, 0.16, clothMat);
    this.buildLimbSegment(this.joints.leftShin, 0.14, 0.42, 0.14, armorDarkMat);
    this.buildLimbSegment(this.joints.rightThigh, 0.16, 0.42, 0.16, clothMat);
    this.buildLimbSegment(this.joints.rightShin, 0.14, 0.42, 0.14, armorDarkMat);

    // 6. Weapons
    this.buildWeaponMesh(steelBladeMat, goldAccentMat);

    // 7. Flowing Scarf / Sash Ribbons with spring physics
    if (isPlayer || isBoss) {
      this.buildFlowingCloth(clothMat);
    }

    // Scale heavy / boss characters appropriately
    if (isHeavy) {
      this.root.scale.set(1.25, 1.25, 1.25);
    } else if (isBoss) {
      this.root.scale.set(1.35, 1.35, 1.35);
    }
  }

  private buildLimbSegment(parent: THREE.Group, w: number, h: number, d: number, mat: THREE.Material): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -h / 2;
    mesh.castShadow = true;
    parent.add(mesh);
  }

  private buildWeaponMesh(bladeMat: THREE.Material, goldMat: THREE.Material): void {
    const isHeavy = this.archetype === 'heavy';
    const isSpear = this.archetype === 'spear';
    const isBoss = this.archetype === 'boss';

    if (isSpear) {
      // Yari / Naginata Spear
      const poleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.4, 8);
      poleGeo.rotateX(Math.PI / 2);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.7 });
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);
      poleMesh.position.set(0, 0, -0.6);
      poleMesh.castShadow = true;
      this.joints.weapon.add(poleMesh);

      const spearTipGeo = new THREE.ConeGeometry(0.06, 0.5, 6);
      spearTipGeo.rotateX(-Math.PI / 2);
      const spearTipMesh = new THREE.Mesh(spearTipGeo, bladeMat);
      spearTipMesh.position.set(0, 0, -1.8);
      spearTipMesh.castShadow = true;
      this.joints.weapon.add(spearTipMesh);

      this.joints.weaponTip.position.set(0, 0, -2.0);
    } else if (isHeavy) {
      // Spiked Tetsubo / Kanabo Club
      const clubGeo = new THREE.CylinderGeometry(0.12, 0.05, 1.8, 8);
      clubGeo.rotateX(Math.PI / 2);
      const clubMat = new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.5, metalness: 0.7 });
      const clubMesh = new THREE.Mesh(clubGeo, clubMat);
      clubMesh.position.set(0, 0, -0.8);
      clubMesh.castShadow = true;
      this.joints.weapon.add(clubMesh);

      this.joints.weaponTip.position.set(0, 0, -1.7);
    } else {
      // Katana / Nodachi
      const bladeLen = isBoss ? 1.6 : 1.25;

      // Curved Katana Blade
      const bladeGeo = new THREE.BoxGeometry(0.025, 0.08, bladeLen);
      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      bladeMesh.position.set(0, 0, -bladeLen / 2 - 0.12);
      bladeMesh.castShadow = true;
      this.joints.weapon.add(bladeMesh);

      // Tsuba (Handguard)
      const tsubaGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.015, 12);
      tsubaGeo.rotateX(Math.PI / 2);
      const tsubaMesh = new THREE.Mesh(tsubaGeo, goldMat);
      tsubaMesh.position.set(0, 0, -0.12);
      this.joints.weapon.add(tsubaMesh);

      // Tsuka (Hilt / Grip)
      const gripGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8);
      gripGeo.rotateX(Math.PI / 2);
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      const gripMesh = new THREE.Mesh(gripGeo, gripMat);
      gripMesh.position.set(0, 0, 0.02);
      this.joints.weapon.add(gripMesh);

      this.joints.weaponTip.position.set(0, 0, -bladeLen - 0.12);
    }
  }

  private buildFlowingCloth(clothMat: THREE.Material): void {
    const scarf = new THREE.Group();
    scarf.position.set(0, 0.22, -0.15);
    this.joints.chest.add(scarf);

    const ribbonGeo = new THREE.BoxGeometry(0.12, 0.45, 0.02);
    const ribbonMesh = new THREE.Mesh(ribbonGeo, clothMat);
    ribbonMesh.position.y = -0.22;
    scarf.add(ribbonMesh);

    this.clothSprings.push({
      obj: scarf,
      targetRot: new THREE.Euler(0, 0, 0),
      vel: new THREE.Vector3(),
    });
  }

  public updateSprings(delta: number, characterVel: THREE.Vector3): void {
    for (const spring of this.clothSprings) {
      // Wind / movement trailing effect
      const targetX = -characterVel.z * 0.06;
      const targetZ = characterVel.x * 0.06;

      spring.obj.rotation.x += (targetX - spring.obj.rotation.x) * Math.min(1.0, delta * 12.0);
      spring.obj.rotation.z += (targetZ - spring.obj.rotation.z) * Math.min(1.0, delta * 12.0);
    }
  }

  public getWeaponTipWorld(): THREE.Vector3 {
    const tip = new THREE.Vector3();
    this.joints.weaponTip.getWorldPosition(tip);
    return tip;
  }

  public getWeaponBaseWorld(): THREE.Vector3 {
    const base = new THREE.Vector3();
    this.joints.weaponBase.getWorldPosition(base);
    return base;
  }
}
