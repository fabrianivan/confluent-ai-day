'use client';

import { useEffect, useRef } from 'react';

interface SeismographProps {
  seismicEnergy?: number; // mm/s
  activityLevel?: number; // 0 - 100%
  phaseName?: string;
}

export default function Seismograph({
  seismicEnergy = 1.2,
  activityLevel = 22,
  phaseName = 'QUIESCENT_BASELINE',
}: SeismographProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pointsRef = useRef<number[]>([]);
  const phaseRef = useRef({ seismicEnergy, activityLevel });

  useEffect(() => {
    phaseRef.current = { seismicEnergy, activityLevel };
  }, [seismicEnergy, activityLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 120);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
    };
    window.addEventListener('resize', handleResize);

    // Initialize baseline points
    const maxPoints = 260;
    if (pointsRef.current.length === 0) {
      pointsRef.current = new Array(maxPoints).fill(height / 2);
    }

    let tick = 0;

    const render = () => {
      tick++;
      const { seismicEnergy: energy, activityLevel: act } = phaseRef.current;

      // Generate next waveform displacement
      const midY = height / 2;
      const normalizedAct = Math.max(0.1, act / 100);
      
      // Base harmonic tremor oscillation
      const tremorBase = Math.sin(tick * 0.18) * (energy * 1.6);
      const highFreqPWave = Math.sin(tick * 0.72) * (energy * 0.8) * (Math.random() > 0.4 ? 1 : -1);
      const stochasticBurst = Math.random() < (0.05 + normalizedAct * 0.2)
        ? (Math.random() - 0.5) * energy * 4.2
        : 0;

      const rawOffset = tremorBase + highFreqPWave + stochasticBurst;
      // Clamp within canvas height margins
      const clampedOffset = Math.max(-height / 2 + 10, Math.min(height / 2 - 10, rawOffset));
      const nextY = midY + clampedOffset;

      pointsRef.current.push(nextY);
      if (pointsRef.current.length > maxPoints) {
        pointsRef.current.shift();
      }

      // Clear with dark cockpit background
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, width, height);

      // Draw faint time-division grid
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.07)';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStep / 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw baseline center reference line
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.22)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Waveform trace color based on activity
      let strokeColor = '#00f2ff'; // Cyan default
      let glowColor = 'rgba(0, 242, 255, 0.4)';
      if (act > 85) {
        strokeColor = '#ff2a5f'; // Crimson alert
        glowColor = 'rgba(255, 42, 95, 0.6)';
      } else if (act > 50) {
        strokeColor = '#ff9100'; // Amber warning
        glowColor = 'rgba(255, 145, 0, 0.5)';
      }

      // Draw continuous seismic trace
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = act > 60 ? 10 : 5;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = act > 75 ? 2.2 : 1.6;
      ctx.beginPath();

      const dx = width / (pointsRef.current.length - 1);
      for (let i = 0; i < pointsRef.current.length; i++) {
        const x = i * dx;
        const y = pointsRef.current[i];
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw live recording stylus dot
      const lastIdx = pointsRef.current.length - 1;
      const lastX = lastIdx * dx;
      const lastY = pointsRef.current[lastIdx];

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const freq = (1.6 + (activityLevel / 100) * 2.8).toFixed(1);

  return (
    <div className="seismograph-container">
      <div className="seismograph__header">
        <div className="seismograph__title">
          <span className="seismograph__pulse-indicator"></span>
          <span>STATION AKR-PAS (PVMBG SEISMOGRAPH)</span>
        </div>
        <div className="seismograph__telemetry">
          <span className="seismograph__stat">
            AMP: <strong>{seismicEnergy.toFixed(1)} mm/s</strong>
          </span>
          <span className="seismograph__stat">
            DOM-FREQ: <strong>{freq} Hz</strong>
          </span>
          <span className={`seismograph__badge seismograph__badge--${phaseName.toLowerCase()}`}>
            {activityLevel > 80 ? 'HIGH SURGE' : activityLevel > 45 ? 'SWARM' : 'QUIESCENT'}
          </span>
        </div>
      </div>
      <div className="seismograph__canvas-wrap">
        <canvas ref={canvasRef} className="seismograph__canvas" />
      </div>
    </div>
  );
}
