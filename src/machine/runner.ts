/**
 * Run engine: automates the well-by-well traversal with configurable dwell time.
 *
 * Supports pause/resume/stop. The dwell timer runs in JS (not G-code)
 * so it can be paused mid-wait.
 */

import { store } from '../state.ts';
import { moveToWell, penUp, linearMove } from './commands.ts';
import { wellPosition, traversalOrder, dripOffPosition } from './plate.ts';
import { RunState, WellState } from '../types.ts';
import { clearQueue } from '../serial/grbl.ts';

let abortController: AbortController | null = null;
let pauseResolve: (() => void) | null = null;
let dwellTimer: ReturnType<typeof setInterval> | null = null;

/** Start the automated run */
export async function startRun(): Promise<void> {
  const { calibration, runConfig } = store.state;
  if (!calibration) {
    store.log('[runner] Cannot start: no calibration data');
    return;
  }

  abortController = new AbortController();
  store.resetWells();
  store.update({ runState: RunState.Running });
  store.log('[runner] Run started');

  const order = traversalOrder();

  try {
    for (const well of order) {
      // Check for abort
      if (abortController.signal.aborted) break;

      // Check for pause
      if (store.state.runState === RunState.Paused) {
        await waitForResume();
        if (abortController.signal.aborted) break;
      }

      // Update well state
      store.state.wellStates.set(well.wellId, WellState.Active);
      store.update({ currentWell: well.wellId });

      // Move to the well
      const pos = wellPosition(calibration, well.row, well.col);
      store.log(`[runner] Moving to ${well.wellId} (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
      await moveToWell(pos);

      if (abortController.signal.aborted) break;

      // Dwell
      store.log(`[runner] Dwelling in ${well.wellId} for ${runConfig.dwellTimeSec}s`);
      await dwell(runConfig.dwellTimeSec);

      if (abortController.signal.aborted) break;

      // Mark done
      store.state.wellStates.set(well.wellId, WellState.Done);
      store.update({});
    }

    // Finished — raise pen and move to drip-off position
    if (!abortController.signal.aborted) {
      await penUp();
      const dripOff = dripOffPosition(calibration);
      store.log(`[runner] Moving to drip-off position (${dripOff.x.toFixed(1)}, ${dripOff.y.toFixed(1)})`);
      await linearMove(dripOff, runConfig.feedRate);
      store.update({ runState: RunState.Complete, currentWell: null });
      store.log('[runner] Run complete');
    }
  } catch (err) {
    store.log(`[runner] Error: ${err}`);
    store.update({ runState: RunState.Idle });
  } finally {
    abortController = null;
    dwellTimer = null;
  }
}

/** Pause the current run */
export function pauseRun(): void {
  store.update({ runState: RunState.Paused });
  store.log('[runner] Paused');
}

/** Resume a paused run */
export function resumeRun(): void {
  store.update({ runState: RunState.Running });
  store.log('[runner] Resumed');
  if (pauseResolve) {
    pauseResolve();
    pauseResolve = null;
  }
}

/** Stop the current run */
export function stopRun(): void {
  if (abortController) {
    abortController.abort();
  }
  clearQueue();
  if (pauseResolve) {
    pauseResolve();
    pauseResolve = null;
  }
  if (dwellTimer) {
    clearInterval(dwellTimer);
    dwellTimer = null;
  }
  store.update({ runState: RunState.Idle, dwellRemainingSec: 0 });
  store.log('[runner] Stopped');
}

/** Wait until resumed or aborted */
function waitForResume(): Promise<void> {
  return new Promise((resolve) => {
    pauseResolve = resolve;
  });
}

/** Dwell for given seconds, updating countdown, supporting pause */
function dwell(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = seconds;
    store.update({ dwellRemainingSec: remaining });

    dwellTimer = setInterval(() => {
      // If paused, don't count down
      if (store.state.runState === RunState.Paused) return;

      remaining -= 1;
      store.update({ dwellRemainingSec: Math.max(0, remaining) });

      if (remaining <= 0) {
        clearInterval(dwellTimer!);
        dwellTimer = null;
        store.update({ dwellRemainingSec: 0 });
        resolve();
      }

      // If aborted, stop the timer
      if (abortController?.signal.aborted) {
        clearInterval(dwellTimer!);
        dwellTimer = null;
        resolve();
      }
    }, 1000);
  });
}
