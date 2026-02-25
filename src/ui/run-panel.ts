/**
 * Run control panel: start/pause/resume/stop + progress display.
 */

import { store } from '../state.ts';
import { startRun, pauseRun, resumeRun, stopRun } from '../machine/runner.ts';
import { RunState, ConnectionState, WellState, PLATE_ROWS, PLATE_COLS } from '../types.ts';
import { el, btn } from './helpers.ts';

export function createRunPanel(): HTMLElement {
  const startBtn = btn('Start Run', () => startRun(), 'btn-primary btn-lg');
  const pauseBtn = btn('Pause', () => pauseRun(), 'btn-secondary');
  const resumeBtn = btn('Resume', () => resumeRun(), 'btn-primary');
  const stopBtn = btn('Stop', () => stopRun(), 'btn-danger');

  const currentWellText = el('span', { className: 'run-well' }, '---');
  const dwellText = el('span', { className: 'run-dwell' }, '---');
  const progressText = el('span', { className: 'run-progress' }, '0 / 48');
  const progressBar = el('div', { className: 'progress-bar-fill' });
  const progressBarContainer = el('div', { className: 'progress-bar' }, progressBar);

  const statusText = el('span', { className: 'run-status' }, 'Idle');

  const panel = el('section', { className: 'panel run-panel' },
    el('h2', {}, 'Run'),
    el('div', { className: 'run-info' },
      el('div', {}, el('strong', {}, 'Status: '), statusText),
      el('div', {}, el('strong', {}, 'Current Well: '), currentWellText),
      el('div', {}, el('strong', {}, 'Dwell Remaining: '), dwellText),
      el('div', {}, el('strong', {}, 'Progress: '), progressText),
    ),
    progressBarContainer,
    el('div', { className: 'run-actions' }, startBtn, pauseBtn, resumeBtn, stopBtn),
  );

  store.subscribe(() => {
    const { runState, currentWell, dwellRemainingSec, wellStates, connection, calibration } = store.state;
    const total = PLATE_ROWS * PLATE_COLS;
    let done = 0;
    for (const s of wellStates.values()) {
      if (s === WellState.Done) done++;
    }

    currentWellText.textContent = currentWell ?? '---';
    dwellText.textContent = dwellRemainingSec > 0 ? `${dwellRemainingSec}s` : '---';
    progressText.textContent = `${done} / ${total}`;
    progressBar.style.width = `${(done / total) * 100}%`;
    statusText.textContent = runState.charAt(0).toUpperCase() + runState.slice(1);

    const connected = connection === ConnectionState.Connected;
    const hasCalibration = calibration !== null;

    startBtn.style.display = (runState === RunState.Idle || runState === RunState.Complete) ? '' : 'none';
    startBtn.disabled = !connected || !hasCalibration;
    if (!hasCalibration) {
      startBtn.title = 'Calibrate the plate first';
    } else {
      startBtn.title = '';
    }

    pauseBtn.style.display = runState === RunState.Running ? '' : 'none';
    resumeBtn.style.display = runState === RunState.Paused ? '' : 'none';
    stopBtn.style.display = (runState === RunState.Running || runState === RunState.Paused) ? '' : 'none';
  });

  return panel;
}
