'use client';

import { useState, useEffect } from 'react';

interface StatusBarProps {
  connected: boolean;
  alertCount: number;
  riskLevel: string;
  dashboardMode: 'REAL' | 'SIMULASI';
  onModeChange: (mode: 'REAL' | 'SIMULASI') => void;
}

export default function StatusBar({
  connected,
  alertCount,
  riskLevel,
  dashboardMode,
  onModeChange,
}: StatusBarProps) {
  const [timeStr, setTimeStr] = useState({ utc: '', wib: '', wita: '', wit: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr({
        utc: now.toISOString().substring(11, 19) + ' UTC',
        wib:
          new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(now) + ' WIB',
        wita:
          new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Makassar',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(now) + ' WITA',
        wit:
          new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jayapura',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }).format(now) + ' WIT',
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAlert = alertCount > 0 || riskLevel === 'CRITICAL';

  return (
    <header className="status-bar">
      <div className="status-bar__brand">
        <div className="status-bar__icon-wrapper" aria-hidden>
          <span className="status-bar__icon-mark">🇮🇩</span>
          <span className="status-bar__icon-beacon" />
        </div>
        <div>
          <div className="status-bar__title">
            <span>INATEWS SENTINEL</span>
            <span className="status-bar__version">MISSION CONTROL</span>
          </div>
          <div className="status-bar__subtitle">
            Pusat Intelijen Bencana & Megathrust Nasional · BMKG TEWS · Confluent Cloud · Apache Flink · Bedrock & Gemini AI
          </div>
        </div>
      </div>

      <div className="status-bar__center">
        <div className="status-bar__clock">
          <span className="status-bar__clock-val">{timeStr.wib || '--:--:-- WIB'}</span>
          <span className="status-bar__clock-sep">•</span>
          <span className="status-bar__clock-sub">{timeStr.wita}</span>
          <span className="status-bar__clock-sep">•</span>
          <span className="status-bar__clock-sub">{timeStr.wit}</span>
          <span className="status-bar__clock-sep">|</span>
          <span className="status-bar__clock-utc">{timeStr.utc || '--:--:-- UTC'}</span>
        </div>
      </div>

      <div className="status-bar__right">
        {/* Operation Mode Toggle */}
        <div className="status-bar__mode-switch" role="tablist" aria-label="Mode operasi">
          <button
            type="button"
            role="tab"
            aria-selected={dashboardMode === 'REAL'}
            className={`status-bar__mode-btn ${
              dashboardMode === 'REAL' ? 'status-bar__mode-btn--active-live' : ''
            }`}
            onClick={() => onModeChange('REAL')}
          >
            <span className="live-dot-pulse" style={{ width: '6px', height: '6px' }} />
            OPERASI LIVE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={dashboardMode === 'SIMULASI'}
            className={`status-bar__mode-btn ${
              dashboardMode === 'SIMULASI' ? 'status-bar__mode-btn--active-drill' : ''
            }`}
            onClick={() => onModeChange('SIMULASI')}
          >
            🧪 DRILL SIMULASI
          </button>
        </div>

        {/* Confluent Cloud Status Badge */}
        <div className="status-bar__cluster-badge">
          <span>☁️</span>
          <span>Confluent Cloud (us-east-2)</span>
        </div>

        {/* Threat Level Badge */}
        <div
          className={`status-bar__alerts ${
            isAlert ? 'status-bar__alerts--active' : 'status-bar__alerts--none'
          }`}
        >
          <span>{isAlert ? `🚨 ${alertCount || 1} ALERT` : '🛡️ NORMAL'}</span>
        </div>

        {/* SSE Streaming Indicator */}
        <div className="status-bar__live">
          <div
            className={`status-bar__live-dot ${
              !connected ? 'status-bar__live-dot--disconnected' : ''
            }`}
          />
          <span>{connected ? 'STREAM LIVE' : 'CONNECTING'}</span>
        </div>
      </div>
    </header>
  );
}
