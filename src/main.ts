import './style.css';
import { Game } from './game/core/Game';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container #canvas-container not found!');
  }

  // Initialize and run ZANSHIN: BLADE OF RESOLVE
  const game = new Game(container);
  (window as any).__GAME_INSTANCE__ = game;
});
