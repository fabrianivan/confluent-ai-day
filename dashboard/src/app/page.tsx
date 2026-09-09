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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || '';

const INITIAL_QUAKES: RealtimeEarthquakesData = {
  latest_bmkg: {
    Tanggal: '09 Sep 2026',
    Jam: '13:21:30 WIB',
    DateTime: '2026-09-09T06:21:30+00:00',
    Coordinates: '-6.92,105.49',
    Lintang: '6.92 LS',
    Bujur: '105.49 BT',
    Magnitude: '3.8',
    Kedalaman: '25 km',
    Wilayah: 'Pusat gempa berada di laut 31 km selatan Sumur',
    Potensi: 'Gempa ini dirasakan untuk diteruskan pada masyarakat',
    Dirasakan: 'II Sumur',
    Shakemap: '20260909132130.mmi.jpg',
  },
  recent_bmkg: [
    {
      type: 'SEISMIC',
      magnitude: 5.2,
      depth: 10,
      frequency: 3.6,
      count: 1,
      latitude: -8.08,
      longitude: 120.56,
      mmi: 7,
      pga: 0.66,
      fault_zone: '60 km TimurLaut RUTENG-MANGGARAI-NTT',
      timestamp: '2026-09-08T04:40:29Z',
    },
    {
      type: 'SEISMIC',
      magnitude: 5.4,
      depth: 10,
      frequency: 3.7,
      count: 1,
      latitude: -8.42,
      longitude: 109.02,
      mmi: 7,
      pga: 0.68,
      fault_zone: '77 km Tenggara CILACAP-JATENG',
      timestamp: '2026-09-04T05:04:59Z',
    },
    {
      type: 'SEISMIC',
      magnitude: 5.8,
      depth: 10,
      frequency: 3.9,
      count: 1,
      latitude: -7.72,
      longitude: 104.47,
      mmi: 8,
      pga: 0.74,
      fault_zone: '170 km BaratDaya SUMUR-BANTEN',
      timestamp: '2026-08-21T17:41:43Z',
    },
  ],
  recent_usgs: [
    {
      type: 'SEISMIC',
      magnitude: 5.0,
      depth: 10,
      frequency: 3.5,
      count: 1,
      latitude: 4.0172,
      longitude: 125.3233,
      mmi: 7,
      pga: 0.63,
      fault_zone: '154 km S of Sarangani, Philippines',
      timestamp: '2026-09-09T07:07:00Z',
    },
    {
      type: 'SEISMIC',
      magnitude: 4.5,
      depth: 39.5,
      frequency: 3.25,
      count: 1,
      latitude: -4.9167,
      longitude: 102.8454,
      mmi: 6,
      pga: 0.45,
      fault_zone: '108 km SSW of Pagar Alam, Indonesia',
      timestamp: '2026-09-09T00:23:00Z',
    },
  ],
  timestamp: new Date().toISOString(),
};

const INITIAL_AI_ANALYSIS: AIAnalysis = {
  status: 'ADVISORY',
  threat_summary: 'Monitoring Kluster Seismisitas Aktif Segmen Selat Sunda (M3.8 Sumur) & NTT (M5.2 Ruteng)',
  observations: [
    'BMKG TEWS mendeteksi gempa terkini M3.8 di kedalaman 25 km pesisir Sumur-Banten (Selat Sunda).',
    'Tercatat kluster seismik M5.0+ regional di Ruteng NTT (M5.2) dan Cilacap Jawa Tengah (M5.4).',
    'Telemetri 12 stasiun broadband BMKG & 34 sensor pasang surut IOC UNESCO terpantau stabil tanpa anomali muka laut destruktif.',
    'Algoritma Flink CEP mencatat indeks intensitas seismik nasional pada level 35.0% (Ambang batas waspada).',
  ],
  assessment:
    'Sistem InaTEWS Sentinel mengonfirmasi aktivitas tektonik regional berada dalam batas terkontrol. Tidak ada indikasi pembentukan gelombang tsunami pasca-event Sumur & Ruteng. Koordinasi antar-lembaga tetap disiagakan untuk memantau potensi gempa susulan.',
  recommendations: [
    'Pertahankan pemantauan real-time kontinyu 24/7 jaringan stasiun seismik broadband BMKG.',
    'Pastikan kanal diseminasi Warning Receiver System (WRS D-VBI) dan SMS blast darurat BNPB dalam status siaga.',
    'Masyarakat diimbau tetap tenang dan hanya merujuk kanal informasi resmi BMKG dan BNPB.',
  ],
  agency_actions: [
    {
      agency: 'BMKG',
      priority: 'URGENT',
      action: 'Monitoring kontinyu focal mechanism hiposenter dan update peta guncangan ShakeMap nasional 24/7.',
    },
    {
      agency: 'BNPB',
      priority: 'STANDBY',
      action: 'Koordinasi Posko Siaga Bencana dengan BPBD tingkat provinsi dan kabupaten terdekat dari episenter.',
    },
    {
      agency: 'BASARNAS',
      priority: 'STANDBY',
      action: 'Siaga regu Search & Rescue maritim di pelabuhan dan pangkalan terdekat.',
    },
  ],
  hazard_details: {
    fault_mechanism: 'Subduction Interplate Thrust & Splay Faulting',
    estimated_coseismic_slip: '<0.2 meter',
    aftershock_risk: 'LOW (Ambang batas normal)',
    tsunami_runup_estimate: 'Tidak berpotensi tsunami',
    evacuation_window_min: 120,
  },
  confidence: 0.89,
  latency_ms: 142,
  model_used: 'Google Gemini 2.5 Flash',
  disclaimer: 'Real-time decision support based on streaming sensor telemetry. Not an official BMKG earthquake prediction.',
  contributing_factors: [
    { indicator: 'Mainshock Magnitude', value: 'M3.8', change: 'BMKG TEWS Verified', significance: 0.94 },
    { indicator: 'Hypocenter Depth', value: '25 km', change: 'Crustal Interface', significance: 0.81 },
    { indicator: 'Sea Level Anomaly', value: 'Nominal (<0.05m)', change: 'IOC Gauge Stable', significance: 0.88 },
    { indicator: 'Flink Intensity Index', value: '35.0%', change: 'Normal Baseline', significance: 0.75 },
  ],
  timestamp: new Date().toISOString(),
};

const INITIAL_STATUS: SystemStatus = {
  seismic_intensity: 35.0,
  ocean_status: 'IOC UNESCO LIVE',
  weather_status: 'OPEN-METEO ONLINE',
  infra_status: 'OPERATIONAL',
  active_alerts: 0,
  risk_level: 'NORMAL',
  trend_direction: 'LIVE STREAM ACTIVE',
  last_update: new Date().toISOString(),
};

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
  const [status, setStatus] = useState<SystemStatus | null>(INITIAL_STATUS);
  const [activityIndex, setActivityIndex] = useState<ActivityIndexType | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(INITIAL_AI_ANALYSIS);
  const [tsunami, setTsunami] = useState<TsunamiScenario | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);
  const [realQuakes, setRealQuakes] = useState<RealtimeEarthquakesData | null>(INITIAL_QUAKES);
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
    const targetUrl = API_BASE ? `${API_BASE}/api/realtime/earthquakes` : '/api/realtime/earthquakes';
    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch real quakes: ${res.status}`);
        return res.json();
      })
      .then((data: RealtimeEarthquakesData) => {
        if (data && (data.latest_bmkg || (data.recent_bmkg && data.recent_bmkg.length > 0))) {
          setRealQuakes(data);
        }
      })
      .catch((err) => {
        console.warn('Primary earthquake fetch failed, falling back to local /api/realtime/earthquakes:', err);
        if (API_BASE) {
          fetch('/api/realtime/earthquakes')
            .then((r) => (r.ok ? r.json() : null))
            .then((localData: RealtimeEarthquakesData | null) => {
              if (localData && (localData.latest_bmkg || (localData.recent_bmkg && localData.recent_bmkg.length > 0))) {
                setRealQuakes(localData);
              }
            })
            .catch(() => {});
        }
      });
  }, []);

  const fetchVolcanoes = useCallback(() => {
    const targetUrl = API_BASE ? `${API_BASE}/api/realtime/volcanoes` : '/api/realtime/volcanoes';
    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch volcanoes');
        return res.json();
      })
      .then((data: VolcanoEruption[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVolcanoes(data);
        }
      })
      .catch((err) => {
        console.warn('Primary volcano fetch failed, falling back to local route:', err);
        if (API_BASE) {
          fetch('/api/realtime/volcanoes')
            .then((r) => (r.ok ? r.json() : null))
            .then((localData: VolcanoEruption[] | null) => {
              if (Array.isArray(localData) && localData.length > 0) {
                setVolcanoes(localData);
              }
            })
            .catch(() => {});
        }
      });
  }, []);

  const fetchAI = useCallback(() => {
    const targetUrl = API_BASE ? `${API_BASE}/api/ai/latest` : '/api/ai/latest';
    fetch(targetUrl)
      .then((res) => {
        if (!res.ok) throw new Error('AI fetch failed');
        return res.json();
      })
      .then((data: AIAnalysis) => {
        if (data && data.status) {
          setAiAnalysis(data);
        }
      })
      .catch((err) => {
        console.warn('Primary AI fetch failed, falling back to local /api/ai/latest:', err);
        if (API_BASE) {
          fetch('/api/ai/latest')
            .then((r) => (r.ok ? r.json() : null))
            .then((localData: AIAnalysis | null) => {
              if (localData && localData.status) {
                setAiAnalysis(localData);
              }
            })
            .catch(() => {});
        }
      });
  }, []);

  const fetchStatus = useCallback(() => {
    const targetUrl = API_BASE ? `${API_BASE}/api/status` : '/api/status';
    fetch(targetUrl)
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
      .catch((err) => {
        console.warn('Primary status fetch failed, falling back to local route:', err);
        if (API_BASE) {
          fetch('/api/status')
            .then((r) => (r.ok ? r.json() : null))
            .then((localData: SystemStatus | null) => {
              if (localData) {
                setStatus(localData);
                if (localData.latest_ai) setAiAnalysis(localData.latest_ai);
                if (localData.tsunami_scenario?.active) setTsunami(localData.tsunami_scenario);
              }
            })
            .catch(() => {});
        }
      });
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
                  realQuakes={realQuakes}
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
                  realQuakes={realQuakes}
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
