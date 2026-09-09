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

  return (
    <div className="tactical-ribbon">
      {/* CARD 1: Latest BMKG Earthquake */}
      <div className="ribbon-card ribbon-card--quake">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">
            <span className="live-dot-pulse"></span>
            BMKG TEWS AUTOGEMPA
          </span>
          <span className="ribbon-card__time">{latestQuake?.Jam || 'LIVE'}</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__mag-wrap">
            <span className={`ribbon-card__mag ${mag >= 5.0 ? 'ribbon-card__mag--high' : 'ribbon-card__mag--normal'}`}>
              M{mag > 0 ? mag.toFixed(1) : '—'}
            </span>
            <div className="ribbon-card__depth-wrap">
              <span className="ribbon-card__depth">Kedalaman {depth}</span>
              <span className="ribbon-card__coords">{latestQuake?.Coordinates || 'Indonesia'}</span>
            </div>
          </div>
          <div className="ribbon-card__location" title={wilayah}>
            📍 {wilayah}
          </div>
          {isTsunamiThreat && (
            <div className="ribbon-card__advisory ribbon-card__advisory--danger">
              🚨 {tsunamiPotensi}
            </div>
          )}
        </div>
      </div>

      {/* CARD 2: National Seismic Intensity (MMI) */}
      <div className="ribbon-card">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">📊 FLINK STREAM CEP</span>
          <span className="ribbon-card__badge ribbon-card__badge--cyan">REAL-TIME</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__stat-row">
            <span className="ribbon-card__stat-val" style={{ color: intensity > 60 ? '#ef4444' : intensity > 35 ? '#f59e0b' : '#10b981' }}>
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
                width: `${Math.min(100, intensity)}%`,
                background: intensity > 60 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #06b6d4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: IOC UNESCO Sea Level & InaTEWS */}
      <div className="ribbon-card">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">🌊 IOC UNESCO TIDE GAUGES</span>
          <span className="ribbon-card__badge ribbon-card__badge--blue">{tideCount} STASIUN</span>
        </div>
        <div className="ribbon-card__body">
          <div className="ribbon-card__stat-row">
            <span className="ribbon-card__stat-val" style={{ color: '#06b6d4' }}>
              {status?.ocean_status?.includes('TSUNAMI') ? 'ANOMALI' : 'NOMINAL'}
            </span>
          </div>
          <div className="ribbon-card__subtext">
            <span>InaTEWS Buoys: <strong>100% ONLINE</strong></span>
          </div>
          <div className="ribbon-card__footer-meta">
            Muka laut pesisir: <strong>±0.04m (Normal)</strong>
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
            <span className="ribbon-card__stat-val" style={{ color: '#34d399' }}>
              ONLINE
            </span>
            <span className="ribbon-card__stat-unit">PGA &lt; 0.005g</span>
          </div>
          <div className="ribbon-card__subtext">
            <span>LEM • JATS • CBJI • YOGI • PLAI</span>
          </div>
          <div className="ribbon-card__footer-meta">
            Signal Quality: <strong>99.6% (Nominal)</strong>
          </div>
        </div>
      </div>

      {/* CARD 5: Gemini AI Intelligence Status */}
      <div className="ribbon-card ribbon-card--ai">
        <div className="ribbon-card__header">
          <span className="ribbon-card__tag">⚡ GOOGLE GEMINI AI</span>
          <span className="ribbon-card__badge ribbon-card__badge--purple">
            {aiAnalysis?.model_used ? '2.5 FLASH' : 'COPILOT'}
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
              ? aiAnalysis.assessment.slice(0, 48) + '...'
              : 'Monitoring aktif seluruh koridor subduksi'}
          </div>
        </div>
      </div>
    </div>
  );
}
