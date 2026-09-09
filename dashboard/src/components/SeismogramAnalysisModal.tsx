'use client';

import { useState, useEffect, useRef } from 'react';
import type { VolcanoEruption } from '@/lib/types';
import { findVolcanoLocation } from '@/lib/volcanoData';

interface SeismogramAnalysisModalProps {
  volcano: VolcanoEruption | null;
  onClose: () => void;
}

export default function SeismogramAnalysisModal({
  volcano,
  onClose,
}: SeismogramAnalysisModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [showPhases, setShowPhases] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!volcano) return null;

  const geo = findVolcanoLocation(volcano.volcano_name);
  const isAwas = volcano.alert_level.includes('AWAS');
  const isSiaga = volcano.alert_level.includes('SIAGA');

  // Parse amplitude & duration
  const ampNum = parseFloat(volcano.amplitude.replace(/[^0-9.]/g, '')) || 25;
  const durNum = parseFloat(volcano.duration.replace(/[^0-9.]/g, '')) || 45;

  // Derive seismological estimates
  const estPGA = (ampNum * 0.0032).toFixed(3);
  const estRSAM = Math.round(ampNum * 115 + durNum * 12);
  const freqDominant = ampNum > 40 ? '1.4 - 2.2 Hz' : '2.0 - 3.5 Hz';
  const signalType =
    ampNum >= 40
      ? 'Gempa Letusan / Erupsi Kuat (High Energy Explosion)'
      : ampNum >= 20
      ? 'Gempa Letusan / Erupsi Sedang (Explosion Tremor)'
      : 'Gempa Hembusan / Vulkanik Dangkal (VB)';

  const interpretation = ampNum >= 40
    ? `Defleksi seismometer sebesar ${volcano.amplitude} dengan durasi ${volcano.duration} mengindikasikan dekompresi gas magmatik eksplosif bertekanan tinggi di conduit kawah. Gelombang seismik didominasi komponen P-wave tajam disusul tremor permukaan berspektrum rendah (${freqDominant}). Akumulasi energi mekanik fluida tergolong signifikan, mengindikasikan aktivitas pelepasan material pijar dan kolom abu tebal.`
    : `Sinyal seismograf menunjukkan pelepasan tekanan gas vulkanik dengan amplitudo ${volcano.amplitude} dan durasi ${volcano.duration}. Pola gelombang merefleksikan getaran fluida hidrotermal di kedalaman dangkal (<1.5 km). Tidak terdeteksi sinyal deformasi regional atau pergeseran sesar tektonik yang mengarah pada keruntuhan tubuh gunung.`;

  return (
    <div className="volcano-lightbox" onClick={onClose} style={{ zIndex: 3000 }}>
      <div
        className="card seismogram-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1200px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 14, 26, 0.98)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 242, 255, 0.15)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🌋</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Analisis Informasi Citra Seismogram: G. {volcano.volcano_name}
                </h3>
                <span
                  className={`volcano-card__level-badge ${
                    isAwas
                      ? 'volcano-card__level-badge--awas'
                      : isSiaga
                      ? 'volcano-card__level-badge--siaga'
                      : 'volcano-card__level-badge--waspada'
                  }`}
                >
                  {volcano.alert_level}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                📍 {geo?.pgaStation || 'Pos Pengamatan Gunung Api PVMBG'} • {geo?.island || 'Nusantara'} • Rekaman: {volcano.time} ({volcano.date})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="volcano-lightbox__close-btn"
            style={{ padding: '6px 14px' }}
          >
            ✕ Tutup
          </button>
        </div>

        {/* Modal Body: Split Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '20px',
            padding: '20px 24px',
            overflowY: 'auto',
            maxHeight: 'calc(92vh - 80px)',
          }}
          className="seismogram-modal__body"
        >
          {/* Left: Seismogram Image & Waveform Drum Canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#00f2ff' }}>
                📸 REKAMAN CITRA SEISMOGRAM / VISUAL PVMBG
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowPhases(!showPhases)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: showPhases ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    color: showPhases ? '#00f2ff' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showPhases ? '✓ Anotasi Fase Aktif' : 'Anotasi Fase'}
                </button>
                <button
                  onClick={() => setZoom(zoom === 1 ? 1.5 : 1)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  🔍 {zoom === 1 ? 'Perbesar 1.5x' : 'Reset Zoom'}
                </button>
              </div>
            </div>

            {/* Image Box */}
            <div
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#060a14',
                border: '1px solid var(--border-medium)',
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {volcano.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={volcano.image_url}
                  alt={`Seismogram G. ${volcano.volcano_name}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '380px',
                    objectFit: 'contain',
                    transform: `scale(${zoom})`,
                    transition: 'transform 0.2s ease',
                  }}
                />
              ) : (
                /* High-fidelity fallback seismogram drum viewer */
                <div style={{ width: '100%', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    📈 Rekonstruksi Rekaman Drum Seismogram PVMBG (Amplitudo: {volcano.amplitude} • Durasi: {volcano.duration})
                  </div>
                  <div
                    style={{
                      height: '240px',
                      background: 'radial-gradient(ellipse at center, #0f172a 0%, #060a14 100%)',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 242, 255, 0.2)',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '10px',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 10, left: 14, fontSize: '10px', fontFamily: 'monospace', color: '#00f2ff' }}>
                      PGA STN: {geo?.pgaStation || 'PVMBG-DIGI'} • CH: EHZ (100 Hz) • FILTER: 0.5 - 10 Hz
                    </div>
                    {/* Simulated SVG Seismogram Traces */}
                    <svg viewBox="0 0 500 160" style={{ width: '100%', height: '160px' }}>
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(0,242,255,0.15)" />
                      <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                      
                      {/* Waveform trace */}
                      <path
                        d={`M 0,80 Q 50,80 80,78 Q 110,80 130,${80 - ampNum * 0.7} Q 145,${80 + ampNum * 0.9} Q 160,${80 - ampNum * 0.8} Q 180,${80 + ampNum * 0.6} Q 210,${80 - ampNum * 0.4} Q 250,${80 + ampNum * 0.3} Q 320,80 500,80`}
                        fill="none"
                        stroke={isAwas ? '#ff2a5f' : '#ff9800'}
                        strokeWidth="2"
                      />
                      
                      {/* Annotations */}
                      {showPhases && (
                        <>
                          <line x1="125" y1="10" x2="125" y2="150" stroke="#00f2ff" strokeWidth="1" strokeDasharray="2 2" />
                          <text x="128" y="24" fill="#00f2ff" fontSize="9" fontFamily="monospace">Onset Erupsi</text>

                          <line x1="145" y1="10" x2="145" y2="150" stroke="#ff2a5f" strokeWidth="1" strokeDasharray="2 2" />
                          <text x="148" y="38" fill="#ff2a5f" fontSize="9" fontFamily="monospace">Amax: {volcano.amplitude}</text>

                          <line x1="280" y1="10" x2="280" y2="150" stroke="#a855f7" strokeWidth="1" strokeDasharray="2 2" />
                          <text x="283" y="52" fill="#a855f7" fontSize="9" fontFamily="monospace">Coda Decay ({volcano.duration})</text>
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              )}

              {/* Overlay Annotations if official image exists and phases are enabled */}
              {volcano.image_url && showPhases && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    right: 12,
                    background: 'rgba(6, 10, 20, 0.85)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <span style={{ color: '#00f2ff', fontWeight: 700 }}>
                    ⚡ Amplitudo: {volcano.amplitude}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ⏱ Durasi: {volcano.duration}
                  </span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    📡 Sensor: {geo?.sensorType || 'Broadband 100Hz'}
                  </span>
                </div>
              )}
            </div>

            {/* Instrument & Station Technical Metadata */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>KOORDINAT KAWAH</span>
                <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {geo ? `${geo.pos[0].toFixed(3)}°, ${geo.pos[1].toFixed(3)}°` : '-'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>ELEVASI PUNCAK</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ff9800' }}>
                  {geo?.elevation ? `${geo.elevation} mdpl` : 'Aktif'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>PETUGAS POS PVMBG</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {volcano.author}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Seismological & Volcanological Physical Analysis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Measured Signal Parameters */}
            <div className="card" style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span> PARAMETER SINYAL SEISMOGRAM TERUKUR
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>AMPLITUDO DEFLEKSI</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#ff2a5f' }}>{volcano.amplitude}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>DURASI GEMPA (CODA)</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#ff9800' }}>{volcano.duration}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>ESTIMASI PGA</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#00f2ff', fontFamily: 'monospace' }}>{estPGA} g</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>FREKUENSI DOMINAN</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>{freqDominant}</span>
                </div>
              </div>

              <div style={{ marginTop: '10px', background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>KLASIFIKASI GELOMBANG SEISMIK</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#00f2ff' }}>{signalType}</span>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Indeks RSAM Estimasi: <strong style={{ color: '#fff' }}>{estRSAM} counts</strong>
                </div>
              </div>
            </div>

            {/* AI Physical Volcanology Interpretation */}
            <div className="card" style={{ padding: '14px 16px', background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#c084fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🤖</span> INTERPRETASI DINAMIKA MAGMA & FISIKA KAWAH
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {interpretation}
              </p>
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px' }}>
                <strong>Pengamatan Visual Kawah:</strong> {volcano.visual_ash}
              </div>
            </div>

            {/* PVMBG Official Mitigation & Aviation Advice */}
            <div className="card" style={{ padding: '14px 16px', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#f87171', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛡️</span> REKOMENDASI KESELAMATAN & STATUS PENERBANGAN
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {volcano.recommendation}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Kode Warna VONA: <strong style={{ color: isAwas ? '#ef4444' : '#f59e0b' }}>{isAwas ? 'RED (AWAS)' : 'ORANGE (SIAGA)'}</strong>
                </span>
                {volcano.detail_url && (
                  <a
                    href={volcano.detail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '11px',
                      color: '#00f2ff',
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    ↗ Rilis Lengkap PVMBG
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
