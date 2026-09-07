'use client';

import { useState, useEffect } from 'react';

interface StatusBarProps {
  connected: boolean;
  alertCount: number;
  riskLevel: string;
}

export default function StatusBar({ connected, alertCount, riskLevel }: StatusBarProps) {
  const [timeStr, setTimeStr] = useState({ utc: '', wib: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr({
        utc: now.toISOString().substring(11, 19) + ' UTC',
        wib: new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now) + ' WIB',
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
        <div className="status-bar__icon-wrapper">
          <span className="status-bar__icon">🌋</span>
          <span className="status-bar__icon-beacon"></span>
        </div>
        <div>
          <div className="status-bar__title">
            <span>KRAKATAU SENTINEL</span>
            <span className="status-bar__version">MISSION CONTROL v2.5</span>
          </div>
          <div className="status-bar__subtitle">
            Autonomous Multi-Stream Volcanic Intelligence & Disaster Warning System
          </div>
        </div>
      </div>

      {/* Center Telemetry: Clocks & Sensor Health */}
      <div className="status-bar__center">
        <div className="status-bar__clock">
          <span className="status-bar__clock-icon">⏱</span>
          <span className="status-bar__clock-val">{timeStr.wib || '16:00:00 WIB'}</span>
          <span className="status-bar__clock-sep">|</span>
          <span className="status-bar__clock-utc">{timeStr.utc || '09:00:00 UTC'}</span>
        </div>
        <div className="status-bar__sensors-badge">
          <span className="status-bar__sensors-dot"></span>
          <span>48 MULTI-DOMAIN SENSORS ONLINE</span>
        </div>
      </div>

      {/* Right Controls: Cluster info, Alerts & Live indicator */}
      <div className="status-bar__right">
        <div className="status-bar__cluster-badge">
          <span className="status-bar__cluster-icon">⚡</span>
          <span>CONFLUENT CLOUD (AWS us-east-2)</span>
        </div>

        <div
          className={`status-bar__alerts ${
            isAlert ? 'status-bar__alerts--active' : 'status-bar__alerts--none'
          }`}
        >
          <span>{isAlert ? '🚨' : '✓'}</span>
          <span>
            {isAlert
              ? `${alertCount || 1} CRITICAL ALERT${alertCount > 1 ? 'S' : ''}`
              : 'ALL CORRIDORS NOMINAL'}
          </span>
        </div>

        <div className="status-bar__live">
          <div
            className={`status-bar__live-dot ${
              !connected ? 'status-bar__live-dot--disconnected' : ''
            }`}
          />
          <span>{connected ? 'LIVE TELEMETRY' : 'CONNECTING'}</span>
        </div>
      </div>
    </header>
  );
}
