'use client';

interface StatusBarProps {
  connected: boolean;
  alertCount: number;
  riskLevel: string;
}

export default function StatusBar({ connected, alertCount, riskLevel }: StatusBarProps) {
  return (
    <header className="status-bar">
      <div className="status-bar__brand">
        <span className="status-bar__icon">🌋</span>
        <div>
          <div className="status-bar__title">Krakatau Sentinel</div>
          <div className="status-bar__subtitle">Real-Time Volcanic Intelligence & Emergency Response</div>
        </div>
      </div>
      <div className="status-bar__right">
        <div className={`status-bar__alerts ${alertCount > 0 ? 'status-bar__alerts--active' : 'status-bar__alerts--none'}`}>
          <span>{alertCount > 0 ? '🚨' : '✓'}</span>
          <span>{alertCount > 0 ? `${alertCount} ACTIVE ALERT${alertCount > 1 ? 'S' : ''}` : 'NO ALERTS'}</span>
        </div>
        <div className="status-bar__live">
          <div className={`status-bar__live-dot ${!connected ? 'status-bar__live-dot--disconnected' : ''}`} />
          <span>{connected ? 'LIVE' : 'CONNECTING'}</span>
        </div>
      </div>
    </header>
  );
}
