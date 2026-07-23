import { useEffect, useRef } from 'react';

/**
 * The site's signature interaction: a two-part cursor.
 *
 *   dot   — tracks the pointer exactly, so precision never suffers
 *   ring  — lags behind on a spring, and is the part that reacts
 *
 * Elements opt in by declaring `data-cursor`:
 *   data-cursor="link"                 ring swells, dot hides
 *   data-cursor="view" data-cursor-label="Bax"   ring becomes a filled cobalt
 *                                                disc carrying that label
 *
 * This only mounts for fine pointers (mouse/trackpad) with motion allowed.
 * Touch and reduced-motion visitors get their normal cursor and lose nothing,
 * because every `data-cursor` element is a real link or button underneath.
 */

type Mode = 'default' | 'link' | 'view';

const LERP = 0.16;

export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || still.matches) return;

    if (!dotRef.current || !ringRef.current || !labelRef.current) return;
    // Bound after the guard so the closures below carry non-null types.
    const dot: HTMLDivElement = dotRef.current;
    const ring: HTMLDivElement = ringRef.current;
    const label: HTMLSpanElement = labelRef.current;

    const root = document.documentElement;
    root.setAttribute('data-cursor-active', '');

    // Start off-screen so nothing flashes at 0,0 before the first move.
    let px = -100;
    let py = -100;
    let rx = -100;
    let ry = -100;
    let mode: Mode = 'default';
    let visible = false;
    let frame = 0;

    const sizes: Record<Mode, number> = { default: 34, link: 62, view: 96 };

    function apply(next: Mode, text: string) {
      if (next === mode) return;
      mode = next;

      const size = sizes[next];
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;

      if (next === 'view') {
        ring.style.backgroundColor = 'var(--color-blue)';
        ring.style.borderColor = 'transparent';
        label.textContent = text;
        label.style.opacity = '1';
      } else {
        ring.style.backgroundColor = 'transparent';
        ring.style.borderColor = 'var(--color-blue)';
        label.style.opacity = '0';
      }

      // The dot would sit inside the swollen ring and read as a smudge.
      dot.style.opacity = next === 'default' ? '1' : '0';
    }

    function onMove(e: PointerEvent) {
      px = e.clientX;
      py = e.clientY;

      if (!visible) {
        visible = true;
        // Snap the ring on the very first move so it does not fly in from
        // the corner.
        rx = px;
        ry = py;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
    }

    function onOver(e: PointerEvent) {
      const target = e.target as Element | null;
      const hit = target?.closest?.('[data-cursor]') as HTMLElement | null;

      if (!hit) {
        apply('default', '');
        return;
      }
      const kind = hit.dataset.cursor as Mode | undefined;
      apply(kind === 'view' ? 'view' : 'link', hit.dataset.cursorLabel ?? '');
    }

    function onLeave() {
      visible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    }

    function tick() {
      rx += (px - rx) * LERP;
      ry += (py - ry) * LERP;
      dot.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    // A click that opens a native dialog or navigates can leave the ring stuck
    // in its swollen state; reset on blur.
    window.addEventListener('blur', onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      root.removeAttribute('data-cursor-active');
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[300] hidden lg:block">
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-blue opacity-0"
        style={{ transition: 'opacity .25s' }}
      />
      <div
        ref={ringRef}
        className="absolute left-0 top-0 flex items-center justify-center rounded-full border-[1.5px] border-blue opacity-0"
        style={{
          width: 34,
          height: 34,
          transition:
            'width .45s var(--ease-out-expo), height .45s var(--ease-out-expo), background-color .3s, border-color .3s, opacity .25s',
        }}
      >
        <span
          ref={labelRef}
          className="label whitespace-nowrap text-paper opacity-0"
          style={{ transition: 'opacity .25s' }}
        />
      </div>
    </div>
  );
}
