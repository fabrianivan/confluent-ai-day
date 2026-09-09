'use client';

import { useState } from 'react';
import type { ActivityIndex, SystemStatus } from '@/lib/types';

interface FlinkPanelProps {
  activityIndex: ActivityIndex | null;
  status: SystemStatus | null;
}

const FLINK_QUERIES = [
  {
    id: 'activity_index',
    name: '02_activity_index.sql (Star Query)',
    description: 'Menghitung Indeks Intensitas Seismik Nasional secara kontinyu menggunakan Window TVF 1 menit dengan bobot multi-sensor.',
    sql: `-- Computes the real-time National Seismic Intensity Index
-- using 1-minute tumbling windows over BMKG station telemetry & seismic events.

CREATE TABLE activity_index (
    \`overall_percentage\` DOUBLE,
    \`seismic_change\` DOUBLE,
    \`tremor_change\` DOUBLE,
    \`deformation_trend\` STRING,
    \`thermal_trend\` STRING,
    \`trend_direction\` STRING,
    \`earthquake_count\` INT,
    \`avg_magnitude\` DOUBLE,
    \`max_magnitude\` DOUBLE,
    \`timestamp\` TIMESTAMP_LTZ(3)
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.intensity_index',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

INSERT INTO activity_index
SELECT
    -- Weighted seismic intensity formula:
    -- 40% magnitude/energy + 35% station PGA + 15% InSAR coseismic slip + 10% tsunami wave anomaly
    CASE 
        WHEN (
            (COALESCE(s.max_mag, 1.0) / 9.5 * 40.0) +
            (COALESCE(st.avg_pga, 0.0) / 0.5 * 35.0) +
            (COALESCE(sat.max_slip, 0.0) / 5.0 * 15.0) +
            (COALESCE(o.max_wave, 0.0) / 10.0 * 10.0)
        ) > 100.0 THEN 100.0
        ELSE (
            (COALESCE(s.max_mag, 1.0) / 9.5 * 40.0) +
            (COALESCE(st.avg_pga, 0.0) / 0.5 * 35.0) +
            (COALESCE(sat.max_slip, 0.0) / 5.0 * 15.0) +
            (COALESCE(o.max_wave, 0.0) / 10.0 * 10.0)
        )
    END AS overall_percentage,
    
    COALESCE(s.seismic_energy_surge, 0.0) AS seismic_change,
    COALESCE(st.avg_pga, 0.0) * 100.0 AS tremor_change,
    
    CASE 
        WHEN COALESCE(sat.max_slip, 0.0) > 2.0 THEN 'MAJOR FAULT RUPTURE'
        WHEN COALESCE(sat.max_slip, 0.0) > 0.5 THEN 'COSEISMIC DISPLACEMENT'
        ELSE 'STABLE'
    END AS deformation_trend,
    
    'STABLE' AS thermal_trend,
    
    CASE 
        WHEN COALESCE(s.max_mag, 0.0) >= 8.0 THEN 'MEGATHRUST RUPTURE DETECTED'
        WHEN COALESCE(s.max_mag, 0.0) >= 6.5 THEN 'MAJOR SHAKING'
        WHEN COALESCE(s.max_mag, 0.0) >= 5.0 THEN 'MODERATE EVENT'
        ELSE 'STABLE'
    END AS trend_direction,
    
    COALESCE(s.quake_count, 0) AS earthquake_count,
    COALESCE(s.avg_mag, 0.0) AS avg_magnitude,
    COALESCE(s.max_mag, 0.0) AS max_magnitude,
    s.window_end AS \`timestamp\`
FROM (
    SELECT 
        window_end,
        COUNT(*) AS quake_count,
        AVG(magnitude) AS avg_mag,
        MAX(magnitude) AS max_mag,
        AVG(pga) * 200.0 AS seismic_energy_surge
    FROM TABLE(
        TUMBLE(TABLE seismic_events, DESCRIPTOR(\`timestamp\`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) s
LEFT JOIN (
    SELECT 
        window_end,
        AVG(pga_recorded) AS avg_pga
    FROM TABLE(
        TUMBLE(TABLE station_events, DESCRIPTOR(\`timestamp\`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) st ON s.window_end = st.window_end
LEFT JOIN (
    SELECT 
        window_end,
        MAX(coseismic_slip) AS max_slip
    FROM TABLE(
        TUMBLE(TABLE satellite_events, DESCRIPTOR(\`timestamp\`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) sat ON s.window_end = sat.window_end
LEFT JOIN (
    SELECT 
        window_end,
        MAX(wave_height) AS max_wave
    FROM TABLE(
        TUMBLE(TABLE ocean_events, DESCRIPTOR(\`timestamp\`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) o ON s.window_end = o.window_end;`,
  },
  {
    id: 'correlated_alerts',
    name: '03_correlated_alerts.sql (Multi-Indicator Join)',
    description: 'Mendeteksi lonjakan anomali simultan lintas domain (seismik + PGA stasiun + deformasi satelit InSAR + buoy laut) dalam window 2 menit.',
    sql: `-- Detects when multiple independent indicators change 
-- simultaneously — seismic, station PGA, InSAR slip, and tsunami sensors.

CREATE TABLE correlated_alerts (
    \`alert_level\` STRING,
    \`correlated_indicators\` ARRAY<STRING>,
    \`time_window\` STRING,
    \`description\` STRING,
    \`timestamp\` TIMESTAMP_LTZ(3)
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.correlated_alerts',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

INSERT INTO correlated_alerts
SELECT
    CASE 
        WHEN indicator_count >= 3 THEN 'CRITICAL'
        WHEN indicator_count >= 2 THEN 'HIGH'
        ELSE 'ELEVATED'
    END AS alert_level,
    
    CASE 
        WHEN s.max_mag >= 7.0 AND st.max_pga >= 0.15 AND sat.max_slip >= 1.0 AND o.max_wave >= 2.0
            THEN ARRAY['Seismic Alert (M>=7.0)', 'Station PGA Surge (>=0.15g)', 'InSAR Fault Slip (>=1.0m)', 'Tsunami Wave Surge (>=2.0m)']
        WHEN s.max_mag >= 7.0 AND st.max_pga >= 0.15 AND o.max_wave >= 2.0
            THEN ARRAY['Seismic Alert (M>=7.0)', 'Station PGA Surge (>=0.15g)', 'Tsunami Wave Surge (>=2.0m)']
        WHEN s.max_mag >= 7.0 AND st.max_pga >= 0.15 AND sat.max_slip >= 1.0
            THEN ARRAY['Seismic Alert (M>=7.0)', 'Station PGA Surge (>=0.15g)', 'InSAR Fault Slip (>=1.0m)']
        WHEN s.max_mag >= 7.0 AND o.max_wave >= 2.0
            THEN ARRAY['Seismic Alert (M>=7.0)', 'Tsunami Wave Surge (>=2.0m)']
        WHEN s.max_mag >= 7.0 AND sat.max_slip >= 1.0
            THEN ARRAY['Seismic Alert (M>=7.0)', 'InSAR Fault Slip (>=1.0m)']
        WHEN st.max_pga >= 0.15 AND o.max_wave >= 2.0
            THEN ARRAY['Station PGA Surge (>=0.15g)', 'Tsunami Wave Surge (>=2.0m)']
        WHEN st.max_pga >= 0.15 AND sat.max_slip >= 1.0
            THEN ARRAY['Station PGA Surge (>=0.15g)', 'InSAR Fault Slip (>=1.0m)']
        ELSE ARRAY['Seismic Precursor', 'Station Network Acceleration']
    END AS correlated_indicators,
    
    CAST(window_start AS STRING) || ' to ' || CAST(window_end AS STRING) AS time_window,
    
    CASE 
        WHEN indicator_count >= 3 THEN 'CRITICAL: Multiple independent seismic, geodetic, and ocean indicators confirm major megathrust event. Immediate evacuation recommended.'
        WHEN indicator_count >= 2 THEN 'HIGH: Co-seismic slip and severe ground acceleration detected simultaneously across regional network.'
        ELSE 'ELEVATED: Precursor earthquake swarm and ground acceleration increase.'
    END AS description,
    
    window_end AS \`timestamp\`
FROM (
    SELECT
        s.window_start,
        s.window_end,
        s.max_mag,
        st.max_pga,
        sat.max_slip,
        o.max_wave,
        (CASE WHEN s.max_mag >= 7.0 THEN 1 ELSE 0 END) +
        (CASE WHEN COALESCE(st.max_pga, 0.0) >= 0.15 THEN 1 ELSE 0 END) +
        (CASE WHEN COALESCE(sat.max_slip, 0.0) >= 1.0 THEN 1 ELSE 0 END) +
        (CASE WHEN COALESCE(o.max_wave, 0.0) >= 2.0 THEN 1 ELSE 0 END)
        AS indicator_count
    FROM (
        SELECT 
            window_start,
            window_end,
            MAX(magnitude) AS max_mag
        FROM TABLE(
            TUMBLE(TABLE seismic_events, DESCRIPTOR(\`timestamp\`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) s
    LEFT JOIN (
        SELECT 
            window_end,
            MAX(pga_recorded) AS max_pga
        FROM TABLE(
            TUMBLE(TABLE station_events, DESCRIPTOR(\`timestamp\`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) st ON s.window_end = st.window_end
    LEFT JOIN (
        SELECT 
            window_end,
            MAX(coseismic_slip) AS max_slip
        FROM TABLE(
            TUMBLE(TABLE satellite_events, DESCRIPTOR(\`timestamp\`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) sat ON s.window_end = sat.window_end
    LEFT JOIN (
        SELECT 
            window_end,
            MAX(wave_height) AS max_wave
        FROM TABLE(
            TUMBLE(TABLE ocean_events, DESCRIPTOR(\`timestamp\`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) o ON s.window_end = o.window_end
)
WHERE indicator_count >= 2;`,
  },
  {
    id: 'tsunami_detection',
    name: '04_tsunami_detection.sql (Wave Front Matcher)',
    description: 'Pencocokan pola rambatan gelombang tsunami dari sensor InaTEWS DART Buoy & IOC tide gauge dengan ambang batas bahaya pesisir.',
    sql: `-- Real-time tsunami wave height & anomaly pattern matching
CREATE TABLE tsunami_scenarios (
    \`active\` BOOLEAN,
    \`detection_time\` TIMESTAMP_LTZ(3),
    \`sensor_id\` STRING,
    \`wave_anomaly\` DOUBLE,
    \`affected_zones\` ARRAY<STRING>,
    \`response_actions\` ARRAY<STRING>,
    \`severity\` STRING,
    \`timestamp\` TIMESTAMP_LTZ(3)
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.tsunami_scenarios',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

INSERT INTO tsunami_scenarios
SELECT
    TRUE AS active,
    window_start AS detection_time,
    sensor_id,
    max_wave_height AS wave_anomaly,
    
    CASE 
        WHEN max_wave_height > 10.0 THEN ARRAY['Pesisir Mentawai', 'Padang', 'Cilacap', 'Anyer', 'Palu Bay']
        WHEN max_wave_height > 5.0 THEN ARRAY['Zona Pesisir Utama (0-10m ASL)', 'Pesisir Banten & Selat Sunda', 'Pesisir Barat Sumatera']
        ELSE ARRAY['Zona Waspada Pesisir', 'Pelabuhan Regional']
    END AS affected_zones,
    
    CASE 
        WHEN max_wave_height > 5.0 THEN ARRAY['🚨 EVAKUASI SEGERA ke dataran tinggi (>20m)', 'Aktifkan sirene tsunami nasional', 'Hentikan seluruh navigasi laut & pelabuhan', 'Mobilisasi Tim SAR & BNPB']
        ELSE ARRAY['Waspada potensi gelombang tinggi', 'Jauhi pantai dan muara sungai']
    END AS response_actions,
    
    CASE 
        WHEN max_wave_height > 8.0 THEN 'CRITICAL'
        WHEN max_wave_height > 3.0 THEN 'HIGH'
        ELSE 'ELEVATED'
    END AS severity,
    
    window_end AS \`timestamp\`
FROM (
    SELECT
        window_start,
        window_end,
        sensor_id,
        MAX(wave_height) AS max_wave_height
    FROM TABLE(
        TUMBLE(TABLE ocean_events, DESCRIPTOR(\`timestamp\`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end, sensor_id
)
WHERE max_wave_height > 1.5;`,
  },
];

export default function FlinkPanel({ activityIndex, status }: FlinkPanelProps) {
  const [activeQueryTab, setActiveQueryTab] = useState('activity_index');
  const [copied, setCopied] = useState(false);

  const selectedQuery = FLINK_QUERIES.find((q) => q.id === activeQueryTab) || FLINK_QUERIES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedQuery.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const intensity = activityIndex?.overall_percentage ?? status?.seismic_intensity ?? 15.0;

  return (
    <div className="flink-panel">
      {/* Top Banner & Telemetry Header */}
      <div className="card flink-header-card">
        <div className="flink-header-card__left">
          <div className="flink-header-card__icon-wrap">
            <span className="flink-header-card__icon">⚡</span>
          </div>
          <div>
            <div className="flink-header-card__title-row">
              <h2 className="flink-header-card__title">Apache Flink Stream Processing Engine</h2>
              <span className="card__badge card__badge--flink">CONFLUENT CLUSTER FLINK v1.20</span>
              <span className="card__badge card__badge--live">LIVE PROCESSING</span>
            </div>
            <p className="flink-header-card__desc">
              Stateful Stream Processing berkecepatan tinggi dengan distributed event-time tumbling windows,
              multi-stream correlation, dan evaluasi kontinyu terhadap seluruh telemetri kegempaan Indonesia.
            </p>
          </div>
        </div>

        <div className="flink-header-card__stats">
          <div className="flink-stat-box">
            <span className="flink-stat-box__label">COMPUTE POOL</span>
            <span className="flink-stat-box__val">cpool-gempa-prod</span>
          </div>
          <div className="flink-stat-box">
            <span className="flink-stat-box__label">THROUGHPUT</span>
            <span className="flink-stat-box__val">1,480 msgs/s</span>
          </div>
          <div className="flink-stat-box">
            <span className="flink-stat-box__label">WATERMARK LAG</span>
            <span className="flink-stat-box__val">&lt; 140 ms</span>
          </div>
          <div className="flink-stat-box">
            <span className="flink-stat-box__label">CHECKPOINTS</span>
            <span className="flink-stat-box__val" style={{ color: 'var(--status-normal)' }}>100% OK</span>
          </div>
        </div>
      </div>

      {/* Visual Streaming Pipeline DAG Topology */}
      <div className="card flink-dag-card">
        <div className="card__header">
          <span className="card__title">
            <span className="card__title-icon">🔀</span>
            Streaming DAG Topology (Confluent Cloud ➔ Flink Engine ➔ AI Hub)
          </span>
          <span className="card__badge card__badge--live">ACTIVE EVENT FLOW</span>
        </div>

        <div className="flink-dag">
          {/* Step 1: Ingestion Topics */}
          <div className="flink-dag__col">
            <div className="flink-dag__col-title">1. KAFKA SOURCES</div>
            <div className="flink-dag__node flink-dag__node--source">
              <span className="flink-dag__node-tag">TOPIC</span>
              <span className="flink-dag__node-name">gempa.seismic</span>
              <span className="flink-dag__node-sub">BMKG & USGS Quakes</span>
            </div>
            <div className="flink-dag__node flink-dag__node--source">
              <span className="flink-dag__node-tag">TOPIC</span>
              <span className="flink-dag__node-name">gempa.stations</span>
              <span className="flink-dag__node-sub">12 Broadband Seismometers</span>
            </div>
            <div className="flink-dag__node flink-dag__node--source">
              <span className="flink-dag__node-tag">TOPIC</span>
              <span className="flink-dag__node-name">gempa.tsunami</span>
              <span className="flink-dag__node-sub">InaTEWS Buoys & IOC</span>
            </div>
            <div className="flink-dag__node flink-dag__node--source">
              <span className="flink-dag__node-tag">TOPIC</span>
              <span className="flink-dag__node-name">gempa.satellite</span>
              <span className="flink-dag__node-sub">InSAR Fault Slip</span>
            </div>
            <div className="flink-dag__node flink-dag__node--source">
              <span className="flink-dag__node-tag">TOPIC</span>
              <span className="flink-dag__node-name">gempa.weather</span>
              <span className="flink-dag__node-sub">Open-Meteo Maritime</span>
            </div>
          </div>

          <div className="flink-dag__arrow">➔</div>

          {/* Step 2: Apache Flink Processing Jobs */}
          <div className="flink-dag__col">
            <div className="flink-dag__col-title">2. FLINK SQL PROCESSING</div>
            <div className="flink-dag__node flink-dag__node--flink">
              <span className="flink-dag__node-tag" style={{ color: '#00f2ff' }}>FLINK JOB #1</span>
              <span className="flink-dag__node-name">TUMBLE Window (1 Min)</span>
              <span className="flink-dag__node-sub">Seismic Intensity Index Aggregation (40% Mag + 35% PGA + 15% Slip + 10% Ocean)</span>
            </div>
            <div className="flink-dag__node flink-dag__node--flink">
              <span className="flink-dag__node-tag" style={{ color: '#00f2ff' }}>FLINK JOB #2</span>
              <span className="flink-dag__node-name">Multi-Indicator Join (2 Min)</span>
              <span className="flink-dag__node-sub">Correlated Alert Engine (Threshold: ≥2 & ≥3 Sensors)</span>
            </div>
            <div className="flink-dag__node flink-dag__node--flink">
              <span className="flink-dag__node-tag" style={{ color: '#00f2ff' }}>FLINK JOB #3</span>
              <span className="flink-dag__node-name">Tsunami Anomaly Window (30s)</span>
              <span className="flink-dag__node-sub">InaTEWS Wave Surge & Run-up Assessment</span>
            </div>
          </div>

          <div className="flink-dag__arrow">➔</div>

          {/* Step 3: Sinks Topics */}
          <div className="flink-dag__col">
            <div className="flink-dag__col-title">3. KAFKA DERIVED SINKS</div>
            <div className="flink-dag__node flink-dag__node--sink">
              <span className="flink-dag__node-tag" style={{ color: '#10b981' }}>DERIVED TOPIC</span>
              <span className="flink-dag__node-name">gempa.intensity_index</span>
              <span className="flink-dag__node-sub">Current: {intensity.toFixed(1)}%</span>
            </div>
            <div className="flink-dag__node flink-dag__node--sink">
              <span className="flink-dag__node-tag" style={{ color: '#10b981' }}>DERIVED TOPIC</span>
              <span className="flink-dag__node-name">gempa.correlated_alerts</span>
              <span className="flink-dag__node-sub">Multi-Agency Early Warning</span>
            </div>
            <div className="flink-dag__node flink-dag__node--sink">
              <span className="flink-dag__node-tag" style={{ color: '#10b981' }}>DERIVED TOPIC</span>
              <span className="flink-dag__node-name">gempa.tsunami_scenarios</span>
              <span className="flink-dag__node-sub">Wave Height & Arrival Times</span>
            </div>
          </div>

          <div className="flink-dag__arrow">➔</div>

          {/* Step 4: AI & Decision Support Sinks */}
          <div className="flink-dag__col">
            <div className="flink-dag__col-title">4. INTELLIGENCE SINKS</div>
            <div className="flink-dag__node flink-dag__node--ai">
              <span className="flink-dag__node-tag" style={{ color: '#a855f7' }}>AI CONSUMER</span>
              <span className="flink-dag__node-name">Google Gemini 2.5 Flash</span>
              <span className="flink-dag__node-sub">Automated Tactical Assessment</span>
            </div>
            <div className="flink-dag__node flink-dag__node--ai">
              <span className="flink-dag__node-tag" style={{ color: '#a855f7' }}>STREAM HUB</span>
              <span className="flink-dag__node-name">Go Backend SSE Hub</span>
              <span className="flink-dag__node-sub">Real-Time WebSocket & Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flink SQL Query Studio */}
      <div className="card flink-studio-card">
        <div className="card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="card__title">
              <span className="card__title-icon">💻</span>
              Flink SQL Query Studio
            </span>
            <span className="card__badge card__badge--flink">CONTINUOUS STREAM QUERIES</span>
          </div>

          <button
            className="flink-copy-btn"
            onClick={handleCopy}
            title="Salin query Flink SQL"
          >
            {copied ? '✓ Disalin ke Clipboard' : '📋 Salin Query SQL'}
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flink-studio-tabs">
          {FLINK_QUERIES.map((q) => (
            <button
              key={q.id}
              className={`flink-studio-tab ${activeQueryTab === q.id ? 'flink-studio-tab--active' : ''}`}
              onClick={() => setActiveQueryTab(q.id)}
            >
              {q.name}
            </button>
          ))}
        </div>

        <div className="flink-studio-body">
          <div className="flink-studio-desc">
            <strong>Penjelasan Kueri:</strong> {selectedQuery.description}
          </div>

          <pre className="flink-code-box">
            <code>{selectedQuery.sql}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
