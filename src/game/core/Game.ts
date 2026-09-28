import * as THREE from 'three';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { FinalBoss } from '../bosses/FinalBoss';
import { Miniboss, spawnMiniboss } from '../bosses/Minibosses';
import { spawnEnemyArchetype } from '../enemies/Archetypes';
import { CombatCamera } from '../camera/CombatCamera';
import { InputManager } from '../input/InputManager';
import { ParticleSystem } from '../effects/ParticleSystem';
import { CombatEngine, Combatant } from '../combat/CombatEngine';
import { ArenaBuilder, ArenaData } from '../scenes/ArenaBuilder';
import { LightingManager } from '../scenes/Lighting';
import { UIManager } from '../ui/UIManager';
import { DebugTools } from '../debug/DebugTools';
import { Time } from './Time';
import { AudioEngine } from '../audio/SoundManager';
import { EventBus } from './EventBus';
import { COMBAT_CONFIG, DifficultyLevel } from '../data/CombatConfig';

export type GameMode = 'campaign' | 'boss_rush' | 'training';

export class Game {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraManager: CombatCamera;
  private input: InputManager;
  private particles: ParticleSystem;
  private combatEngine: CombatEngine;
  private arenaBuilder: ArenaBuilder;
  private lighting: LightingManager;
  private ui: UIManager;
  private debug: DebugTools;

  // Entities
  private player: Player;
  private enemies: Enemy[] = [];
  private activeBoss: FinalBoss | Miniboss | null = null;
  private currentArenaData: ArenaData | null = null;

  // Progression
  private mode: GameMode = 'campaign';
  private campaignStage: number = 1;
  private bossRushStage: number = 1;
  private isEncounterRunning: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Three.js Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 2. Core Systems
    this.cameraManager = new CombatCamera(65, window.innerWidth / window.innerHeight);
    this.input = new InputManager(this.renderer.domElement);
    this.particles = new ParticleSystem(this.scene);
    this.combatEngine = new CombatEngine(this.particles, this.cameraManager);
    this.arenaBuilder = new ArenaBuilder(this.scene);
    this.lighting = new LightingManager(this.scene);
    this.ui = new UIManager(this.cameraManager.camera);
    this.debug = new DebugTools(this.scene);

    // 3. Player Creation
    this.player = new Player(this.scene);
    this.cameraManager.setPlayer(this.player.rig.root);

    // 4. Wire Global Events
    this.bindGameEvents();
    this.bindMenuButtons();

    // 5. Window Resize
    window.addEventListener('resize', () => this.onResize());

    // 6. Start Main Loop
    Time.init();
    requestAnimationFrame((t) => this.loop(t));
  }

  private bindGameEvents(): void {
    EventBus.on('player_death', () => {
      this.isEncounterRunning = false;
      this.input.unlockPointer();
      setTimeout(() => {
        this.ui.showDefeatScreen();
      }, 900);
    });

    EventBus.on('enemy_killed', () => {
      this.checkEncounterCompletion();
    });
  }

  private bindMenuButtons(): void {
    // Campaign Start
    document.getElementById('btn-campaign')?.addEventListener('click', () => {
      AudioEngine.init();
      this.startCampaignEncounter(1);
    });

    // Boss Rush Start
    document.getElementById('btn-boss-rush')?.addEventListener('click', () => {
      AudioEngine.init();
      this.startBossRushEncounter(1);
    });

    // Training Dojo
    document.getElementById('btn-training')?.addEventListener('click', () => {
      this.ui.showMenu('training-menu');
    });

    document.getElementById('btn-start-training')?.addEventListener('click', () => {
      AudioEngine.init();
      const enemyType = (document.getElementById('training-enemy-type') as HTMLSelectElement).value;
      this.startTrainingEncounter(enemyType);
    });

    // Arena Select
    document.getElementById('btn-arena-select')?.addEventListener('click', () => {
      this.ui.showMenu('arena-menu');
    });

    document.querySelectorAll('.arena-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const arena = (e.currentTarget as HTMLElement).getAttribute('data-arena') as any;
        AudioEngine.init();
        this.startCustomArena(arena);
      });
    });

    // Archives / Stats
    document.getElementById('btn-stats')?.addEventListener('click', () => {
      this.ui.showStatsScreen();
    });

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.ui.showMenu('settings-screen');
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.ui.showMenu('settings-screen');
    });

    // Settings Inputs
    document.getElementById('setting-difficulty')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value as DifficultyLevel;
      this.combatEngine.setDifficulty(val);
    });

    document.getElementById('setting-master-vol')?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value) / 100;
      AudioEngine.setVolumes(val, 0.9, 0.5);
    });

    document.getElementById('setting-screenshake')?.addEventListener('change', (e) => {
      this.cameraManager.screenShakeEnabled = (e.target as HTMLInputElement).checked;
    });

    // Pause & Resume
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.ui.hideMenus();
      this.input.lockPointer();
    });

    document.getElementById('btn-restart-encounter')?.addEventListener('click', () => {
      this.restartCurrentEncounter();
    });

    document.getElementById('btn-quit-to-menu')?.addEventListener('click', () => {
      this.clearEncounter();
      this.ui.showMenu('main-menu');
    });

    // Retry on Defeat
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      this.restartCurrentEncounter();
    });

    document.getElementById('btn-defeat-menu')?.addEventListener('click', () => {
      this.clearEncounter();
      this.ui.showMenu('main-menu');
    });

    // Next encounter on Victory
    document.getElementById('btn-victory-next')?.addEventListener('click', () => {
      if (this.mode === 'campaign') {
        this.startCampaignEncounter(this.campaignStage + 1);
      } else if (this.mode === 'boss_rush') {
        this.startBossRushEncounter(this.bossRushStage + 1);
      } else {
        this.restartCurrentEncounter();
      }
    });

    document.getElementById('btn-victory-menu')?.addEventListener('click', () => {
      this.clearEncounter();
      this.ui.showMenu('main-menu');
    });

    // Generic Back Buttons
    document.querySelectorAll('.back-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-target') || 'main-menu';
        this.ui.showMenu(target);
      });
    });
  }

  // ==========================================
  // ENCOUNTER LIFECYCLE
  // ==========================================

  public startCampaignEncounter(stage: number): void {
    this.mode = 'campaign';
    this.campaignStage = Math.min(5, Math.max(1, stage));
    this.clearEncounter();

    if (this.campaignStage === 1) {
      // Training Courtyard (Sparring Swordsman)
      this.setupArena('training');
      this.spawnEnemy('swordsman', this.currentArenaData!.spawnEnemyPos);
    } else if (this.campaignStage === 2) {
      // Bamboo Forest (Crimson Duelist & Spear Master)
      this.setupArena('forest');
      this.spawnEnemy('duelist', this.currentArenaData!.spawnEnemyPos);
      this.spawnEnemy('spear', this.currentArenaData!.spawnEnemyPos.clone().add(new THREE.Vector3(3, 0, 2)));
    } else if (this.campaignStage === 3) {
      // Sunken Temple (Miniboss: Iron Juggernaut)
      this.setupArena('temple');
      this.spawnBoss('juggernaut', this.currentArenaData!.spawnEnemyPos);
    } else if (this.campaignStage === 4) {
      // Pagoda Rooftops (Miniboss: Crimson Phantom)
      this.setupArena('rooftops');
      this.spawnBoss('phantom', this.currentArenaData!.spawnEnemyPos);
    } else if (this.campaignStage === 5) {
      // Moonlit Sovereign's Courtyard (Final Boss: Lord Genjiro)
      this.setupArena('boss');
      this.spawnFinalBoss(this.currentArenaData!.spawnEnemyPos);
    }

    this.startBattle();
  }

  public startBossRushEncounter(stage: number): void {
    this.mode = 'boss_rush';
    this.bossRushStage = Math.min(4, Math.max(1, stage));
    this.clearEncounter();

    if (this.bossRushStage === 1) {
      this.setupArena('temple');
      this.spawnBoss('kensei', this.currentArenaData!.spawnEnemyPos);
    } else if (this.bossRushStage === 2) {
      this.setupArena('forest');
      this.spawnBoss('juggernaut', this.currentArenaData!.spawnEnemyPos);
    } else if (this.bossRushStage === 3) {
      this.setupArena('rooftops');
      this.spawnBoss('phantom', this.currentArenaData!.spawnEnemyPos);
    } else if (this.bossRushStage === 4) {
      this.setupArena('boss');
      this.spawnFinalBoss(this.currentArenaData!.spawnEnemyPos);
    }

    this.startBattle();
  }

  public startTrainingEncounter(enemyType: string): void {
    this.mode = 'training';
    this.clearEncounter();
    this.setupArena('training');

    if (enemyType === 'boss') {
      this.spawnFinalBoss(this.currentArenaData!.spawnEnemyPos);
    } else {
      this.spawnEnemy(enemyType, this.currentArenaData!.spawnEnemyPos);
    }

    const infiniteHp = (document.getElementById('training-invulnerable-player') as HTMLInputElement)?.checked;
    if (infiniteHp) {
      this.debug.godMode = true;
    }

    this.startBattle();
  }

  public startCustomArena(arenaType: 'training' | 'forest' | 'temple' | 'rooftops' | 'boss'): void {
    this.clearEncounter();
    this.setupArena(arenaType);

    if (arenaType === 'boss') {
      this.spawnFinalBoss(this.currentArenaData!.spawnEnemyPos);
    } else if (arenaType === 'temple') {
      this.spawnBoss('juggernaut', this.currentArenaData!.spawnEnemyPos);
    } else {
      this.spawnEnemy('duelist', this.currentArenaData!.spawnEnemyPos);
    }

    this.startBattle();
  }

  private setupArena(type: 'training' | 'forest' | 'temple' | 'rooftops' | 'boss'): void {
    this.currentArenaData = this.arenaBuilder.buildArena(type);
    this.lighting.setAtmosphere(type);
    this.particles.setWeather(this.currentArenaData.weather);
    this.ui.setArenaInfo(this.currentArenaData.title, this.currentArenaData.objective);
    this.player.position.copy(this.currentArenaData.spawnPlayerPos);
  }

  private spawnEnemy(type: string, pos: THREE.Vector3): void {
    const enemy = spawnEnemyArchetype(this.scene, type, pos);
    this.enemies.push(enemy);
  }

  private spawnBoss(type: 'kensei' | 'juggernaut' | 'phantom', pos: THREE.Vector3): void {
    const miniboss = spawnMiniboss(this.scene, type, pos);
    this.enemies.push(miniboss);
    this.activeBoss = miniboss;
  }

  private spawnFinalBoss(pos: THREE.Vector3): void {
    const finalBoss = new FinalBoss(this.scene, pos);
    this.enemies.push(finalBoss);
    this.activeBoss = finalBoss;
  }

  private startBattle(): void {
    // Reset Player
    this.player.health = this.player.maxHealth;
    this.player.posture = 0;
    this.player.isPostureBroken = false;
    this.player.isDead = false;
    this.player.healCharges = COMBAT_CONFIG.PLAYER_HEAL_CHARGES_MAX;
    this.player.transitionTo('IDLE');

    // Auto-lock onto primary enemy
    if (this.enemies.length > 0) {
      this.cameraManager.setLockTarget(this.enemies[0].rig.root);
    }

    this.ui.hideMenus();
    this.input.lockPointer();
    this.isEncounterRunning = true;
    AudioEngine.setInCombat(true);
  }

  public restartCurrentEncounter(): void {
    if (this.mode === 'campaign') {
      this.startCampaignEncounter(this.campaignStage);
    } else if (this.mode === 'boss_rush') {
      this.startBossRushEncounter(this.bossRushStage);
    } else {
      this.startTrainingEncounter('swordsman');
    }
  }

  private clearEncounter(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.root);
    }
    this.enemies = [];
    this.activeBoss = null;
    this.cameraManager.setLockTarget(null);
    AudioEngine.setInCombat(false);
  }

  private checkEncounterCompletion(): void {
    const aliveEnemies = this.enemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0 && this.isEncounterRunning) {
      this.isEncounterRunning = false;
      this.input.unlockPointer();
      setTimeout(() => {
        this.ui.showVictoryScreen(this.currentArenaData?.title || 'Encounter Resolved');
      }, 1200);
    }
  }

  // ==========================================
  // MAIN UPDATE LOOP
  // ==========================================

  private loop(timestamp: number): void {
    requestAnimationFrame((t) => this.loop(t));

    Time.update(timestamp);
    const delta = Time.delta;

    // Handle Pause Toggle
    if (this.input.state.escapePressed) {
      if (this.ui.isMenuOpen()) {
        this.ui.hideMenus();
        this.input.lockPointer();
      } else {
        this.ui.showMenu('pause-menu');
        this.input.unlockPointer();
      }
    }

    if (!this.ui.isMenuOpen() && this.isEncounterRunning) {
      // 1. Mouse Look update
      this.cameraManager.onMouseMove(this.input.mouseMovementX, this.input.mouseMovementY);

      // 2. Lock-on Toggle [Q] & Target Cycling
      if (this.input.state.lockonPressed) {
        this.handleLockonToggle();
      }
      if (this.input.state.switchTargetDir !== 0) {
        this.cycleLockTarget(this.input.state.switchTargetDir);
      }

      // 3. Execution & Counter Trigger Check [E]
      const postureBrokenEnemy = this.findNearbyPostureBrokenEnemy();
      if (this.input.state.actionPressed) {
        if (postureBrokenEnemy) {
          this.executeEnemy(postureBrokenEnemy);
        } else {
          this.checkThrustCounterAttempt();
        }
      }

      // 4. Update Player
      this.player.update(
        delta,
        this.input,
        this.cameraManager,
        this.combatEngine,
        this.particles,
        this.enemies
      );

      // 5. Update Enemies
      for (const enemy of this.enemies) {
        enemy.update(delta, this.player, this.combatEngine);
      }

      // 6. Update Camera
      this.cameraManager.update(delta, this.currentArenaData?.colliders);

      // 7. Update Particles
      this.particles.update(delta);

      // 8. Update HUD & Reticles
      const lockedObj = this.cameraManager.getLockTarget();
      const lockedCombatant = this.enemies.find(e => e.rig.root === lockedObj) || null;
      this.ui.updateHUD(this.player, this.activeBoss, lockedCombatant, postureBrokenEnemy);

      // 9. Update Debug Tools
      this.debug.update(this.player, this.enemies);
    }

    // Reset single frame input triggers
    this.input.endFrame();

    // Render Scene
    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  private handleLockonToggle(): void {
    if (this.cameraManager.getLockTarget()) {
      this.cameraManager.setLockTarget(null);
    } else {
      const nearest = this.findNearestAliveEnemy();
      if (nearest) {
        this.cameraManager.setLockTarget(nearest.rig.root);
      }
    }
  }

  private cycleLockTarget(dir: number): void {
    const alive = this.enemies.filter(e => !e.isDead);
    if (alive.length <= 1) return;

    const current = this.cameraManager.getLockTarget();
    let idx = alive.findIndex(e => e.rig.root === current);
    idx = (idx + dir + alive.length) % alive.length;
    this.cameraManager.setLockTarget(alive[idx].rig.root);
  }

  private findNearestAliveEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = COMBAT_CONFIG.LOCKON_MAX_DISTANCE;

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const d = this.player.position.distanceTo(enemy.position);
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private findNearbyPostureBrokenEnemy(): Enemy | null {
    for (const enemy of this.enemies) {
      if (!enemy.isDead && enemy.isPostureBroken) {
        if (this.player.position.distanceTo(enemy.position) <= COMBAT_CONFIG.MELEE_RANGE + 1.2) {
          return enemy;
        }
      }
    }
    return null;
  }

  private executeEnemy(enemy: Enemy): void {
    this.player.performExecutionOn(enemy);
    this.ui.showFeedback('DEATHBLOW');

    if (enemy instanceof FinalBoss || enemy instanceof Miniboss) {
      const isDead = (enemy as any).executeDeathblow();
      if (isDead) {
        EventBus.emit('enemy_killed', { attacker: this.player, defender: enemy });
      }
    } else {
      enemy.isDead = true;
      enemy.transitionTo('EXECUTION_VICTIM');
      setTimeout(() => {
        enemy.transitionTo('DEAD');
        EventBus.emit('enemy_killed', { attacker: this.player, defender: enemy });
      }, 1200);
    }
  }

  private checkThrustCounterAttempt(): void {
    for (const enemy of this.enemies) {
      if (!enemy.isDead && enemy.currentAttackType === 'thrust' && enemy.aiState === 'ATTACK') {
        const d = this.player.position.distanceTo(enemy.position);
        if (d <= COMBAT_CONFIG.THRUST_COUNTER_MAX_RANGE + 0.8) {
          // Trigger the specific, cinematic Mikiri Counter Stomp!
          this.player.performMikiriCounter(enemy, this.particles, this.cameraManager);
          (enemy as any).onMikiriVictim();
          this.combatEngine.triggerThrustCounter(enemy, this.player, enemy.rig.getWeaponTipWorld());
          break;
        }
      }
    }
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.cameraManager.onResize(w, h);
    this.renderer.setSize(w, h);
  }
}
