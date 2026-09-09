-- ============================================
-- GEMPA SENTINEL — Flink SQL Source Tables
-- ============================================
-- Run these in Confluent Cloud Flink SQL workspace
-- Topics must exist before running these statements

-- 1. Seismic Events (USGS / BMKG Feed)
CREATE TABLE seismic_events (
    `type` STRING,
    `magnitude` DOUBLE,
    `depth` DOUBLE,
    `frequency` DOUBLE,
    `count` INT,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `mmi` INT,
    `pga` DOUBLE,
    `fault_zone` STRING,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.seismic',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- 2. BMKG Station Network Telemetry
CREATE TABLE station_events (
    `type` STRING,
    `station_id` STRING,
    `station_name` STRING,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `signal_quality` DOUBLE,
    `p_wave_arrival` DOUBLE,
    `s_wave_arrival` DOUBLE,
    `pga_recorded` DOUBLE,
    `status` STRING,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.stations',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- 3. InaTEWS DART Buoy & Ocean Sensor Events
CREATE TABLE ocean_events (
    `type` STRING,
    `sensor_id` STRING,
    `sea_level` DOUBLE,
    `wave_height` DOUBLE,
    `tsunami_sensor_reading` DOUBLE,
    `buoy_data` DOUBLE,
    `wave_eta` INT,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.tsunami',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- 4. Weather / Meteorological Events
CREATE TABLE weather_events (
    `type` STRING,
    `wind_speed` DOUBLE,
    `wind_direction` STRING,
    `rainfall` DOUBLE,
    `atmospheric_pressure` DOUBLE,
    `temperature` DOUBLE,
    `humidity` DOUBLE,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.weather',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- 5. Satellite Observation (InSAR & Geodetic Slip)
CREATE TABLE satellite_events (
    `type` STRING,
    `ground_displacement` DOUBLE,
    `deformation` DOUBLE,
    `coseismic_slip` DOUBLE,
    `satellite_id` STRING,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.satellite',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- 6. Critical Infrastructure Events
CREATE TABLE infrastructure_events (
    `type` STRING,
    `facility_id` STRING,
    `facility_name` STRING,
    `facility_type` STRING,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `damage_level` STRING,
    `operational` BOOLEAN,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.infrastructure',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);

-- 7. Population & Evacuation Readiness Events
CREATE TABLE population_events (
    `type` STRING,
    `zone` STRING,
    `population` INT,
    `shelter_capacity` INT,
    `evacuation_route_status` STRING,
    `evacuation_readiness` DOUBLE,
    `timestamp` TIMESTAMP_LTZ(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'gempa.population',
    'value.format' = 'json',
    'value.json.timestamp-format.standard' = 'ISO-8601'
);
