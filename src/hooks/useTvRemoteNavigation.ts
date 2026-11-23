import { useEffect } from 'react';
import {
  findNextFocusableBox,
  keyToTvDirection,
  type RectBox,
} from '../utils/tvNavigation';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Enables Smart TV / Android TV D-Pad remote navigation (Arrow keys + Enter + Back)
 * across the visible interactive DOM elements. Automatically stays out of the way
 * while typing inside inputs or when the video player owns keyboard shortcuts.
 */
export function useTvRemoteNavigation(options: {
  enabled: boolean;
  suspended?: boolean;
}) {
  const { enabled, suspended = false } = options;

  useEffect(() => {
    if (!enabled || suspended) return;

    const handlePointerDown = () => {
      if (document.documentElement.dataset.keyboardNav === 'true') {
        document.documentElement.dataset.keyboardNav = 'false';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = keyToTvDirection(e.key);
      if (!dir) return;

      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName?.toLowerCase() || '';

      // Do not hijack arrow movement inside text inputs or textareas
      if (tag === 'input' || tag === 'textarea') {
        if (dir === 'left' || dir === 'right') return;
        if (tag === 'textarea') return;
      }

      document.documentElement.dataset.keyboardNav = 'true';

      // Limit scope to active modal dialog if one is open
      const openDialogs = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"]')
      );
      const scopeRoot: ParentNode =
        openDialogs.length > 0 ? openDialogs[openDialogs.length - 1] : document;

      const rawElements = Array.from(
        scopeRoot.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none';
      });

      if (rawElements.length === 0) return;

      const boxMap = new Map<string, HTMLElement>();
      const boxes: RectBox[] = rawElements.map((el, idx) => {
        const id = `tv_${idx}`;
        const r = el.getBoundingClientRect();
        boxMap.set(id, el);
        return {
          id,
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        };
      });

      const currentIdx = active ? rawElements.indexOf(active) : -1;
      const scrollBehavior: ScrollBehavior =
        document.documentElement.dataset.tvMode === 'true' ? 'auto' : 'smooth';

      if (currentIdx === -1) {
        e.preventDefault();
        rawElements[0].focus();
        rawElements[0].scrollIntoView({ behavior: scrollBehavior, block: 'nearest', inline: 'nearest' });
        return;
      }

      const nextBox = findNextFocusableBox(boxes[currentIdx], boxes, dir);
      if (nextBox) {
        const nextEl = boxMap.get(nextBox.id);
        if (nextEl) {
          e.preventDefault();
          nextEl.focus({ preventScroll: true });
          nextEl.scrollIntoView({
            behavior: scrollBehavior,
            block: 'nearest',
            inline: 'nearest',
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [enabled, suspended]);
}

