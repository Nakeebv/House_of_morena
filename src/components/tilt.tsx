"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Pointer-driven 3D response.
 *
 * Deliberately cheap: one rAF-batched write of two custom properties, no
 * per-frame layout reads, and a static light gradient that fades with hover
 * rather than one that tracks the cursor. Tracking the cursor meant hundreds
 * of style recalculations a second across a grid of cards, which showed up as
 * visible judder.
 */
export function Tilt({
  children,
  className = "",
  strength = 5,
  sheen = true,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  sheen?: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const node = scene.current;
    if (!node) return;

    const apply = () => {
      frame.current = null;
      const el = scene.current;
      const position = pointer.current;
      if (!el || !position) return;
      el.style.setProperty("--ry", `${(position.x - 0.5) * strength}deg`);
      el.style.setProperty("--rx", `${(0.5 - position.y) * strength}deg`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      pointer.current = {
        x: Math.min(1.25, Math.max(-0.25, (event.clientX - rect.left) / rect.width)),
        y: Math.min(1.25, Math.max(-0.25, (event.clientY - rect.top) / rect.height)),
      };
      if (frame.current == null) {
        frame.current = requestAnimationFrame(apply);
      }
    };

    const onEnter = () => node.dataset.hover = "true";
    const onLeave = () => {
      pointer.current = null;
      node.dataset.hover = "false";
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
    };

    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerenter", onEnter, { passive: true });
    node.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("pointerleave", onLeave);
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [enabled, strength]);

  if (!enabled) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {children}
        {sheen ? <span className="sheen" aria-hidden="true" /> : null}
      </div>
    );
  }

  return (
    <div ref={scene} className={`tilt-scene ${className}`}>
      <div className="tilt">
        {children}
        {sheen ? <span className="sheen" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}
