-- ============================================
-- GEMPA SENTINEL — Seismic Intensity Index
-- ============================================
-- Star Query: Computes the real-time National Seismic Intensity Index
-- using 1-minute tumbling windows over BMKG station telemetry & seismic events.

-- Step 1: Create the output table
CREATE TABLE activity_index (
    `overall_percentage` DOUBLE,
    `seismic_change` DOUBLE,
    `tremor_change` DOUBLE,
    `deformation_trend` STRING,
    `thermal_trend` STRING,
    `trend_direction` STRING,
    `earthquake_count` INT,
    `avg_magnitude` DOUBLE,
    `max_magnitude` DOUBLE,
    `timestamp` TIMESTAMP_LTZ(3)
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.intensity_index',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- Step 2: Continuous aggregation query using Window TVF
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
    s.window_end AS `timestamp`
FROM (
    SELECT 
        window_end,
        COUNT(*) AS quake_count,
        AVG(magnitude) AS avg_mag,
        MAX(magnitude) AS max_mag,
        AVG(pga) * 200.0 AS seismic_energy_surge
    FROM TABLE(
        TUMBLE(TABLE seismic_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) s
LEFT JOIN (
    SELECT 
        window_end,
        AVG(pga_recorded) AS avg_pga
    FROM TABLE(
        TUMBLE(TABLE station_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) st ON s.window_end = st.window_end
LEFT JOIN (
    SELECT 
        window_end,
        MAX(coseismic_slip) AS max_slip
    FROM TABLE(
        TUMBLE(TABLE satellite_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) sat ON s.window_end = sat.window_end
LEFT JOIN (
    SELECT 
        window_end,
        MAX(wave_height) AS max_wave
    FROM TABLE(
        TUMBLE(TABLE ocean_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) o ON s.window_end = o.window_end;
