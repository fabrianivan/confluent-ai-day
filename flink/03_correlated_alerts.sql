-- ============================================
-- GEMPA SENTINEL — Correlated Alerts
-- ============================================
-- Detects when multiple independent indicators change 
-- simultaneously — seismic, station PGA, InSAR slip, and tsunami sensors.

CREATE TABLE correlated_alerts (
    `alert_level` STRING,
    `correlated_indicators` STRING,
    `time_window` STRING,
    `description` STRING,
    `timestamp` TIMESTAMP(3)
) WITH (
    'kafka.topic' = 'gempa.correlated_alerts',
    'value.format' = 'json'
);

INSERT INTO correlated_alerts
SELECT
    CASE 
        WHEN indicator_count >= 3 THEN 'CRITICAL'
        WHEN indicator_count >= 2 THEN 'HIGH'
        ELSE 'ELEVATED'
    END AS alert_level,
    
    indicators AS correlated_indicators,
    
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
        (CASE WHEN s.max_mag >= 7.0 THEN 1 ELSE 0 END) +
        (CASE WHEN st.max_pga >= 0.15 THEN 1 ELSE 0 END) +
        (CASE WHEN sat.max_slip >= 1.0 THEN 1 ELSE 0 END) +
        (CASE WHEN o.max_wave >= 2.0 THEN 1 ELSE 0 END)
        AS indicator_count,
        
        CONCAT(
            CASE WHEN s.max_mag >= 7.0 THEN 'Seismic(M' || CAST(ROUND(s.max_mag, 1) AS STRING) || ') ' ELSE '' END,
            CASE WHEN st.max_pga >= 0.15 THEN 'StationPGA(' || CAST(ROUND(st.max_pga, 3) AS STRING) || 'g) ' ELSE '' END,
            CASE WHEN sat.max_slip >= 1.0 THEN 'InSARSlip(' || CAST(ROUND(sat.max_slip, 1) AS STRING) || 'm) ' ELSE '' END,
            CASE WHEN o.max_wave >= 2.0 THEN 'TsunamiWave(' || CAST(ROUND(o.max_wave, 1) AS STRING) || 'm) ' ELSE '' END
        ) AS indicators
        
    FROM (
        SELECT 
            TUMBLE_START(`timestamp`, INTERVAL '2' MINUTE) AS window_start,
            TUMBLE_END(`timestamp`, INTERVAL '2' MINUTE) AS window_end,
            MAX(magnitude) AS max_mag
        FROM seismic_events
        GROUP BY TUMBLE(`timestamp`, INTERVAL '2' MINUTE)
    ) s
    LEFT JOIN (
        SELECT 
            TUMBLE_END(`timestamp`, INTERVAL '2' MINUTE) AS window_end,
            MAX(pga_recorded) AS max_pga
        FROM station_events
        GROUP BY TUMBLE(`timestamp`, INTERVAL '2' MINUTE)
    ) st ON s.window_end = st.window_end
    LEFT JOIN (
        SELECT 
            TUMBLE_END(`timestamp`, INTERVAL '2' MINUTE) AS window_end,
            MAX(coseismic_slip) AS max_slip
        FROM satellite_events
        GROUP BY TUMBLE(`timestamp`, INTERVAL '2' MINUTE)
    ) sat ON s.window_end = sat.window_end
    LEFT JOIN (
        SELECT 
            TUMBLE_END(`timestamp`, INTERVAL '2' MINUTE) AS window_end,
            MAX(wave_height) AS max_wave
        FROM ocean_events
        GROUP BY TUMBLE(`timestamp`, INTERVAL '2' MINUTE)
    ) o ON s.window_end = o.window_end
)
WHERE indicator_count >= 2;
