export type TvDirection = 'up' | 'down' | 'left' | 'right';

export interface RectBox {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Maps keyboard / Smart TV remote keys to spatial navigation directions.
 */
export function keyToTvDirection(key: string): TvDirection | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}

/**
 * Pure geometric spatial navigation solver for Smart TV / Android TV D-Pad remotes.
 * Given a currently focused bounding box and candidate boxes, selects the nearest
 * candidate along the requested directional cone while strongly penalizing orthogonal drift.
 */
export function findNextFocusableBox(
  current: RectBox,
  candidates: RectBox[],
  direction: TvDirection
): RectBox | null {
  const cx = current.left + current.width / 2;
  const cy = current.top + current.height / 2;

  let best: RectBox | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cand of candidates) {
    if (cand.id === current.id) continue;
    if (cand.width <= 0 || cand.height <= 0) continue;

    const tx = cand.left + cand.width / 2;
    const ty = cand.top + cand.height / 2;

    const dx = tx - cx;
    const dy = ty - cy;

    let primaryDist = 0;
    let secondaryDist = 0;

    if (direction === 'right') {
      if (dx <= 6) continue;
      primaryDist = dx;
      secondaryDist = Math.abs(dy);
    } else if (direction === 'left') {
      if (dx >= -6) continue;
      primaryDist = -dx;
      secondaryDist = Math.abs(dy);
    } else if (direction === 'down') {
      if (dy <= 6) continue;
      primaryDist = dy;
      secondaryDist = Math.abs(dx);
    } else if (direction === 'up') {
      if (dy >= -6) continue;
      primaryDist = -dy;
      secondaryDist = Math.abs(dx);
    }

    // Weighted Manhattan + Euclidean distance that favors elements aligned on the same row/column
    const score = primaryDist + secondaryDist * 2.4 + Math.hypot(primaryDist, secondaryDist) * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best;
}
