/**
 * 48-well plate visualization.
 *
 * The physical plate is rotated 90 degrees on the iDraw bed:
 *   - A1 is bottom-left, A8 is top-left
 *   - F1 is bottom-right, F8 is top-right
 *
 * We render: columns (8 down to 1) run top-to-bottom,
 * rows (A-F) run left-to-right. Uses CSS Grid for alignment.
 */

import { store } from '../state.ts';
import { PLATE_ROWS, PLATE_COLS, ROW_LABELS, wellId, WellState } from '../types.ts';
import { el } from './helpers.ts';

export function createPlateView(): HTMLElement {
  const cells = new Map<string, HTMLElement>();

  // CSS grid: 1 label col + 6 well cols, auto rows
  const grid = el('div', { className: 'plate-grid' });

  // Top-left empty corner
  grid.appendChild(el('div', { className: 'plate-header-corner' }));

  // Column headers: A B C D E F
  for (let r = 0; r < PLATE_ROWS; r++) {
    grid.appendChild(el('div', { className: 'plate-col-label' }, ROW_LABELS[r]));
  }

  // Rows: 8 (top) down to 1 (bottom)
  for (let c = PLATE_COLS - 1; c >= 0; c--) {
    // Row label
    grid.appendChild(el('div', { className: 'plate-label' }, String(c + 1)));

    // Wells for this column across all rows
    for (let r = 0; r < PLATE_ROWS; r++) {
      const id = wellId(r, c);
      const cell = el('div', {
        className: 'plate-well pending',
        title: id,
      }, id);
      cells.set(id, cell);
      grid.appendChild(cell);
    }
  }

  const panel = el('section', { className: 'panel plate-panel' },
    el('h2', {}, 'Plate'),
    grid,
  );

  store.subscribe(() => {
    const { wellStates, currentWell } = store.state;
    for (const [id, cell] of cells) {
      const state = wellStates.get(id) ?? WellState.Pending;
      cell.className = `plate-well ${state}`;
      if (id === currentWell) {
        cell.classList.add('current');
      }
    }
  });

  return panel;
}
