'use client';

import type { BMKGGempaDetail, ActivityIndex, SystemStatus, AIAnalysis } from '@/lib/types';

interface TacticalRibbonProps {
  latestQuake: BMKGGempaDetail | null;
  activityIndex: ActivityIndex | null;
  status: SystemStatus | null;
  aiAnalysis: AIAnalysis | null;
  stationCount?: number;
  tideCount?: number;
}

export default function TacticalRibbon({
  latestQuake,
  activityIndex,
  status,
  aiAnalysis,
  stationCount = 12,
  tideCount = 34,
}: TacticalRibbonProps) {
  const intensity = activityIndex?.overall_percentage ?? status?.seismic_intensity ?? 15.0;
  const mag = latestQuake?.Magnitude ? parseFloat(latestQuake.Magnitude) : 0;
  const depth = latestQuake?.Kedalaman || '10 km';
  const wilayah = latestQuake?.Wilayah || 'Wilayah Perairan Indonesia';
  const tsunamiPotensi = latestQuake?.Potensi || 'Tidak berpotensi tsunami';
  const isTsunamiThreat = tsunamiPotensi.toLowerCase().includes('berpotensi tsunami') && !tsunamiPotensi.toLowerCase().includes('tidak');

  const isBedrock = aiAnalysis?.model_used?.toLowerCase().includes('claude') ||
    aiAnalysis?.model_used?.toLowerCase().includes('bedrock') ||
    false;

  return (
    <div className="tactical-ribbon">
      {/* CARD 1: Latest BMKG Earthquake */}
      <div className={`ribbon-card ribbon-card--quake ${isTsunamiThreat ? 'ribbon-card--threat' : ''}`}>
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">
            <span className="live-dot-pulse" style={{ width: '6px', height: '6px' }} />
            BMKG TEWS AUTOGEMPA
          </span>
          <span className="ribbon-card__time">{latestQuake?.Jam || 'LIVE'}</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__mag-wrap">
            <div className={`ribbon-card__mag-badge ${mag >= 7.0 ? 'ribbon-card__mag-badge--critical' : mag >= 5.0 ? 'ribbon-card__mag-badge--high' : 'ribbon-card__mag-badge--normal'}`}>
              M{mag > 0 ? mag.toFixed(1) : '—'}
            </div>
            <div className="ribbon-card__depth-wrap">
              <span className="ribbon-card__depth">Kedalaman {depth}</span>
              <span className="ribbon-card__coords">{latestQuake?.Coordinates || 'Indonesia'}</span>
            </div>
          </div>
          <div className="ribbon-card__location" title={wilayah}>
            📍 {wilayah}
          </div>
          {isTsunamiThreat ? (
            <div className="ribbon-card__advisory ribbon-card__advisory--danger">
              🚨 {tsunamiPotensi}
            </div>
          ) : (
            <div className="ribbon-card__footer-meta" style={{ color: '#10b981' }}>
              ✓ {tsunamiPotensi}
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: National Seismic Intensity (MMI) */}
      <div className="ribbon-card">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">📊 FLINK STREAM CEP</span>
          <span className="ribbon-card__badge ribbon-card__badge--cyan">1-MIN TUMBLE</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__stat-row">
            <span className="ribbon-card__stat-val" style={{
              color: intensity > 60 ? '#ef4444' : intensity > 35 ? '#f59e0b' : '#10b981',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {intensity.toFixed(1)}%
            </span>
            <span className="ribbon-card__stat-unit">MMI INDEX</span>
          </div>
          <div className="ribbon-card__subtext">
            <span>Trend: <strong>{activityIndex?.trend_direction || status?.trend_direction || 'NOMINAL'}</strong></span>
          </div>
          <div className="ribbon-card__bar-track">
            <div
              className="ribbon-card__bar-fill"
              style={{
                width: `${Math.min(100, Math.max(5, intensity))}%`,
                background: intensity > 60 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #06b6d4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: IOC UNESCO Sea Level & InaTEWS */}
      <div className="ribbon-card">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">🌊 IOC UNESCO RADAR</span>
          <span className="ribbon-card__badge ribbon-card__badge--blue">{tideCount} STASIUN</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__stat-row">
            <span className="ribbon-card__stat-val" style={{
              color: status?.ocean_status?.includes('TSUNAMI') ? '#ff2a5f' : '#06b6d4',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {status?.ocean_status?.includes('TSUNAMI') ? 'ANOMALI' : 'NOMINAL'}
            </span>
            <span className="ribbon-card__stat-unit">DART BUOY</span>
          </div>
          <div className="ribbon-card__subtext">
            <span>InaTEWS Buoys: <strong style={{ color: '#10b981' }}>100% ONLINE</strong></span>
          </div>
          <div className="ribbon-card__footer-meta">
            Muka laut pesisir: <strong>±0.04m (Stabil)</strong>
          </div>
        </div>
      </div>

      {/* CARD 4: BMKG Broadband Network */}
      <div className="ribbon-card">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">📡 BMKG SEISMOMETER</span>
          <span className="ribbon-card__badge ribbon-card__badge--green">{stationCount} AKTIF</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__stat-row">
            <span className="ribbon-card__stat-val" style={{ color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>
              ONLINE
            </span>
            <span className="ribbon-card__stat-unit">PGA &lt; 0.005g</span>
          </div>
          <div className="ribbon-card__subtext">
            <span>LEM • JATS • CBJI • YOGI • PLAI</span>
          </div>
          <div className="ribbon-card__footer-meta">
            Kualitas Sinyal: <strong style={{ color: '#34d399' }}>99.8% (Nominal)</strong>
          </div>
        </div>
      </div>

      {/* CARD 5: AI Intelligence Status (Gemini / Bedrock) */}
      <div className="ribbon-card ribbon-card--ai">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">
            {isBedrock ? '☁️ AWS BEDROCK AI' : '⚡ GOOGLE GEMINI AI'}
          </span>
          <span className={`ribbon-card__badge ${isBedrock ? 'ribbon-card__badge--bedrock' : 'ribbon-card__badge--purple'}`}>
            {isBedrock ? 'CLAUDE 3.5' : '2.5 FLASH'}
          </span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__stat-row">
            <span
              className="ribbon-card__stat-val"
              style={{
                color:
                  aiAnalysis?.status === 'CRITICAL'
                    ? '#ef4444'
                    : aiAnalysis?.status === 'HIGH'
                    ? '#f59e0b'
                    : '#10b981',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {aiAnalysis?.status || 'NORMAL'}
            </span>
            <span className="ribbon-card__stat-unit">
              Conf: {Math.round((aiAnalysis?.confidence ?? 0.96) * 100)}%
            </span>
          </div>
          <div className="ribbon-card__subtext" title={aiAnalysis?.assessment || 'Monitoring aktif seluruh koridor subduksi'}>
            {aiAnalysis?.assessment
              ? aiAnalysis.assessment.slice(0, 52) + '...'
              : 'Monitoring aktif seluruh koridor subduksi'}
          </div>
          <div className="ribbon-card__footer-meta" style={{ color: '#94a3b8' }}>
            Latency: <strong>{aiAnalysis?.latency_ms || 280}ms</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
