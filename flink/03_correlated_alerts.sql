-- ============================================
-- KRAKATAU SENTINEL — Correlated Alerts
-- ============================================
-- Detects when multiple independent indicators change 
-- simultaneously — the key insight that makes streaming valuable.
-- 
-- "The important insight doesn't exist in any individual event. 
--  It emerges from the correlation of events over time."

-- Output table for correlated alerts
CREATE TABLE correlated_alerts (
    `alert_level` STRING,
    `correlated_indicators` STRING,
    `time_window` STRING,
    `description` STRING,
    `timestamp` TIMESTAMP(3)
) WITH (
    'kafka.topic' = 'volcano.correlated_alerts',
    'value.format' = 'json'
);

-- Correlated alert query: fires when 3+ indicators are elevated
-- within the same 2-minute window
INSERT INTO correlated_alerts
SELECT
    CASE 
        WHEN indicator_count >= 4 THEN 'CRITICAL'
        WHEN indicator_count >= 3 THEN 'HIGH'
        WHEN indicator_count >= 2 THEN 'ELEVATED'
        ELSE 'ADVISORY'
    END AS alert_level,
    
    indicators AS correlated_indicators,
    
    CAST(window_start AS STRING) || ' to ' || CAST(window_end AS STRING) AS time_window,
    
    CASE 
        WHEN indicator_count >= 4 THEN 'CRITICAL: Four or more independent monitoring indicators are simultaneously elevated. Immediate assessment recommended.'
        WHEN indicator_count >= 3 THEN 'HIGH: Three independent indicators are escalating within the same time window. Enhanced monitoring recommended.'
        WHEN indicator_count >= 2 THEN 'ELEVATED: Two independent indicators are changing simultaneously. Review monitoring data.'
        ELSE 'ADVISORY: Elevated activity detected in one monitoring domain.'
    END AS description,
    
    window_end AS `timestamp`
    
FROM (
    SELECT
        s.window_start,
        s.window_end,
        -- Count how many indicators are elevated
        (CASE WHEN s.avg_mag > 2.0 THEN 1 ELSE 0 END) +
        (CASE WHEN v.avg_tremor > 3.0 THEN 1 ELSE 0 END) +
        (CASE WHEN v.avg_thermal > 50.0 THEN 1 ELSE 0 END) +
        (CASE WHEN v.avg_deformation > 0.5 THEN 1 ELSE 0 END) +
        (CASE WHEN sat.avg_thermal_anomaly > 2.0 THEN 1 ELSE 0 END)
        AS indicator_count,
        
        -- Build indicator list
        CONCAT(
            CASE WHEN s.avg_mag > 2.0 THEN 'Seismic(M' || CAST(ROUND(s.avg_mag, 1) AS STRING) || ') ' ELSE '' END,
            CASE WHEN v.avg_tremor > 3.0 THEN 'Tremor(' || CAST(ROUND(v.avg_tremor, 1) AS STRING) || ') ' ELSE '' END,
            CASE WHEN v.avg_thermal > 50.0 THEN 'Thermal(' || CAST(ROUND(v.avg_thermal, 0) AS STRING) || '%) ' ELSE '' END,
            CASE WHEN v.avg_deformation > 0.5 THEN 'Deformation(' || CAST(ROUND(v.avg_deformation, 1) AS STRING) || 'cm) ' ELSE '' END,
            CASE WHEN sat.avg_thermal_anomaly > 2.0 THEN 'SatThermal(' || CAST(ROUND(sat.avg_thermal_anomaly, 1) AS STRING) || '°C) ' ELSE '' END
        ) AS indicators
        
    FROM (
        SELECT
            window_start, window_end,
            AVG(magnitude) AS avg_mag,
            COUNT(*) AS eq_count
        FROM TABLE(
            TUMBLE(TABLE seismic_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) s
    
    LEFT JOIN (
        SELECT
            window_start, window_end,
            AVG(tremor_intensity) AS avg_tremor,
            AVG(thermal_activity) AS avg_thermal,
            AVG(deformation) AS avg_deformation
        FROM TABLE(
            TUMBLE(TABLE volcanic_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) v ON s.window_start = v.window_start AND s.window_end = v.window_end
    
    LEFT JOIN (
        SELECT
            window_start, window_end,
            AVG(thermal_anomaly) AS avg_thermal_anomaly
        FROM TABLE(
            TUMBLE(TABLE satellite_events, DESCRIPTOR(`timestamp`), INTERVAL '2' MINUTE)
        )
        GROUP BY window_start, window_end
    ) sat ON s.window_start = sat.window_start AND s.window_end = sat.window_end
)
WHERE indicator_count >= 2;
