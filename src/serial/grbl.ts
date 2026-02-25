/**
 * GRBL protocol layer.
 *
 * Sends G-code commands one at a time, waits for 'ok' or 'error' before
 * sending the next. Queues commands internally so callers can fire-and-forget.
 */

import { writeLine, setLineHandler, isConnected } from './connection.ts';
import { store } from '../state.ts';

type CommandResolve = (response: string) => void;
type CommandReject = (err: Error) => void;

interface QueuedCommand {
  command: string;
  resolve: CommandResolve;
  reject: CommandReject;
}

const queue: QueuedCommand[] = [];
let pending: QueuedCommand | null = null;

/** Status report listeners */
type StatusHandler = (status: GrblStatus) => void;
let onStatus: StatusHandler | null = null;

export interface GrblStatus {
  state: string;
  mpos: { x: number; y: number; z: number };
}

function handleLine(line: string): void {
  // Status report: <Idle|MPos:0.000,0.000,0.000|...>
  if (line.startsWith('<') && line.endsWith('>')) {
    const status = parseStatusReport(line);
    if (status) {
      onStatus?.(status);
      store.update({
        machinePosition: { x: status.mpos.x, y: status.mpos.y },
      });
    }
    return;
  }

  // Welcome message (GRBL boot)
  if (line.startsWith('Grbl')) {
    store.log(`[grbl] Controller ready: ${line}`);
    return;
  }

  // Response to a queued command
  if (pending) {
    if (line === 'ok') {
      pending.resolve('ok');
      pending = null;
      processNext();
    } else if (line.startsWith('error')) {
      pending.reject(new Error(line));
      pending = null;
      processNext();
    }
    // ALARM, etc. — could also handle here
    return;
  }
}

function parseStatusReport(raw: string): GrblStatus | null {
  // Example: <Idle|MPos:0.000,5.000,0.000|FS:0,0>
  const inner = raw.slice(1, -1);
  const parts = inner.split('|');
  const state = parts[0];

  let mpos = { x: 0, y: 0, z: 0 };
  for (const part of parts) {
    if (part.startsWith('MPos:')) {
      const coords = part.slice(5).split(',').map(Number);
      mpos = { x: coords[0] ?? 0, y: coords[1] ?? 0, z: coords[2] ?? 0 };
    }
  }

  return { state, mpos };
}

function processNext(): void {
  if (pending || queue.length === 0) return;
  if (!isConnected()) return;

  pending = queue.shift()!;
  writeLine(pending.command).catch((err) => {
    pending?.reject(err);
    pending = null;
  });
}

/** Send a G-code command and wait for response */
export function send(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    queue.push({ command, resolve, reject });
    processNext();
  });
}

/**
 * Send a realtime command (single character, no newline, no queue).
 * Used for ?, !, ~, and Ctrl-X (soft reset).
 */
export async function sendRealtime(char: string): Promise<void> {
  if (!isConnected()) throw new Error('Not connected');
  // Realtime commands bypass the queue — they don't get 'ok' responses
  await writeLine(char.replace('\n', ''));
}

/** Request a status report (? command — realtime, doesn't queue) */
export function requestStatus(): void {
  if (isConnected()) {
    // ? is a realtime command — just write it directly
    writeLine('?').catch(() => {});
  }
}

export function setStatusHandler(handler: StatusHandler): void {
  onStatus = handler;
}

/** Initialize the GRBL line handler */
export function initGrbl(): void {
  setLineHandler(handleLine);
}

/** Clear the command queue (e.g. on stop) */
export function clearQueue(): void {
  for (const item of queue) {
    item.reject(new Error('Queue cleared'));
  }
  queue.length = 0;
  if (pending) {
    pending.reject(new Error('Queue cleared'));
    pending = null;
  }
}
