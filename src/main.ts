import './style.css';
import { store } from './state.ts';
import { loadCalibration, loadRunConfig } from './storage.ts';
import { createConnectionPanel } from './ui/connection-panel.ts';
import { createJogPanel } from './ui/jog-panel.ts';
import { createPlateView } from './ui/plate-view.ts';
import { createCalibrationPanel } from './ui/calibration-panel.ts';
import { createConfigPanel } from './ui/config-panel.ts';
import { createRunPanel } from './ui/run-panel.ts';
import { createConsolePanel } from './ui/console-panel.ts';
import { el } from './ui/helpers.ts';

function init(): void {
  // Load persisted state
  const savedCal = loadCalibration();
  const savedConfig = loadRunConfig();
  store.update({
    calibration: savedCal,
    runConfig: savedConfig,
  });

  // Check for Web Serial API support
  if (!('serial' in navigator)) {
    document.querySelector('#app')!.innerHTML = `
      <div class="unsupported">
        <h1>Browser Not Supported</h1>
        <p>This app requires the <strong>Web Serial API</strong>, which is only available in
           <strong>Chrome/Edge 89+</strong>.</p>
        <p>Please open this page in Chrome or Edge.</p>
      </div>
    `;
    return;
  }

  const app = document.querySelector<HTMLDivElement>('#app')!;

  // Header with ASCII art logo
  const ascii = el('pre', { className: 'ascii-logo' },
`  ___  ___ ___ ___   ___      _
 / __|/ __|_ _/ __| | _ ) ___| |_
| (_ |\\__ \\| |\\__ \\ | _ \\/ _ \\  _|
 \\___|___/___|___/ |___/\\___/\\__|`);

  const header = el('header', { className: 'app-header' },
    ascii,
    el('span', { className: 'app-subtitle' }, '48-Well Plate Controller'),
  );

  // 2-column layout
  // Left: connection + plate + run + calibration
  // Right: jog + console + config
  const colLeft = el('div', { className: 'col col-left' },
    createConnectionPanel(),
    createPlateView(),
    createRunPanel(),
    createCalibrationPanel(),
  );

  const colRight = el('div', { className: 'col col-right' },
    createJogPanel(),
    createConsolePanel(),
    createConfigPanel(),
  );

  const main = el('div', { className: 'main-layout' }, colLeft, colRight);

  app.appendChild(header);
  app.appendChild(main);
}

init();
