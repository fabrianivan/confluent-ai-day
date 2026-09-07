package models

import "time"

// SeismicEvent represents an earthquake detection
type SeismicEvent struct {
	Type      string    `json:"type"`
	Magnitude float64   `json:"magnitude"`
	Depth     float64   `json:"depth"`
	Frequency float64   `json:"frequency"`
	Count     int       `json:"count"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	MMI       int       `json:"mmi"`       // Modified Mercalli Intensity (I-XII)
	PGA       float64   `json:"pga"`       // Peak Ground Acceleration (g)
	FaultZone string    `json:"fault_zone"`
	Timestamp time.Time `json:"timestamp"`
}

// StationEvent represents seismic station network data
type StationEvent struct {
	Type          string    `json:"type"`
	StationID     string    `json:"station_id"`
	StationName   string    `json:"station_name"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	SignalQuality float64   `json:"signal_quality"` // 0-100%
	PWaveArrival  float64   `json:"p_wave_arrival"`  // seconds since origin
	SWaveArrival  float64   `json:"s_wave_arrival"`  // seconds since origin
	PGARecorded   float64   `json:"pga_recorded"`    // g
	Status        string    `json:"status"`          // ONLINE, OFFLINE, CLIPPED
	Timestamp     time.Time `json:"timestamp"`
}

// OceanEvent represents tsunami gauge / tide sensor data
type OceanEvent struct {
	Type                 string    `json:"type"`
	SensorID             string    `json:"sensor_id"`
	SeaLevel             float64   `json:"sea_level"`
	WaveHeight           float64   `json:"wave_height"`
	TsunamiSensorReading float64   `json:"tsunami_sensor_reading"`
	BuoyData             float64   `json:"buoy_data"`
	WaveETA              int       `json:"wave_eta"` // minutes to coast
	Latitude             float64   `json:"latitude"`
	Longitude            float64   `json:"longitude"`
	Timestamp            time.Time `json:"timestamp"`
}

// WeatherEvent represents meteorological data
type WeatherEvent struct {
	Type                string    `json:"type"`
	WindSpeed           float64   `json:"wind_speed"`
	WindDirection       string    `json:"wind_direction"`
	Rainfall            float64   `json:"rainfall"`
	AtmosphericPressure float64   `json:"atmospheric_pressure"`
	Temperature         float64   `json:"temperature"`
	Humidity            float64   `json:"humidity"`
	Timestamp           time.Time `json:"timestamp"`
}

// SatelliteEvent represents satellite observation (InSAR, SAR)
type SatelliteEvent struct {
	Type             string    `json:"type"`
	GroundDisplacement float64 `json:"ground_displacement"` // cm
	Deformation      float64   `json:"deformation"`
	CoseismicSlip    float64   `json:"coseismic_slip"` // meters of fault slip
	SatelliteID      string    `json:"satellite_id"`
	Timestamp        time.Time `json:"timestamp"`
}

// InfrastructureEvent represents infrastructure impact data
type InfrastructureEvent struct {
	Type           string    `json:"type"`
	FacilityID     string    `json:"facility_id"`
	FacilityName   string    `json:"facility_name"`
	FacilityType   string    `json:"facility_type"` // BRIDGE, HOSPITAL, SCHOOL, PORT
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	DamageLevel    string    `json:"damage_level"` // NONE, MINOR, MODERATE, SEVERE, COLLAPSED
	Operational    bool      `json:"operational"`
	Timestamp      time.Time `json:"timestamp"`
}

// PopulationEvent represents population/evacuation data
type PopulationEvent struct {
	Type                  string    `json:"type"`
	Zone                  string    `json:"zone"`
	Population            int       `json:"population"`
	ShelterCapacity       int       `json:"shelter_capacity"`
	EvacuationRouteStatus string    `json:"evacuation_route_status"`
	EvacuationReadiness   float64   `json:"evacuation_readiness"`
	Timestamp             time.Time `json:"timestamp"`
}

// ActivityIndex represents the computed seismic intensity index
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

// AgencyAction represents tactical recommendations broken down by responder agency
type AgencyAction struct {
	Agency   string `json:"agency"`   // BMKG, BNPB, BASARNAS, KEMENHUB
	Priority string `json:"priority"` // IMMEDIATE, URGENT, STANDBY
	Action   string `json:"action"`
}

// HazardDeepDive contains technical seismological assessments
type HazardDeepDive struct {
	FaultMechanism         string `json:"fault_mechanism"`          // e.g. Subduction Megathrust Thrust
	EstimatedCoseismicSlip string `json:"estimated_coseismic_slip"` // e.g. 5.2 meters
	AftershockRisk         string `json:"aftershock_risk"`         // e.g. HIGH (Probability M>6.5 in 48h: 78%)
	TsunamiRunupEstimate   string `json:"tsunami_runup_estimate"`   // e.g. 8 - 15 meters
	EvacuationWindowMin    int    `json:"evacuation_window_min"`    // Golden evacuation window
}

// AIAnalysis represents the AI intelligence layer output
type AIAnalysis struct {
	Status              string               `json:"status"`
	ThreatSummary       string               `json:"threat_summary,omitempty"`
	Observations        []string             `json:"observations"`
	Assessment          string               `json:"assessment"`
	Recommendations     []string             `json:"recommendations"`
	AgencyActions       []AgencyAction       `json:"agency_actions,omitempty"`
	HazardDetails       *HazardDeepDive      `json:"hazard_details,omitempty"`
	Confidence          float64              `json:"confidence"`
	LatencyMs           int64                `json:"latency_ms,omitempty"`
	ModelUsed           string               `json:"model_used,omitempty"`
	Disclaimer          string               `json:"disclaimer"`
	ContributingFactors []ContributingFactor `json:"contributing_factors"`
	Timestamp           time.Time            `json:"timestamp"`
}

// AIQuestionRequest represents an interactive question to Gemini Copilot
type AIQuestionRequest struct {
	Question string `json:"question"`
}

// AIQuestionResponse represents the reply from Gemini Copilot
type AIQuestionResponse struct {
	Answer    string    `json:"answer"`
	Model     string    `json:"model"`
	LatencyMs int64     `json:"latency_ms"`
	Timestamp time.Time `json:"timestamp"`
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
	AlertLevel           string    `json:"alert_level"`
	CorrelatedIndicators []string  `json:"correlated_indicators"`
	TimeWindow           string    `json:"time_window"`
	Description          string    `json:"description"`
	Timestamp            time.Time `json:"timestamp"`
}

// SystemStatus represents the overall system state
type SystemStatus struct {
	SeismicIntensity  float64          `json:"seismic_intensity"`
	OceanStatus       string           `json:"ocean_status"`
	WeatherStatus     string           `json:"weather_status"`
	InfraStatus       string           `json:"infra_status"`
	ActiveAlerts      int              `json:"active_alerts"`
	RiskLevel         string           `json:"risk_level"`
	TrendDirection    string           `json:"trend_direction"`
	LastUpdate        time.Time        `json:"last_update"`
	TsunamiScenario   *TsunamiScenario `json:"tsunami_scenario,omitempty"`
	LatestAI          *AIAnalysis      `json:"latest_ai,omitempty"`
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
