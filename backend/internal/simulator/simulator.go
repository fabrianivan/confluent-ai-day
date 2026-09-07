package simulator

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/hub"
	"krakatau-sentinel/internal/kafka"
	"krakatau-sentinel/internal/models"
)

// SimulationMode represents the current simulation state
type SimulationMode int

const (
	ModeNormal SimulationMode = iota
	ModeVolcanicEscalation
	ModeTsunamiScenario
)

// LifecyclePhase describes the current autonomous real-life simulation phase
type LifecyclePhase struct {
	PhaseNumber   int       `json:"phase_number"`
	PhaseName     string    `json:"phase_name"`
	PhaseTitle    string    `json:"phase_title"`
	ActivityLevel float64   `json:"activity_level"`
	DurationSec   int       `json:"duration_sec"`
	ElapsedSec    int       `json:"elapsed_sec"`
	SeismicEnergy float64   `json:"seismic_energy"` // in mm/s for live seismograph
	Status        string    `json:"status"`
	Timestamp     time.Time `json:"timestamp"`
}

// Simulator orchestrates event generation across all domains
type Simulator struct {
	producer  *kafka.Producer
	hub       *hub.SSEHub
	mode      SimulationMode
	mu        sync.RWMutex
	cancel    context.CancelFunc

	// Escalation state
	escalationProgress float64 // 0.0 to 1.0
	tsunamiProgress    float64 // 0.0 to 1.0

	// Current computed state (local approximation before Flink processes)
	currentActivity float64
	trendDirection  string

	// Autonomous lifecycle state
	currentPhase      LifecyclePhase
	onTriggerAnalysis func(models.ActivityIndex)
}

// NewSimulator creates a new event simulator
func NewSimulator(producer *kafka.Producer, h *hub.SSEHub) *Simulator {
	return &Simulator{
		producer:        producer,
		hub:             h,
		mode:            ModeNormal,
		currentActivity: 18.0 + rand.Float64()*6.0,
		trendDirection:  "STABLE",
		currentPhase: LifecyclePhase{
			PhaseNumber:   1,
			PhaseName:     "QUIESCENT_BASELINE",
			PhaseTitle:    "Phase 1: Quiescent Surveillance & Ambient Ingestion",
			ActivityLevel: 21.4,
			DurationSec:   35,
			ElapsedSec:    1,
			SeismicEnergy: 1.2,
			Status:        "NORMAL",
			Timestamp:     time.Now(),
		},
	}
}

// SetAnalysisTrigger binds the AI analysis callback
func (s *Simulator) SetAnalysisTrigger(fn func(models.ActivityIndex)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onTriggerAnalysis = fn
}

// Start begins generating baseline events and starts autonomous crisis lifecycle
func (s *Simulator) Start(ctx context.Context) {
	log.Println("🌋 Event simulator started — running autonomous real-life surveillance lifecycle")

	ctx, cancel := context.WithCancel(ctx)
	s.cancel = cancel

	go s.generateSeismicEvents(ctx)
	go s.generateVolcanicEvents(ctx)
	go s.generateOceanEvents(ctx)
	go s.generateWeatherEvents(ctx)
	go s.generateSatelliteEvents(ctx)
	go s.generateMaritimeEvents(ctx)
	go s.generatePopulationEvents(ctx)
	go s.broadcastMetrics(ctx)
	go s.startAutonomousLifecycle(ctx)
}

// TriggerVolcanicEscalation starts the volcanic escalation scenario
func (s *Simulator) TriggerVolcanicEscalation() {
	s.mu.Lock()
	s.mode = ModeVolcanicEscalation
	s.escalationProgress = 0.0
	s.mu.Unlock()

	log.Println("🔥 VOLCANIC ESCALATION TRIGGERED")

	go s.runVolcanicEscalation()
}

// TriggerTsunami starts the tsunami scenario
func (s *Simulator) TriggerTsunami() {
	s.mu.Lock()
	s.mode = ModeTsunamiScenario
	s.tsunamiProgress = 0.0
	s.mu.Unlock()

	log.Println("🌊 TSUNAMI SCENARIO TRIGGERED")

	go s.runTsunamiScenario()
}

// TriggerReal2018Disaster replays the actual December 22, 2018 Anak Krakatau flank collapse and tsunami
func (s *Simulator) TriggerReal2018Disaster() {
	s.mu.Lock()
	s.mode = ModeVolcanicEscalation
	s.escalationProgress = 0.0
	s.currentActivity = 65.0
	s.trendDirection = "FLANK COLLAPSE"
	s.mu.Unlock()

	log.Println("🚨 HISTORICAL REAL 2018 KRAKATAU FLANK COLLAPSE & TSUNAMI REPLAY TRIGGERED")

	go s.runReal2018Disaster()
}

func (s *Simulator) runReal2018Disaster() {
	stages := []struct {
		delay     time.Duration
		activity  float64
		desc      string
		eventType string
	}{
		{1 * time.Second, 52, "20:55 WIB: PVMBG Pasauran seismograph records continuous volcanic tremor surge (amplitude 35mm)", "VOLCANIC"},
		{4 * time.Second, 78, "21:03 WIB: 64-hectare southwest flank collapse into Sunda Strait (M3.3 equivalent displacement shockwave)", "SEISMIC"},
		{8 * time.Second, 89, "21:15 WIB: Sentinel-1 SAR confirms massive caldera loss; SO2 gas emissions spike >5,000 tons/day", "SATELLITE"},
		{12 * time.Second, 94, "21:27 WIB: Tide gauge Marina Jukung Anyer detects initial +0.9m sudden water level displacement", "OCEAN"},
		{16 * time.Second, 97, "21:31 WIB: Tide gauge Ciwandan (+1.2m) & Kota Agung (+0.36m) confirm destructive tsunami wavefront", "OCEAN"},
		{20 * time.Second, 99, "21:40 WIB: Extreme runup (up to 3.5m) devastates Carita Beach, Labuan, and South Lampung coast", "POPULATION"},
	}

	for _, stage := range stages {
		time.Sleep(stage.delay)
		s.mu.Lock()
		s.currentActivity = stage.activity
		s.trendDirection = "CRITICAL FLANK COLLAPSE"
		s.mu.Unlock()

		s.hub.BroadcastAll("event", map[string]interface{}{
			"type":        stage.eventType,
			"description": fmt.Sprintf("HISTORICAL REAL 2018: %s", stage.desc),
			"severity":    "CRITICAL",
			"timestamp":   time.Now(),
		})
	}

	scenario := models.TsunamiScenario{
		Active:        true,
		DetectionTime: time.Now().Add(-20 * time.Second),
		SensorID:      "Marina Jukung Anyer & Ciwandan (2018 Real Record)",
		WaveAnomaly:   3.5,
		AffectedZones: []string{
			"Zone A — Anyer Coastal Sector (Actual 2018: Extreme Runup)",
			"Zone B — Carita Beach Resort Corridor (Actual 2018: 3.5m Runup, Severe Destruction)",
			"Zone C — Labuan Harbor & Dense Settlements (Actual 2018: 2.8m Wave Surge)",
			"Zone D — Pandeglang Coastline (Actual 2018: 267 Fatalities)",
			"Zone E — South Lampung / Kalianda (Actual 2018: 114 Fatalities)",
		},
		ResponseActions: []string{
			"🚨 MANDATORY IMMEDIATE EVACUATION TO HIGH GROUND (>20m)",
			"🚨 Sound all manual coastal sirens across Banten & Lampung",
			"🚨 Halt Merak - Bakauheni ferry services across Sunda Strait",
			"🚨 Mobilize National SAR Agency (Basarnas) & BNPB Emergency Response",
		},
		Severity:  "CRITICAL",
		Timestamp: time.Now(),
	}

	_ = s.producer.Produce(config.TopicNames.TsunamiScenarios, "real-2018-disaster", scenario)
	s.hub.BroadcastAll("tsunami", scenario)
}

// Reset returns the simulator to normal mode
func (s *Simulator) Reset() {
	s.mu.Lock()
	s.mode = ModeNormal
	s.escalationProgress = 0.0
	s.tsunamiProgress = 0.0
	s.currentActivity = 18.0 + rand.Float64()*10.0
	s.trendDirection = "STABLE"
	s.mu.Unlock()

	log.Println("↺ Simulator reset to normal mode")

	// Broadcast reset
	s.hub.BroadcastAll("tsunami", models.TsunamiScenario{Active: false, Timestamp: time.Now()})
	s.hub.BroadcastAll("ai_analysis", models.AIAnalysis{
		Status:      "NORMAL",
		Observations: []string{"All indicators returned to baseline levels"},
		Assessment:  "System reset. All monitoring indicators within normal parameters.",
		Recommendations: []string{
			"Continue standard monitoring schedule",
			"No action required at this time",
		},
		Confidence: 0.95,
		Disclaimer: "This is a decision-support assessment, not an official eruption prediction.",
		Timestamp:  time.Now(),
	})
}

// GetStatus returns the current system status
func (s *Simulator) GetStatus() models.SystemStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	riskLevel := "NORMAL"
	oceanStatus := "NORMAL"
	if s.currentActivity > 70 {
		riskLevel = "CRITICAL"
	} else if s.currentActivity > 50 {
		riskLevel = "ELEVATED"
	} else if s.currentActivity > 35 {
		riskLevel = "ADVISORY"
	}

	if s.mode == ModeTsunamiScenario {
		oceanStatus = "ANOMALY DETECTED"
	}

	alerts := 0
	if s.currentActivity > 50 {
		alerts++
	}
	if s.mode == ModeTsunamiScenario {
		alerts++
	}

	return models.SystemStatus{
		VolcanicActivity: s.currentActivity,
		OceanStatus:      oceanStatus,
		WeatherStatus:    "NORMAL",
		MaritimeStatus:   "NORMAL",
		ActiveAlerts:     alerts,
		RiskLevel:        riskLevel,
		TrendDirection:   s.trendDirection,
		LastUpdate:       time.Now(),
	}
}

// runVolcanicEscalation simulates a ~30-second volcanic escalation
func (s *Simulator) runVolcanicEscalation() {
	stages := []struct {
		delay       time.Duration
		activity    float64
		trend       string
		description string
	}{
		{0 * time.Second, 28, "INCREASING", "Initial seismic uptick detected"},
		{3 * time.Second, 35, "INCREASING", "Earthquake frequency rising"},
		{6 * time.Second, 41, "INCREASING", "Tremor intensity increasing"},
		{9 * time.Second, 48, "RAPIDLY INCREASING", "Multiple seismic indicators elevated"},
		{12 * time.Second, 55, "RAPIDLY INCREASING", "Ground deformation detected"},
		{15 * time.Second, 62, "RAPIDLY INCREASING", "Thermal anomaly confirmed"},
		{18 * time.Second, 69, "RAPIDLY INCREASING", "Gas emissions significantly elevated"},
		{21 * time.Second, 76, "RAPIDLY INCREASING", "Multiple independent indicators escalating"},
		{24 * time.Second, 82, "RAPIDLY INCREASING", "Activity index at elevated level"},
		{27 * time.Second, 85, "HIGH", "Peak activity — sustained elevated readings"},
	}

	for i, stage := range stages {
		s.mu.RLock()
		if s.mode != ModeVolcanicEscalation {
			s.mu.RUnlock()
			return
		}
		s.mu.RUnlock()

		if i > 0 {
			time.Sleep(stage.delay - stages[i-1].delay)
		}

		s.mu.Lock()
		s.currentActivity = stage.activity
		s.trendDirection = stage.trend
		s.escalationProgress = float64(i+1) / float64(len(stages))
		s.mu.Unlock()

		// Produce escalated events
		s.produceEscalatedSeismic(stage.activity)
		s.produceEscalatedVolcanic(stage.activity)
		if stage.activity > 55 {
			s.produceEscalatedSatellite(stage.activity)
		}

		log.Printf("🌋 Escalation stage %d/10: %.0f%% — %s", i+1, stage.activity, stage.description)
	}
}

// runTsunamiScenario simulates a tsunami detection scenario
func (s *Simulator) runTsunamiScenario() {
	stages := []struct {
		delay       time.Duration
		description string
	}{
		{0 * time.Second, "Sea level change detected on sensor Banten-03"},
		{4 * time.Second, "Wave height anomaly +2.8m confirmed"},
		{8 * time.Second, "Multiple buoy readings confirm anomaly"},
		{12 * time.Second, "Affected coastal zones identified"},
		{16 * time.Second, "Impact assessment complete"},
	}

	for i, stage := range stages {
		s.mu.RLock()
		if s.mode != ModeTsunamiScenario {
			s.mu.RUnlock()
			return
		}
		s.mu.RUnlock()

		if i > 0 {
			time.Sleep(stage.delay - stages[i-1].delay)
		}

		s.mu.Lock()
		s.tsunamiProgress = float64(i+1) / float64(len(stages))
		s.mu.Unlock()

		s.produceOceanAnomaly(i)
		log.Printf("🌊 Tsunami stage %d/5: %s", i+1, stage.description)
	}

	// Final tsunami scenario broadcast
	scenario := models.TsunamiScenario{
		Active:        true,
		DetectionTime: time.Now().Add(-16 * time.Second),
		SensorID:      "Banten-03",
		WaveAnomaly:   2.8,
		AffectedZones: []string{
			"Coastal Zone A — Anyer (Pop: 45,000)",
			"Coastal Zone B — Carita Beach (Pop: 12,000)",
			"Coastal Zone C — Labuan (Pop: 28,000)",
			"Coastal Zone D — Pandeglang Coast (Pop: 18,000)",
		},
		ResponseActions: []string{
			"⚠ Activate coastal warning sirens",
			"⚠ Review evacuation plans for zones A-D",
			"⚠ Notify maritime traffic in Sunda Strait",
			"⚠ Alert emergency response teams",
			"⚠ Monitor wave propagation sensors",
		},
		Severity:  "HIGH",
		Timestamp: time.Now(),
	}

	// Produce to Kafka
	_ = s.producer.Produce(config.TopicNames.TsunamiScenarios, "tsunami-scenario", scenario)

	// Broadcast to SSE
	s.hub.BroadcastAll("tsunami", scenario)
}

// broadcastMetrics periodically broadcasts current system metrics
func (s *Simulator) broadcastMetrics(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			status := s.GetStatus()
			s.hub.BroadcastAll("metrics", status)

			// Broadcast activity index
			s.mu.RLock()
			actIdx := models.ActivityIndex{
				OverallPercentage: s.currentActivity,
				TrendDirection:    s.trendDirection,
				Timestamp:         time.Now(),
			}
			s.mu.RUnlock()

			s.hub.BroadcastAll("activity_index", actIdx)
		}
	}
}

// Helper: add jitter to intervals
func jitter(base time.Duration, factor float64) time.Duration {
	return base + time.Duration(float64(base)*factor*(rand.Float64()-0.5))
}

// GetLifecyclePhase returns the current phase of the autonomous simulation
func (s *Simulator) GetLifecyclePhase() LifecyclePhase {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentPhase
}

// startAutonomousLifecycle runs a continuous, realistic 5-phase volcanic crisis lifecycle
func (s *Simulator) startAutonomousLifecycle(ctx context.Context) {
	phases := []struct {
		number   int
		name     string
		title    string
		duration int // seconds
		minAct   float64
		maxAct   float64
		energy   float64
		status   string
		trend    string
		desc     string
		evtType  string
	}{
		{
			number:   1,
			name:     "QUIESCENT_BASELINE",
			title:    "Phase 1: Quiescent Surveillance & Ambient Ingestion",
			duration: 35,
			minAct:   18.0,
			maxAct:   24.0,
			energy:   1.2,
			status:   "NORMAL",
			trend:    "STABLE",
			desc:     "Ambient baseline: Micro-seismic tremor 0.4–1.2 mm/s, Open-Meteo live atmospheric telemetry nominal",
			evtType:  "VOLCANIC",
		},
		{
			number:   2,
			name:     "MAGMA_INTRUSION_SWARM",
			title:    "Phase 2: Micro-seismic Swarm & Magmatic Pressurization",
			duration: 25,
			minAct:   42.0,
			maxAct:   58.0,
			energy:   5.8,
			status:   "ADVISORY",
			trend:    "RISING SWARM",
			desc:     "Hydrothermal pressurization detected: Shallow swarm at 3.5km depth, acoustic tremor surge +140%",
			evtType:  "SEISMIC",
		},
		{
			number:   3,
			name:     "FLANK_DEFORMATION",
			title:    "Phase 3: Flank Instability & Thermal Hotspot Surge",
			duration: 20,
			minAct:   72.0,
			maxAct:   85.0,
			energy:   14.5,
			status:   "WATCH",
			trend:    "RAPID INFLATION",
			desc:     "Radial tiltmeter measures +0.48cm ground displacement on SW rim; infrared thermal radiance heating +3.2°C",
			evtType:  "SATELLITE",
		},
		{
			number:   4,
			name:     "CRITICAL_SURGE_TSUNAMI",
			title:    "Phase 4: Flank Displacement & Tsunami Wavefront",
			duration: 25,
			minAct:   94.0,
			maxAct:   98.5,
			energy:   38.0,
			status:   "CRITICAL ALERT",
			trend:    "COLLAPSE DETECTED",
			desc:     "🚨 CRITICAL: Rapid submarine mass displacement! Sea level spike detected on Anyer & Ciwandan tide gauges!",
			evtType:  "OCEAN",
		},
		{
			number:   5,
			name:     "POST_SURGE_RECOVERY",
			title:    "Phase 5: Wave Dissipation & Post-Crisis Calibration",
			duration: 20,
			minAct:   35.0,
			maxAct:   20.0,
			energy:   2.8,
			status:   "RECOVERY",
			trend:    "ATTENUATING",
			desc:     "Wave energy attenuating along Sunda Strait coastline. Tremor amplitude decaying to nominal baseline.",
			evtType:  "VOLCANIC",
		},
	}

	for {
		for _, p := range phases {
			select {
			case <-ctx.Done():
				return
			default:
			}

			// Broadcast initial phase announcement event
			s.hub.BroadcastAll("event", map[string]interface{}{
				"type":        p.evtType,
				"description": fmt.Sprintf("🛰️ [AUTONOMOUS CYCLE] %s", p.desc),
				"severity":    p.status,
				"timestamp":   time.Now(),
			})

			// Handle Phase 4 tsunami scenario
			if p.number == 4 {
				scenario := models.TsunamiScenario{
					Active:        true,
					DetectionTime: time.Now(),
					SensorID:      "Marina-Jukung-Anyer",
					WaveAnomaly:   3.2,
					AffectedZones: []string{
						"Zone 1 — Anyer Coastal Strip (Wave: 3.2m, ETA: 22m)",
						"Zone 2 — Ciwandan Industrial Port (Wave: 2.6m, ETA: 28m)",
						"Zone 3 — Carita & Labuan Corridor (Wave: 2.9m, ETA: 35m)",
						"Zone 4 — South Lampung / Rajabasa (Wave: 2.4m, ETA: 31m)",
					},
					ResponseActions: []string{
						"Sound coastal sirens across Banten and South Lampung",
						"Enforce immediate vertical evacuation to >15m elevation",
						"Halt Merak-Bakauheni maritime ferry transit",
						"Deploy BASARNAS and BNPB emergency forward response units",
					},
					Severity:  "CRITICAL",
					Timestamp: time.Now(),
				}
				s.hub.BroadcastAll("tsunami", scenario)
				_ = s.producer.Produce(config.TopicNames.TsunamiScenarios, "tsunami-scenario", scenario)
			} else if p.number == 5 {
				// Reset tsunami
				s.hub.BroadcastAll("tsunami", models.TsunamiScenario{Active: false, Timestamp: time.Now()})
			}

			// Progress through duration second by second
			for sec := 0; sec < p.duration; sec++ {
				select {
				case <-ctx.Done():
					return
				default:
				}

				progressRatio := float64(sec) / float64(p.duration)
				activity := p.minAct + (p.maxAct-p.minAct)*progressRatio

				s.mu.Lock()
				s.currentActivity = activity
				s.trendDirection = p.trend
				phaseObj := LifecyclePhase{
					PhaseNumber:   p.number,
					PhaseName:     p.name,
					PhaseTitle:    p.title,
					ActivityLevel: activity,
					DurationSec:   p.duration,
					ElapsedSec:    sec + 1,
					SeismicEnergy: p.energy * (0.85 + 0.3*rand.Float64()),
					Status:        p.status,
					Timestamp:     time.Now(),
				}
				s.currentPhase = phaseObj
				s.mu.Unlock()

				s.hub.BroadcastAll("lifecycle_phase", phaseObj)

				// Automatically trigger AI Analysis in Phase 3 or 4
				if (p.number == 3 && sec == 5) || (p.number == 4 && sec == 3) {
					s.mu.RLock()
					triggerFn := s.onTriggerAnalysis
					s.mu.RUnlock()
					if triggerFn != nil {
						triggerFn(models.ActivityIndex{
							OverallPercentage: activity,
							TrendDirection:    p.trend,
							Timestamp:         time.Now(),
						})
					}
				}

				time.Sleep(1 * time.Second)
			}
		}
	}
}

