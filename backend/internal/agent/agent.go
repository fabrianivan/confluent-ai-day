package agent

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"gempa-sentinel/internal/ai"
	"gempa-sentinel/internal/hub"
	"gempa-sentinel/internal/models"
)

// AgentAction represents an autonomous decision executed by the streaming data agent
type AgentAction struct {
	ID         string    `json:"id"`
	Type       string    `json:"type"`        // "TSUNAMI_WARNING_SIREN", "CORRIDOR_EVACUATION", "INFRASTRUCTURE_HALT", "EMERGENCY_BROADCAST"
	Agency     string    `json:"agency"`      // "BMKG", "BNPB", "BASARNAS", "KEMENHUB"
	TargetZone string    `json:"target_zone"` // e.g. "Selat Sunda / Banten"
	Priority   string    `json:"priority"`    // "CRITICAL", "HIGH", "ELEVATED"
	Rationale  string    `json:"rationale"`
	Timestamp  time.Time `json:"timestamp"`
}

// AgentThought represents a reasoning step emitted by the streaming data agent
type AgentThought struct {
	CycleID   int64     `json:"cycle_id"`
	Phase     string    `json:"phase"`    // "OBSERVE", "ORIENT", "DECIDE", "ACT"
	Message   string    `json:"message"`
	Severity  string    `json:"severity"` // "NORMAL", "HIGH", "CRITICAL"
	Timestamp time.Time `json:"timestamp"`
}

// AgentState represents the complete snapshot of the streaming agent's working memory
type AgentState struct {
	Status          string                `json:"status"` // "MONITORING", "REASONING", "ACTION_DISPATCHED"
	ActiveProvider  string                `json:"active_provider"`
	ActiveModel     string                `json:"active_model"`
	TotalCycles     int64                 `json:"total_cycles"`
	LastEvaluatedAt time.Time             `json:"last_evaluated_at"`
	CurrentRisk     string                `json:"current_risk"`
	LatestIntensity *models.ActivityIndex `json:"latest_intensity,omitempty"`
	RecentThoughts  []AgentThought        `json:"recent_thoughts"`
	RecentActions   []AgentAction         `json:"recent_actions"`
}

// StreamingDataAgent continuously analyzes real-time streaming data from Kafka & Flink,
// maintaining memory, executing autonomous reasoning cycles, and dispatching tactical actions.
type StreamingDataAgent struct {
	pm  *ai.ProviderManager
	sse *hub.SSEHub

	mu              sync.RWMutex
	status          string
	totalCycles     int64
	lastEvaluatedAt time.Time
	currentRisk     string

	// Working memory
	latestSeismic   *models.SeismicEvent
	latestActivity  *models.ActivityIndex
	latestAlert     *models.CorrelatedAlert
	latestTsunami   *models.TsunamiScenario
	recentThoughts  []AgentThought
	recentActions   []AgentAction
	evaluatedKeys   map[string]bool

	stopCh chan struct{}
}

// NewStreamingDataAgent creates a new autonomous streaming data agent
func NewStreamingDataAgent(pm *ai.ProviderManager, sse *hub.SSEHub) *StreamingDataAgent {
	return &StreamingDataAgent{
		pm:             pm,
		sse:            sse,
		status:         "MONITORING",
		currentRisk:    "NORMAL",
		recentThoughts: make([]AgentThought, 0),
		recentActions:  make([]AgentAction, 0),
		evaluatedKeys:  make(map[string]bool),
		stopCh:         make(chan struct{}),
	}
}

// Start begins background autonomous reasoning heartbeat
func (a *StreamingDataAgent) Start(ctx context.Context) {
	log.Println("[INFO] Starting Autonomous Streaming Data Agent loop...")

	ticker := time.NewTicker(4 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("[INFO] Streaming Data Agent stopped")
				return
			case <-a.stopCh:
				return
			case <-ticker.C:
				a.heartbeat(ctx)
			}
		}
	}()
}

// Stop shuts down the agent
func (a *StreamingDataAgent) Stop() {
	close(a.stopCh)
}

// Ingestion Handlers
func (a *StreamingDataAgent) OnSeismicEvent(evt models.SeismicEvent) {
	a.mu.Lock()
	a.latestSeismic = &evt
	a.mu.Unlock()

	if evt.Magnitude >= 6.0 {
		a.triggerCycle(context.Background(), fmt.Sprintf("Strong seismic event detected: M%.1f at %s (depth: %.1f km)", evt.Magnitude, evt.FaultZone, evt.Depth))
	}
}

func (a *StreamingDataAgent) OnActivityIndex(idx models.ActivityIndex) {
	a.mu.Lock()
	a.latestActivity = &idx
	if idx.OverallPercentage > 75 || idx.MaxMagnitude >= 7.5 {
		a.currentRisk = "CRITICAL"
	} else if idx.OverallPercentage > 45 || idx.MaxMagnitude >= 6.5 {
		a.currentRisk = "HIGH"
	} else if idx.OverallPercentage > 25 {
		a.currentRisk = "ELEVATED"
	} else {
		a.currentRisk = "NORMAL"
	}
	a.mu.Unlock()

	if idx.OverallPercentage >= 40 {
		a.triggerCycle(context.Background(), fmt.Sprintf("Flink intensity index surge: %.1f%% (%s)", idx.OverallPercentage, idx.TrendDirection))
	}
}

func (a *StreamingDataAgent) OnCorrelatedAlert(alert models.CorrelatedAlert) {
	a.mu.Lock()
	a.latestAlert = &alert
	a.mu.Unlock()

	a.triggerCycle(context.Background(), fmt.Sprintf("Multi-stream correlated alert: %s (%v)", alert.AlertLevel, alert.CorrelatedIndicators))
}

func (a *StreamingDataAgent) OnTsunamiScenario(ts models.TsunamiScenario) {
	a.mu.Lock()
	a.latestTsunami = &ts
	a.currentRisk = "CRITICAL"
	a.mu.Unlock()

	a.triggerCycle(context.Background(), fmt.Sprintf("Tsunami wave anomaly detected: %.1fm wave at %s", ts.WaveAnomaly, ts.SensorID))
}

// heartbeat runs periodic health checks and background reasoning
func (a *StreamingDataAgent) heartbeat(ctx context.Context) {
	a.mu.RLock()
	risk := a.currentRisk
	a.mu.RUnlock()

	if risk == "CRITICAL" || risk == "HIGH" {
		a.triggerCycle(ctx, fmt.Sprintf("Escalated %s risk level active in working memory", risk))
	}
}

// triggerCycle runs an OODA (Observe-Orient-Decide-Act) agentic cycle
func (a *StreamingDataAgent) triggerCycle(ctx context.Context, triggerReason string) {
	a.mu.Lock()
	a.totalCycles++
	cycleID := a.totalCycles
	a.lastEvaluatedAt = time.Now()
	a.status = "REASONING"
	a.mu.Unlock()

	// 1. OBSERVE
	obs := fmt.Sprintf("[OBSERVE] %s", triggerReason)
	a.recordThought(cycleID, "OBSERVE", obs, a.currentRisk)

	// 2. ORIENT
	a.mu.RLock()
	var orientMsg string
	var actionsToTake []AgentAction
	now := time.Now()

	if a.latestTsunami != nil && a.latestTsunami.Active && a.latestTsunami.WaveAnomaly > 3.0 {
		orientMsg = fmt.Sprintf("[ORIENT] Tsunami wave anomaly %.1fm confirmed on sensor %s. Target zones: %v. Golden evacuation window < 20 min.",
			a.latestTsunami.WaveAnomaly, a.latestTsunami.SensorID, a.latestTsunami.AffectedZones)

		actionKey := fmt.Sprintf("tsunami-%s-%d", a.latestTsunami.SensorID, now.Minute())
		if !a.evaluatedKeys[actionKey] {
			a.evaluatedKeys[actionKey] = true
			actionsToTake = append(actionsToTake,
				AgentAction{
					ID:         fmt.Sprintf("act-%d-1", now.UnixNano()),
					Type:       "TSUNAMI_WARNING_SIREN",
					Agency:     "BMKG",
					TargetZone: fmt.Sprintf("%v", a.latestTsunami.AffectedZones),
					Priority:   "CRITICAL",
					Rationale:  fmt.Sprintf("Run-up anomaly %.1fm exceeds threshold. Immediate vertical evacuation required.", a.latestTsunami.WaveAnomaly),
					Timestamp:  now,
				},
				AgentAction{
					ID:         fmt.Sprintf("act-%d-2", now.UnixNano()),
					Type:       "CORRIDOR_EVACUATION",
					Agency:     "BNPB",
					TargetZone: "Coastal buffer zone (0-2 km inland)",
					Priority:   "CRITICAL",
					Rationale:  "Initiate mass siren alert and open high-ground shelter corridors.",
					Timestamp:  now,
				},
			)
		}
	} else if a.latestActivity != nil && a.latestActivity.MaxMagnitude >= 7.0 {
		orientMsg = fmt.Sprintf("[ORIENT] High magnitude event M%.1f detected with tremor surge %.0f%%. Evaluating regional bridge and hospital integrity.",
			a.latestActivity.MaxMagnitude, a.latestActivity.TremorChange)

		actionKey := fmt.Sprintf("quake-m%.0f-%d", a.latestActivity.MaxMagnitude, now.Minute())
		if !a.evaluatedKeys[actionKey] {
			a.evaluatedKeys[actionKey] = true
			actionsToTake = append(actionsToTake,
				AgentAction{
					ID:         fmt.Sprintf("act-%d-3", now.UnixNano()),
					Type:       "INFRASTRUCTURE_HALT",
					Agency:     "KEMENHUB",
					TargetZone: "Regional straits, suspension bridges, and seaport terminals",
					Priority:   "HIGH",
					Rationale:  "PGA acceleration indicates severe liquefaction and pillar strain.",
					Timestamp:  now,
				},
				AgentAction{
					ID:         fmt.Sprintf("act-%d-4", now.UnixNano()),
					Type:       "SEARCH_AND_RESCUE_DEPLOY",
					Agency:     "BASARNAS",
					TargetZone: "Subduction corridor epicenter radius 50km",
					Priority:   "HIGH",
					Rationale:  "Pre-position Urban Search & Rescue rapid response assets.",
					Timestamp:  now,
				},
			)
		}
	} else {
		orientMsg = "[ORIENT] Seismic parameters within safe baseline. Continuing continuous streaming watch across 7 BMKG topics."
	}
	a.mu.RUnlock()

	a.recordThought(cycleID, "ORIENT", orientMsg, a.currentRisk)

	// 3. DECIDE & ACT
	if len(actionsToTake) > 0 {
		decideMsg := fmt.Sprintf("[DECIDE] Multi-agency protocol triggered: %d emergency response directives approved for dispatch.", len(actionsToTake))
		a.recordThought(cycleID, "DECIDE", decideMsg, "CRITICAL")

		for _, action := range actionsToTake {
			actMsg := fmt.Sprintf("[ACT] Dispatched to %s: [%s] for %s (%s)", action.Agency, action.Type, action.TargetZone, action.Priority)
			a.recordThought(cycleID, "ACT", actMsg, action.Priority)
			a.recordAction(action)
		}

		a.mu.Lock()
		a.status = "ACTION_DISPATCHED"
		a.mu.Unlock()
	} else {
		a.mu.Lock()
		a.status = "MONITORING"
		a.mu.Unlock()
	}
}

func (a *StreamingDataAgent) recordThought(cycleID int64, phase, message, severity string) {
	thought := AgentThought{
		CycleID:   cycleID,
		Phase:     phase,
		Message:   message,
		Severity:  severity,
		Timestamp: time.Now(),
	}

	a.mu.Lock()
	a.recentThoughts = append(a.recentThoughts, thought)
	if len(a.recentThoughts) > 40 {
		a.recentThoughts = a.recentThoughts[len(a.recentThoughts)-40:]
	}
	a.mu.Unlock()

	// Broadcast thought to SSE listeners
	if a.sse != nil {
		a.sse.BroadcastAll("agent_thought", thought)
	}
}

func (a *StreamingDataAgent) recordAction(action AgentAction) {
	a.mu.Lock()
	a.recentActions = append(a.recentActions, action)
	if len(a.recentActions) > 20 {
		a.recentActions = a.recentActions[len(a.recentActions)-20:]
	}
	a.mu.Unlock()

	// Broadcast action to SSE listeners
	if a.sse != nil {
		a.sse.BroadcastAll("agent_action", action)
	}
}

// GetState returns current agent state snapshot
func (a *StreamingDataAgent) GetState() AgentState {
	a.mu.RLock()
	defer a.mu.RUnlock()

	thoughts := make([]AgentThought, len(a.recentThoughts))
	copy(thoughts, a.recentThoughts)

	actions := make([]AgentAction, len(a.recentActions))
	copy(actions, a.recentActions)

	activeProvider := "unknown"
	activeModel := "unknown"
	if a.pm != nil {
		activeProvider = a.pm.ActiveName()
		if p := a.pm.GetActive(); p != nil {
			activeModel = p.ModelName()
		}
	}

	return AgentState{
		Status:          a.status,
		ActiveProvider:  activeProvider,
		ActiveModel:     activeModel,
		TotalCycles:     a.totalCycles,
		LastEvaluatedAt: a.lastEvaluatedAt,
		CurrentRisk:     a.currentRisk,
		LatestIntensity: a.latestActivity,
		RecentThoughts:  thoughts,
		RecentActions:   actions,
	}
}

// ChatStream handles interactive conversational queries with the Streaming Data Agent,
// injecting active working memory context and streaming tokens in real time.
func (a *StreamingDataAgent) ChatStream(ctx context.Context, question string, onToken func(string)) (*models.AIQuestionResponse, error) {
	a.mu.RLock()
	telemetryContext := fmt.Sprintf("Status Agen: %s | Risiko: %s | Siklus Evaluasi: #%d\n", a.status, a.currentRisk, a.totalCycles)
	if a.latestActivity != nil {
		telemetryContext += fmt.Sprintf("Indeks Intensitas: %.1f%% | Trend: %s | Mag Max: M%.1f | Quake Swarm: %d\n",
			a.latestActivity.OverallPercentage, a.latestActivity.TrendDirection, a.latestActivity.MaxMagnitude, a.latestActivity.EarthquakeCount)
	}
	if a.latestTsunami != nil && a.latestTsunami.Active {
		telemetryContext += fmt.Sprintf("Sensor Tsunami: %s | Tinggi Anomali Gelombang: %.1fm | Zona: %v\n",
			a.latestTsunami.SensorID, a.latestTsunami.WaveAnomaly, a.latestTsunami.AffectedZones)
	}
	if len(a.recentActions) > 0 {
		latestAction := a.recentActions[len(a.recentActions)-1]
		telemetryContext += fmt.Sprintf("Aksi Terakhir Diterbitkan: [%s] untuk %s oleh %s (%s)\n",
			latestAction.Type, latestAction.TargetZone, latestAction.Agency, latestAction.Priority)
	}
	a.mu.RUnlock()

	return a.pm.StreamCopilot(ctx, question, telemetryContext, onToken)
}
