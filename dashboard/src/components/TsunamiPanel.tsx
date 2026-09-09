'use client';

import type { TsunamiScenario } from '@/lib/types';

interface TsunamiPanelProps {
  scenario: TsunamiScenario;
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

export default function TsunamiPanel({ scenario }: TsunamiPanelProps) {
  if (!scenario.active) return null;

  return (
    <div className="card tsunami-panel">
      <div className="card__body">
        <div className="tsunami-panel__header">
          <span>🚨</span>
          <span>TSUNAMI SCENARIO — SIMULATED</span>
        </div>

        <div className="tsunami-panel__grid">
          <div>
            <div className="ai-panel__section-title">Detection Details</div>
            <div className="tsunami-panel__detail">
              <span className="tsunami-panel__detail-label">Detection Time</span>
              <span className="tsunami-panel__detail-value">{formatTime(scenario.detection_time)}</span>
            </div>
            <div className="tsunami-panel__detail">
              <span className="tsunami-panel__detail-label">Sensor</span>
              <span className="tsunami-panel__detail-value">{scenario.sensor_id}</span>
            </div>
            <div className="tsunami-panel__detail">
              <span className="tsunami-panel__detail-label">Wave Anomaly</span>
              <span className="tsunami-panel__detail-value" style={{ color: 'var(--status-critical)' }}>
                +{scenario.wave_anomaly?.toFixed(1)}m
              </span>
            </div>
            <div className="tsunami-panel__detail">
              <span className="tsunami-panel__detail-label">Severity</span>
              <span className="tsunami-panel__detail-value" style={{ color: 'var(--status-critical)' }}>
                {scenario.severity}
              </span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div className="ai-panel__section-title">Potentially Affected Zones</div>
              <ul className="tsunami-panel__zones">
                {scenario.affected_zones?.map((zone, i) => (
                  <li key={i}>{zone}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="ai-panel__section-title">Response Actions</div>
            <ul className="ai-panel__list">
              {scenario.response_actions?.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>

            <div className="ai-panel__disclaimer" style={{ marginTop: '20px' }}>
              ⚠ This is a <strong>simulated scenario</strong> for demonstration purposes. Not an official tsunami warning.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
