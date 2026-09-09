-- ============================================
-- GEMPA SENTINEL — Tsunami Anomaly Detection
-- ============================================
-- Monitors InaTEWS DART buoys and coastal tide gauges
-- for megathrust tsunami wave propagation.

CREATE TABLE tsunami_scenarios (
    `active` BOOLEAN,
    `detection_time` TIMESTAMP_LTZ(3),
    `sensor_id` STRING,
    `wave_anomaly` DOUBLE,
    `affected_zones` ARRAY<STRING>,
    `response_actions` ARRAY<STRING>,
    `severity` STRING,
    `timestamp` TIMESTAMP_LTZ(3)
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
    
    window_end AS `timestamp`
    
FROM (
    SELECT
        window_start,
        window_end,
        sensor_id,
        MAX(wave_height) AS max_wave_height
    FROM TABLE(
        TUMBLE(TABLE ocean_events, DESCRIPTOR(`timestamp`), INTERVAL '1' MINUTE)
    )
    GROUP BY window_start, window_end, sensor_id
)
WHERE max_wave_height > 1.5;
