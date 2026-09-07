package models_test

import (
	"encoding/json"
	"testing"
	"time"

	"gempa-sentinel/internal/models"
)

func TestSeismicEventJSON(t *testing.T) {
	now := time.Now().UTC()
	event := models.SeismicEvent{
		Type:      "SEISMIC",
		Magnitude: 2.8,
		Depth:     5.2,
		Frequency: 4.5,
		Count:     14,
		Latitude:  -6.102,
		Longitude: 105.423,
		Timestamp: now,
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to marshal SeismicEvent: %v", err)
	}

	var decoded models.SeismicEvent
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal SeismicEvent: %v", err)
	}

	if decoded.Magnitude != 2.8 || decoded.Depth != 5.2 {
		t.Errorf("Unexpected values: got mag=%.1f, depth=%.1f", decoded.Magnitude, decoded.Depth)
	}
	if decoded.Type != "SEISMIC" {
		t.Errorf("Unexpected type: %s", decoded.Type)
	}
}

func TestActivityIndexJSON(t *testing.T) {
	now := time.Now().UTC()
	idx := models.ActivityIndex{
		OverallPercentage: 78.5,
		SeismicChange:     240.0,
		TremorChange:      180.0,
		DeformationTrend:  "RAPID_INFLATION",
		ThermalTrend:      "ANOMALOUS_HEATING",
		TrendDirection:    "INCREASING",
		EarthquakeCount:   18,
		AvgMagnitude:      2.4,
		MaxMagnitude:      3.1,
		Timestamp:         now,
	}

	data, err := json.Marshal(idx)
	if err != nil {
		t.Fatalf("Failed to marshal ActivityIndex: %v", err)
	}

	var decoded models.ActivityIndex
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal ActivityIndex: %v", err)
	}

	if decoded.OverallPercentage != 78.5 || decoded.TrendDirection != "INCREASING" {
		t.Errorf("Decoded mismatch: %+v", decoded)
	}
	if decoded.EarthquakeCount != 18 {
		t.Errorf("Expected 18 earthquakes, got %d", decoded.EarthquakeCount)
	}
}

func TestAIAnalysisJSON(t *testing.T) {
	now := time.Now().UTC()
	ai := models.AIAnalysis{
		Status:          "ELEVATED ACTIVITY",
		Observations:    []string{"Seismic activity up 240%", "Tremor up 180%"},
		Assessment:      "Consistent with magma migration at shallow depth.",
		Recommendations: []string{"Increase monitoring", "Review exclusion zone"},
		Confidence:      85.0,
		Disclaimer:      "Decision-support assessment, not an eruption prediction.",
		ContributingFactors: []models.ContributingFactor{
			{
				Indicator:    "Seismic Frequency",
				Value:        "14 events/hr",
				Change:       "+240%",
				Significance: 0.85,
			},
		},
		Timestamp: now,
	}

	data, err := json.Marshal(ai)
	if err != nil {
		t.Fatalf("Failed to marshal AIAnalysis: %v", err)
	}

	var decoded models.AIAnalysis
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal AIAnalysis: %v", err)
	}

	if decoded.Status != "ELEVATED ACTIVITY" || decoded.Confidence != 85.0 {
		t.Errorf("Decoded mismatch: %+v", decoded)
	}
	if len(decoded.ContributingFactors) != 1 {
		t.Errorf("Expected 1 factor, got %d", len(decoded.ContributingFactors))
	}
}
