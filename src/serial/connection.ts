/**
 * Web Serial API wrapper for communicating with the iDraw 2.0 (GRBL).
 * Handles connecting, reading lines, and writing commands.
 */

import { store } from '../state.ts';
import { ConnectionState } from '../types.ts';

let port: SerialPort | null = null;
let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let readLoopActive = false;

/** Buffered line reader callback */
type LineHandler = (line: string) => void;
let onLineReceived: LineHandler | null = null;

const encoder = new TextEncoder();
const BAUD_RATE = 115200;

export function setLineHandler(handler: LineHandler): void {
  onLineReceived = handler;
}

export async function connect(): Promise<void> {
  if (port) {
    throw new Error('Already connected');
  }

  store.update({ connection: ConnectionState.Connecting });

  try {
    // Web Serial API requires user gesture - requestPort shows a picker
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: BAUD_RATE });

    if (!port.readable || !port.writable) {
      throw new Error('Port is not readable/writable');
    }

    reader = port.readable.getReader();
    writer = port.writable.getWriter();

    store.update({ connection: ConnectionState.Connected });
    store.log(`[serial] Connected at ${BAUD_RATE} baud`);

    // Start reading
    readLoopActive = true;
    readLoop();
  } catch (err) {
    port = null;
    reader = null;
    writer = null;
    store.update({ connection: ConnectionState.Error });
    store.log(`[serial] Connection failed: ${err}`);
    throw err;
  }
}

export async function disconnect(): Promise<void> {
  readLoopActive = false;

  try {
    if (reader) {
      await reader.cancel();
      reader.releaseLock();
      reader = null;
    }
    if (writer) {
      writer.releaseLock();
      writer = null;
    }
    if (port) {
      await port.close();
      port = null;
    }
  } catch (_err) {
    // Ignore close errors
  }

  store.update({ connection: ConnectionState.Disconnected });
  store.log('[serial] Disconnected');
}

export async function writeLine(command: string): Promise<void> {
  if (!writer) {
    throw new Error('Not connected');
  }
  const data = encoder.encode(command + '\n');
  await writer.write(data);
  store.log(`> ${command}`);
}

export function isConnected(): boolean {
  return port !== null && store.state.connection === ConnectionState.Connected;
}

/** Continuously read from serial port and split into lines */
async function readLoop(): Promise<void> {
  let buffer = '';
  const decoder = new TextDecoder();

  while (readLoopActive && reader) {
    try {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split buffer on newlines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.replace(/\r/g, '').trim();
        if (line.length > 0) {
          store.log(`< ${line}`);
          onLineReceived?.(line);
        }
      }
    } catch (err) {
      if (readLoopActive) {
        store.log(`[serial] Read error: ${err}`);
        store.update({ connection: ConnectionState.Error });
      }
      break;
    }
  }
}
