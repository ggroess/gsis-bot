/**
 * Manual jog controls: directional arrows, pen up/down, home, set origin.
 */

import { store } from '../state.ts';
import { jog, penUp, penDown, home, unlock, setOrigin } from '../machine/commands.ts';
import { ConnectionState } from '../types.ts';
import { el, btn } from './helpers.ts';

const JOG_DISTANCES = [0.1, 1, 5, 10];

export function createJogPanel(): HTMLElement {
  let jogDist = 5;

  // Distance selector
  const distBtns = JOG_DISTANCES.map((d) => {
    const b = btn(`${d}`, () => {
      jogDist = d;
      updateDistBtns();
    }, d === jogDist ? 'btn-sm btn-active' : 'btn-sm');
    b.dataset.dist = String(d);
    return b;
  });

  function updateDistBtns() {
    for (const b of distBtns) {
      b.className = Number(b.dataset.dist) === jogDist ? 'btn-sm btn-active' : 'btn-sm';
    }
  }

  const distRow = el('div', { className: 'jog-dist-row' },
    el('span', {}, 'Step (mm):'),
    ...distBtns,
  );

  // Arrow buttons
  const upBtn = btn('Y+', () => jog(0, -jogDist), 'btn-jog');
  const downBtn = btn('Y-', () => jog(0, jogDist), 'btn-jog');
  const leftBtn = btn('X-', () => jog(-jogDist, 0), 'btn-jog');
  const rightBtn = btn('X+', () => jog(jogDist, 0), 'btn-jog');

  const arrows = el('div', { className: 'jog-arrows' },
    el('div', { className: 'jog-row' }, upBtn),
    el('div', { className: 'jog-row' }, leftBtn, el('div', { className: 'jog-spacer' }), rightBtn),
    el('div', { className: 'jog-row' }, downBtn),
  );

  // Pen & home controls
  const penUpBtn = btn('Pen Up', () => penUp(), 'btn-secondary');
  const penDownBtn = btn('Pen Down', () => penDown(), 'btn-secondary');
  const homeBtn = btn('Home', () => home(), 'btn-secondary');
  const unlockBtn = btn('Unlock', () => unlock(), 'btn-secondary');
  const originBtn = btn('Set Origin', () => setOrigin(), 'btn-secondary');

  const penIndicator = el('span', { className: 'pen-indicator' }, 'UP');

  const actions = el('div', { className: 'jog-actions' },
    el('div', { className: 'jog-pen-row' },
      penUpBtn, penDownBtn, el('span', {}, 'Pen: '), penIndicator,
    ),
    el('div', { className: 'jog-home-row' }, homeBtn, unlockBtn, originBtn),
  );

  const panel = el('section', { className: 'panel jog-panel' },
    el('h2', {}, 'Manual Controls'),
    distRow,
    arrows,
    actions,
  );

  // Disable when not connected
  const allBtns = [upBtn, downBtn, leftBtn, rightBtn, penUpBtn, penDownBtn, homeBtn, unlockBtn, originBtn];

  store.subscribe(() => {
    const disabled = store.state.connection !== ConnectionState.Connected;
    for (const b of allBtns) b.disabled = disabled;
    penIndicator.textContent = store.state.penDown ? 'DOWN' : 'UP';
    penIndicator.className = `pen-indicator ${store.state.penDown ? 'down' : 'up'}`;
  });

  return panel;
}
