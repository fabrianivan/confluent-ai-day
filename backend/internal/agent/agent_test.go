package agent

import (
	"context"
	"testing"
	"time"

	"gempa-sentinel/internal/ai"
	"gempa-sentinel/internal/hub"
	"gempa-sentinel/internal/models"
)

func TestStreamingDataAgent(t *testing.T) {
	gemini, err := ai.NewGeminiAnalyzer("")
	if err != nil {
		t.Fatalf("Failed to create analyzer: %v", err)
	}

	pm := ai.NewProviderManager("gemini", map[string]ai.LLMProvider{"gemini": gemini})
	sse := hub.NewSSEHub()

	agent := NewStreamingDataAgent(pm, sse)
	state := agent.GetState()
	if state.Status != "MONITORING" {
		t.Errorf("Expected initial status MONITORING, got %s", state.Status)
	}

	// 1. Ingest Seismic Event
	agent.OnSeismicEvent(models.SeismicEvent{
		Magnitude: 8.2,
		FaultZone: "Megathrust Selat Sunda",
		Depth:     15.0,
		Timestamp: time.Now(),
	})

	// 2. Ingest Flink Intensity Index
	agent.OnActivityIndex(models.ActivityIndex{
		OverallPercentage: 88.0,
		MaxMagnitude:      8.2,
		TremorChange:      95.0,
		TrendDirection:    "MEGATHRUST RUPTURE DETECTED",
		Timestamp:         time.Now(),
	})

	// 3. Ingest Tsunami Wave Anomaly
	agent.OnTsunamiScenario(models.TsunamiScenario{
		Active:        true,
		WaveAnomaly:   6.5,
		SensorID:      "DART-BUOY-SUNDA-01",
		AffectedZones: []string{"Anyer", "Pandeglang", "Lampung Selatan"},
		Timestamp:     time.Now(),
	})

	state = agent.GetState()
	if state.CurrentRisk != "CRITICAL" {
		t.Errorf("Expected risk CRITICAL, got %s", state.CurrentRisk)
	}
	if len(state.RecentThoughts) == 0 {
		t.Errorf("Expected thoughts generated, got 0")
	}
	if len(state.RecentActions) == 0 {
		t.Errorf("Expected autonomous actions dispatched, got 0")
	}

	// 4. Test ChatStream
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var tokens []string
	_, err = agent.ChatStream(ctx, "Apa rekomendasi pengamanan jalur evakuasi?", func(token string) {
		tokens = append(tokens, token)
	})
	if err != nil {
		t.Fatalf("ChatStream failed: %v", err)
	}
	if len(tokens) == 0 {
		t.Errorf("Expected streamed tokens, got 0")
	}
}
