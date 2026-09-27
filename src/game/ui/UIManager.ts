import * as THREE from 'three';
import { Player } from '../player/Player';
import { Combatant } from '../combat/CombatEngine';
import { FinalBoss } from '../bosses/FinalBoss';
import { Miniboss } from '../bosses/Minibosses';
import { EventBus } from '../core/EventBus';

export class UIManager {
  private camera: THREE.PerspectiveCamera;

  // DOM Elements - HUD
  private hudElement: HTMLElement;
  private playerHealthFill: HTMLElement;
  private playerHealthGhost: HTMLElement;
  private playerPostureFill: HTMLElement;
  private specialPips: HTMLElement[];
  private healChargesLabel: HTMLElement;

  // Boss HUD
  private bossHud: HTMLElement;
  private bossName: HTMLElement;
  private bossTitle: HTMLElement;
  private bossHealthFill: HTMLElement;
  private bossPostureFill: HTMLElement;
  private bossDeathMarkers: HTMLElement;

  // Normal Target Sub-HUD
  private targetSubHud: HTMLElement;
  private targetName: HTMLElement;
  private targetHealthFill: HTMLElement;
  private targetPostureFill: HTMLElement;

  // Reticle & Combat Prompts
  private lockonReticle: HTMLElement;
  private dangerIndicator: HTMLElement;
  private dangerTypeLabel: HTMLElement;
  private executionPrompt: HTMLElement;
  private combatFeedbackBanner: HTMLElement;
  private feedbackText: HTMLElement;
  private flashOverlay: HTMLElement;

  // Arena Info
  private arenaTitle: HTMLElement;
  private arenaObjective: HTMLElement;

  // Menus
  private menuOverlay: HTMLElement;
  private currentOpenMenu: string | null = 'main-menu';

  // Stats Tracker
  public stats = {
    enemiesDefeated: 0,
    perfectDeflections: 0,
    normalBlocks: 0,
    successfulDodges: 0,
    executions: 0,
    damageDealt: 0,
    damageTaken: 0,
    bossAttempts: 0,
    startTime: Date.now(),
  };

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;

    // Cache elements
    this.hudElement = document.getElementById('hud')!;
    this.playerHealthFill = document.getElementById('player-health-fill')!;
    this.playerHealthGhost = document.getElementById('player-health-ghost')!;
    this.playerPostureFill = document.getElementById('player-posture-fill')!;
    this.specialPips = [
      document.getElementById('pip-1')!,
      document.getElementById('pip-2')!,
      document.getElementById('pip-3')!,
    ];
    this.healChargesLabel = document.getElementById('hud-heal-charges')!;

    this.bossHud = document.getElementById('boss-hud')!;
    this.bossName = document.getElementById('boss-name')!;
    this.bossTitle = document.getElementById('boss-title')!;
    this.bossHealthFill = document.getElementById('boss-health-fill')!;
    this.bossPostureFill = document.getElementById('boss-posture-fill')!;
    this.bossDeathMarkers = document.getElementById('boss-death-markers')!;

    this.targetSubHud = document.getElementById('target-sub-hud')!;
    this.targetName = document.getElementById('target-name')!;
    this.targetHealthFill = document.getElementById('target-health-fill')!;
    this.targetPostureFill = document.getElementById('target-posture-fill')!;

    this.lockonReticle = document.getElementById('lockon-reticle')!;
    this.dangerIndicator = document.getElementById('danger-indicator')!;
    this.dangerTypeLabel = document.getElementById('danger-type')!;
    this.executionPrompt = document.getElementById('execution-prompt')!;
    this.combatFeedbackBanner = document.getElementById('combat-feedback-banner')!;
    this.feedbackText = document.getElementById('feedback-text')!;
    this.flashOverlay = document.getElementById('flash-overlay')!;

    this.arenaTitle = document.getElementById('arena-title')!;
    this.arenaObjective = document.getElementById('arena-objective')!;
    this.menuOverlay = document.getElementById('menu-overlay')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    EventBus.on('perfect_deflect', () => {
      this.stats.perfectDeflections++;
      this.showFeedback('PERFECT DEFLECT');
      this.triggerFlash('deflect');
    });

    EventBus.on('normal_block', () => {
      this.stats.normalBlocks++;
    });

    EventBus.on('dodge', () => {
      this.stats.successfulDodges++;
    });

    EventBus.on('thrust_counter', () => {
      this.stats.perfectDeflections++;
      this.showFeedback('MIKIRI COUNTER');
      this.triggerFlash('deflect');
    });

    EventBus.on('player_damaged', (data) => {
      if (data.damage) this.stats.damageTaken += data.damage;
      this.triggerFlash('hit');
    });

    EventBus.on('hit', (data) => {
      if (data.damage) this.stats.damageDealt += data.damage;
    });

    EventBus.on('enemy_killed', () => {
      this.stats.enemiesDefeated++;
    });

    EventBus.on('perilous_warning', (data) => {
      this.showPerilousWarning(data.attackType || 'thrust');
    });
  }

  public updateHUD(
    player: Player,
    activeBoss: FinalBoss | Miniboss | null,
    lockedTarget: Combatant | null,
    canExecuteTarget: Combatant | null
  ): void {
    // 1. Player Health & Ghost Bar
    const hpPercent = Math.max(0, (player.health / player.maxHealth) * 100);
    this.playerHealthFill.style.width = `${hpPercent}%`;
    setTimeout(() => {
      if (this.playerHealthGhost) {
        this.playerHealthGhost.style.width = `${hpPercent}%`;
      }
    }, 150);

    // 2. Player Posture
    const posturePercent = Math.min(100, (player.posture / player.maxPosture) * 100);
    this.playerPostureFill.style.width = `${posturePercent}%`;

    // 3. Special Pips
    this.specialPips.forEach((pip, idx) => {
      if (idx < player.specialPips) {
        pip.classList.add('charged');
      } else {
        pip.classList.remove('charged');
      }
    });

    // 4. Heal Charges
    this.healChargesLabel.textContent = `GOURD [1] x${player.healCharges}`;

    // 5. Boss HUD
    if (activeBoss && !activeBoss.isDead) {
      this.bossHud.classList.remove('hidden');
      this.targetSubHud.classList.add('hidden');

      this.bossName.textContent = activeBoss.name;
      this.bossTitle.textContent = (activeBoss as any).bossTitle || 'Warrior of Renown';

      const bossHp = Math.max(0, (activeBoss.health / activeBoss.maxHealth) * 100);
      this.bossHealthFill.style.width = `${bossHp}%`;

      const bossPosture = Math.min(100, (activeBoss.posture / activeBoss.maxPosture) * 100);
      this.bossPostureFill.style.width = `${bossPosture}%`;

      this.renderBossDeathMarkers(activeBoss);
    } else {
      this.bossHud.classList.add('hidden');

      // Normal Target Sub-HUD
      if (lockedTarget && !lockedTarget.isDead) {
        this.targetSubHud.classList.remove('hidden');
        this.targetName.textContent = lockedTarget.name;
        this.targetHealthFill.style.width = `${(lockedTarget.health / lockedTarget.maxHealth) * 100}%`;
        this.targetPostureFill.style.width = `${(lockedTarget.posture / lockedTarget.maxPosture) * 100}%`;
      } else {
        this.targetSubHud.classList.add('hidden');
      }
    }

    // 6. Lock-on Reticle (Screen Space projection)
    if (lockedTarget && !lockedTarget.isDead) {
      const screenPos = this.toScreenPosition((lockedTarget as any).position.clone().add(new THREE.Vector3(0, 1.2, 0)));
      if (screenPos.visible) {
        this.lockonReticle.classList.remove('hidden');
        this.lockonReticle.style.left = `${screenPos.x}px`;
        this.lockonReticle.style.top = `${screenPos.y}px`;
      } else {
        this.lockonReticle.classList.add('hidden');
      }
    } else {
      this.lockonReticle.classList.add('hidden');
    }

    // 7. Execution Prompt
    if (canExecuteTarget && !canExecuteTarget.isDead) {
      this.executionPrompt.classList.remove('hidden');
      const screenPos = this.toScreenPosition((canExecuteTarget as any).position.clone().add(new THREE.Vector3(0, 1.3, 0)));
      if (screenPos.visible) {
        this.executionPrompt.style.left = `${screenPos.x}px`;
        this.executionPrompt.style.top = `${screenPos.y}px`;
      }
    } else {
      this.executionPrompt.classList.add('hidden');
    }
  }

  private renderBossDeathMarkers(boss: FinalBoss | Miniboss): void {
    const total = boss.maxDeathNodes;
    const remaining = boss.deathNodesRemaining;

    let html = '';
    for (let i = 0; i < total; i++) {
      if (i < remaining) {
        html += '<div class="boss-orb"></div>';
      } else {
        html += '<div class="boss-orb shattered"></div>';
      }
    }
    this.bossDeathMarkers.innerHTML = html;
  }

  private toScreenPosition(worldPos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const vector = worldPos.clone().project(this.camera);
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    const x = Math.round(vector.x * halfWidth + halfWidth);
    const y = Math.round(-vector.y * halfHeight + halfHeight);
    const visible = vector.z < 1.0;

    return { x, y, visible };
  }

  public showPerilousWarning(type: string): void {
    this.dangerIndicator.classList.remove('hidden');
    this.dangerTypeLabel.textContent = `${type.toUpperCase()} [E/SPACE]`;
    setTimeout(() => {
      this.dangerIndicator.classList.add('hidden');
    }, 700);
  }

  public showFeedback(msg: string): void {
    this.feedbackText.textContent = msg;
    this.combatFeedbackBanner.classList.remove('hidden');
    setTimeout(() => {
      this.combatFeedbackBanner.classList.add('hidden');
    }, 700);
  }

  public triggerFlash(type: 'deflect' | 'hit'): void {
    this.flashOverlay.className = `flash-overlay ${type === 'deflect' ? 'deflect-flash' : 'hit-flash'}`;
    setTimeout(() => {
      this.flashOverlay.className = 'flash-overlay';
    }, 90);
  }

  public setArenaInfo(title: string, objective: string): void {
    this.arenaTitle.textContent = title;
    this.arenaObjective.textContent = objective;
  }

  public showMenu(menuId: string): void {
    this.menuOverlay.classList.remove('hidden');
    this.hudElement.classList.add('hidden');

    const screens = document.querySelectorAll('.menu-screen');
    screens.forEach(s => s.classList.add('hidden'));

    const target = document.getElementById(menuId);
    if (target) {
      target.classList.remove('hidden');
      this.currentOpenMenu = menuId;
    }
  }

  public hideMenus(): void {
    this.menuOverlay.classList.add('hidden');
    this.hudElement.classList.remove('hidden');
    this.currentOpenMenu = null;
  }

  public isMenuOpen(): boolean {
    return this.currentOpenMenu !== null;
  }

  public showDefeatScreen(): void {
    this.showMenu('defeat-screen');
  }

  public showVictoryScreen(encounterTitle: string): void {
    const statsContainer = document.getElementById('victory-stats-content')!;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - this.stats.startTime) / 60000));

    statsContainer.innerHTML = `
      <div class="stat-row"><span>Encounter</span><span class="stat-val">${encounterTitle}</span></div>
      <div class="stat-row"><span>Perfect Deflections</span><span class="stat-val">${this.stats.perfectDeflections}</span></div>
      <div class="stat-row"><span>Executions Landed</span><span class="stat-val">${this.stats.executions}</span></div>
      <div class="stat-row"><span>Dodges Evaded</span><span class="stat-val">${this.stats.successfulDodges}</span></div>
      <div class="stat-row"><span>Damage Dealt</span><span class="stat-val">${this.stats.damageDealt}</span></div>
      <div class="stat-row"><span>Damage Taken</span><span class="stat-val">${this.stats.damageTaken}</span></div>
    `;

    this.showMenu('victory-screen');
  }

  public showStatsScreen(): void {
    const container = document.getElementById('all-time-stats')!;
    container.innerHTML = `
      <div class="stat-row"><span>Total Enemies Defeated</span><span class="stat-val">${this.stats.enemiesDefeated}</span></div>
      <div class="stat-row"><span>Total Perfect Deflections</span><span class="stat-val">${this.stats.perfectDeflections}</span></div>
      <div class="stat-row"><span>Normal Blocks</span><span class="stat-val">${this.stats.normalBlocks}</span></div>
      <div class="stat-row"><span>Total Executions</span><span class="stat-val">${this.stats.executions}</span></div>
      <div class="stat-row"><span>Total Dodges</span><span class="stat-val">${this.stats.successfulDodges}</span></div>
      <div class="stat-row"><span>Total Damage Dealt</span><span class="stat-val">${this.stats.damageDealt}</span></div>
      <div class="stat-row"><span>Total Damage Taken</span><span class="stat-val">${this.stats.damageTaken}</span></div>
    `;
    this.showMenu('stats-screen');
  }
}
