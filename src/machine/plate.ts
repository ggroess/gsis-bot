/**
 * 48-well plate model.
 *
 * Uses 3-point calibration (A1, A8, F1 corners) to compute
 * machine coordinates for all 48 wells via bilinear interpolation.
 */

import type { CalibrationData, Position, WellId } from '../types.ts';
import { PLATE_ROWS, PLATE_COLS, wellId } from '../types.ts';

/**
 * Compute machine position for a well given calibration data.
 *
 * Uses bilinear interpolation from 3 corners:
 *   A1 = top-left  (row=0, col=0)
 *   A8 = top-right (row=0, col=7)
 *   F1 = bottom-left (row=5, col=0)
 *
 * The 4th corner (F8) is derived: F8 = F1 + (A8 - A1)
 */
export function wellPosition(
  cal: CalibrationData,
  row: number,
  col: number,
): Position {
  const rowFrac = row / (PLATE_ROWS - 1); // 0..1 from A to F
  const colFrac = col / (PLATE_COLS - 1); // 0..1 from 1 to 8

  // Derive the 4th corner
  const f8: Position = {
    x: cal.f1.x + (cal.a8.x - cal.a1.x),
    y: cal.f1.y + (cal.a8.y - cal.a1.y),
  };

  // Bilinear interpolation
  const x =
    (1 - rowFrac) * (1 - colFrac) * cal.a1.x +
    (1 - rowFrac) * colFrac * cal.a8.x +
    rowFrac * (1 - colFrac) * cal.f1.x +
    rowFrac * colFrac * f8.x;

  const y =
    (1 - rowFrac) * (1 - colFrac) * cal.a1.y +
    (1 - rowFrac) * colFrac * cal.a8.y +
    rowFrac * (1 - colFrac) * cal.f1.y +
    rowFrac * colFrac * f8.y;

  return { x, y };
}

/**
 * Generate the full traversal order: column by column.
 * A1 -> B1 -> C1 -> D1 -> E1 -> F1 -> A2 -> B2 -> ... -> F8
 */
export function traversalOrder(): Array<{
  wellId: WellId;
  row: number;
  col: number;
}> {
  const order: Array<{ wellId: WellId; row: number; col: number }> = [];
  for (let c = 0; c < PLATE_COLS; c++) {
    for (let r = 0; r < PLATE_ROWS; r++) {
      order.push({ wellId: wellId(r, c), row: r, col: c });
    }
  }
  return order;
}

/**
 * Compute a "drip-off" position one column past the last well.
 * After the run finishes the tip moves here so residual fluid
 * doesn't accumulate in the last real well.
 */
export function dripOffPosition(cal: CalibrationData): Position {
  // Extrapolate one column beyond column 8 (index 8, which is PLATE_COLS)
  // using the same interpolation but with col = PLATE_COLS
  const colFrac = PLATE_COLS / (PLATE_COLS - 1);
  const rowFrac = 0.5; // center row

  const f8: Position = {
    x: cal.f1.x + (cal.a8.x - cal.a1.x),
    y: cal.f1.y + (cal.a8.y - cal.a1.y),
  };

  const x =
    (1 - rowFrac) * (1 - colFrac) * cal.a1.x +
    (1 - rowFrac) * colFrac * cal.a8.x +
    rowFrac * (1 - colFrac) * cal.f1.x +
    rowFrac * colFrac * f8.x;

  const y =
    (1 - rowFrac) * (1 - colFrac) * cal.a1.y +
    (1 - rowFrac) * colFrac * cal.a8.y +
    rowFrac * (1 - colFrac) * cal.f1.y +
    rowFrac * colFrac * f8.y;

  return { x, y };
}

/**
 * Compute all well positions given calibration data.
 */
export function allWellPositions(
  cal: CalibrationData,
): Map<WellId, Position> {
  const positions = new Map<WellId, Position>();
  for (let r = 0; r < PLATE_ROWS; r++) {
    for (let c = 0; c < PLATE_COLS; c++) {
      positions.set(wellId(r, c), wellPosition(cal, r, c));
    }
  }
  return positions;
}
