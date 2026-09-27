import * as THREE from 'three';

export class LightingManager {
  private ambientLight: THREE.AmbientLight;
  private mainLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  constructor(scene: THREE.Scene) {
    // Ambient Light (subtle cool blue dark fill)
    this.ambientLight = new THREE.AmbientLight(0x232b38, 1.2);
    scene.add(this.ambientLight);

    // Main Moonlight / Sunlight
    this.mainLight = new THREE.DirectionalLight(0xdce6f2, 2.4);
    this.mainLight.position.set(15, 25, 12);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 60;
    this.mainLight.shadow.camera.left = -20;
    this.mainLight.shadow.camera.right = 20;
    this.mainLight.shadow.camera.top = 20;
    this.mainLight.shadow.camera.bottom = -20;
    this.mainLight.shadow.bias = -0.0005;
    scene.add(this.mainLight);

    // Rim light for strong silhouette definition
    this.rimLight = new THREE.DirectionalLight(0x4dabf7, 1.6);
    this.rimLight.position.set(-15, 10, -18);
    scene.add(this.rimLight);

    // Atmospheric Fog
    scene.fog = new THREE.FogExp2(0x0a0c10, 0.022);
  }

  public setAtmosphere(arenaType: string): void {
    if (arenaType === 'forest') {
      this.ambientLight.color.setHex(0x19281e);
      this.mainLight.color.setHex(0xc2e0c6);
      this.rimLight.color.setHex(0x38d9a9);
    } else if (arenaType === 'temple') {
      this.ambientLight.color.setHex(0x282019);
      this.mainLight.color.setHex(0xffd8a8);
      this.rimLight.color.setHex(0xff922b);
    } else if (arenaType === 'rooftops') {
      this.ambientLight.color.setHex(0x181a24);
      this.mainLight.color.setHex(0x91a7ff);
      this.rimLight.color.setHex(0x748ffc);
    } else {
      // Default / Boss / Training
      this.ambientLight.color.setHex(0x232b38);
      this.mainLight.color.setHex(0xdce6f2);
      this.rimLight.color.setHex(0xff6b6b);
    }
  }
}
