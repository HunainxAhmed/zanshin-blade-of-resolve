import * as THREE from 'three';

export class SwordTrail {
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshBasicMaterial;

  private pointsTip: THREE.Vector3[] = [];
  private pointsBase: THREE.Vector3[] = [];
  private maxPoints: number;
  private active: boolean = false;

  constructor(scene: THREE.Scene, maxPoints: number = 24, color: number = 0xffffff) {
    this.maxPoints = maxPoints;

    this.geometry = new THREE.BufferGeometry();
    const vertexCount = maxPoints * 2;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let i = 0; i < maxPoints - 1; i++) {
      const p1 = i * 2;
      const p2 = i * 2 + 1;
      const p3 = (i + 1) * 2;
      const p4 = (i + 1) * 2 + 1;

      indices.push(p1, p2, p3);
      indices.push(p2, p4, p3);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(indices);

    this.material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  public setColor(color: number, opacity: number = 0.85): void {
    this.material.color.setHex(color);
    this.material.opacity = opacity;
  }

  public setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      this.pointsTip = [];
      this.pointsBase = [];
      this.clearGeometry();
    }
  }

  public updateTrail(tipWorldPos: THREE.Vector3, baseWorldPos: THREE.Vector3): void {
    if (!this.active) {
      if (this.pointsTip.length > 0) {
        this.pointsTip.shift();
        this.pointsBase.shift();
        this.rebuildMesh();
      }
      return;
    }

    this.pointsTip.unshift(tipWorldPos.clone());
    this.pointsBase.unshift(baseWorldPos.clone());

    if (this.pointsTip.length > this.maxPoints) {
      this.pointsTip.pop();
      this.pointsBase.pop();
    }

    this.rebuildMesh();
  }

  private rebuildMesh(): void {
    const pos = this.geometry.attributes.position.array as Float32Array;
    const uvs = this.geometry.attributes.uv.array as Float32Array;
    const len = this.pointsTip.length;

    for (let i = 0; i < this.maxPoints; i++) {
      const idx = i * 2;
      if (i < len) {
        const tip = this.pointsTip[i];
        const base = this.pointsBase[i];

        pos[idx * 3 + 0] = tip.x;
        pos[idx * 3 + 1] = tip.y;
        pos[idx * 3 + 2] = tip.z;

        pos[(idx + 1) * 3 + 0] = base.x;
        pos[(idx + 1) * 3 + 1] = base.y;
        pos[(idx + 1) * 3 + 2] = base.z;

        const u = 1.0 - (i / (this.maxPoints - 1));
        uvs[idx * 2 + 0] = u;
        uvs[idx * 2 + 1] = 0;
        uvs[(idx + 1) * 2 + 0] = u;
        uvs[(idx + 1) * 2 + 1] = 1;
      } else {
        const lastIdx = Math.max(0, len - 1);
        const lastTip = this.pointsTip[lastIdx] || new THREE.Vector3();
        const lastBase = this.pointsBase[lastIdx] || new THREE.Vector3();
        pos[idx * 3 + 0] = lastTip.x;
        pos[idx * 3 + 1] = lastTip.y;
        pos[idx * 3 + 2] = lastTip.z;
        pos[(idx + 1) * 3 + 0] = lastBase.x;
        pos[(idx + 1) * 3 + 1] = lastBase.y;
        pos[(idx + 1) * 3 + 2] = lastBase.z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
  }

  private clearGeometry(): void {
    const pos = this.geometry.attributes.position.array as Float32Array;
    pos.fill(0);
    this.geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
