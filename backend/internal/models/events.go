package models

import "time"

// SeismicEvent represents an earthquake/tremor detection
type SeismicEvent struct {
	Type      string    `json:"type"`
	Magnitude float64   `json:"magnitude"`
	Depth     float64   `json:"depth"`
	Frequency float64   `json:"frequency"`
	Count     int       `json:"count"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Timestamp time.Time `json:"timestamp"`
}

// VolcanicEvent represents volcanic monitoring data
type VolcanicEvent struct {
	Type               string    `json:"type"`
	ActivityLevel      float64   `json:"activity_level"`
	Deformation        float64   `json:"deformation"`
	GasMeasurement     float64   `json:"gas_measurement"`
	ThermalActivity    float64   `json:"thermal_activity"`
	EruptionObservation string   `json:"eruption_observation"`
	TremorIntensity    float64   `json:"tremor_intensity"`
	Timestamp          time.Time `json:"timestamp"`
}

// OceanEvent represents ocean/tsunami sensor data
type OceanEvent struct {
	Type               string    `json:"type"`
	SensorID           string    `json:"sensor_id"`
	SeaLevel           float64   `json:"sea_level"`
	WaveHeight         float64   `json:"wave_height"`
	TsunamiSensorReading float64 `json:"tsunami_sensor_reading"`
	BuoyData           float64   `json:"buoy_data"`
	Latitude           float64   `json:"latitude"`
	Longitude          float64   `json:"longitude"`
	Timestamp          time.Time `json:"timestamp"`
}

// WeatherEvent represents meteorological data
type WeatherEvent struct {
	Type               string    `json:"type"`
	WindSpeed          float64   `json:"wind_speed"`
	WindDirection      string    `json:"wind_direction"`
	Rainfall           float64   `json:"rainfall"`
	AtmosphericPressure float64  `json:"atmospheric_pressure"`
	Temperature        float64   `json:"temperature"`
	Humidity           float64   `json:"humidity"`
	Timestamp          time.Time `json:"timestamp"`
}

// SatelliteEvent represents satellite observation data
type SatelliteEvent struct {
	Type           string    `json:"type"`
	ThermalAnomaly float64   `json:"thermal_anomaly"`
	Deformation    float64   `json:"deformation"`
	AshPlume       string    `json:"ash_plume"`
	SatelliteID    string    `json:"satellite_id"`
	Timestamp      time.Time `json:"timestamp"`
}

// MaritimeEvent represents ship/maritime data
type MaritimeEvent struct {
	Type              string    `json:"type"`
	ShipID            string    `json:"ship_id"`
	ShipName          string    `json:"ship_name"`
	Latitude          float64   `json:"latitude"`
	Longitude         float64   `json:"longitude"`
	Speed             float64   `json:"speed"`
	RestrictedZone    bool      `json:"restricted_zone"`
	Timestamp         time.Time `json:"timestamp"`
}

// PopulationEvent represents population/evacuation data
type PopulationEvent struct {
	Type                string    `json:"type"`
	Zone                string    `json:"zone"`
	Population          int       `json:"population"`
	ShelterCapacity     int       `json:"shelter_capacity"`
	EvacuationRouteStatus string  `json:"evacuation_route_status"`
	EvacuationReadiness float64   `json:"evacuation_readiness"`
	Timestamp           time.Time `json:"timestamp"`
}

// ActivityIndex represents the Flink-computed volcanic activity index
type ActivityIndex struct {
	OverallPercentage float64   `json:"overall_percentage"`
	SeismicChange     float64   `json:"seismic_change"`
	TremorChange      float64   `json:"tremor_change"`
	DeformationTrend  string    `json:"deformation_trend"`
	ThermalTrend      string    `json:"thermal_trend"`
	TrendDirection    string    `json:"trend_direction"`
	EarthquakeCount   int       `json:"earthquake_count"`
	AvgMagnitude      float64   `json:"avg_magnitude"`
	MaxMagnitude      float64   `json:"max_magnitude"`
	Timestamp         time.Time `json:"timestamp"`
}

// AIAnalysis represents the AI intelligence layer output
type AIAnalysis struct {
	Status              string            `json:"status"`
	Observations        []string          `json:"observations"`
	Assessment          string            `json:"assessment"`
	Recommendations     []string          `json:"recommendations"`
	Confidence          float64           `json:"confidence"`
	Disclaimer          string            `json:"disclaimer"`
	ContributingFactors []ContributingFactor `json:"contributing_factors"`
	Timestamp           time.Time         `json:"timestamp"`
}

// ContributingFactor represents a single factor contributing to an alert
type ContributingFactor struct {
	Indicator    string  `json:"indicator"`
	Value        string  `json:"value"`
	Change       string  `json:"change"`
	Significance float64 `json:"significance"`
}

// TsunamiScenario represents a tsunami detection scenario
type TsunamiScenario struct {
	Active          bool      `json:"active"`
	DetectionTime   time.Time `json:"detection_time"`
	SensorID        string    `json:"sensor_id"`
	WaveAnomaly     float64   `json:"wave_anomaly"`
	AffectedZones   []string  `json:"affected_zones"`
	ResponseActions []string  `json:"response_actions"`
	Severity        string    `json:"severity"`
	Timestamp       time.Time `json:"timestamp"`
}

// CorrelatedAlert represents a multi-stream correlation alert
type CorrelatedAlert struct {
	AlertLevel          string    `json:"alert_level"`
	CorrelatedIndicators []string `json:"correlated_indicators"`
	TimeWindow          string    `json:"time_window"`
	Description         string    `json:"description"`
	Timestamp           time.Time `json:"timestamp"`
}

// SystemStatus represents the overall system state
type SystemStatus struct {
	VolcanicActivity  float64         `json:"volcanic_activity"`
	OceanStatus       string          `json:"ocean_status"`
	WeatherStatus     string          `json:"weather_status"`
	MaritimeStatus    string          `json:"maritime_status"`
	ActiveAlerts      int             `json:"active_alerts"`
	RiskLevel         string          `json:"risk_level"`
	TrendDirection    string          `json:"trend_direction"`
	LastUpdate        time.Time       `json:"last_update"`
	TsunamiScenario   *TsunamiScenario `json:"tsunami_scenario,omitempty"`
	LatestAI          *AIAnalysis     `json:"latest_ai,omitempty"`
}

// GovernanceInfo represents data governance metadata for a topic
type GovernanceInfo struct {
	Topic          string `json:"topic"`
	Classification string `json:"classification"`
	PII            string `json:"pii"`
	SchemaVersion  string `json:"schema_version"`
	Owner          string `json:"owner"`
	Access         string `json:"access"`
}

// SSEMessage is a wrapper for SSE events
type SSEMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}
