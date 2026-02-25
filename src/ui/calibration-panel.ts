/**
 * Calibration workflow: jog to 3 corner wells (A1, A8, F1) and capture positions.
 */

import { store } from '../state.ts';
import { CalibrationStep, ConnectionState } from '../types.ts';
import type { CalibrationData, Position } from '../types.ts';
import { saveCalibration } from '../storage.ts';
import { el, btn } from './helpers.ts';

const STEPS = [
  { step: CalibrationStep.CalibratingA1, label: 'A1 (top-left)', wellLabel: 'A1' },
  { step: CalibrationStep.CalibratingA8, label: 'A8 (top-right)', wellLabel: 'A8' },
  { step: CalibrationStep.CalibratingF1, label: 'F1 (bottom-left)', wellLabel: 'F1' },
];

export function createCalibrationPanel(): HTMLElement {
  let stepIndex = -1;
  const captured: Partial<CalibrationData> = {};

  const instructionText = el('p', { className: 'cal-instruction' }, 'Press "Start Calibration" then jog to each corner well.');

  const a1Text = el('span', {}, '---');
  const a8Text = el('span', {}, '---');
  const f1Text = el('span', {}, '---');
  const posSpans = [a1Text, a8Text, f1Text];

  function fmtPos(p: Position | undefined): string {
    return p ? `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})` : '---';
  }

  const captureBtn = btn('Capture Position', () => {
    if (stepIndex < 0 || stepIndex >= STEPS.length) return;
    const pos = { ...store.state.machinePosition };
    const step = STEPS[stepIndex];

    if (step.wellLabel === 'A1') captured.a1 = pos;
    if (step.wellLabel === 'A8') captured.a8 = pos;
    if (step.wellLabel === 'F1') captured.f1 = pos;

    posSpans[stepIndex].textContent = fmtPos(pos);
    store.log(`[cal] Captured ${step.wellLabel} at ${fmtPos(pos)}`);

    // Advance
    stepIndex++;
    if (stepIndex >= STEPS.length) {
      // Done
      const calData = captured as CalibrationData;
      store.update({ calibration: calData, calibrationStep: CalibrationStep.Complete });
      saveCalibration(calData);
      instructionText.textContent = 'Calibration complete! Positions saved.';
      captureBtn.disabled = true;
      store.log('[cal] Calibration saved');
    } else {
      store.update({ calibrationStep: STEPS[stepIndex].step });
      instructionText.textContent = `Jog to well ${STEPS[stepIndex].label}, then press Capture.`;
    }
  }, 'btn-primary');

  const startBtn = btn('Start Calibration', () => {
    stepIndex = 0;
    store.update({ calibrationStep: STEPS[0].step });
    instructionText.textContent = `Jog to well ${STEPS[0].label}, then press Capture.`;
    captureBtn.disabled = false;
    for (const s of posSpans) s.textContent = '---';
  }, 'btn-secondary');

  captureBtn.disabled = true;

  const posTable = el('div', { className: 'cal-positions' },
    el('div', {}, el('strong', {}, 'A1: '), a1Text),
    el('div', {}, el('strong', {}, 'A8: '), a8Text),
    el('div', {}, el('strong', {}, 'F1: '), f1Text),
  );

  const panel = el('section', { className: 'panel calibration-panel' },
    el('h2', {}, 'Calibration'),
    instructionText,
    posTable,
    el('div', { className: 'cal-actions' }, startBtn, captureBtn),
  );

  // Load existing calibration on init
  const existing = store.state.calibration;
  if (existing) {
    a1Text.textContent = fmtPos(existing.a1);
    a8Text.textContent = fmtPos(existing.a8);
    f1Text.textContent = fmtPos(existing.f1);
    instructionText.textContent = 'Calibration loaded from saved data.';
  }

  // Disable when not connected
  store.subscribe(() => {
    const disabled = store.state.connection !== ConnectionState.Connected;
    startBtn.disabled = disabled;
    if (disabled) captureBtn.disabled = true;
  });

  return panel;
}
