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
      🗺️ Initializing National Tectonic & Subduction Zone Mapping...
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const INITIAL_EVENTS: LiveEvent[] = [
  {
    id: 'init-1',
    type: 'SEISMIC',
    description: 'BMKG National Array: Continuous real-time broadband seismic waveform ingestion',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 3000).toISOString(),
  },
  {
    id: 'init-2',
    type: 'STATION',
    description: 'Station LEM (Lembang, West Java): Signal quality 99.4%, PGA 0.002g [ONLINE]',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 7000).toISOString(),
  },
  {
    id: 'init-3',
    type: 'OCEAN',
    description: 'InaTEWS Buoy BUOY-INA-01 (Selat Sunda): Nominal sea surface displacement (0.02m)',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 14000).toISOString(),
  },
  {
    id: 'init-4',
    type: 'SATELLITE',
    description: 'Sentinel-1A InSAR Interferometry: Subduction trench baseline deformation nominal',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 22000).toISOString(),
  },
  {
    id: 'init-5',
    type: 'INFRASTRUCTURE',
    description: 'RSUD & Pelabuhan Strategic Facilities: Operational status verified 100%',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 31000).toISOString(),
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
        const fault = String(data.fault_zone || 'Subduction Zone');
        description = `Earthquake M${mag} — Depth ${depth}km (${fault})`;
        severity =
          typeof data.magnitude === 'number' && data.magnitude >= 7.5
            ? 'CRITICAL'
            : typeof data.magnitude === 'number' && data.magnitude >= 6.0
            ? 'HIGH'
            : typeof data.magnitude === 'number' && data.magnitude >= 4.5
            ? 'MEDIUM'
            : 'LOW';
        break;
      }
      case 'STATION': {
        const st = String(data.station_id || 'Station');
        const pga = typeof data.pga_recorded === 'number' ? data.pga_recorded.toFixed(4) : '?';
        const status = String(data.status || 'ONLINE');
        description = `Station ${st}: PGA ${pga}g [${status}]`;
        severity = status === 'CLIPPED' ? 'CRITICAL' : 'LOW';
        break;
      }
      case 'OCEAN': {
        const sensor = String(data.sensor_id || 'Tide-Gauge');
        const wh = typeof data.wave_height === 'number' ? data.wave_height.toFixed(2) : '?';
        description = `${sensor}: Wave surge ${wh}m`;
        severity =
          typeof data.wave_height === 'number' && data.wave_height > 3.0
            ? 'CRITICAL'
            : typeof data.wave_height === 'number' && data.wave_height > 1.0
            ? 'HIGH'
            : 'LOW';
        break;
      }
      case 'SATELLITE': {
        const sat = String(data.satellite_id || 'InSAR');
        const slip = typeof data.coseismic_slip === 'number' ? data.coseismic_slip.toFixed(2) : '0';
        description = `${sat}: Fault slip ${slip}m detected`;
        severity = typeof data.coseismic_slip === 'number' && data.coseismic_slip > 2.0 ? 'CRITICAL' : 'LOW';
        break;
      }
      case 'INFRASTRUCTURE': {
        const fac = String(data.facility_name || 'Facility');
        const dmg = String(data.damage_level || 'NONE');
        description = `${fac}: Damage level ${dmg}`;
        severity = dmg === 'COLLAPSED' || dmg === 'SEVERE' ? 'CRITICAL' : dmg === 'MODERATE' ? 'HIGH' : 'LOW';
        break;
      }
      case 'WEATHER': {
        const ws = typeof data.wind_speed === 'number' ? data.wind_speed.toFixed(0) : '?';
        const wd = String(data.wind_direction || 'N');
        description = `Weather: Wind ${ws} km/h ${wd}`;
        severity = 'LOW';
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
    phase_name: 'SEISMIC_BASELINE',
    phase_title: 'Fase 1: Baseline Monitoring & USGS Feed Ingestion',
    activity_level: 12.0,
    duration_sec: 30,
    elapsed_sec: 1,
    seismic_energy: 0.8,
    status: 'NORMAL',
    scenario_name: 'MEGATHRUST SELAT SUNDA (M8.2)',
    magnitude: 8.2,
    depth: 25.0,
    fault_zone: 'Sunda Strait Subduction',
    mmi: 1,
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

  const activity =
    phase?.activity_level ??
    activityIndex?.overall_percentage ??
    status?.seismic_intensity ??
    15.0;

  const trend =
    phase?.phase_number === 4
      ? 'TSUNAMI WARNING'
      : phase?.phase_number === 3
      ? 'MAINSHOCK RUPTURE'
      : phase?.phase_number === 2
      ? 'PRECURSOR SWARM'
      : activityIndex?.trend_direction ?? status?.trend_direction ?? 'STABLE';

  const riskLevel =
    phase?.phase_number === 4 || phase?.phase_number === 3
      ? 'CRITICAL'
      : phase?.phase_number === 2
      ? 'HIGH'
      : status?.risk_level ?? 'NORMAL';

  const alertCount =
    tsunami?.active || phase?.phase_number === 4 || phase?.phase_number === 3
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

        {/* Left Column: National Megathrust Map + Broadband Seismometer Drum */}
        <div className="dashboard__left-col">
          <div className="map-container">
            <div className="map-tactical-header">
              <span className="map-tactical-header__icon">🌐</span>
              <span className="map-tactical-header__title">
                INDONESIAN SUBDUCTION & MEGATHRUST RADAR // {phase?.scenario_name || 'NATIONAL OVERVIEW'}
              </span>
              <span className="map-tactical-header__coords">
                FAULT: {phase?.fault_zone || 'Sunda Megathrust'}
              </span>
            </div>
            <MapComponent
              activityLevel={activity}
              tsunamiActive={tsunami?.active ?? phase?.phase_number === 4}
              phase={phase}
            />
          </div>

          <Seismograph
            seismicEnergy={phase?.seismic_energy ?? 1.2}
            activityLevel={activity}
            phaseName={phase?.phase_name ?? 'SEISMIC_BASELINE'}
          />
        </div>

        {/* Right Column: MMI Intensity Gauge + Sensor Metrics */}
        <div className="sidebar">
          <div className="card">
            <div className="card__header">
              <span className="card__title">
                <span className="card__title-icon">📊</span>
                Seismic Intensity Index (MMI)
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
                ? 'TSUNAMI WAVE FRONT PROPAGATING'
                : status?.ocean_status ?? 'NORMAL'
            }
            weatherStatus={status?.weather_status ?? 'NORMAL'}
            infraStatus={
              phase?.phase_number === 3 || phase?.phase_number === 4
                ? 'HIGH INTENSITY SHAKING'
                : status?.infra_status ?? 'NORMAL'
            }
            activityIndex={activityIndex}
          />
        </div>

        {/* Tsunami Scenario Banner (Auto-rendered during Tsunami Phase) */}
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
