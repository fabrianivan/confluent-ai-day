export interface SeismicEvent {
  type: 'SEISMIC';
  magnitude: number;
  depth: number;
  frequency: number;
  count: number;
  latitude: number;
  longitude: number;
  mmi: number;
  pga: number;
  fault_zone: string;
  timestamp: string;
}

export interface StationEvent {
  type: 'STATION';
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  signal_quality: number;
  p_wave_arrival: number;
  s_wave_arrival: number;
  pga_recorded: number;
  status: 'ONLINE' | 'OFFLINE' | 'CLIPPED';
  timestamp: string;
}

export interface OceanEvent {
  type: 'OCEAN';
  sensor_id: string;
  sea_level: number;
  wave_height: number;
  tsunami_sensor_reading: number;
  buoy_data: number;
  wave_eta: number;
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
  ground_displacement: number;
  deformation: number;
  coseismic_slip: number;
  satellite_id: string;
  timestamp: string;
}

export interface InfrastructureEvent {
  type: 'INFRASTRUCTURE';
  facility_id: string;
  facility_name: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  damage_level: string;
  operational: boolean;
  timestamp: string;
}

export interface PopulationEvent {
  type: 'POPULATION';
  zone: string;
  population: number;
  shelter_capacity: number;
  evacuation_route_status: string;
  evacuation_readiness: number;
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

export interface AgencyAction {
  agency: string;
  priority: string;
  action: string;
}

export interface HazardDeepDive {
  fault_mechanism: string;
  estimated_coseismic_slip: string;
  aftershock_risk: string;
  tsunami_runup_estimate: string;
  evacuation_window_min: number;
}

export interface AIAnalysis {
  status: string;
  threat_summary?: string;
  observations: string[];
  assessment: string;
  recommendations: string[];
  agency_actions?: AgencyAction[];
  hazard_details?: HazardDeepDive;
  confidence: number;
  latency_ms?: number;
  model_used?: string;
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
  seismic_intensity: number;
  ocean_status: string;
  weather_status: string;
  infra_status: string;
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

export interface LifecyclePhase {
  phase_number: number;
  phase_name: string;
  phase_title: string;
  activity_level: number;
  duration_sec: number;
  elapsed_sec: number;
  seismic_energy: number;
  status: string;
  scenario_name?: string;
  magnitude?: number;
  depth?: number;
  fault_zone?: string;
  mmi?: number;
  timestamp: string;
}
