import { Game } from './game/Game.js';

const game = new Game({
  canvas: document.getElementById('game'),
  ui: document.getElementById('ui'),
});

game.start();
