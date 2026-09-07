-- ============================================
-- KRAKATAU SENTINEL — Flink SQL Source Tables
-- ============================================
-- Run these in Confluent Cloud Flink SQL workspace
-- Topics must exist before running these statements

-- Seismic Events
CREATE TABLE seismic_events (
    `type` STRING,
    `magnitude` DOUBLE,
    `depth` DOUBLE,
    `frequency` DOUBLE,
    `count` INT,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.seismic',
    'value.format' = 'json'
);

-- Volcanic Activity Events
CREATE TABLE volcanic_events (
    `type` STRING,
    `activity_level` DOUBLE,
    `deformation` DOUBLE,
    `gas_measurement` DOUBLE,
    `thermal_activity` DOUBLE,
    `eruption_observation` STRING,
    `tremor_intensity` DOUBLE,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.activity',
    'value.format' = 'json'
);

-- Ocean Sensor Events
CREATE TABLE ocean_events (
    `type` STRING,
    `sensor_id` STRING,
    `sea_level` DOUBLE,
    `wave_height` DOUBLE,
    `tsunami_sensor_reading` DOUBLE,
    `buoy_data` DOUBLE,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.ocean',
    'value.format' = 'json'
);

-- Weather Events
CREATE TABLE weather_events (
    `type` STRING,
    `wind_speed` DOUBLE,
    `wind_direction` STRING,
    `rainfall` DOUBLE,
    `atmospheric_pressure` DOUBLE,
    `temperature` DOUBLE,
    `humidity` DOUBLE,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.weather',
    'value.format' = 'json'
);

-- Satellite Events
CREATE TABLE satellite_events (
    `type` STRING,
    `thermal_anomaly` DOUBLE,
    `deformation` DOUBLE,
    `ash_plume` STRING,
    `satellite_id` STRING,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.satellite',
    'value.format' = 'json'
);

-- Maritime Events
CREATE TABLE maritime_events (
    `type` STRING,
    `ship_id` STRING,
    `ship_name` STRING,
    `latitude` DOUBLE,
    `longitude` DOUBLE,
    `speed` DOUBLE,
    `restricted_zone` BOOLEAN,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.maritime',
    'value.format' = 'json'
);

-- Population/Evacuation Events
CREATE TABLE population_events (
    `type` STRING,
    `zone` STRING,
    `population` INT,
    `shelter_capacity` INT,
    `evacuation_route_status` STRING,
    `evacuation_readiness` DOUBLE,
    `timestamp` TIMESTAMP(3),
    WATERMARK FOR `timestamp` AS `timestamp` - INTERVAL '5' SECOND
) WITH (
    'kafka.topic' = 'volcano.population',
    'value.format' = 'json'
);
