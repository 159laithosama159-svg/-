export type SpatialDirection = 'up' | 'down' | 'left' | 'right';

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SpatialCandidate<T = HTMLElement> {
  item: T;
  rect: RectLike;
}

/**
 * Pure geometric 2D spatial navigation solver for Smart TV D-Pad & keyboard arrow keys.
 * Chooses the nearest focusable target in the requested cardinal direction with strong
 * primary-axis alignment preference (just like Android TV / Apple TV focus engines).
 */
export function findNextSpatialFocusTarget<T>(
  currentRect: RectLike,
  candidates: SpatialCandidate<T>[],
  direction: SpatialDirection
): T | null {
  const curCx = currentRect.left + currentRect.width / 2;
  const curCy = currentRect.top + currentRect.height / 2;

  let bestItem: T | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cand of candidates) {
    const r = cand.rect;
    if (r.width <= 0 || r.height <= 0) continue;

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - curCx;
    const dy = cy - curCy;

    let primary = 0;
    let orthogonal = 0;

    if (direction === 'right') {
      if (dx <= 6) continue;
      primary = dx;
      orthogonal = Math.abs(dy);
    } else if (direction === 'left') {
      if (dx >= -6) continue;
      primary = -dx;
      orthogonal = Math.abs(dy);
    } else if (direction === 'down') {
      if (dy <= 6) continue;
      primary = dy;
      orthogonal = Math.abs(dx);
    } else {
      if (dy >= -6) continue;
      primary = -dy;
      orthogonal = Math.abs(dx);
    }

    // Prefer elements aligned on the same row/column, while still allowing diagonal jumps
    const score = primary + orthogonal * 2.4;
    if (score < bestScore) {
      bestScore = score;
      bestItem = cand.item;
    }
  }

  return bestItem;
}

export function isSmartTvUserAgent(ua: string): boolean {
  return /(Android TV|GoogleTV|SmartTV|SMART-TV|Tizen|Web0S|WebOS|BRAVIA|TV Bro|AFTB|AFTT|AFTM|AFTN|CrKey|HbbTV|NetCast|Viera|Xbox|PlayStation)/i.test(
    String(ua || '')
  );
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisibleElement(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
    return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}

export function getActiveFocusRoot(): ParentNode {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(
    isVisibleElement
  );
  if (dialogs.length > 0) {
    return dialogs[dialogs.length - 1];
  }
  return document;
}

/**
 * Moves DOM focus to the spatially nearest element in the given Arrow direction.
 * Returns true if focus moved successfully.
 */
export function moveSpatialFocus(direction: SpatialDirection): boolean {
  if (typeof document === 'undefined') return false;
  const root = getActiveFocusRoot();
  const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isVisibleElement
  );
  if (focusables.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  if (!active || !focusables.includes(active)) {
    focusables[0].focus({ preventScroll: false });
    focusables[0].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  const currentRect = active.getBoundingClientRect();
  const candidates: SpatialCandidate<HTMLElement>[] = [];
  for (const el of focusables) {
    if (el === active) continue;
    candidates.push({ item: el, rect: el.getBoundingClientRect() });
  }

  const next = findNextSpatialFocusTarget(currentRect, candidates, direction);
  if (!next) return false;

  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}
