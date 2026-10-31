import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * ConfettiBurst Component
 * 
 * Lightweight 20-particle celebratory burst for TrueTax AI when all issues are resolved (issues > 0 -> 0).
 * Runs for 800ms and cleans up automatically. Respects prefers-reduced-motion.
 */
export default function ConfettiBurst({ onComplete = null }) {
  const canvasRef = useRef(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      if (onComplete) onComplete();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 300);
    const height = (canvas.height = 180);

    const colors = ['#059669', '#10B981', '#34D399', '#F59E0B', '#FBBF24', '#FFFFFF'];
    const particles = Array.from({ length: 22 }, () => ({
      x: width / 2,
      y: height / 2 + 20,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 3,
      size: Math.random() * 4 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1,
    }));

    const startTime = performance.now();
    const duration = 800; // ms
    let animId;

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(progress, 2);

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx * ease;
        p.y += p.vy * ease + 1.2; // slight gravity
        p.rotation += p.vRot;
        p.opacity = Math.max(1 - progress * 1.2, 0);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      });

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        if (onComplete) onComplete();
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [prefersReduced, onComplete]);

  if (prefersReduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 right-0 sm:right-1/4 pointer-events-none z-50 overflow-visible"
      style={{ width: '300px', height: '180px' }}
      aria-hidden="true"
    />
  );
}

