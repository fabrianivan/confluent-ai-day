'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SystemStatus,
  AIAnalysis,
  TsunamiScenario,
  LiveEvent,
  ActivityIndex as ActivityIndexType,
  LifecyclePhase,
} from '@/lib/types';
import ActivityGauge from '@/components/ActivityGauge';
import MetricCards from '@/components/MetricCards';
import EventStream from '@/components/EventStream';
import AIPanel from '@/components/AIPanel';
import TsunamiPanel from '@/components/TsunamiPanel';
import TelemetryHUD from '@/components/TelemetryHUD';
import Seismograph from '@/components/Seismograph';
import StatusBar from '@/components/StatusBar';
import GovernancePanel from '@/components/GovernancePanel';

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
      🗺️ Initializing Satellite & Tactical Radar Mapping...
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const INITIAL_EVENTS: LiveEvent[] = [
  {
    id: 'init-1',
    type: 'VOLCANIC',
    description: '🛰️ [AUTONOMOUS] Ambient baseline: Micro-seismic tremor 0.4–1.2 mm/s',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 3000).toISOString(),
  },
  {
    id: 'init-2',
    type: 'WEATHER',
    description: 'Open-Meteo Ingest: Wind 14 km/h NW — Barometer 1012.4 hPa — Temp 29.2°C',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 9000).toISOString(),
  },
  {
    id: 'init-3',
    type: 'SEISMIC',
    description: 'USGS Stream: Recent shallow regional events monitored within 500km buffer',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 17000).toISOString(),
  },
  {
    id: 'init-4',
    type: 'OCEAN',
    description: 'Marina Jukung & Ciwandan tide gauges reporting nominal sea-surface displacement',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 25000).toISOString(),
  },
  {
    id: 'init-5',
    type: 'MARITIME',
    description: 'KM Sunda Express (11.8 kts) crossing active Sunda Strait navigation lane',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 36000).toISOString(),
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
        const depth = typeof data.depth === 'number' ? data.depth.toFixed(1) : '?';
        const freq = typeof data.frequency === 'number' ? data.frequency.toFixed(1) : '?';
        description = `Earthquake M${mag} — Depth ${depth}km (Tremor: ${freq} Hz)`;
        severity =
          typeof data.magnitude === 'number' && data.magnitude >= 3.0
            ? 'CRITICAL'
            : typeof data.magnitude === 'number' && data.magnitude >= 2.0
            ? 'HIGH'
            : typeof data.magnitude === 'number' && data.magnitude >= 1.2
            ? 'MEDIUM'
            : 'LOW';
        break;
      }
      case 'VOLCANO':
      case 'VOLCANIC': {
        const level = typeof data.activity_level === 'number' ? data.activity_level.toFixed(0) : '?';
        const tremor = typeof data.tremor_intensity === 'number' ? data.tremor_intensity.toFixed(0) : '?';
        const def =
          typeof data.deformation === 'number'
            ? `${data.deformation >= 0 ? '+' : ''}${data.deformation.toFixed(2)}cm`
            : '';
        const obs = data.eruption_observation ? ` — ${data.eruption_observation}` : '';
        description = `Activity ${level}% — Tremor ${tremor}% — Def: ${def}${obs}`;
        severity =
          typeof data.activity_level === 'number' && data.activity_level >= 70
            ? 'CRITICAL'
            : typeof data.activity_level === 'number' && data.activity_level >= 45
            ? 'HIGH'
            : typeof data.activity_level === 'number' && data.activity_level >= 25
            ? 'MEDIUM'
            : 'LOW';
        break;
      }
      case 'OCEAN': {
        const sensor = String(data.sensor_id || 'Ocean-Sensor');
        const sl = typeof data.sea_level === 'number' ? `${data.sea_level >= 0 ? '+' : ''}${data.sea_level.toFixed(2)}m` : '?';
        const wh = typeof data.wave_height === 'number' ? `${data.wave_height.toFixed(2)}m` : '?';
        description = `${sensor}: Sea level ${sl}, Wave: ${wh}`;
        severity =
          typeof data.sea_level === 'number' && Math.abs(data.sea_level) > 1.5
            ? 'CRITICAL'
            : typeof data.sea_level === 'number' && Math.abs(data.sea_level) > 0.8
            ? 'HIGH'
            : 'LOW';
        break;
      }
      case 'WEATHER': {
        const ws = typeof data.wind_speed === 'number' ? `${data.wind_speed.toFixed(0)} km/h` : '?';
        const wd = String(data.wind_direction || 'N');
        const p = typeof data.atmospheric_pressure === 'number' ? `${data.atmospheric_pressure.toFixed(0)} hPa` : '?';
        const temp = typeof data.temperature === 'number' ? `${data.temperature.toFixed(0)}°C` : '?';
        description = `Wind: ${ws} ${wd} — Barometer: ${p} — Temp: ${temp}`;
        severity = 'LOW';
        break;
      }
      case 'SATELLITE': {
        const sat = String(data.satellite_id || 'Sentinel-2');
        const thermal = typeof data.thermal_anomaly === 'number' ? `${data.thermal_anomaly >= 0 ? '+' : ''}${data.thermal_anomaly.toFixed(1)}°C` : '?';
        const plume = data.ash_plume ? ` — Plume: ${data.ash_plume}` : '';
        description = `${sat}: Thermal anomaly ${thermal}${plume}`;
        severity =
          typeof data.thermal_anomaly === 'number' && data.thermal_anomaly > 2.0
            ? 'HIGH'
            : 'LOW';
        break;
      }
      case 'MARITIME': {
        const ship = String(data.ship_name || 'Vessel');
        const spd = typeof data.speed === 'number' ? `${data.speed.toFixed(1)} kts` : '?';
        const rz = data.restricted_zone ? ' ⚠️ INSIDE EXCLUSION ZONE' : '';
        description = `${ship} (${spd})${rz}`;
        severity = data.restricted_zone ? 'CRITICAL' : 'LOW';
        break;
      }
      default:
        description = `${type} event received`;
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
  const [phase, setPhase] = useState<LifecyclePhase | null>({
    phase_number: 1,
    phase_name: 'QUIESCENT_BASELINE',
    phase_title: 'Phase 1: Quiescent Surveillance & Ambient Ingestion',
    activity_level: 21.4,
    duration_sec: 35,
    elapsed_sec: 4,
    seismic_energy: 1.2,
    status: 'NORMAL',
    timestamp: new Date().toISOString(),
  });
  const [connected, setConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const eventCounter = useRef(100);

  // Fetch initial system status
  useEffect(() => {
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
      .catch(() => {
        // Backend not yet reachable — will auto-connect via SSE
      });
  }, []);

  const connectSSE = useCallback(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener('all', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        const { event: eventType, data } = msg;

        switch (eventType) {
          case 'lifecycle_phase':
            setPhase(data as LifecyclePhase);
            break;
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
      setTimeout(connectSSE, 2000);
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectSSE]);

  // Autonomous Real-Life simulation ticker fallback (runs seamlessly if backend is restarting)
  useEffect(() => {
    if (connected) return;

    let secInPhase = 0;
    let currPhaseNum = 1;

    const interval = setInterval(() => {
      secInPhase += 2;

      // Realistic 5-phase schedule: 35s, 25s, 20s, 25s, 20s
      const durations = [35, 25, 20, 25, 20];
      const titles = [
        'Phase 1: Quiescent Surveillance & Ambient Ingestion',
        'Phase 2: Micro-seismic Swarm & Magmatic Pressurization',
        'Phase 3: Flank Instability & Thermal Hotspot Surge',
        'Phase 4: Flank Displacement & Tsunami Wavefront',
        'Phase 5: Wave Dissipation & Post-Crisis Calibration',
      ];
      const names = [
        'QUIESCENT_BASELINE',
        'MAGMA_INTRUSION_SWARM',
        'FLANK_DEFORMATION',
        'CRITICAL_SURGE_TSUNAMI',
        'POST_SURGE_RECOVERY',
      ];
      const activities = [21.4, 48.6, 78.2, 96.5, 32.0];
      const energies = [1.2, 5.4, 13.8, 38.0, 3.2];
      const statuses = ['NORMAL', 'ADVISORY', 'WATCH', 'CRITICAL ALERT', 'RECOVERY'];

      const maxDur = durations[currPhaseNum - 1];
      if (secInPhase >= maxDur) {
        secInPhase = 0;
        currPhaseNum = (currPhaseNum % 5) + 1;
      }

      const activeIdx = currPhaseNum - 1;
      const fallbackPhase: LifecyclePhase = {
        phase_number: currPhaseNum,
        phase_name: names[activeIdx],
        phase_title: titles[activeIdx],
        activity_level: activities[activeIdx],
        duration_sec: maxDur,
        elapsed_sec: secInPhase,
        seismic_energy: energies[activeIdx],
        status: statuses[activeIdx],
        timestamp: new Date().toISOString(),
      };

      setPhase(fallbackPhase);

      // Handle tsunami state in fallback
      if (currPhaseNum === 4) {
        setTsunami({
          active: true,
          detection_time: new Date().toISOString(),
          sensor_id: 'Marina-Jukung-Anyer',
          wave_anomaly: 3.2,
          affected_zones: [
            'Zone 1 — Anyer Coastal Strip (Wave: 3.2m, ETA: 22m)',
            'Zone 2 — Ciwandan Industrial Port (Wave: 2.6m, ETA: 28m)',
            'Zone 3 — Carita & Labuan Corridor (Wave: 2.9m, ETA: 35m)',
            'Zone 4 — South Lampung / Rajabasa (Wave: 2.4m, ETA: 31m)',
          ],
          response_actions: [
            'Sound coastal sirens across Banten and South Lampung',
            'Mandatory vertical evacuation to >15m elevation',
            'Suspend Merak-Bakauheni maritime ferry transit',
            'Deploy BASARNAS and BNPB emergency forward units',
          ],
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        });
      } else if (currPhaseNum === 5) {
        setTsunami(null);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [connected]);

  const activity =
    phase?.activity_level ??
    activityIndex?.overall_percentage ??
    status?.volcanic_activity ??
    21.4;

  const trend =
    phase?.phase_name === 'CRITICAL_SURGE_TSUNAMI'
      ? 'COLLAPSE DETECTED'
      : phase?.phase_name === 'FLANK_DEFORMATION'
      ? 'RAPID INFLATION'
      : phase?.phase_name === 'MAGMA_INTRUSION_SWARM'
      ? 'RISING SWARM'
      : activityIndex?.trend_direction ?? status?.trend_direction ?? 'STABLE';

  const riskLevel =
    phase?.phase_number === 4
      ? 'CRITICAL'
      : phase?.phase_number === 3
      ? 'HIGH'
      : status?.risk_level ?? 'NORMAL';

  const alertCount =
    tsunami?.active || phase?.phase_number === 4
      ? 1
      : status?.active_alerts ?? 0;

  return (
    <>
      <StatusBar
        connected={connected}
        alertCount={alertCount}
        riskLevel={riskLevel}
      />

      <main className="dashboard">
        {/* Top Mission Control Telemetry HUD Ribbon */}
        <TelemetryHUD phase={phase} connected={connected} />

        {/* Left Column: Tactical Satellite Map + Seismograph Drum Visualizer */}
        <div className="dashboard__left-col">
          <div className="map-container">
            <div className="map-tactical-header">
              <span className="map-tactical-header__icon">🛰️</span>
              <span className="map-tactical-header__title">TACTICAL RADAR SURVEILLANCE // SUNDA STRAIT SECTOR</span>
              <span className="map-tactical-header__coords">06°06&apos;07&quot;S 105°25&apos;23&quot;E</span>
            </div>
            <MapComponent
              activityLevel={activity}
              tsunamiActive={tsunami?.active ?? phase?.phase_number === 4}
            />
          </div>

          <Seismograph
            seismicEnergy={phase?.seismic_energy ?? 1.2}
            activityLevel={activity}
            phaseName={phase?.phase_name ?? 'QUIESCENT_BASELINE'}
          />
        </div>

        {/* Right Column: Volcanic Activity Gauge + Sensor Metrics */}
        <div className="sidebar">
          <div className="card">
            <div className="card__header">
              <span className="card__title">
                <span className="card__title-icon">🌋</span>
                Volcanic Activity Index
              </span>
              <span className="card__phase-chip">
                PHASE {phase?.phase_number ?? 1}/5
              </span>
            </div>
            <ActivityGauge percentage={activity} trend={trend} />
          </div>

          <MetricCards
            oceanStatus={
              tsunami?.active || phase?.phase_number === 4
                ? 'TSUNAMI SURGE DETECTED'
                : status?.ocean_status ?? 'NORMAL'
            }
            weatherStatus={status?.weather_status ?? 'NORMAL'}
            maritimeStatus={
              phase?.phase_number === 4
                ? 'EMERGENCY LOCKDOWN'
                : phase?.phase_number === 3
                ? 'CAUTIONARY ADVISORY'
                : status?.maritime_status ?? 'NORMAL'
            }
            activityIndex={activityIndex}
          />
        </div>

        {/* Tsunami Scenario Banner (Auto-rendered in Critical Phase) */}
        {tsunami?.active && <TsunamiPanel scenario={tsunami} />}

        {/* Explainable AI Decision-Support Assessment */}
        {aiAnalysis && <AIPanel analysis={aiAnalysis} />}

        {/* Live Multi-Domain Event Stream Feed */}
        <EventStream events={events} />
      </main>

      <GovernancePanel />
    </>
  );
}
