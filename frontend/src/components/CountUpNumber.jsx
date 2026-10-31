import React, { useState, useEffect, useRef } from 'react';

/**
 * CountUpNumber Component
 * 
 * Animated numeric count-up with tabular font-mono numerals.
 * Supports starting from 0 on first mount/bill change, with easeOutCubic easing.
 * Respects prefers-reduced-motion by rendering the final target instantly.
 */
export default function CountUpNumber({
  value,
  prefix = '₹',
  decimals = 2,
  duration = 450,
  startFromZeroOnMount = false,
}) {
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const endVal = Number(value) || 0;
  const [displayVal, setDisplayVal] = useState(() =>
    startFromZeroOnMount && !prefersReduced ? 0 : endVal
  );
  const prevValRef = useRef(startFromZeroOnMount && !prefersReduced ? 0 : endVal);

  useEffect(() => {
    if (prefersReduced) {
      const frameId = requestAnimationFrame(() => {
        setDisplayVal(endVal);
        prevValRef.current = endVal;
      });
      return () => cancelAnimationFrame(frameId);
    }

    const startVal = prevValRef.current;
    if (Math.abs(startVal - endVal) < 0.001) {
      return;
    }

    const startTime = performance.now();
    let animId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setDisplayVal(endVal);
        prevValRef.current = endVal;
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [endVal, duration, prefersReduced]);

  return (
    <span className="font-mono tabular-nums">
      {prefix}
      {displayVal.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
