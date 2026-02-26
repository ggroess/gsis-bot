/**
 * High-level machine commands built on top of the GRBL protocol layer.
 */

import { send } from '../serial/grbl.ts';
import { store } from '../state.ts';
import type { Position } from '../types.ts';

/** Rapid move to absolute position */
export async function rapidMove(pos: Position): Promise<void> {
  await send(`G0 X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)}`);
}

/** Linear move at given feed rate */
export async function linearMove(
  pos: Position,
  feedRate: number,
): Promise<void> {
  await send(`G1 X${pos.x.toFixed(3)} Y${pos.y.toFixed(3)} F${feedRate}`);
}

/** Jog relative by dx, dy at the configured feed rate */
export async function jog(dx: number, dy: number): Promise<void> {
  // Use G91 (relative) then back to G90 (absolute)
  await send('G91');
  await send(`G0 X${dx.toFixed(3)} Y${dy.toFixed(3)}`);
  await send('G90');
}

/** Raise the pen / tip out of well (Z-axis move) */
export async function penUp(): Promise<void> {
  const { penUpValue } = store.state.runConfig;
  await send(`G0 Z${penUpValue}`);
  store.update({ penDown: false });
}

/** Lower the pen / tip into well (Z-axis move) */
export async function penDown(): Promise<void> {
  const { penDownValue } = store.state.runConfig;
  await send(`G0 Z${penDownValue}`);
  store.update({ penDown: true });
}

/** Home the machine */
export async function home(): Promise<void> {
  await send('$H');
}

/** Unlock (clear alarm) */
export async function unlock(): Promise<void> {
  await send('$X');
}

/** Set current position as origin (0,0) */
export async function setOrigin(): Promise<void> {
  await send('G10 L20 P1 X0 Y0');
}

/** Set absolute positioning mode */
export async function setAbsolute(): Promise<void> {
  await send('G90');
}

/** Set millimeter mode */
export async function setMillimeters(): Promise<void> {
  await send('G21');
}

/** Initialize machine after connection */
export async function initMachine(): Promise<void> {
  // Small delay to let GRBL boot
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await setAbsolute();
  await setMillimeters();
}

/**
 * Move to a well position: pen up, move, pen down.
 * Returns after pen is down in the well.
 */
export async function moveToWell(pos: Position): Promise<void> {
  const { feedRate } = store.state.runConfig;
  await penUp();
  await linearMove(pos, feedRate);
  await penDown();
}
