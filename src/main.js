import { Game } from './core/game.js';

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const game = new Game(canvas);

    // Start the game
    game.init();

    // Expose for debugging
    window.game = game;

    console.log('🌍 신의 손길 - God Simulation Started');
    console.log('Controls:');
    console.log('  Mouse drag: Pan camera');
    console.log('  Scroll: Zoom in/out');
    console.log('  WASD/Arrow keys: Pan camera');
    console.log('  Click: Select entity/tile');
    console.log('  Left panel: God powers');
});
