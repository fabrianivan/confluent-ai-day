'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConnectorInfo {
  id: string;
  name: string;
  status: string;
  type: string;
  class: string;
  topic: string;
  tasks_active: number;
  tasks_max: number;
  throughput: string;
  total_records: number;
  last_heartbeat: string;
  config?: Record<string, unknown>;
}

interface ConnectorActionResponse {
  success: boolean;
  message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || '';

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  RUNNING: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399', dot: '#10b981' },
  PAUSED: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24', dot: '#f59e0b' },
  FAILED: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', dot: '#ef4444' },
  PROVISIONING: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: '#38bdf8', dot: '#38bdf8' },
};

const TYPE_ICONS: Record<string, string> = {
  source: '📥',
  sink: '📤',
};

const TYPE_LABELS: Record<string, string> = {
  source: 'SOURCE',
  sink: 'SINK',
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function ConnectorsPanel() {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<ConnectorInfo | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/connectors`);
      if (!res.ok) throw new Error(`Failed to fetch connectors: ${res.status}`);
      const data = await res.json();
      setConnectors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectors();
    const interval = setInterval(fetchConnectors, 15000);
    return () => clearInterval(interval);
  }, [fetchConnectors]);

  const handleAction = async (name: string, action: 'pause' | 'resume' | 'restart') => {
    setActionLoading(name);
    try {
      const res = await fetch(`${API_BASE}/api/connectors/${encodeURIComponent(name)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data: ConnectorActionResponse = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      setToast({ message: data.message, type: 'success' });
      fetchConnectors();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Action failed', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const showConfig = (connector: ConnectorInfo) => {
    setSelectedConfig(connector);
  };

  const hideConfig = () => {
    setSelectedConfig(null);
  };

  if (loading) {
    return (
      <div className="connectors-panel">
        <div className="connectors-panel__header">
          <h2 className="connectors-panel__title">
            <span>🔌</span> Confluent Connectors & Pipeline Hub
          </h2>
          <p className="connectors-panel__subtitle">Real-time connector telemetry & control plane</p>
        </div>
        <div className="connectors-panel__loading">Memuat telemetri connector...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="connectors-panel">
        <div className="connectors-panel__header">
          <h2 className="connectors-panel__title">
            <span>🔌</span> Confluent Connectors & Pipeline Hub
          </h2>
        </div>
        <div className="connectors-panel__error">
          <span>⚠️</span> {error}
          <button onClick={fetchConnectors} className="connectors-panel__retry-btn">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="connectors-panel">
      <div className="connectors-panel__header">
        <div>
          <h2 className="connectors-panel__title">
            <span>🔌</span> Confluent Connectors & Pipeline Hub
          </h2>
          <p className="connectors-panel__subtitle">
            Pipeline: DatagenSource → Kafka (gempa.stations) → Flink CEP → HttpSink → Emergency Webhooks
          </p>
        </div>
        <div className="connectors-panel__stats">
          {connectors.map(c => (
            <div key={c.name} className="connectors-panel__stat">
              <span className="connectors-panel__stat-label">{c.name}</span>
              <span className="connectors-panel__stat-value" style={{ color: STATUS_COLORS[c.status]?.text || STATUS_COLORS.RUNNING.text }}>
                {c.total_records > 0 ? formatNumber(c.total_records) : '—'} events
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Architecture Diagram */}
      <div className="connectors-panel__pipeline">
        <div className="pipeline-stage source">
          <div className="pipeline-stage__icon">📥</div>
          <div className="pipeline-stage__label">DatagenSource</div>
          <div className="pipeline-stage__topic">gempa.stations</div>
          <div className="pipeline-stage__connector">DatagenSource_SeismicTelemetry</div>
          <div className="pipeline-stage__status running">RUNNING</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage kafka">
          <div className="pipeline-stage__icon">⚡</div>
          <div className="pipeline-stage__label">Kafka Topics</div>
          <div className="pipeline-stage__topic">gempa.seismic, stations, tsunami</div>
          <div className="pipeline-stage__connector">Cluster: lkc-xqxxgr1</div>
          <div className="pipeline-stage__status running">ACTIVE</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage flink">
          <div className="pipeline-stage__icon">🔄</div>
          <div className="pipeline-stage__label">Flink CEP</div>
          <div className="pipeline-stage__topic">correlated_alerts, tsunami_scenarios</div>
          <div className="pipeline-stage__connector">3 Jobs Running</div>
          <div className="pipeline-stage__status running">PROCESSING</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage sink">
          <div className="pipeline-stage__icon">📤</div>
          <div className="pipeline-stage__label">HttpSink</div>
          <div className="pipeline-stage__topic">gempa.correlated_alerts</div>
          <div className="pipeline-stage__connector">HttpSink_DisasterAlerts</div>
          <div className="pipeline-stage__status running">RUNNING</div>
        </div>
        <div className="pipeline-arrow">→</div>
        <div className="pipeline-stage dashboard">
          <div className="pipeline-stage__icon">🖥️</div>
          <div className="pipeline-stage__label">Dashboard SSE</div>
          <div className="pipeline-stage__topic">/api/webhook/alerts</div>
          <div className="pipeline-stage__connector">Real-time UI Updates</div>
          <div className="pipeline-stage__status running">LISTENING</div>
        </div>
      </div>

      {/* Connector Cards Grid */}
      <div className="connectors-panel__grid">
        {connectors.map((connector) => {
          const statusStyle = STATUS_COLORS[connector.status] || STATUS_COLORS.RUNNING;
          const isActionLoading = actionLoading === connector.name;

          return (
            <div key={connector.name} className="connector-card" style={{ borderColor: statusStyle.border }}>
              <div className="connector-card__header" style={{ borderBottomColor: statusStyle.border }}>
                <div className="connector-card__identity">
                  <span className="connector-card__type-icon">{TYPE_ICONS[connector.type] || '🔌'}</span>
                  <div>
                    <div className="connector-card__name">{connector.name}</div>
                    <div className="connector-card__class">{connector.class} • {TYPE_LABELS[connector.type] || connector.type.toUpperCase()}</div>
                  </div>
                </div>
                <div className="connector-card__status" style={{ background: statusStyle.bg, borderColor: statusStyle.border, color: statusStyle.text }}>
                  <span className="connector-card__status-dot" style={{ background: statusStyle.dot }} />
                  {connector.status}
                </div>
              </div>

              <div className="connector-card__body">
                <div className="connector-card__metrics">
                  <div className="connector-metric">
                    <span className="connector-metric__label">Topic</span>
                    <span className="connector-metric__value">{connector.topic}</span>
                  </div>
                  <div className="connector-metric">
                    <span className="connector-metric__label">Tasks</span>
                    <span className="connector-metric__value">{connector.tasks_active} / {connector.tasks_max}</span>
                  </div>
                  <div className="connector-metric">
                    <span className="connector-metric__label">Throughput</span>
                    <span className="connector-metric__value">{connector.throughput}</span>
                  </div>
                  <div className="connector-metric">
                    <span className="connector-metric__label">Total Records</span>
                    <span className="connector-metric__value">{formatNumber(connector.total_records)}</span>
                  </div>
                  <div className="connector-metric">
                    <span className="connector-metric__label">Last Heartbeat</span>
                    <span className="connector-metric__value">{formatTimeAgo(connector.last_heartbeat)}</span>
                  </div>
                  <div className="connector-metric">
                    <span className="connector-metric__label">Connector ID</span>
                    <span className="connector-metric__value connector-metric__value--id">{connector.id}</span>
                  </div>
                </div>

                <div className="connector-card__actions">
                  <button
                    className="connector-btn connector-btn--primary"
                    onClick={() => handleAction(connector.name, 'pause')}
                    disabled={isActionLoading || connector.status === 'PAUSED' || connector.status === 'FAILED'}
                  >
                    {isActionLoading ? '⏳' : '⏸️'} Pause
                  </button>
                  <button
                    className="connector-btn connector-btn--success"
                    onClick={() => handleAction(connector.name, 'resume')}
                    disabled={isActionLoading || connector.status === 'RUNNING'}
                  >
                    {isActionLoading ? '⏳' : '▶️'} Resume
                  </button>
                  <button
                    className="connector-btn connector-btn--warning"
                    onClick={() => handleAction(connector.name, 'restart')}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? '⏳' : '🔄'} Restart
                  </button>
                  <button
                    className="connector-btn connector-btn--info"
                    onClick={() => showConfig(connector)}
                  >
                    📋 Config
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Config Modal */}
      {selectedConfig && (
        <div className="config-modal__overlay" onClick={hideConfig}>
          <div className="config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="config-modal__header">
              <h3>Connector Configuration: {selectedConfig.name}</h3>
              <button className="config-modal__close" onClick={hideConfig}>✕</button>
            </div>
            <div className="config-modal__body">
              <pre className="config-modal__json">{JSON.stringify(selectedConfig.config, null, 2)}</pre>
            </div>
            <div className="config-modal__footer">
              <button className="config-modal__copy-btn" onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedConfig.config, null, 2))}>
                📋 Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`connector-toast ${toast.type}`} onClick={() => setToast(null)}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}