export type GameEventType =
  | 'hit'
  | 'perfect_deflect'
  | 'normal_block'
  | 'late_block'
  | 'dodge'
  | 'thrust_counter'
  | 'posture_break'
  | 'execution_ready'
  | 'execution_perform'
  | 'enemy_killed'
  | 'player_damaged'
  | 'player_death'
  | 'boss_phase_change'
  | 'lockon_changed'
  | 'special_attack'
  | 'camera_shake'
  | 'perilous_warning'
  | 'encounter_cleared';

export interface CombatEventData {
  attacker?: any;
  defender?: any;
  damage?: number;
  postureDamage?: number;
  hitPoint?: { x: number; y: number; z: number };
  attackType?: 'normal' | 'heavy' | 'thrust' | 'sweep' | 'grab' | 'special';
  phase?: number;
  message?: string;
  intensity?: number;
}

type EventCallback = (data: CombatEventData) => void;

class EventBusService {
  private listeners: Map<GameEventType, Set<EventCallback>> = new Map();

  public on(event: GameEventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: GameEventType, callback: EventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  public emit(event: GameEventType, data: CombatEventData = {}): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const callback of set) {
        callback(data);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new EventBusService();
