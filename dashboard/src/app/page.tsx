'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { SystemStatus, AIAnalysis, TsunamiScenario, LiveEvent, ActivityIndex as ActivityIndexType } from '@/lib/types';
import { triggerSimulation } from '@/hooks/useSSE';
import ActivityGauge from '@/components/ActivityGauge';
import MetricCards from '@/components/MetricCards';
import EventStream from '@/components/EventStream';
import AIPanel from '@/components/AIPanel';
import TsunamiPanel from '@/components/TsunamiPanel';
import SimControls from '@/components/SimControls';
import StatusBar from '@/components/StatusBar';
import GovernancePanel from '@/components/GovernancePanel';

const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,18,0.6)', color: 'var(--text-muted)', fontSize: '13px' }}>
      🗺️ Loading Anak Krakatau Map...
    </div>
  ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const INITIAL_EVENTS: LiveEvent[] = [
  { id: 'init-1', type: 'SEISMIC', description: 'Earthquake M1.1 — Depth 8.2km (Tremor: 1.0 Hz)', severity: 'LOW', timestamp: new Date(Date.now() - 4000).toISOString() },
  { id: 'init-2', type: 'OCEAN', description: 'Sensor Banten-02: Sea level +0.12m, Wave: 0.85m', severity: 'LOW', timestamp: new Date(Date.now() - 11000).toISOString() },
  { id: 'init-3', type: 'WEATHER', description: 'Wind: 14 km/h NW — Barometer: 1012 hPa — Temp: 29°C', severity: 'LOW', timestamp: new Date(Date.now() - 18000).toISOString() },
  { id: 'init-4', type: 'VOLCANIC', description: 'Activity 22% — Tremor 45% — Ground deformation normal', severity: 'LOW', timestamp: new Date(Date.now() - 28000).toISOString() },
  { id: 'init-5', type: 'MARITIME', description: 'KM Sunda Express (12 kts) in transit in Sunda Strait', severity: 'LOW', timestamp: new Date(Date.now() - 42000).toISOString() },
];

function parseLiveEvent(data: Record<string, unknown>, id: string): LiveEvent {
  const rawType = String(data.type || 'UNKNOWN');
  const type = rawType.toUpperCase();
  let description = data.description ? String(data.description) : '';
  let severity = (data.severity ? String(data.severity) : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  if (!description) {
    switch (type) {
      case 'SEISMIC': {
        const mag = typeof data.magnitude === 'number' ? data.magnitude.toFixed(1) : '?';
        const depth = typeof data.depth === 'number' ? data.depth.toFixed(1) : '?';
        const freq = typeof data.frequency === 'number' ? data.frequency.toFixed(1) : '?';
        description = `Earthquake M${mag} — Depth ${depth}km (Tremor: ${freq} Hz)`;
        severity = typeof data.magnitude === 'number' && data.magnitude >= 3.0 ? 'CRITICAL' :
                   typeof data.magnitude === 'number' && data.magnitude >= 2.0 ? 'HIGH' :
                   typeof data.magnitude === 'number' && data.magnitude >= 1.2 ? 'MEDIUM' : 'LOW';
        break;
      }
      case 'VOLCANO':
      case 'VOLCANIC': {
        const level = typeof data.activity_level === 'number' ? data.activity_level.toFixed(0) : '?';
        const tremor = typeof data.tremor_intensity === 'number' ? data.tremor_intensity.toFixed(0) : '?';
        const def = typeof data.deformation === 'number' ? `${data.deformation >= 0 ? '+' : ''}${data.deformation.toFixed(2)}cm` : '';
        const obs = data.eruption_observation ? ` — ${data.eruption_observation}` : '';
        description = `Activity ${level}% — Tremor ${tremor}% — Def: ${def}${obs}`;
        severity = typeof data.activity_level === 'number' && data.activity_level >= 70 ? 'CRITICAL' :
                   typeof data.activity_level === 'number' && data.activity_level >= 50 ? 'HIGH' :
                   typeof data.activity_level === 'number' && data.activity_level >= 35 ? 'MEDIUM' : 'LOW';
        break;
      }
      case 'OCEAN': {
        const sensor = data.sensor_id || 'Buoy';
        const sl = typeof data.sea_level === 'number' ? `${data.sea_level >= 0 ? '+' : ''}${data.sea_level.toFixed(2)}m` : '';
        const wave = typeof data.wave_height === 'number' ? `${data.wave_height.toFixed(2)}m` : '';
        description = `Sensor ${sensor}: Sea level ${sl}, Wave: ${wave}`;
        const waveVal = typeof data.wave_height === 'number' ? data.wave_height : 0;
        const slVal = typeof data.sea_level === 'number' ? Math.abs(data.sea_level) : 0;
        severity = (waveVal > 2.0 || slVal > 1.5) ? 'CRITICAL' : (waveVal > 1.2) ? 'HIGH' : 'LOW';
        break;
      }
      case 'WEATHER': {
        const wind = typeof data.wind_speed === 'number' ? `${data.wind_speed.toFixed(0)} km/h` : '';
        const dir = data.wind_direction ? String(data.wind_direction) : '';
        const pres = typeof data.atmospheric_pressure === 'number' ? `${data.atmospheric_pressure.toFixed(0)} hPa` : '';
        const temp = typeof data.temperature === 'number' ? `${data.temperature.toFixed(0)}°C` : '';
        description = `Wind: ${wind} ${dir} — Barometer: ${pres} — Temp: ${temp}`;
        severity = typeof data.wind_speed === 'number' && data.wind_speed > 35 ? 'HIGH' : 'LOW';
        break;
      }
      case 'SATELLITE': {
        const thermal = typeof data.thermal_anomaly === 'number' ? `+${data.thermal_anomaly.toFixed(1)}°C` : '';
        const satId = data.satellite_id ? String(data.satellite_id) : 'Sentinel-2';
        const plume = data.ash_plume && data.ash_plume !== 'NONE' ? ` — Plume: ${data.ash_plume}` : '';
        description = `${satId} Thermal Anomaly: ${thermal}${plume}`;
        severity = typeof data.thermal_anomaly === 'number' && data.thermal_anomaly > 2.5 ? 'CRITICAL' :
                   typeof data.thermal_anomaly === 'number' && data.thermal_anomaly > 1.0 ? 'HIGH' : 'LOW';
        break;
      }
      case 'MARITIME': {
        const name = data.ship_name ? String(data.ship_name) : String(data.ship_id || 'Vessel');
        const spd = typeof data.speed === 'number' ? `${data.speed.toFixed(1)} kts` : '';
        description = `${name} (${spd}) ${data.restricted_zone ? '⚠️ INSIDE EXCLUSION ZONE' : 'in transit'}`;
        severity = data.restricted_zone ? 'HIGH' : 'LOW';
        break;
      }
      case 'POPULATION': {
        const zone = data.zone ? String(data.zone) : 'Coastal Zone';
        const pop = typeof data.population === 'number' ? data.population.toLocaleString() : '';
        const route = data.evacuation_route_status ? String(data.evacuation_route_status) : 'OPEN';
        description = `Evacuation Readiness ${zone}: ${pop} pop — Route: ${route}`;
        severity = route !== 'OPEN' ? 'HIGH' : 'LOW';
        break;
      }
      default:
        description = JSON.stringify(data);
    }
  }

  return {
    id,
    type,
    description,
    severity,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
  };
}

export default function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [activityIndex, setActivityIndex] = useState<ActivityIndexType | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [tsunami, setTsunami] = useState<TsunamiScenario | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>(INITIAL_EVENTS);
  const [simulating, setSimulating] = useState<string | null>(null);
  const eventCounter = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial status on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SystemStatus | null) => {
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
            const liveEvent = parseLiveEvent(data as Record<string, unknown>, `evt-${++eventCounter.current}`);
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

  // Soft baseline ticker if backend is disconnected
  useEffect(() => {
    if (connected) return;
    const interval = setInterval(() => {
      const types = ['SEISMIC', 'OCEAN', 'WEATHER', 'VOLCANIC', 'MARITIME'];
      const pick = types[Math.floor(Math.random() * types.length)];
      let mockData: Record<string, unknown> = { type: pick, timestamp: new Date().toISOString() };
      if (pick === 'SEISMIC') mockData = { ...mockData, magnitude: 0.8 + Math.random() * 0.7, depth: 4 + Math.random() * 8, frequency: 1.0 + Math.random() };
      else if (pick === 'OCEAN') mockData = { ...mockData, sensor_id: 'Banten-02', sea_level: 0.05 + Math.random() * 0.15, wave_height: 0.7 + Math.random() * 0.3 };
      else if (pick === 'WEATHER') mockData = { ...mockData, wind_speed: 12 + Math.random() * 8, wind_direction: 'NW', atmospheric_pressure: 1011 + Math.random() * 3, temperature: 29 };
      else if (pick === 'VOLCANIC') mockData = { ...mockData, activity_level: 20 + Math.random() * 6, tremor_intensity: 40 + Math.random() * 10, deformation: 0.02 };
      else if (pick === 'MARITIME') mockData = { ...mockData, ship_name: 'MV Krakatau Ferry', speed: 11.5, restricted_zone: false };

      const newEvt = parseLiveEvent(mockData, `evt-${++eventCounter.current}`);
      setEvents((prev) => [newEvt, ...prev].slice(0, 50));
    }, 6000);
    return () => clearInterval(interval);
  }, [connected]);

  const handleSimulate = async (type: 'volcanic-escalation' | 'tsunami' | 'real-2018' | 'reset') => {
    setSimulating(type);

    try {
      await triggerSimulation(type);
      if (type === 'reset') {
        setTsunami(null);
        setAiAnalysis(null);
      }
    } catch {
      // Local fallback simulation if backend is not yet running
      if (type === 'real-2018') {
        const scenario: TsunamiScenario = {
          active: true,
          detection_time: new Date().toISOString(),
          sensor_id: 'Marina-Jukung-Anyer',
          wave_anomaly: 3.5,
          affected_zones: [
            'Zone 1 — Marina Jukung, Anyer (Runup: 3.5m, Hit: 21:27 WIB)',
            'Zone 2 — Ciwandan Industrial Port (Runup: 2.8m, Hit: 21:35 WIB)',
            'Zone 3 — Carita & Labuan Coastline (Runup: 3.2m, Hit: 21:42 WIB)',
            'Zone 4 — South Lampung / Rajabasa (Runup: 2.9m, Hit: 21:38 WIB)',
          ],
          response_actions: [
            'Immediate sirens activation across Banten and South Lampung shores',
            'Enforce mandatory vertical evacuation to +15m elevation zones',
            'Full freeze on Sunda Strait maritime transit and Merak-Bakauheni ferries',
            'Deploy BASARNAS, TNI/Polri, and BNPB emergency disaster teams',
          ],
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        };
        setTsunami(scenario);
        setActivityIndex({
          overall_percentage: 96.5,
          seismic_change: 480,
          tremor_change: 350,
          deformation_trend: 'CATASTROPHIC_FLANK_COLLAPSE',
          thermal_trend: 'VOLCANIC_EXPLOSION',
          trend_direction: 'COLLAPSE_DETECTED',
          earthquake_count: 58,
          avg_magnitude: 3.4,
          max_magnitude: 3.8,
          timestamp: new Date().toISOString(),
        });
        setStatus((prev) => ({
          volcanic_activity: 96.5,
          ocean_status: 'TSUNAMI_RUNUP_DETECTED',
          weather_status: 'HEAVY_ASH_FALL',
          maritime_status: 'PORT_EMERGENCY_LOCKDOWN',
          active_alerts: 5,
          risk_level: 'CRITICAL',
          trend_direction: 'COLLAPSE_DETECTED',
          last_update: new Date().toISOString(),
          tsunami_scenario: scenario,
        }));
        setAiAnalysis({
          status: 'HISTORICAL DISASTER REPLAY: 2018 FLANK COLLAPSE',
          observations: [
            '20:56 WIB: 64-hectare southwest flank of Anak Krakatau collapsed into the sea',
            '21:03 WIB: Low-frequency seismic wave equivalent to M3.4 detected by regional networks without prior warning',
            '21:27 WIB: 3.5m tsunami wave surge impacted Marina Jukung Anyer tide gauge',
            '21:35–21:42 WIB: Destructive runup hit Ciwandan, Carita, Labuan, and Rajabasa coasts'
          ],
          assessment: 'Real historical reconstruction matching PVMBG, BMKG, and tide gauge data from the Dec 22, 2018 Sunda Strait tsunami.',
          recommendations: [
            'Replay demonstrates critical necessity of multi-sensor correlation (tiltmeter + seismic + sea-level)',
            'Deploy automated acoustic hydrophone network around caldera perimeter',
            'Integrate sub-minute radar altimetry for real-time flank displacement detection'
          ],
          confidence: 0.99,
          disclaimer: 'Actual historical event reconstruction from Dec 22, 2018 disaster records.',
          contributing_factors: [
            { indicator: 'Flank Displacement', value: '64 Hectares', change: 'Collapsed', significance: 1.0 },
            { indicator: 'Peak Wave Runup', value: '3.5 meters', change: 'Rapid Surge', significance: 0.98 },
            { indicator: 'Seismic Signature', value: 'M3.4 low-freq', change: 'Atypical', significance: 0.95 },
            { indicator: 'Transit Time to Shore', value: '24–35 mins', change: 'Critical', significance: 0.96 }
          ],
          timestamp: new Date().toISOString(),
        });
        setEvents((prev) => [
          { id: `evt-${++eventCounter.current}`, type: 'OCEAN', description: '🌊 [2018 REPLAY] 3.5m tsunami wave surges into Marina Jukung Anyer & Carita!', severity: 'CRITICAL', timestamp: new Date().toISOString() },
          { id: `evt-${++eventCounter.current}`, type: 'VOLCANIC', description: '🚨 [2018 REPLAY] Anak Krakatau SW flank collapses into Sunda Strait abyss!', severity: 'CRITICAL', timestamp: new Date().toISOString() },
          { id: `evt-${++eventCounter.current}`, type: 'SEISMIC', description: '⚠️ [2018 REPLAY] Long-period M3.4 seismic tremor from mass submarine landslide', severity: 'HIGH', timestamp: new Date().toISOString() },
          ...prev,
        ].slice(0, 50));
      } else if (type === 'volcanic-escalation') {
        setActivityIndex({
          overall_percentage: 82.4,
          seismic_change: 240,
          tremor_change: 180,
          deformation_trend: 'RAPID_INFLATION',
          thermal_trend: 'ANOMALOUS_HEATING',
          trend_direction: 'RAPIDLY INCREASING',
          earthquake_count: 24,
          avg_magnitude: 2.7,
          max_magnitude: 3.4,
          timestamp: new Date().toISOString(),
        });
        setStatus((prev) => ({
          volcanic_activity: 82.4,
          ocean_status: prev?.ocean_status ?? 'NORMAL',
          weather_status: prev?.weather_status ?? 'NORMAL',
          maritime_status: prev?.maritime_status ?? 'NORMAL',
          active_alerts: 3,
          risk_level: 'CRITICAL',
          trend_direction: 'RAPIDLY INCREASING',
          last_update: new Date().toISOString(),
        }));
        setAiAnalysis({
          status: 'CRITICAL ESCALATION',
          observations: [
            'Seismic event frequency spiked 240% in shallow magma chamber (3.2–5.0 km)',
            'Volcanic tremor intensity increased +180% indicating sustained fluid resonance',
            'Tiltmeter detected ground deformation +0.45 cm radial inflation at crater rim',
            'Satellite infrared sensor confirms thermal anomaly heating +2.8°C at summit'
          ],
          assessment: 'Consistent with shallow magma ascent and hydrothermal pressurization beneath Anak Krakatau caldera.',
          recommendations: [
            'Increase maritime exclusion zone radius from 3 km to 5 km immediately',
            'Issue urgent maritime alert to Sunda Strait shipping corridor and ferry routes',
            'Activate Emergency Operations Center (EOC) with BPBD Banten & Lampung',
            'Transition coastal early warning systems to standby readiness level'
          ],
          confidence: 0.92,
          disclaimer: 'Decision-support assessment based on multi-stream sensor correlation. Not an official eruption prediction.',
          contributing_factors: [
            { indicator: 'Seismic Frequency', value: '24 events/hr', change: '+240%', significance: 0.94 },
            { indicator: 'Tremor Amplitude', value: '180% baseline', change: 'Surge', significance: 0.88 },
            { indicator: 'Ground Deformation', value: '+0.45 cm', change: 'Inflation', significance: 0.82 },
            { indicator: 'Thermal Anomaly', value: '+2.8°C', change: 'Heating', significance: 0.76 },
          ],
          timestamp: new Date().toISOString(),
        });

        // Add escalation events to live feed
        setEvents((prev) => [
          { id: `evt-${++eventCounter.current}`, type: 'SEISMIC', description: '🚨 Earthquakes M3.4 shallow swarm detected (Depth: 3.2km)', severity: 'CRITICAL', timestamp: new Date().toISOString() },
          { id: `evt-${++eventCounter.current}`, type: 'VOLCANIC', description: '🚨 Tremor intensity surged 180% — Magma ascent acoustic signature', severity: 'CRITICAL', timestamp: new Date().toISOString() },
          { id: `evt-${++eventCounter.current}`, type: 'SATELLITE', description: '⚠️ Thermal radiance anomaly +2.8°C detected at caldera', severity: 'HIGH', timestamp: new Date().toISOString() },
          ...prev,
        ].slice(0, 50));
      } else if (type === 'tsunami') {
        const scenario: TsunamiScenario = {
          active: true,
          detection_time: new Date().toISOString(),
          sensor_id: 'Banten-03',
          wave_anomaly: 2.8,
          affected_zones: [
            'Zone A — Anyer Coastal Strip (Pop: ~45,000)',
            'Zone B — Carita Beach Resort Corridor (Pop: ~12,000)',
            'Zone C — Labuan Harbor & Dense Settlements (Pop: ~28,000)',
            'Zone D — Pandeglang Coastline (Pop: ~18,000)'
          ],
          response_actions: [
            'Sound coastal warning sirens along Banten & South Lampung coasts',
            'Trigger vertical evacuation protocols for low-lying residential sectors',
            'Suspend ferry operations at Merak - Bakauheni crossing',
            'Deploy Basarnas SAR units to designated forward response posts'
          ],
          severity: 'HIGH',
          timestamp: new Date().toISOString(),
        };
        setTsunami(scenario);
        setStatus((prev) => ({
          volcanic_activity: prev?.volcanic_activity ?? 23,
          ocean_status: 'ANOMALY DETECTED',
          weather_status: prev?.weather_status ?? 'NORMAL',
          maritime_status: prev?.maritime_status ?? 'NORMAL',
          active_alerts: (prev?.active_alerts ?? 0) + 1,
          risk_level: 'CRITICAL',
          trend_direction: prev?.trend_direction ?? 'STABLE',
          last_update: new Date().toISOString(),
          tsunami_scenario: scenario,
        }));
        setEvents((prev) => [
          { id: `evt-${++eventCounter.current}`, type: 'OCEAN', description: '🌊 TSUNAMI ALERT: Banten-03 sensor recorded rapid +2.80m sea level displacement!', severity: 'CRITICAL', timestamp: new Date().toISOString() },
          ...prev,
        ].slice(0, 50));
      } else if (type === 'reset') {
        setTsunami(null);
        setAiAnalysis(null);
        setActivityIndex(null);
        setStatus({
          volcanic_activity: 22,
          ocean_status: 'NORMAL',
          weather_status: 'NORMAL',
          maritime_status: 'NORMAL',
          active_alerts: 0,
          risk_level: 'NORMAL',
          trend_direction: 'STABLE',
          last_update: new Date().toISOString(),
        });
        setEvents((prev) => [
          { id: `evt-${++eventCounter.current}`, type: 'VOLCANIC', description: '↺ System reset to baseline normal monitoring', severity: 'LOW', timestamp: new Date().toISOString() },
          ...prev,
        ].slice(0, 50));
      }
    } finally {
      setTimeout(() => setSimulating(null), 1000);
    }
  };

  const activity = activityIndex?.overall_percentage ?? status?.volcanic_activity ?? 23;
  const trend = activityIndex?.trend_direction ?? status?.trend_direction ?? 'STABLE';

  return (
    <>
      <StatusBar
        connected={connected}
        alertCount={status?.active_alerts ?? 0}
        riskLevel={status?.risk_level ?? 'NORMAL'}
      />
      <main className="dashboard">
        <div className="map-container">
          <MapComponent
            activityLevel={activity}
            tsunamiActive={tsunami?.active ?? false}
          />
        </div>

        <div className="sidebar">
          <div className="card">
            <div className="card__header">
              <span className="card__title">
                <span className="card__title-icon">🌋</span>
                Volcanic Activity
              </span>
            </div>
            <ActivityGauge
              percentage={activity}
              trend={trend}
            />
          </div>

          <MetricCards
            oceanStatus={status?.ocean_status ?? 'NORMAL'}
            weatherStatus={status?.weather_status ?? 'NORMAL'}
            maritimeStatus={status?.maritime_status ?? 'NORMAL'}
            activityIndex={activityIndex}
          />
        </div>

        <EventStream events={events} />

        {aiAnalysis && <AIPanel analysis={aiAnalysis} />}

        {tsunami?.active && <TsunamiPanel scenario={tsunami} />}

        <SimControls
          onSimulate={handleSimulate}
          simulating={simulating}
        />
      </main>
      <GovernancePanel />
    </>
  );
}
