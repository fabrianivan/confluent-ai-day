'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { VolcanoEruption } from '@/lib/types';
import { INDONESIAN_VOLCANOES, findVolcanoLocation } from '@/lib/volcanoData';

interface VolcanoSeismographHubProps {
  volcanoes: VolcanoEruption[];
  selectedVolcano?: string | null;
  onSelectVolcano?: (name: string) => void;
  onInspectSeismogram?: (volcano: VolcanoEruption) => void;
}

export default function VolcanoSeismographHub({
  volcanoes,
  selectedVolcano = 'Anak Krakatau',
  onSelectVolcano,
  onInspectSeismogram,
}: VolcanoSeismographHubProps) {
  const [activeVolcano, setActiveVolcano] = useState<string>(selectedVolcano || 'Anak Krakatau');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewPan, setPreviewPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPreviewDragging, setIsPreviewDragging] = useState<boolean>(false);
  const [previewDragStart, setPreviewDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pointsRef = useRef<number[]>([]);

  const openPreview = (imgUrl: string) => {
    setPreviewImage(imgUrl);
    setPreviewZoom(1);
    setPreviewPan({ x: 0, y: 0 });
  };

  // Keep internal selection synced with external prop
  useEffect(() => {
    if (selectedVolcano) {
      setActiveVolcano(selectedVolcano);
    }
  }, [selectedVolcano]);

  // Find geo metadata
  const geo = useMemo(() => {
    return findVolcanoLocation(activeVolcano) || INDONESIAN_VOLCANOES[0];
  }, [activeVolcano]);

  // Find all historical reports for this specific volcano
  const volcanoHistory = useMemo(() => {
    const cleanName = geo.name.toLowerCase().trim();
    return volcanoes.filter((e) => {
      const cleanErup = e.volcano_name.toLowerCase().trim().replace(/^g\.\s*/, '');
      return cleanName.includes(cleanErup) || cleanErup.includes(cleanName);
    });
  }, [geo, volcanoes]);

  // Latest report is first in list (or fallback generated for active volcano)
  const latestReport = useMemo(() => {
    if (volcanoHistory.length > 0) return volcanoHistory[0];
    return {
      id: `latest-${geo.name.toLowerCase().replace(/\s+/g, '-')}`,
      volcano_name: geo.name,
      time: 'Pemantauan Aktif',
      date: new Date().toLocaleDateString('id-ID'),
      description: `Pos Pengamatan Gunung Api ${geo.pgaStation} merekam aktivitas tremor vulkanik kontinu dalam batas normal-waspada.`,
      amplitude: '15 mm',
      duration: '45 detik',
      visual_ash: 'Asap kawah putih intensitas tipis hingga sedang',
      author: 'Petugas Pos Pengamatan PVMBG',
      alert_level: geo.defaultLevel,
      recommendation: 'Masyarakat dilarang mendekati kawah aktif sesuai radius rekomendasi PVMBG.',
      timestamp: new Date().toISOString(),
    } as VolcanoEruption;
  }, [volcanoHistory, geo]);

  const alertLevel = latestReport.alert_level || geo.defaultLevel;
  const isAwas = alertLevel.includes('AWAS');
  const isSiaga = alertLevel.includes('SIAGA');
  const isWaspada = alertLevel.includes('WASPADA');

  const ampNum = parseFloat(latestReport.amplitude.replace(/[^0-9.]/g, '')) || 20;

  // Animate live waveform drum for this volcano
  const configRef = useRef({ ampNum, isAwas, isSiaga });
  useEffect(() => {
    configRef.current = { ampNum, isAwas, isSiaga };
  }, [ampNum, isAwas, isSiaga]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    const height = (canvas.height = 130);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
    };
    window.addEventListener('resize', handleResize);

    const maxPoints = 280;
    if (pointsRef.current.length === 0) {
      pointsRef.current = new Array(maxPoints).fill(height / 2);
    }

    let tick = 0;

    const render = () => {
      tick++;
      const { ampNum: amp, isAwas: awas, isSiaga: siaga } = configRef.current;
      const midY = height / 2;

      // Volcanic tremor & harmonic resonance
      const ampScale = Math.min(42, Math.max(8, amp * 0.75));
      const tremor = Math.sin(tick * 0.42) * (ampScale * 0.35);
      const fluidResonance = Math.sin(tick * 0.88) * (ampScale * 0.28);
      const lp = Math.sin(tick * 0.14) * (ampScale * 0.4);
      const burstProb = awas ? 0.22 : siaga ? 0.12 : 0.05;
      const burst = Math.random() < burstProb ? (Math.random() - 0.5) * ampScale * 1.6 : 0;

      const offset = Math.max(-height / 2 + 8, Math.min(height / 2 - 8, tremor + fluidResonance + lp + burst));
      pointsRef.current.push(midY + offset);
      if (pointsRef.current.length > maxPoints) pointsRef.current.shift();

      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center reference line
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Stylus line
      const strokeColor = awas ? '#ff2a5f' : siaga ? '#ff5722' : isWaspada ? '#ff9800' : '#00f2ff';
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.0;
      ctx.beginPath();

      const dx = width / (pointsRef.current.length - 1);
      for (let i = 0; i < pointsRef.current.length; i++) {
        const x = i * dx;
        const y = pointsRef.current[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Stylus needle
      const lastIdx = pointsRef.current.length - 1;
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(lastIdx * dx, pointsRef.current[lastIdx], 4, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [geo]);

  const handleSelectVolcano = (name: string) => {
    setActiveVolcano(name);
    onSelectVolcano?.(name);
  };

  return (
    <div className="card volcano-seismo-hub" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with Title and Volcano Selection Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🌋</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Pusat Seismograf & Citra Vulkanik Per Gunung
                </h2>
                <span className="card__badge card__badge--live">MAGMA PVMBG ESDM</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Monitoring gelombang seismograf terkini dan riwayat dokumentasi seismogram per pos pengamatan gunung api aktif
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PILIH GUNUNG API:</span>
          </div>
        </div>

        {/* Volcano Selection Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {INDONESIAN_VOLCANOES.map((v) => {
            const isSelected = activeVolcano.toLowerCase().includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(activeVolcano.toLowerCase());
            const reportCount = volcanoes.filter((e) => {
              const clean = e.volcano_name.toLowerCase().replace(/^g\.\s*/, '');
              return v.name.toLowerCase().includes(clean) || clean.includes(v.name.toLowerCase());
            }).length;

            return (
              <button
                key={v.name}
                onClick={() => handleSelectVolcano(v.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(255, 87, 34, 0.25), rgba(255, 42, 95, 0.15))'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? '1px solid #ff5722' : '1px solid var(--border-subtle)',
                  color: isSelected ? '#ff9800' : 'var(--text-secondary)',
                  boxShadow: isSelected ? '0 0 12px rgba(255, 87, 34, 0.3)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🌋 G. {v.name}</span>
                {reportCount > 0 && (
                  <span
                    style={{
                      background: isSelected ? '#ff2a5f' : 'rgba(255, 42, 95, 0.3)',
                      color: '#fff',
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                    }}
                  >
                    {reportCount} Erupsi
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Section Terkini (Left: Waveform + Right: Latest Image & Parameters) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '18px',
        }}
        className="volcano-hub-main-grid"
      >
        {/* Left Column: Live Telemetry & Waveform Drum */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot-pulse"></span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#00f2ff', letterSpacing: '0.04em' }}>
                REKAMAN SEISMOGRAF TERKINI (LIVE DRUM)
              </span>
            </div>
            <span
              className={`volcano-card__level-badge ${
                isAwas
                  ? 'volcano-card__level-badge--awas'
                  : isSiaga
                  ? 'volcano-card__level-badge--siaga'
                  : 'volcano-card__level-badge--waspada'
              }`}
              style={{ fontSize: '10px', padding: '2px 8px' }}
            >
              {alertLevel}
            </span>
          </div>

          {/* Pos & Instrument Details */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            📍 <strong style={{ color: 'var(--text-primary)' }}>{geo.pgaStation}</strong> • Wilayah: <strong>{geo.province}</strong><br />
            Koordinat: <span style={{ fontFamily: 'monospace', color: '#00f2ff' }}>{geo.pos[0].toFixed(3)}°S, {geo.pos[1].toFixed(3)}°E</span> • Elevasi: <strong>{geo.elevation} mdpl</strong> • Sensor: <strong>{geo.sensorType}</strong>
          </div>

          {/* Canvas Drum */}
          <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0, 242, 255, 0.2)', position: 'relative' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '130px', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 6, left: 10, fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              KOMPONEN Z • 100 Hz REAL-TIME STREAM • AMPLITUDO: {latestReport.amplitude}
            </div>
          </div>

          {/* Live Parameter Metric Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>AMPLITUDO MAKS</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ff2a5f' }}>{latestReport.amplitude}</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>DURASI GEMPA</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#ff9800' }}>{latestReport.duration}</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.35)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>WAKTU TERAKHIR</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#00f2ff' }}>{latestReport.time}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Latest Seismogram Image & Physical Inspection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#ff9800', letterSpacing: '0.04em' }}>
              📸 CITRA SEISMOGRAM TERKINI PVMBG
            </span>
            <button
              onClick={() => onInspectSeismogram?.(latestReport)}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#c084fc',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>🔬</span>
              <span>Analisis Lengkap</span>
            </button>
          </div>

          {/* Image Display Box */}
          <div
            style={{
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#060a14',
              border: '1px solid var(--border-medium)',
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (latestReport.image_url) openPreview(latestReport.image_url);
              else onInspectSeismogram?.(latestReport);
            }}
            title="Klik untuk memperbesar gambar seismogram"
          >
            {latestReport.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latestReport.image_url}
                alt={`Seismogram ${geo.name}`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '28px', display: 'block', marginBottom: '6px' }}>📈</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Rekaman Sinyal Erupsi G. {geo.name}
                </span>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                  Amplitudo: {latestReport.amplitude} • Durasi: {latestReport.duration}
                </div>
                <div style={{ fontSize: '10px', color: '#00f2ff', marginTop: '6px' }}>
                  Klik untuk membuka rekonstruksi instrumen & analisis AI ↗
                </div>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                insetInline: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '10px',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700 }}>🔍 Klik untuk Perbesar</span>
              <span style={{ color: '#94a3b8' }}>{latestReport.date}</span>
            </div>
          </div>

          {/* Quick Volcanic Note */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            <strong style={{ color: '#ff9800' }}>Pengamatan Kawah:</strong> {latestReport.visual_ash}<br />
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Petugas Pos: {latestReport.author}</span>
          </div>
        </div>
      </div>

      {/* Section Riwayat (History of Seismograms per Volcano) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>📜</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Riwayat Seismograf & Catatan Erupsi: G. {geo.name}
            </span>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px' }}>
              {volcanoHistory.length > 0 ? `${volcanoHistory.length} Kejadian Tercatat` : 'Monitoring Rutin'}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sumber: MAGMA Indonesia PVMBG
          </span>
        </div>

        {/* History Grid */}
        {volcanoHistory.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            Belum ada letusan besar baru yang dicatat pos pengamatan hari ini untuk G. {geo.name}. Seismograf saat ini merekam getaran tremor latar belakang (background micro-tremors).
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {volcanoHistory.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* Top Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#00f2ff' }}>
                    ⏱ {item.time}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {item.date}
                  </span>
                </div>

                {/* Thumbnail Image if available */}
                {item.image_url && (
                  <div
                    style={{
                      height: '100px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#060a14',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={`Seismogram ${item.time}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Metrics Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                  <span>Amp: <strong style={{ color: '#ff2a5f' }}>{item.amplitude}</strong></span>
                  <span>Durasi: <strong style={{ color: '#ff9800' }}>{item.duration}</strong></span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </p>

                {/* Action button */}
                <button
                  onClick={() => onInspectSeismogram?.(item)}
                  style={{
                    marginTop: 'auto',
                    padding: '5px 8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🔬</span>
                  <span>Analisis Sinyal & Citra Ini</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="volcano-lightbox" onClick={() => setPreviewImage(null)}>
          <div
            className="volcano-lightbox__content"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: '92vw',
              maxHeight: '92vh',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Zoom Controls Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(6, 10, 20, 0.9)',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '10px',
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#00f2ff' }}>🔍 Zoom:</span>
              <button
                onClick={() => setPreviewZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                −
              </button>
              {[1, 1.5, 2, 2.5].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setPreviewZoom(lvl);
                    if (lvl === 1) setPreviewPan({ x: 0, y: 0 });
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: previewZoom === lvl ? 'rgba(0,242,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: previewZoom === lvl ? '#00f2ff' : 'var(--text-secondary)',
                    border: `1px solid ${previewZoom === lvl ? '#00f2ff' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {lvl}x
                </button>
              ))}
              <button
                onClick={() => setPreviewZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                +
              </button>
              <button
                onClick={() => {
                  setPreviewZoom(1);
                  setPreviewPan({ x: 0, y: 0 });
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                ⟲ Reset
              </button>
            </div>

            {/* Draggable Pan Image Container */}
            <div
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.2 : -0.2;
                setPreviewZoom((z) => Math.max(0.75, Math.min(3.5, Number((z + delta).toFixed(2)))));
              }}
              onMouseDown={(e) => {
                if (previewZoom <= 1) return;
                setIsPreviewDragging(true);
                setPreviewDragStart({ x: e.clientX - previewPan.x, y: e.clientY - previewPan.y });
              }}
              onMouseMove={(e) => {
                if (!isPreviewDragging || previewZoom <= 1) return;
                setPreviewPan({ x: e.clientX - previewDragStart.x, y: e.clientY - previewDragStart.y });
              }}
              onMouseUp={() => setIsPreviewDragging(false)}
              onMouseLeave={() => setIsPreviewDragging(false)}
              style={{
                width: '100%',
                maxHeight: '78vh',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: previewZoom > 1 ? (isPreviewDragging ? 'grabbing' : 'grab') : 'default',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Seismogram PVMBG"
                className="volcano-lightbox__img"
                style={{
                  transform: `translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewZoom})`,
                  transition: isPreviewDragging ? 'none' : 'transform 0.15s ease',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <button
              className="volcano-lightbox__close-btn"
              onClick={() => setPreviewImage(null)}
            >
              ✕ Tutup Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
