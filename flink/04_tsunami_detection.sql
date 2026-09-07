-- ============================================
-- KRAKATAU SENTINEL — Tsunami Anomaly Detection
-- ============================================
-- Monitors ocean sensors for sudden sea level and 
-- wave height anomalies that could indicate tsunami risk.
-- 
-- Correlates ocean anomalies with volcanic activity 
-- for context on potential causation.

-- Output table for tsunami scenarios
CREATE TABLE tsunami_scenarios (
    `active` BOOLEAN,
    `detection_time` TIMESTAMP(3),
    `sensor_id` STRING,
    `wave_anomaly` DOUBLE,
    `affected_zones` STRING,
    `response_actions` STRING,
    `severity` STRING,
    `timestamp` TIMESTAMP(3)
) WITH (
    'kafka.topic' = 'volcano.tsunami_scenarios',
    'value.format' = 'json'
);

-- Tsunami detection: triggers when sea level change exceeds threshold
-- Uses 1-minute tumbling windows on ocean data
INSERT INTO tsunami_scenarios
SELECT
    TRUE AS active,
    window_start AS detection_time,
    sensor_id,
    max_sea_level AS wave_anomaly,
    
    CASE 
        WHEN max_sea_level > 2.0 THEN 'Anyer,Carita Beach,Labuan,Pandeglang Coast'
        WHEN max_sea_level > 1.0 THEN 'Anyer,Carita Beach'
        ELSE 'Nearest coastal zone'
    END AS affected_zones,
    
    CASE 
        WHEN max_sea_level > 2.0 THEN 'Activate sirens,Evacuate zones A-D,Alert maritime,Notify emergency teams,Monitor propagation'
        WHEN max_sea_level > 1.0 THEN 'Review evacuation plans,Alert maritime traffic,Monitor sensors'
        ELSE 'Increase monitoring frequency,Review sensor data'
    END AS response_actions,
    
    CASE 
        WHEN max_sea_level > 2.5 THEN 'CRITICAL'
        WHEN max_sea_level > 1.5 THEN 'HIGH'
        WHEN max_sea_level > 0.8 THEN 'ELEVATED'
        ELSE 'ADVISORY'
    END AS severity,
    
    window_end AS `timestamp`
    
FROM (
    SELECT
        window_start,
        window_end,
        sensor_id,
        MAX(sea_level) AS max_sea_level,
        MAX(wave_height) AS max_wave_height,
        MAX(tsunami_sensor_reading) AS max_tsunami_reading
    FROM TABLE(
        TUMBLE(TABLE ocean_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end, sensor_id
)
WHERE max_sea_level > 0.8 OR max_wave_height > 2.0 OR max_tsunami_reading > 1.0;
