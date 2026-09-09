'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { VolcanoEruption } from '@/lib/types';
import { INDONESIAN_VOLCANOES, findVolcanoLocation } from '@/lib/volcanoData';

interface SeismographProps {
  seismicEnergy?: number; // mm/s
  activityLevel?: number; // 0 - 100%
  phaseName?: string;
  volcanoes?: VolcanoEruption[];
  selectedVolcano?: string | null;
  onSelectVolcano?: (name: string) => void;
  onInspectSeismogram?: (volcano: VolcanoEruption) => void;
}

export default function Seismograph({
  seismicEnergy = 1.2,
  activityLevel = 22,
  phaseName = 'SEISMIC_BASELINE',
  volcanoes = [],
  selectedVolcano = 'Anak Krakatau',
  onSelectVolcano,
  onInspectSeismogram,
}: SeismographProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pointsRef = useRef<number[]>([]);
  const [activeTarget, setActiveTarget] = useState<string>(selectedVolcano || 'Anak Krakatau');

  // Keep internal activeTarget synced with parent selectedVolcano
  useEffect(() => {
    if (selectedVolcano) {
      setActiveTarget(selectedVolcano);
    }
  }, [selectedVolcano]);

  // Find geo metadata for currently active volcano/station
  const isBMKGMode = activeTarget === 'BMKG_REGIONAL';
  const geo = useMemo(() => {
    return isBMKGMode ? null : findVolcanoLocation(activeTarget);
  }, [activeTarget, isBMKGMode]);

  // Find matching PVMBG live report for this volcano
  const liveReport = useMemo(() => {
    if (!geo) return null;
    return volcanoes.find((e) => {
      const cleanErup = e.volcano_name.toLowerCase().trim().replace(/^g\.\s*/, '');
      return geo.name.toLowerCase().includes(cleanErup) || cleanErup.includes(geo.name.toLowerCase());
    }) || null;
  }, [geo, volcanoes]);

  // Parse amplitude & duration
  const ampNum = useMemo(() => {
    if (liveReport?.amplitude) {
      return parseFloat(liveReport.amplitude.replace(/[^0-9.]/g, '')) || 35;
    }
    return 15;
  }, [liveReport]);

  const alertLevel = liveReport?.alert_level || geo?.defaultLevel || 'LEVEL II (WASPADA)';
  const isAwas = alertLevel.includes('AWAS');
  const isSiaga = alertLevel.includes('SIAGA');

  // References for animation loop
  const configRef = useRef({
    isBMKGMode,
    ampNum,
    seismicEnergy,
    activityLevel,
    isAwas,
    isSiaga,
  });

  useEffect(() => {
    configRef.current = {
      isBMKGMode,
      ampNum,
      seismicEnergy,
      activityLevel,
      isAwas,
      isSiaga,
    };
  }, [isBMKGMode, ampNum, seismicEnergy, activityLevel, isAwas, isSiaga]);

  // Canvas waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 140);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
    };
    window.addEventListener('resize', handleResize);

    const maxPoints = 300;
    if (pointsRef.current.length === 0) {
      pointsRef.current = new Array(maxPoints).fill(height / 2);
    }

    let tick = 0;

    const render = () => {
      tick++;
      const {
        isBMKGMode: isBMKG,
        ampNum: amp,
        seismicEnergy: energy,
        activityLevel: act,
        isAwas: awas,
        isSiaga: siaga,
      } = configRef.current;

      const midY = height / 2;
      let rawOffset = 0;

      if (isBMKG) {
        // Tectonic P/S Waveform
        const normalizedAct = Math.max(0.1, act / 100);
        const pWave = Math.sin(tick * 0.45) * (energy * 1.2);
        const sWave = Math.sin(tick * 0.15) * (energy * 2.8 * normalizedAct);
        const burst = Math.random() < 0.05 + normalizedAct * 0.2 ? (Math.random() - 0.5) * energy * 4.5 : 0;
        rawOffset = pWave + sWave + burst;
      } else {
        // Volcanic Tremor / Explosion Pulse Waveform
        const ampScale = Math.min(45, Math.max(8, amp * 0.75));
        const tremorBase = Math.sin(tick * 0.38) * (ampScale * 0.35);
        const harmonicFluid = Math.sin(tick * 0.85) * (ampScale * 0.25);
        const volcanicLP = Math.sin(tick * 0.12) * (ampScale * 0.45);
        // Random explosion / ash emission shock bursts
        const burstProb = awas ? 0.22 : siaga ? 0.12 : 0.05;
        const explosionBurst = Math.random() < burstProb ? (Math.random() - 0.5) * ampScale * 1.5 : 0;
        rawOffset = tremorBase + harmonicFluid + volcanicLP + explosionBurst;
      }

      const clampedOffset = Math.max(-height / 2 + 10, Math.min(height / 2 - 10, rawOffset));
      const nextY = midY + clampedOffset;

      pointsRef.current.push(nextY);
      if (pointsRef.current.length > maxPoints) {
        pointsRef.current.shift();
      }

      // Dark background
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, width, height);

      // Grid division lines
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.06)';
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

      // Baseline center reference line
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Stroke & Glow Colors based on target mode and alert level
      let strokeColor = '#00f2ff';
      let glowColor = 'rgba(0, 242, 255, 0.4)';

      if (!isBMKG) {
        if (awas) {
          strokeColor = '#ff2a5f';
          glowColor = 'rgba(255, 42, 95, 0.7)';
        } else if (siaga) {
          strokeColor = '#ff5722';
          glowColor = 'rgba(255, 87, 34, 0.6)';
        } else {
          strokeColor = '#ff9800';
          glowColor = 'rgba(255, 152, 0, 0.5)';
        }
      } else {
        if (act > 80) {
          strokeColor = '#ff2a5f';
          glowColor = 'rgba(255, 42, 95, 0.6)';
        } else if (act > 50) {
          strokeColor = '#ff9100';
          glowColor = 'rgba(255, 145, 0, 0.5)';
        }
      }

      // Draw continuous waveform trace
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.0;
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

      // Stylus recording point
      const lastIdx = pointsRef.current.length - 1;
      const lastX = lastIdx * dx;
      const lastY = pointsRef.current[lastIdx];

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleSelect = (targetName: string) => {
    setActiveTarget(targetName);
    if (targetName !== 'BMKG_REGIONAL') {
      onSelectVolcano?.(targetName);
    }
  };

  // Prepare fallback eruption if opening inspection
  const effectiveInspectionReport: VolcanoEruption = useMemo(() => {
    if (liveReport) return liveReport;
    return {
      id: `erup-${geo?.name.toLowerCase().replace(/\s+/g, '-') || 'active'}-gen`,
      volcano_name: geo?.name || 'Gunung Api Aktif',
      time: 'Live Telemetri',
      date: new Date().toLocaleDateString('id-ID'),
      description: `Rekaman getaran seismik pos pengamatan ${geo?.pgaStation || 'PVMBG'} dengan aktivitas tremor vulkanik kontinu.`,
      amplitude: `${ampNum} mm`,
      duration: '45 detik',
      visual_ash: 'Kolom asap kawah kawah aktif',
      author: 'Petugas Pos Pengamatan PVMBG',
      alert_level: alertLevel,
      recommendation: geo?.defaultLevel || 'Waspadai potensi erupsi dan ikuti arahan PVMBG',
      timestamp: new Date().toISOString(),
    };
  }, [liveReport, geo, ampNum, alertLevel]);

  return (
    <div id="seismograph-container" className="seismograph-container card" style={{ padding: '14px 18px', gap: '10px' }}>
      {/* Target Selector Toolbar (BMKG vs Volcanoes) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            LOKASI SEISMOGRAF:
          </span>

          {/* BMKG Regional Option */}
          <button
            onClick={() => handleSelect('BMKG_REGIONAL')}
            style={{
              padding: '4px 9px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              background: isBMKGMode ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isBMKGMode ? '#00f2ff' : 'var(--border-subtle)'}`,
              color: isBMKGMode ? '#00f2ff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            📡 BMKG Broadband (LEM / JATS)
          </button>

          {/* Quick Active Volcanoes */}
          {INDONESIAN_VOLCANOES.slice(0, 6).map((v) => {
            const isTarget = activeTarget === v.name;
            const hasReport = volcanoes.some((e) =>
              e.volcano_name.toLowerCase().includes(v.name.toLowerCase()) ||
              v.name.toLowerCase().includes(e.volcano_name.toLowerCase())
            );

            return (
              <button
                key={v.name}
                onClick={() => handleSelect(v.name)}
                style={{
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isTarget
                    ? 'rgba(255, 87, 34, 0.2)'
                    : hasReport
                    ? 'rgba(255, 87, 34, 0.08)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isTarget ? '#ff5722' : hasReport ? 'rgba(255, 87, 34, 0.4)' : 'var(--border-subtle)'}`,
                  color: isTarget ? '#ff9800' : hasReport ? '#ff7043' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🌋 {v.name}</span>
                {hasReport && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff2a5f' }}></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Button: Analisis Citra Seismogram */}
        {!isBMKGMode && (
          <button
            onClick={() => onInspectSeismogram?.(effectiveInspectionReport)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(0, 242, 255, 0.15))',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              color: '#fff',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(168, 85, 247, 0.3)',
              transition: 'all 0.2s ease',
            }}
            title="Buka analisis citra rekaman seismogram PVMBG dan interpretasi fisis kawah"
          >
            <span>🔬</span>
            <span>ANALISIS CITRA SEISMOGRAM PVMBG</span>
            {liveReport?.image_url && (
              <span style={{ background: '#10b981', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}>
                FOTO LIVE
              </span>
            )}
          </button>
        )}
      </div>

      {/* Seismograph Header & Metadata Bar */}
      <div className="seismograph__header" style={{ padding: '4px 0' }}>
        <div className="seismograph__title">
          <span className="seismograph__pulse-indicator" style={{ background: isBMKGMode ? '#00f2ff' : '#ff5722' }}></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                {isBMKGMode ? 'BMKG REGIONAL BROADBAND SEISMIC ARRAY' : `POS SEISMOGRAF: ${geo?.pgaStation.toUpperCase()}`}
              </span>
              {!isBMKGMode && (
                <span
                  className={`volcano-card__level-badge ${
                    isAwas
                      ? 'volcano-card__level-badge--awas'
                      : isSiaga
                      ? 'volcano-card__level-badge--siaga'
                      : 'volcano-card__level-badge--waspada'
                  }`}
                  style={{ fontSize: '9px', padding: '2px 6px' }}
                >
                  {alertLevel}
                </span>
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isBMKGMode
                ? 'Stasiun LEM (Lembang, Jabar) & JATS (Jatiluhur) • Komponen Z-Vertical • 100 Hz Streaming'
                : `Gunung ${geo?.name} (${geo?.province}) • ${geo?.pos[0].toFixed(3)}°S, ${geo?.pos[1].toFixed(3)}°E • Elevasi ${geo?.elevation} mdpl`}
            </span>
          </div>
        </div>

        {/* Telemetry Numbers */}
        <div className="seismograph__telemetry">
          {!isBMKGMode && liveReport ? (
            <>
              <span className="seismograph__stat">
                AMP MAKS: <strong style={{ color: '#ff2a5f' }}>{liveReport.amplitude}</strong>
              </span>
              <span className="seismograph__stat">
                DURASI: <strong style={{ color: '#ff9800' }}>{liveReport.duration}</strong>
              </span>
              <span className="seismograph__badge" style={{ background: 'rgba(255,87,34,0.15)', color: '#ff7043', border: '1px solid rgba(255,87,34,0.4)' }}>
                TREMOR ERUPSI
              </span>
            </>
          ) : (
            <>
              <span className="seismograph__stat">
                VEL: <strong>{seismicEnergy.toFixed(1)} mm/s</strong>
              </span>
              <span className="seismograph__stat">
                PGA: <strong>{((activityLevel / 100) * 0.45).toFixed(3)} g</strong>
              </span>
              <span className={`seismograph__badge seismograph__badge--${phaseName.toLowerCase()}`}>
                {activityLevel > 80 ? 'SATURATED / CLIPPED' : activityLevel > 45 ? 'SURFACE WAVE' : 'AMBIENT NOISE'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Canvas Waveform Drum */}
      <div className="seismograph__canvas-wrap" style={{ minHeight: '140px' }}>
        <canvas ref={canvasRef} className="seismograph__canvas" style={{ height: '140px' }} />
      </div>

      {/* Contextual Volcanic Signal Caption */}
      {!isBMKGMode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#ff9800' }}>📡 Sensor:</span>
            <span>{geo?.sensorType || 'Broadband Güralp CMG-40T'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>Status Kawah: <strong>{liveReport?.visual_ash || 'Aktivitas Normal Terpantau'}</strong></span>
            <span
              onClick={() => onInspectSeismogram?.(effectiveInspectionReport)}
              style={{ color: '#00f2ff', cursor: 'pointer', fontWeight: 700 }}
            >
              Lihat Analisis Lengkap ↗
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
