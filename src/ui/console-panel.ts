/**
 * G-code console: raw send/receive log and manual command input.
 */

import { store } from '../state.ts';
import { send } from '../serial/grbl.ts';
import { ConnectionState } from '../types.ts';
import { el } from './helpers.ts';

export function createConsolePanel(): HTMLElement {
  const logContainer = el('div', { className: 'console-log' });

  const input = el('input', {
    type: 'text',
    placeholder: 'Type G-code command...',
    className: 'console-input',
  }) as HTMLInputElement;

  const sendBtn = el('button', { className: 'btn-primary btn-sm' }, 'Send');

  async function sendCommand() {
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    try {
      await send(cmd);
    } catch (err) {
      store.log(`[console] Error: ${err}`);
    }
  }

  sendBtn.addEventListener('click', sendCommand);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCommand();
  });

  const inputRow = el('div', { className: 'console-input-row' }, input, sendBtn);

  const panel = el('section', { className: 'panel console-panel' },
    el('h2', {}, 'Console'),
    logContainer,
    inputRow,
  );

  let lastLogLength = 0;

  store.subscribe(() => {
    const { consoleLog, connection } = store.state;
    const disabled = connection !== ConnectionState.Connected;
    input.disabled = disabled;
    (sendBtn as HTMLButtonElement).disabled = disabled;

    // Only update if log changed
    if (consoleLog.length !== lastLogLength) {
      // Append new lines
      const newLines = consoleLog.slice(lastLogLength);
      for (const line of newLines) {
        const lineEl = el('div', {
          className: `console-line ${line.startsWith('>') ? 'sent' : line.startsWith('<') ? 'received' : 'info'}`,
        }, line);
        logContainer.appendChild(lineEl);
      }
      lastLogLength = consoleLog.length;

      // Auto-scroll
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });

  return panel;
}
