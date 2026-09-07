-- ============================================
-- GEMPA SENTINEL — Tsunami Anomaly Detection
-- ============================================
-- Monitors InaTEWS DART buoys and coastal tide gauges
-- for megathrust tsunami wave propagation.

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
    'kafka.topic' = 'gempa.tsunami_scenarios',
    'value.format' = 'json'
);

INSERT INTO tsunami_scenarios
SELECT
    TRUE AS active,
    window_start AS detection_time,
    sensor_id,
    max_wave_height AS wave_anomaly,
    
    CASE 
        WHEN max_wave_height > 10.0 THEN 'Pesisir Mentawai,Padang,Cilacap,Anyer,Palu Bay'
        WHEN max_wave_height > 5.0 THEN 'Zona Pesisir Utama (0-10m ASL)'
        ELSE 'Zona Waspada Pesisir'
    END AS affected_zones,
    
    CASE 
        WHEN max_wave_height > 5.0 THEN '🚨 EVAKUASI SEGERA ke dataran tinggi (>20m),Aktifkan sirene tsunami,Hentikan seluruh navigasi laut,Mobilisasi SAR'
        ELSE 'Waspada potensi gelombang tinggi,Jauhi pantai'
    END AS response_actions,
    
    CASE 
        WHEN max_wave_height > 8.0 THEN 'CRITICAL'
        WHEN max_wave_height > 3.0 THEN 'HIGH'
        ELSE 'ELEVATED'
    END AS severity,
    
    window_end AS `timestamp`
    
FROM (
    SELECT
        TUMBLE_START(`timestamp`, INTERVAL '1' MINUTE) AS window_start,
        TUMBLE_END(`timestamp`, INTERVAL '1' MINUTE) AS window_end,
        sensor_id,
        MAX(wave_height) AS max_wave_height
    FROM ocean_events
    GROUP BY TUMBLE(`timestamp`, INTERVAL '1' MINUTE), sensor_id
)
WHERE max_wave_height > 1.5;
