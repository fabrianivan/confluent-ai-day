'use client';

import { LifecyclePhase } from '../lib/types';

interface TelemetryHUDProps {
  phase: LifecyclePhase | null;
  connected: boolean;
}

export default function TelemetryHUD({ phase, connected }: TelemetryHUDProps) {
  const phaseNum = phase?.phase_number ?? 1;
  const phaseTitle = phase?.phase_title ?? 'Fase 1: Baseline Monitoring & USGS Feed Ingestion';
  const duration = phase?.duration_sec ?? 30;
  const elapsed = phase?.elapsed_sec ?? 1;
  const progressPercent = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const remainingSec = Math.max(0, duration - elapsed);
  const scenarioName = phase?.scenario_name ?? 'MEGATHRUST SELAT SUNDA (M8.2)';
  const faultZone = phase?.fault_zone ?? 'Sunda Strait Subduction';
  const magnitude = phase?.magnitude ?? 8.2;
  const depth = phase?.depth ?? 25;

  const getPhaseColor = () => {
    switch (phaseNum) {
      case 4:
        return 'var(--ocean-cyan, #00f2ff)'; // Tsunami
      case 3:
        return 'var(--status-critical, #ff2a5f)'; // Mainshock
      case 2:
        return 'var(--status-high, #ff9100)'; // Precursor
      case 5:
        return 'var(--status-medium, #ffd600)'; // Aftershock/Recovery
      default:
        return 'var(--status-normal, #00e676)'; // Baseline
    }
  };

  return (
    <div className="telemetry-hud">
      {/* Top Banner: Autonomous Status & Scenario Badge */}
      <div className="telemetry-hud__header">
        <div className="telemetry-hud__badge-group">
          <div className="telemetry-hud__mode-badge">
            <span className={`live-dot-pulse ${connected ? '' : 'live-dot-pulse--off'}`}></span>
            <span className="telemetry-hud__mode-text">
              AUTONOMOUS MEGATHRUST SIMULATION
            </span>
          </div>

          <div
            className="telemetry-hud__phase-pill"
            style={{ borderColor: getPhaseColor() }}
          >
            <span className="telemetry-hud__phase-num">SCENARIO: {scenarioName}</span>
            <span className="telemetry-hud__phase-title">{phaseTitle}</span>
          </div>
        </div>

        {/* Phase Timeline Countdown */}
        <div className="telemetry-hud__timer">
          <span className="telemetry-hud__timer-label">PHASE PROGRESS:</span>
          <span className="telemetry-hud__timer-value">{remainingSec}s left</span>
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
          <span className="telemetry-chip__label">Fault Zone:</span>
          <span className="telemetry-chip__val">{faultZone}</span>
        </div>

        <div className="telemetry-chip telemetry-chip--feed">
          <span className="telemetry-chip__dot"></span>
          <span className="telemetry-chip__label">Parameters:</span>
          <span className="telemetry-chip__val">M{magnitude > 0 ? magnitude.toFixed(1) : '8.2'} • Depth {depth}km</span>
        </div>

        <div className="telemetry-chip telemetry-chip--infra">
          <span className="telemetry-chip__dot telemetry-chip__dot--kafka"></span>
          <span className="telemetry-chip__label">Confluent Kafka:</span>
          <span className="telemetry-chip__val">gempa.* (10 Topics)</span>
        </div>

        <div className="telemetry-chip telemetry-chip--infra">
          <span className="telemetry-chip__dot telemetry-chip__dot--flink"></span>
          <span className="telemetry-chip__label">Flink CEP:</span>
          <span className="telemetry-chip__val">Tsunami & MMI Correlation</span>
        </div>

        <div className="telemetry-chip telemetry-chip--infra">
          <span className="telemetry-chip__dot telemetry-chip__dot--gemini"></span>
          <span className="telemetry-chip__label">Gemini AI:</span>
          <span className="telemetry-chip__val">BMKG/BNPB Decision Support</span>
        </div>
      </div>
    </div>
  );
}
