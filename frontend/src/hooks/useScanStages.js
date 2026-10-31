import { useState, useEffect, useRef, useCallback } from 'react';
import {
  STAGE_CONFIG,
  calculateProgress,
  canAdvanceStage,
} from '../utils/scanStagesEngine.js';

/**
 * useScanStages Hook
 * 
 * Drives the ScanConversion 4-stage pipeline while enforcing:
 * 1. Minimum stage durations (Capture 500ms, Stages 1-3 700ms each, Stage 4 900ms)
 * 2. Real pipeline synchronization (loops laser if backend is still working)
 * 3. Error freeze (stops laser, flags error)
 * 4. Immediate skip functionality
 * 5. prefers-reduced-motion awareness
 */
export function useScanStages({
  isActive = false,
  backendStep = 1,
  backendDone = false,
  isError = false,
  onDone = null,
  isDemo = false,
  reducedMotionOverride = null,
} = {}) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const hasError = Boolean(isError);

  // System prefers-reduced-motion detection
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => setSystemReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const prefersReducedMotion =
    reducedMotionOverride !== null ? reducedMotionOverride : systemReducedMotion;

  // Timers and state refs
  const stageStartTimeRef = useRef(0);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Stage advancement controller
  useEffect(() => {
    if (!isActive || hasError || isDone || isSkipped) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const currentConfig = STAGE_CONFIG[stage] || STAGE_CONFIG[0];
    const minDuration = prefersReducedMotion
      ? Math.round(currentConfig.minDuration * 0.75)
      : currentConfig.minDuration;

    stageStartTimeRef.current = Date.now();

    // Progress updater tick
    const updateProgressTick = () => {
      const elapsed = Date.now() - stageStartTimeRef.current;
      setProgress(calculateProgress(stage, elapsed, isDone));
      if (!isDone && stage < 4) {
        animFrameRef.current = requestAnimationFrame(updateProgressTick);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgressTick);

    // Minimum duration gatekeeper
    const scheduleNextCheck = (delay) => {
      timerRef.current = setTimeout(() => {
        if (stage === 4) {
          // Final stage completed -> seal verified!
          setProgress(1.0);
          setIsDone(true);
          if (onDone) onDone();
          return;
        }

        const canAdvance = canAdvanceStage(stage, backendStep, backendDone, isDemo);
        if (canAdvance) {
          setStage((prev) => Math.min(prev + 1, 4));
        } else {
          // Backend is still processing, wait 200ms and re-check while scanning loops
          scheduleNextCheck(200);
        }
      }, delay);
    };

    scheduleNextCheck(minDuration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    isActive,
    stage,
    backendStep,
    backendDone,
    hasError,
    isDone,
    isSkipped,
    isDemo,
    prefersReducedMotion,
    onDone,
  ]);

  // Skip action
  const skip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsSkipped(true);
    setStage(4);
    setProgress(1.0);
    setIsDone(true);
    if (onDone) onDone();
  }, [onDone]);

  // Reset action
  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setStage(0);
    setProgress(0);
    setIsDone(false);
    setIsSkipped(false);
  }, []);

  const currentConfig = STAGE_CONFIG[stage] || STAGE_CONFIG[0];

  return {
    stage,
    progress,
    isDone,
    isSkipped,
    hasError,
    skip,
    reset,
    currentConfig,
    stageAriaText: currentConfig.ariaText,
    prefersReducedMotion,
  };
}
