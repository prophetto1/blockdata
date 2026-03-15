import { useCallback, useEffect, useRef, useState } from 'react';

type Position = { x: number; y: number };

const STORAGE_KEY = 'blockdata.shell.chat_position';
const EDGE_MARGIN = 12;

function clamp(pos: Position, elWidth: number, elHeight: number): Position {
  const maxX = window.innerWidth - elWidth - EDGE_MARGIN;
  const maxY = window.innerHeight - elHeight - EDGE_MARGIN;
  return {
    x: Math.max(EDGE_MARGIN, Math.min(pos.x, maxX)),
    y: Math.max(EDGE_MARGIN, Math.min(pos.y, maxY)),
  };
}

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Position;
  } catch { /* ignore */ }
  return null;
}

function savePosition(pos: Position) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch { /* ignore */ }
}

/**
 * Makes a fixed-position element draggable by a handle.
 * Returns a ref for the drag handle and the current position (top/left).
 */
export function useDraggable(containerRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // Compute default position (bottom-right) once the container mounts
  useEffect(() => {
    const saved = loadPosition();
    if (saved) {
      setPosition(saved);
      return;
    }
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({
        x: window.innerWidth - rect.width - EDGE_MARGIN,
        y: window.innerHeight - rect.height - EDGE_MARGIN,
      });
    }
  }, [containerRef]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    // Don't drag if clicking a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [role="button"]')) return;

    const el = containerRef.current;
    if (!el) return;

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const rect = el.getBoundingClientRect();
    dragStart.current = { px: e.clientX, py: e.clientY, ox: rect.left, oy: rect.top };
    setIsDragging(true);
  }, [containerRef]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragStart.current || !containerRef.current) return;
    const { px, py, ox, oy } = dragStart.current;
    const el = containerRef.current;
    const newPos = clamp(
      { x: ox + (e.clientX - px), y: oy + (e.clientY - py) },
      el.offsetWidth,
      el.offsetHeight,
    );
    setPosition(newPos);
  }, [containerRef]);

  const onPointerUp = useCallback(() => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setIsDragging(false);
    setPosition((p) => {
      if (p) savePosition(p);
      return p;
    });
  }, []);

  // Attach pointer listeners to the handle element
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);

    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => {
      const el = containerRef.current;
      if (!el || !position) return;
      setPosition(clamp(position, el.offsetWidth, el.offsetHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [containerRef, position]);

  return { position, isDragging, handleRef };
}
