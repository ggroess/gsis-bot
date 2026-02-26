/**
 * Connection controls: status dot, position readout, connect/disconnect buttons.
 * Designed to sit inline inside the app header bar.
 */

import { store } from '../state.ts';
import { connect, disconnect } from '../serial/connection.ts';
import { initGrbl, requestStatus } from '../serial/grbl.ts';
import { initMachine } from '../machine/commands.ts';
import { ConnectionState } from '../types.ts';
import { el, btn } from './helpers.ts';

export function createConnectionPanel(): HTMLElement {
  const statusDot = el('span', { className: 'status-dot disconnected' });
  const statusText = el('span', { className: 'status-text' }, 'Disconnected');
  const posText = el('span', { className: 'pos-text' }, 'X: 0.0  Y: 0.0');

  const connectBtn = btn('Connect', async () => {
    try {
      initGrbl();
      await connect();
      await initMachine();
      setInterval(() => requestStatus(), 1000);
    } catch (err) {
      store.log(`[ui] Connect failed: ${err}`);
    }
  }, 'btn-primary btn-sm');

  const disconnectBtn = btn('Disconnect', async () => {
    await disconnect();
  }, 'btn-danger btn-sm');

  const panel = el(
    'div',
    { className: 'connection-controls' },
    statusDot,
    statusText,
    posText,
    connectBtn,
    disconnectBtn,
  );

  store.subscribe(() => {
    const { connection, machinePosition } = store.state;
    statusDot.className = `status-dot ${connection}`;
    disconnectBtn.disabled = connection !== ConnectionState.Connected;

    switch (connection) {
      case ConnectionState.Disconnected:
        statusText.textContent = 'Disconnected';
        connectBtn.disabled = false;
        break;
      case ConnectionState.Connecting:
        statusText.textContent = 'Connecting...';
        connectBtn.disabled = true;
        break;
      case ConnectionState.Connected:
        statusText.textContent = 'Connected';
        connectBtn.disabled = true;
        break;
      case ConnectionState.Error:
        statusText.textContent = 'Error';
        connectBtn.disabled = false;
        break;
    }

    posText.textContent = `X: ${machinePosition.x.toFixed(1)}  Y: ${machinePosition.y.toFixed(1)}`;
  });

  return panel;
}
