import * as THREE from 'three';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Time } from '../core/Time';

export class DebugTools {
  private overlay: HTMLElement;
  private infoLabel: HTMLElement;
  private isVisible: boolean = false;
  private fpsCounter: number = 60;
  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();

  // Toggles
  public godMode: boolean = false;
  public showHitboxes: boolean = false;
  private hitboxHelpers: THREE.Mesh[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.overlay = document.getElementById('debug-overlay')!;
    this.infoLabel = document.getElementById('debug-info')!;
    this.bindButtons();
    this.bindKeys();
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F1' || e.code === 'Backquote') {
        this.toggle();
      }
    });
  }

  private bindButtons(): void {
    document.getElementById('dbg-god')?.addEventListener('click', () => {
      this.godMode = !this.godMode;
      alert(`God Mode: ${this.godMode ? 'ON' : 'OFF'}`);
    });

    document.getElementById('dbg-slow')?.addEventListener('click', () => {
      Time.timeScale = Time.timeScale === 1.0 ? 0.2 : 1.0;
    });

    document.getElementById('dbg-hitbox')?.addEventListener('click', () => {
      this.showHitboxes = !this.showHitboxes;
    });
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.overlay.classList.remove('hidden');
    } else {
      this.overlay.classList.add('hidden');
    }
  }

  public update(player: Player, enemies: Enemy[]): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.fpsCounter = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    if (this.godMode) {
      player.health = player.maxHealth;
      player.posture = 0;
    }

    if (this.isVisible) {
      const activeEnemy = enemies.find(e => !e.isDead);
      const enemyInfo = activeEnemy 
        ? `${activeEnemy.name} | HP: ${Math.round(activeEnemy.health)} | Posture: ${Math.round(activeEnemy.posture)} | AI: ${activeEnemy.aiState}`
        : 'None';

      this.infoLabel.innerHTML = `
        FPS: ${this.fpsCounter} | TimeScale: ${Time.timeScale.toFixed(2)}<br>
        Player State: ${player.state} | HP: ${Math.round(player.health)} | Posture: ${Math.round(player.posture)}<br>
        Enemy: ${enemyInfo}<br>
        GodMode: ${this.godMode ? 'ON' : 'OFF'}
      `;
    }
  }
}
