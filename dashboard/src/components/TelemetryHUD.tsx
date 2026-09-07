'use client';

import { LifecyclePhase } from '../lib/types';

interface TelemetryHUDProps {
  phase: LifecyclePhase | null;
  connected: boolean;
}

export default function TelemetryHUD({ phase, connected }: TelemetryHUDProps) {
  const phaseNum = phase?.phase_number ?? 1;
  const phaseTitle = phase?.phase_title ?? 'Phase 1: Quiescent Surveillance & Ambient Ingestion';
  const duration = phase?.duration_sec ?? 35;
  const elapsed = phase?.elapsed_sec ?? 1;
  const progressPercent = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const remainingSec = Math.max(0, duration - elapsed);

  const getPhaseColor = () => {
    switch (phaseNum) {
      case 4:
        return 'var(--status-critical, #ff2a5f)';
      case 3:
        return 'var(--status-high, #ff9100)';
      case 2:
        return 'var(--status-medium, #ffd600)';
      case 5:
        return 'var(--ocean-cyan, #00f2ff)';
      default:
        return 'var(--status-normal, #00e676)';
    }
  };

  return (
    <div className="telemetry-hud">
      {/* Top Banner: Autonomous Status & Phase Badge */}
      <div className="telemetry-hud__header">
        <div className="telemetry-hud__badge-group">
          <div className="telemetry-hud__mode-badge">
            <span className={`live-dot-pulse ${connected ? '' : 'live-dot-pulse--off'}`}></span>
            <span className="telemetry-hud__mode-text">
              AUTONOMOUS REAL-LIFE SURVEILLANCE
            </span>
          </div>

          <div
            className="telemetry-hud__phase-pill"
            style={{ borderColor: getPhaseColor() }}
          >
            <span className="telemetry-hud__phase-num">PHASE 0{phaseNum}/05</span>
            <span className="telemetry-hud__phase-title">{phaseTitle}</span>
          </div>
        </div>

        {/* Phase Timeline Countdown */}
        <div className="telemetry-hud__timer">
          <span className="telemetry-hud__timer-label">NEXT CYCLE SHIFT:</span>
          <span className="telemetry-hud__timer-value">{remainingSec}s</span>
        </div>
      </div>

      {/* Progress Timeline Bar */}
      <div className="telemetry-hud__progress-track">
        <div
          className="telemetry-hud__progress-bar"
          style={{
            width: `${progressPercent}%`,
            background: `linear-gradient(90deg, #00f2ff 0%, ${getPhaseColor()} 100%)`,
            boxShadow: `0 0 12px ${getPhaseColor()}`,
          }}
        />
      </div>

      {/* Real-Life Feeds & Streaming Infrastructure Telemetry Chips */}
      <div className="telemetry-hud__chips">
        <div className="telemetry-chip telemetry-chip--feed">
          <span className="telemetry-chip__dot"></span>
          <span className="telemetry-chip__label">USGS Seismic Feed:</span>
          <span className="telemetry-chip__val">LIVE STREAM (Sunda Strait)</span>
        </div>

        <div className="telemetry-chip telemetry-chip--feed">
          <span className="telemetry-chip__dot"></span>
          <span className="telemetry-chip__label">Open-Meteo Weather:</span>
          <span className="telemetry-chip__val">LIVE INGEST (-6.102, 105.423)</span>
        </div>

        <div className="telemetry-chip telemetry-chip--infra">
          <span className="telemetry-chip__dot telemetry-chip__dot--kafka"></span>
          <span className="telemetry-chip__label">Confluent Cloud:</span>
          <span className="telemetry-chip__val">10 Topics Active (28 msg/s)</span>
        </div>

        <div className="telemetry-chip telemetry-chip--infra">
          <span className="telemetry-chip__dot telemetry-chip__dot--flink"></span>
          <span className="telemetry-chip__label">Flink SQL:</span>
          <span className="telemetry-chip__val">Window Correlator (12ms)</span>
        </div>

        <div className="telemetry-chip telemetry-chip--infra">
          <span className="telemetry-chip__dot telemetry-chip__dot--gemini"></span>
          <span className="telemetry-chip__label">Gemini AI:</span>
          <span className="telemetry-chip__val">Explainable Decision Engine</span>
        </div>
      </div>
    </div>
  );
}
