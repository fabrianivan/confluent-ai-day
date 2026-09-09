-- ============================================
-- GEMPA SENTINEL — Correlated Alerts
-- ============================================
-- Detects when multiple independent indicators change 
-- simultaneously — seismic, station PGA, InSAR slip, and tsunami sensors.

CREATE TABLE correlated_alerts (
    `alert_level` STRING,
    `correlated_indicators` ARRAY<STRING>,
    `time_window` STRING,
    `description` STRING,
    `timestamp` TIMESTAMP_LTZ(3)
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
    
    window_end AS `timestamp`
    
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
            TUMBLE(TABLE seismic_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) s
    LEFT JOIN (
        SELECT 
            window_end,
            MAX(pga_recorded) AS max_pga
        FROM TABLE(
            TUMBLE(TABLE station_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) st ON s.window_end = st.window_end
    LEFT JOIN (
        SELECT 
            window_end,
            MAX(coseismic_slip) AS max_slip
        FROM TABLE(
            TUMBLE(TABLE satellite_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) sat ON s.window_end = sat.window_end
    LEFT JOIN (
        SELECT 
            window_end,
            MAX(wave_height) AS max_wave
        FROM TABLE(
            TUMBLE(TABLE ocean_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) o ON s.window_end = o.window_end
)
WHERE indicator_count >= 2;
