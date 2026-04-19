import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/**
 * Smooth count-up number animation.
 * Props: value (number), format (fn), duration (ms), className
 */
export const CountUpNumber = ({ value = 0, format = (v) => v, duration = 700, className = '', testId }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) { setDisplay(value); return; }
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [value]);

  return <span className={className} data-testid={testId}>{format(display)}</span>;
};

export default CountUpNumber;
