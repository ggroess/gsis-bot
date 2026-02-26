/**
 * Run configuration: dwell time, feed rate, servo values.
 */

import { store } from '../state.ts';
import { saveRunConfig } from '../storage.ts';
import { el } from './helpers.ts';

function numberInput(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (val: number) => void,
): HTMLElement {
  const input = el('input', {
    type: 'number',
    value: String(value),
    min: String(min),
    max: String(max),
    step: String(step),
  }) as HTMLInputElement;

  input.addEventListener('change', () => {
    const val = parseFloat(input.value);
    if (!isNaN(val)) {
      onChange(val);
      saveRunConfig(store.state.runConfig);
    }
  });

  return el('div', { className: 'config-field' },
    el('label', {}, label),
    input,
  );
}

export function createConfigPanel(): HTMLElement {
  const config = store.state.runConfig;

  const panel = el('section', { className: 'panel config-panel' },
    el('h2', {}, 'Run Configuration'),
    numberInput('Dwell time (sec)', config.dwellTimeSec, 1, 3600, 1, (v) => {
      store.state.runConfig.dwellTimeSec = v;
    }),
    numberInput('XY speed (mm/min)', config.feedRate, 100, 10000, 100, (v) => {
      store.state.runConfig.feedRate = v;
    }),
    numberInput('Z speed (mm/min)', config.zFeedRate, 10, 2000, 10, (v) => {
      store.state.runConfig.zFeedRate = v;
    }),
    numberInput('Z up / raised (mm)', config.penUpValue, 0, 50, 0.5, (v) => {
      store.state.runConfig.penUpValue = v;
    }),
    numberInput('Z down / in well (mm)', config.penDownValue, 0, 50, 0.5, (v) => {
      store.state.runConfig.penDownValue = v;
    }),
  );

  return panel;
}
