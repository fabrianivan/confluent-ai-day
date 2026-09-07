export interface SeismicEvent {
  type: 'SEISMIC';
  magnitude: number;
  depth: number;
  frequency: number;
  count: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface VolcanicEvent {
  type: 'VOLCANIC';
  activity_level: number;
  deformation: number;
  gas_measurement: number;
  thermal_activity: number;
  eruption_observation: string;
  tremor_intensity: number;
  timestamp: string;
}

export interface OceanEvent {
  type: 'OCEAN';
  sensor_id: string;
  sea_level: number;
  wave_height: number;
  tsunami_sensor_reading: number;
  buoy_data: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface WeatherEvent {
  type: 'WEATHER';
  wind_speed: number;
  wind_direction: string;
  rainfall: number;
  atmospheric_pressure: number;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface SatelliteEvent {
  type: 'SATELLITE';
  thermal_anomaly: number;
  deformation: number;
  ash_plume: string;
  satellite_id: string;
  timestamp: string;
}

export interface MaritimeEvent {
  type: 'MARITIME';
  ship_id: string;
  ship_name: string;
  latitude: number;
  longitude: number;
  speed: number;
  restricted_zone: boolean;
  timestamp: string;
}

export interface ActivityIndex {
  overall_percentage: number;
  seismic_change: number;
  tremor_change: number;
  deformation_trend: string;
  thermal_trend: string;
  trend_direction: string;
  earthquake_count: number;
  avg_magnitude: number;
  max_magnitude: number;
  timestamp: string;
}

export interface ContributingFactor {
  indicator: string;
  value: string;
  change: string;
  significance: number;
}

export interface AIAnalysis {
  status: string;
  observations: string[];
  assessment: string;
  recommendations: string[];
  confidence: number;
  disclaimer: string;
  contributing_factors: ContributingFactor[];
  timestamp: string;
}

export interface TsunamiScenario {
  active: boolean;
  detection_time: string;
  sensor_id: string;
  wave_anomaly: number;
  affected_zones: string[];
  response_actions: string[];
  severity: string;
  timestamp: string;
}

export interface SystemStatus {
  volcanic_activity: number;
  ocean_status: string;
  weather_status: string;
  maritime_status: string;
  active_alerts: number;
  risk_level: string;
  trend_direction: string;
  last_update: string;
  tsunami_scenario?: TsunamiScenario;
  latest_ai?: AIAnalysis;
}

export interface LiveEvent {
  id: string;
  type: string;
  description: string;
  severity: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface GovernanceInfo {
  topic: string;
  classification: string;
  pii: string;
  schema_version: string;
  owner: string;
  access: string;
}

export interface SSEMessage {
  event: string;
  data: unknown;
}
