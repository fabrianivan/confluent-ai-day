'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SystemStatus,
  AIAnalysis,
  TsunamiScenario,
  LiveEvent,
  ActivityIndex as ActivityIndexType,
  RealtimeEarthquakesData,
  VolcanoEruption,
} from '@/lib/types';
import ActivityGauge from '@/components/ActivityGauge';
import MetricCards from '@/components/MetricCards';
import EventStream from '@/components/EventStream';
import AIPanel from '@/components/AIPanel';
import TsunamiPanel from '@/components/TsunamiPanel';
import Seismograph from '@/components/Seismograph';
import TacticalRibbon from '@/components/TacticalRibbon';
import LatestQuakeCard from '@/components/LatestQuakeCard';
import StatusBar from '@/components/StatusBar';
import FlinkPanel from '@/components/FlinkPanel';
import OceanPanel from '@/components/OceanPanel';
import GovernanceView from '@/components/GovernanceView';
import SeismogramAnalysisModal from '@/components/SeismogramAnalysisModal';
import VolcanoSeismographHub from '@/components/VolcanoSeismographHub';
import WorkspaceNav, { WorkspaceTab } from '@/components/WorkspaceNav';

const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        minHeight: '440px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(6, 10, 20, 0.8)',
        color: 'var(--text-muted)',
        fontSize: '13px',
      }}
    >
      Memuat peta subduksi & jaringan InaTEWS...
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const INITIAL_EVENTS: LiveEvent[] = [
  {
    id: 'init-1',
    type: 'SEISMIC',
    description: 'BMKG TEWS: Pemantauan kontinyu jaringan seismik broadband nasional aktif',
    severity: 'LOW',
    timestamp: '2026-09-08T08:00:00.000Z',
  },
  {
    id: 'init-2',
    type: 'STATION',
    description: 'Stasiun LEM (Lembang, Jawa Barat): Kualitas sinyal 99.8%, PGA 0.0018g [ONLINE]',
    severity: 'LOW',
    timestamp: '2026-09-08T08:01:00.000Z',
  },
  {
    id: 'init-3',
    type: 'OCEAN',
    description: 'InaTEWS Buoy & Tide Gauge IOC: Selat Sunda & Pesisir Selatan Jawa nominal',
    severity: 'LOW',
    timestamp: '2026-09-08T08:02:00.000Z',
  },
  {
    id: 'init-4',
    type: 'VOLCANO',
    description: 'MAGMA PVMBG: Monitoring kontinyu aktivitas vulkanik kawah aktif Nusantara',
    severity: 'LOW',
    timestamp: '2026-09-08T08:03:00.000Z',
  },
  {
    id: 'init-5',
    type: 'INFRASTRUCTURE',
    description: 'Fasilitas Kritis BNPB / BPBD: Jalur telemetri darurat operasional 100%',
    severity: 'LOW',
    timestamp: '2026-09-08T08:04:00.000Z',
  },
];

function parseLiveEvent(data: Record<string, unknown>, id: string): LiveEvent {
  const rawType = String(data.type || 'UNKNOWN');
  const type = rawType.toUpperCase();
  let description = data.description ? String(data.description) : '';
  let severity = (data.severity ? String(data.severity) : 'LOW') as
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL';

  if (!description) {
    switch (type) {
      case 'SEISMIC': {
        const mag = typeof data.magnitude === 'number' ? data.magnitude.toFixed(1) : '?';
        const depth = typeof data.depth === 'number' ? data.depth.toFixed(0) : '?';
        const fault = String(data.fault_zone || 'Wilayah Indonesia');
        description = `Gempa Bumi M${mag} — Kedalaman ${depth}km (${fault})`;
        severity =
          typeof data.magnitude === 'number' && data.magnitude >= 7.0
            ? 'CRITICAL'
            : typeof data.magnitude === 'number' && data.magnitude >= 5.5
            ? 'HIGH'
            : typeof data.magnitude === 'number' && data.magnitude >= 4.0
            ? 'MEDIUM'
            : 'LOW';
        break;
      }
      case 'STATION': {
        const st = String(data.station_id || 'Station');
        const pga = typeof data.pga_recorded === 'number' ? data.pga_recorded.toFixed(4) : '?';
        const status = String(data.status || 'ONLINE');
        description = `Stasiun ${st}: PGA ${pga}g [${status}]`;
        severity = status === 'CLIPPED' ? 'CRITICAL' : 'LOW';
        break;
      }
      case 'OCEAN': {
        const sensor = String(data.sensor_id || 'Tide-Gauge');
        const wh = typeof data.wave_height === 'number' ? data.wave_height.toFixed(2) : '?';
        description = `${sensor}: Fluktuasi muka laut ${wh}m`;
        severity =
          typeof data.wave_height === 'number' && data.wave_height > 2.0
            ? 'CRITICAL'
            : typeof data.wave_height === 'number' && data.wave_height > 0.8
            ? 'HIGH'
            : 'LOW';
        break;
      }
      case 'WEATHER': {
        const ws = typeof data.wind_speed === 'number' ? data.wind_speed.toFixed(0) : '?';
        const wd = String(data.wind_direction || 'N');
        description = `Cuaca: Kecepatan angin ${ws} km/h arah ${wd}`;
        severity = 'LOW';
        break;
      }
      default:
        description = `${type} telemetri diterima`;
        severity = 'LOW';
    }
  }

  return {
    id,
    type,
    description,
    severity,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
    data,
  };
}

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [activityIndex, setActivityIndex] = useState<ActivityIndexType | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [tsunami, setTsunami] = useState<TsunamiScenario | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);
  const [realQuakes, setRealQuakes] = useState<RealtimeEarthquakesData | null>(null);
  const [volcanoes, setVolcanoes] = useState<VolcanoEruption[]>([]);
  const [selectedVolcano, setSelectedVolcano] = useState<string | null>('BMKG_REGIONAL');
  const [inspectingSeismogram, setInspectingSeismogram] = useState<VolcanoEruption | null>(null);
  const [dashboardMode, setDashboardMode] = useState<'REAL' | 'SIMULASI'>('REAL');
  const [focusCoords, setFocusCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('overview');

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventCounter = useRef(100);

  // Fetch real BMKG earthquakes & system status
  const fetchRealQuakes = useCallback(() => {
    fetch(`${API_BASE}/api/realtime/earthquakes`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch real quakes');
        return res.json();
      })
      .then((data: RealtimeEarthquakesData) => {
        if (data) setRealQuakes(data);
      })
      .catch(() => {});
  }, []);

  const fetchVolcanoes = useCallback(() => {
    fetch(`${API_BASE}/api/realtime/volcanoes`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch volcanoes');
        return res.json();
      })
      .then((data: VolcanoEruption[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVolcanoes(data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAI = useCallback(() => {
    fetch(`${API_BASE}/api/ai/latest`)
      .then((res) => {
        if (!res.ok) throw new Error('AI fetch failed');
        return res.json();
      })
      .then((data: AIAnalysis) => {
        if (data && data.status) {
          setAiAnalysis(data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchStatus = useCallback(() => {
    fetch(`${API_BASE}/api/status`)
      .then((res) => {
        if (!res.ok) throw new Error('Status fetch failed');
        return res.json();
      })
      .then((data: SystemStatus) => {
        if (data) {
          setStatus(data);
          if (data.latest_ai) setAiAnalysis(data.latest_ai);
          if (data.tsunami_scenario?.active) setTsunami(data.tsunami_scenario);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRealQuakes();
    fetchVolcanoes();
    fetchStatus();
    fetchAI();

    const interval = setInterval(() => {
      fetchRealQuakes();
      fetchVolcanoes();
      fetchStatus();
      fetchAI();
    }, 25000);

    return () => clearInterval(interval);
  }, [fetchRealQuakes, fetchVolcanoes, fetchStatus, fetchAI]);

  // SSE Stream Listener
  const connectSSE = useCallback(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener('all', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        const { event: eventType, data } = msg;

        switch (eventType) {
          case 'metrics':
            setStatus(data as SystemStatus);
            break;
          case 'activity_index':
            setActivityIndex(data as ActivityIndexType);
            break;
          case 'ai_analysis':
            setAiAnalysis(data as AIAnalysis);
            break;
          case 'tsunami':
            setTsunami(data as TsunamiScenario);
            break;
          case 'event': {
            const liveEvent = parseLiveEvent(
              data as Record<string, unknown>,
              `evt-${++eventCounter.current}`
            );
            setEvents((prev) => [liveEvent, ...prev].slice(0, 50));

            if (liveEvent.type === 'SEISMIC') {
              fetchRealQuakes();
              fetchAI();
            }
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connectSSE, 2500);
    };
  }, [fetchRealQuakes, fetchAI]);

  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectSSE]);

  const activity =
    activityIndex?.overall_percentage ??
    status?.seismic_intensity ??
    15.0;

  const trend = activityIndex?.trend_direction ?? status?.trend_direction ?? 'STABLE';
  const riskLevel = status?.risk_level ?? 'NORMAL';
  const alertCount = (tsunami?.active ? 1 : 0) + (status?.active_alerts ?? 0);

  const drillScenario: TsunamiScenario = tsunami?.active
    ? tsunami
    : {
        active: true,
        detection_time: '11:42:00 WIB',
        sensor_id: 'BUOY-INA-01 (Selat Sunda)',
        wave_anomaly: 3.85,
        affected_zones: [
          'Pesisir Pandeglang / Ujung Kulon',
          'Lampung Selatan / Kalianda',
          'Anyer & Carita',
          'Cilacap Pesisir',
        ],
        response_actions: [
          'Evakuasi segera ke ketinggian >20 m',
          'Aktivasi sirine pesisir InaTEWS',
          'Dispatch tim SAR BNPB / BASARNAS',
        ],
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
      };

  return (
    <div className="dash-root">
      <StatusBar
        connected={connected}
        alertCount={alertCount}
        riskLevel={riskLevel}
        dashboardMode={dashboardMode}
        onModeChange={setDashboardMode}
      />

      <WorkspaceNav
        activeTab={activeWorkspaceTab}
        onTabChange={setActiveWorkspaceTab}
        aiModel={aiAnalysis?.model_used}
        isDrill={dashboardMode === 'SIMULASI'}
      />

      <main className="dashboard">
        {/* ==================== TAB 1: OVERVIEW & PETA SITUASI ==================== */}
        {activeWorkspaceTab === 'overview' && (
          <>
            <TacticalRibbon
              latestQuake={realQuakes?.latest_bmkg ?? null}
              activityIndex={activityIndex}
              status={status}
              aiAnalysis={aiAnalysis}
              stationCount={12}
              tideCount={34}
            />

            {dashboardMode === 'SIMULASI' && (
              <div className="drill-banner">
                <strong>Latihan Megathrust</strong>
                <span>
                  Skenario drill InaTEWS aktif di atas Kafka stream live. Flink SQL menghitung intensitas
                  secara deterministik untuk pengujian kesiapsiagaan darurat nasional.
                </span>
              </div>
            )}

            {dashboardMode === 'SIMULASI' && <TsunamiPanel scenario={drillScenario} />}

            <div className="dashboard__main-grid">
              <div className="dashboard__left-col">
                <MapComponent
                  realQuakes={realQuakes}
                  focusCoords={focusCoords}
                  activityLevel={activity}
                  events={events}
                  volcanoes={volcanoes}
                  selectedVolcano={selectedVolcano}
                  onSelectVolcano={(name) => setSelectedVolcano(name)}
                  onInspectVolcanoSeismogram={(v) => setInspectingSeismogram(v)}
                  tsunamiActive={dashboardMode === 'SIMULASI' || Boolean(tsunami?.active)}
                  isSimulasi={dashboardMode === 'SIMULASI'}
                />

                <Seismograph
                  seismicEnergy={dashboardMode === 'SIMULASI' ? 8.4 : 1.2}
                  activityLevel={activity}
                  phaseName={dashboardMode === 'SIMULASI' ? 'MEGATHRUST_DRILL' : 'SEISMIC_BASELINE'}
                  volcanoes={volcanoes}
                  selectedVolcano={selectedVolcano}
                  onSelectVolcano={(name) => setSelectedVolcano(name)}
                  onInspectSeismogram={(v) => setInspectingSeismogram(v)}
                  isSimulasi={dashboardMode === 'SIMULASI'}
                />
              </div>

              <div className="sidebar">
                <LatestQuakeCard
                  quake={realQuakes?.latest_bmkg ?? null}
                  onFocusMap={(lat, lon) => setFocusCoords({ lat, lon })}
                />

                <div className="card">
                  <div className="card__header">
                    <span className="card__title">Indeks Intensitas Seismik (MMI)</span>
                    <span className="card__badge card__badge--flink">FLINK SQL</span>
                  </div>
                  <ActivityGauge percentage={activity} trend={trend} />
                </div>

                <MetricCards
                  oceanStatus={
                    dashboardMode === 'SIMULASI' || tsunami?.active
                      ? 'TSUNAMI WAVE FRONT'
                      : status?.ocean_status ?? 'IOC UNESCO LIVE'
                  }
                  weatherStatus={status?.weather_status ?? 'OPEN-METEO'}
                  infraStatus={status?.infra_status ?? 'OPERASIONAL'}
                  activityIndex={activityIndex}
                />
              </div>
            </div>

            {/* Live Stream & AI Sentinel Quick Gateway */}
            <div className="dashboard__split" style={{ marginTop: '8px' }}>
              <EventStream events={events} />

              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0' }}>
                <div>
                  <div className="card__header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="card__title">
                      <span>⚡</span>
                      <span>Pusat Intelijen AI & Agen Streaming</span>
                    </span>
                    <span className="card__badge" style={{
                      background: 'rgba(0, 242, 255, 0.12)',
                      border: '1px solid #00f2ff',
                      color: '#00f2ff',
                      fontWeight: 800,
                    }}>
                      {aiAnalysis?.model_used || 'Bedrock & Gemini'}
                    </span>
                  </div>

                  <div className="card__body" style={{ padding: '16px 20px' }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: aiAnalysis?.status === 'CRITICAL' ? '#ff2a5f' : aiAnalysis?.status === 'HIGH' ? '#ff9100' : '#00f2ff',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span className="live-dot-pulse" style={{
                        background: aiAnalysis?.status === 'CRITICAL' ? '#ff2a5f' : '#10b981',
                        boxShadow: `0 0 8px ${aiAnalysis?.status === 'CRITICAL' ? '#ff2a5f' : '#10b981'}`,
                      }} />
                      <span>THREAT LEVEL: {aiAnalysis?.status || 'NORMAL MONITORING'}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                        (Confidence: {Math.round((aiAnalysis?.confidence || 0.95) * 100)}%)
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.65, marginBottom: '14px' }}>
                      {aiAnalysis?.threat_summary || aiAnalysis?.assessment || 'InaTEWS Sentinel Intelligence terus mengamati aliran sensor real-time BMKG, buoy InaTEWS, dan Flink CEP secara berkelanjutan.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '10px' }}>OODA Autonomous Loop</div>
                        <div style={{ color: '#00f2ff', fontWeight: 700, marginTop: '2px' }}>✓ Aktif Mengamati Kafka</div>
                      </div>
                      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                        <div style={{ color: '#94a3b8', fontSize: '10px' }}>Multi-Agency Action</div>
                        <div style={{ color: '#34d399', fontWeight: 700, marginTop: '2px' }}>✓ SOP BMKG, BNPB, SAR</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6, 10, 20, 0.5)' }}>
                  <button
                    onClick={() => setActiveWorkspaceTab('ai')}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.22), rgba(168, 85, 247, 0.28))',
                      border: '1px solid #00f2ff',
                      color: '#00f2ff',
                      padding: '11px 18px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      letterSpacing: '0.8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 255, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span>🤖</span>
                    <span>BUKA PANEL AI SENTINEL & STREAMING AGENT LENGKAP</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: AI SENTINEL & STREAMING AGENT ==================== */}
        {activeWorkspaceTab === 'ai' && (
          <>
            <TacticalRibbon
              latestQuake={realQuakes?.latest_bmkg ?? null}
              activityIndex={activityIndex}
              status={status}
              aiAnalysis={aiAnalysis}
              stationCount={12}
              tideCount={34}
            />

            {aiAnalysis ? (
              <AIPanel analysis={aiAnalysis} />
            ) : (
              <div className="card ops-placeholder">
                <h3>InaTEWS AI Decision Support</h3>
                <p>AI sedang memproses telemetri seismik aktif...</p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB 3: TSUNAMI & LAUT IOC ==================== */}
        {activeWorkspaceTab === 'ocean' && (
          <>
            <TacticalRibbon
              latestQuake={realQuakes?.latest_bmkg ?? null}
              activityIndex={activityIndex}
              status={status}
              aiAnalysis={aiAnalysis}
              stationCount={12}
              tideCount={34}
            />

            {dashboardMode === 'SIMULASI' && <TsunamiPanel scenario={drillScenario} />}
            <OceanPanel tsunami={dashboardMode === 'SIMULASI' ? drillScenario : tsunami} />
          </>
        )}

        {/* ==================== TAB 4: CONFLUENT & FLINK CEP ==================== */}
        {activeWorkspaceTab === 'stream' && (
          <section className="platform-row">
            <div className="platform-row__intro">
              <h2>Spine Streaming (Confluent Cloud & Apache Flink)</h2>
              <p>
                Confluent Cloud mengorelasikan stasiun BMKG, buoy InaTEWS, dan feed laut lewat Flink
                SQL. Schema Registry menjaga kontrak event untuk decision-support darurat nasional.
              </p>
            </div>
            <FlinkPanel activityIndex={activityIndex} status={status} />
            <GovernanceView />
          </section>
        )}

        {/* ==================== TAB 5: VOLCANO HUB ==================== */}
        {activeWorkspaceTab === 'volcano' && (
          <VolcanoSeismographHub
            volcanoes={volcanoes}
            selectedVolcano={selectedVolcano === 'BMKG_REGIONAL' ? 'Anak Krakatau' : selectedVolcano}
            onSelectVolcano={(name) => setSelectedVolcano(name)}
            onInspectSeismogram={(v) => setInspectingSeismogram(v)}
          />
        )}

        {/* ==================== TAB 6: ALL (PANORAMA LENGKAP) ==================== */}
        {activeWorkspaceTab === 'all' && (
          <>
            <TacticalRibbon
              latestQuake={realQuakes?.latest_bmkg ?? null}
              activityIndex={activityIndex}
              status={status}
              aiAnalysis={aiAnalysis}
              stationCount={12}
              tideCount={34}
            />

            {dashboardMode === 'SIMULASI' && <TsunamiPanel scenario={drillScenario} />}

            <div className="section-hero-title">
              <h2><span>🗺️</span> 1. Peta Situasi & Seismograf Real-Time</h2>
              <p>Jaringan stasiun broadband BMKG dan deformasi subduksi</p>
            </div>

            <div className="dashboard__main-grid">
              <div className="dashboard__left-col">
                <MapComponent
                  realQuakes={realQuakes}
                  focusCoords={focusCoords}
                  activityLevel={activity}
                  events={events}
                  volcanoes={volcanoes}
                  selectedVolcano={selectedVolcano}
                  onSelectVolcano={(name) => setSelectedVolcano(name)}
                  onInspectVolcanoSeismogram={(v) => setInspectingSeismogram(v)}
                  tsunamiActive={dashboardMode === 'SIMULASI' || Boolean(tsunami?.active)}
                  isSimulasi={dashboardMode === 'SIMULASI'}
                />

                <Seismograph
                  seismicEnergy={dashboardMode === 'SIMULASI' ? 8.4 : 1.2}
                  activityLevel={activity}
                  phaseName={dashboardMode === 'SIMULASI' ? 'MEGATHRUST_DRILL' : 'SEISMIC_BASELINE'}
                  volcanoes={volcanoes}
                  selectedVolcano={selectedVolcano}
                  onSelectVolcano={(name) => setSelectedVolcano(name)}
                  onInspectSeismogram={(v) => setInspectingSeismogram(v)}
                  isSimulasi={dashboardMode === 'SIMULASI'}
                />
              </div>

              <div className="sidebar">
                <LatestQuakeCard
                  quake={realQuakes?.latest_bmkg ?? null}
                  onFocusMap={(lat, lon) => setFocusCoords({ lat, lon })}
                />

                <div className="card">
                  <div className="card__header">
                    <span className="card__title">Indeks Intensitas Seismik (MMI)</span>
                    <span className="card__badge card__badge--flink">FLINK SQL</span>
                  </div>
                  <ActivityGauge percentage={activity} trend={trend} />
                </div>

                <MetricCards
                  oceanStatus={
                    dashboardMode === 'SIMULASI' || tsunami?.active
                      ? 'TSUNAMI WAVE FRONT'
                      : status?.ocean_status ?? 'IOC UNESCO LIVE'
                  }
                  weatherStatus={status?.weather_status ?? 'OPEN-METEO'}
                  infraStatus={status?.infra_status ?? 'OPERASIONAL'}
                  activityIndex={activityIndex}
                />
              </div>
            </div>

            <div className="section-hero-title" style={{ marginTop: '24px' }}>
              <h2><span>🤖</span> 2. AI Sentinel & Streaming Data Agent</h2>
              <p>Dual LLM Engine (Bedrock & Gemini) dengan Continuous OODA Loop</p>
            </div>

            {aiAnalysis && <AIPanel analysis={aiAnalysis} />}

            <div className="section-hero-title" style={{ marginTop: '24px' }}>
              <h2><span>🌊</span> 3. Radar Muka Air Laut & Jaringan Pasut IOC</h2>
              <p>Stasiun pasut pesisir dan DART Buoys deteksi tsunami</p>
            </div>

            <div className="dashboard__split">
              <OceanPanel tsunami={dashboardMode === 'SIMULASI' ? drillScenario : tsunami} />
              <EventStream events={events} />
            </div>

            <div className="section-hero-title" style={{ marginTop: '24px' }}>
              <h2><span>⚡</span> 4. Flink Stream CEP & Tata Kelola Schema</h2>
              <p>Confluent Cloud stream correlation and schema versioning</p>
            </div>

            <section className="platform-row">
              <FlinkPanel activityIndex={activityIndex} status={status} />
              <GovernanceView />
            </section>

            <div className="section-hero-title" style={{ marginTop: '24px' }}>
              <h2><span>🌋</span> 5. Hub Spektrografi Seismik PVMBG</h2>
              <p>Analisis gelombang frekuensi tinggi dan swarm vulkanik</p>
            </div>

            <VolcanoSeismographHub
              volcanoes={volcanoes}
              selectedVolcano={selectedVolcano === 'BMKG_REGIONAL' ? 'Anak Krakatau' : selectedVolcano}
              onSelectVolcano={(name) => setSelectedVolcano(name)}
              onInspectSeismogram={(v) => setInspectingSeismogram(v)}
            />
          </>
        )}
      </main>

      {/* Seismogram Image & Physical Waveform Analysis Modal */}
      {inspectingSeismogram && (
        <SeismogramAnalysisModal
          volcano={inspectingSeismogram}
          onClose={() => setInspectingSeismogram(null)}
        />
      )}
    </div>
  );
}
