-- ============================================
-- KRAKATAU SENTINEL — Volcanic Activity Index
-- ============================================
-- This is the "star query" — computes the real-time
-- Volcanic Activity Index using 1-minute tumbling windows
-- 
-- The index emerges from correlating multiple independent 
-- monitoring streams. No single event tells the full story.

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
    `timestamp` TIMESTAMP(3)
) WITH (
    'kafka.topic' = 'volcano.activity_index',
    'value.format' = 'json'
);

-- Step 2: Continuous query — Seismic aggregation per window
-- This computes earthquake statistics in 1-minute tumbling windows
INSERT INTO activity_index
SELECT
    -- Weighted activity index formula:
    -- 30% seismic + 25% tremor + 20% thermal + 15% deformation + 10% gas
    LEAST(100.0, 
        (COALESCE(s.seismic_score, 0) * 0.30) +
        (COALESCE(v.tremor_score, 0) * 0.25) +
        (COALESCE(v.thermal_score, 0) * 0.20) +
        (COALESCE(v.deformation_score, 0) * 0.15) +
        (COALESCE(v.gas_score, 0) * 0.10)
    ) AS overall_percentage,
    
    COALESCE(s.seismic_score, 0) AS seismic_change,
    COALESCE(v.tremor_score, 0) AS tremor_change,
    
    CASE 
        WHEN COALESCE(v.avg_deformation, 0) > 1.0 THEN 'RAPIDLY INCREASING'
        WHEN COALESCE(v.avg_deformation, 0) > 0.3 THEN 'INCREASING'
        ELSE 'STABLE'
    END AS deformation_trend,
    
    CASE 
        WHEN COALESCE(v.avg_thermal, 0) > 60 THEN 'RAPIDLY INCREASING'
        WHEN COALESCE(v.avg_thermal, 0) > 35 THEN 'INCREASING'
        ELSE 'STABLE'
    END AS thermal_trend,
    
    CASE 
        WHEN LEAST(100.0, 
            (COALESCE(s.seismic_score, 0) * 0.30) +
            (COALESCE(v.tremor_score, 0) * 0.25) +
            (COALESCE(v.thermal_score, 0) * 0.20) +
            (COALESCE(v.deformation_score, 0) * 0.15) +
            (COALESCE(v.gas_score, 0) * 0.10)
        ) > 70 THEN 'RAPIDLY INCREASING'
        WHEN LEAST(100.0, 
            (COALESCE(s.seismic_score, 0) * 0.30) +
            (COALESCE(v.tremor_score, 0) * 0.25) +
            (COALESCE(v.thermal_score, 0) * 0.20) +
            (COALESCE(v.deformation_score, 0) * 0.15) +
            (COALESCE(v.gas_score, 0) * 0.10)
        ) > 40 THEN 'INCREASING'
        ELSE 'STABLE'
    END AS trend_direction,
    
    COALESCE(s.eq_count, 0) AS earthquake_count,
    COALESCE(s.avg_mag, 0) AS avg_magnitude,
    COALESCE(s.max_mag, 0) AS max_magnitude,
    
    s.window_end AS `timestamp`

FROM (
    -- Seismic sub-query: 1-minute tumbling window
    SELECT
        window_start,
        window_end,
        COUNT(*) AS eq_count,
        AVG(magnitude) AS avg_mag,
        MAX(magnitude) AS max_mag,
        -- Score: based on count and magnitude
        -- Baseline ~2 events/min with M<1.5
        LEAST(100.0, (COUNT(*) * 10.0) + (AVG(magnitude) * 20.0)) AS seismic_score
    FROM TABLE(
        TUMBLE(TABLE seismic_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) s

LEFT JOIN (
    -- Volcanic sub-query: 1-minute tumbling window
    SELECT
        window_start,
        window_end,
        AVG(tremor_intensity) AS avg_tremor,
        AVG(thermal_activity) AS avg_thermal,
        AVG(deformation) AS avg_deformation,
        AVG(gas_measurement) AS avg_gas,
        -- Tremor score
        LEAST(100.0, AVG(tremor_intensity) * 12.0) AS tremor_score,
        -- Thermal score
        LEAST(100.0, AVG(thermal_activity) * 1.2) AS thermal_score,
        -- Deformation score
        LEAST(100.0, AVG(deformation) * 50.0) AS deformation_score,
        -- Gas score
        LEAST(100.0, AVG(gas_measurement) * 0.12) AS gas_score
    FROM TABLE(
        TUMBLE(TABLE volcanic_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end
) v ON s.window_start = v.window_start AND s.window_end = v.window_end;
