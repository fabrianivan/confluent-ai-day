'use client';

interface SimControlsProps {
  onSimulate: (type: 'volcanic-escalation' | 'tsunami' | 'real-2018' | 'reset') => void;
  simulating: string | null;
}

export default function SimControls({ onSimulate, simulating }: SimControlsProps) {
  return (
    <div className="sim-controls">
      <div className="sim-controls__indicator">
        <span className="live-dot-pulse"></span>
        <span>Live Real Data Feeds: <strong>USGS Earthquakes + Open-Meteo</strong></span>
      </div>

      <button
        className="sim-btn sim-btn--real-2018"
        onClick={() => onSimulate('real-2018')}
        disabled={simulating !== null}
        title="Replay exact sensor timeline of the Dec 22, 2018 Anak Krakatau flank collapse & tsunami"
      >
        <span>⚡</span>
        <span>{simulating === 'real-2018' ? 'Replaying Real 2018 Data...' : '🚨 Replay Real 2018 Flank Collapse'}</span>
      </button>

      <button
        className="sim-btn sim-btn--volcanic"
        onClick={() => onSimulate('volcanic-escalation')}
        disabled={simulating !== null}
      >
        <span>🔥</span>
        <span>{simulating === 'volcanic-escalation' ? 'Simulating...' : 'Simulate Volcanic Escalation'}</span>
      </button>

      <button
        className="sim-btn sim-btn--tsunami"
        onClick={() => onSimulate('tsunami')}
        disabled={simulating !== null}
      >
        <span>🌊</span>
        <span>{simulating === 'tsunami' ? 'Simulating...' : 'Simulate Tsunami Scenario'}</span>
      </button>

      <button
        className="sim-btn sim-btn--reset"
        onClick={() => onSimulate('reset')}
        disabled={simulating !== null}
      >
        <span>↺</span>
        <span>{simulating === 'reset' ? 'Resetting...' : 'Reset to Baseline'}</span>
      </button>
    </div>
  );
}
