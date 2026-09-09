package ai

import (
	"context"
	"strings"
	"testing"
	"time"

	"gempa-sentinel/internal/config"
	"gempa-sentinel/internal/models"
)

func TestProviderManager(t *testing.T) {
	gemini, err := NewGeminiAnalyzer("")
	if err != nil {
		t.Fatalf("Failed to create GeminiAnalyzer: %v", err)
	}

	bedrock, err := NewBedrockProvider(&config.Config{
		AWSRegion:         "us-east-1",
		AWSBedrockModelID: "anthropic.claude-3-5-sonnet-20240620-v1:0",
	})
	if err != nil {
		t.Fatalf("Failed to create BedrockProvider: %v", err)
	}

	providers := map[string]LLMProvider{
		"gemini":  gemini,
		"bedrock": bedrock,
	}

	pm := NewProviderManager("gemini", providers)
	if pm.ActiveName() != "gemini" {
		t.Errorf("Expected active provider gemini, got %s", pm.ActiveName())
	}

	// Test switching to Bedrock
	if err := pm.SetActive("bedrock"); err != nil {
		t.Fatalf("Failed to set active provider to bedrock: %v", err)
	}
	if pm.ActiveName() != "bedrock" {
		t.Errorf("Expected active provider bedrock, got %s", pm.ActiveName())
	}

	// Test Analyze with Bedrock provider
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	idx := models.ActivityIndex{
		OverallPercentage: 82.5,
		MaxMagnitude:      8.2,
		TremorChange:      95.0,
		TrendDirection:    "MEGATHRUST RUPTURE DETECTED",
	}

	analysis, err := pm.Analyze(ctx, idx, []string{"Seismic M8.2 detected in Sunda Strait"})
	if err != nil {
		t.Fatalf("Analyze failed: %v", err)
	}
	if analysis.Status != "CRITICAL" {
		t.Errorf("Expected CRITICAL status for M8.2, got %s", analysis.Status)
	}
	if !strings.Contains(analysis.ModelUsed, "Bedrock") {
		t.Errorf("Expected Bedrock model in ModelUsed, got %s", analysis.ModelUsed)
	}

	// Test StreamCopilot
	var streamedTokens []string
	_, err = pm.StreamCopilot(ctx, "Apa instruksi evakuasi tsunami?", "Status: CRITICAL", func(token string) {
		streamedTokens = append(streamedTokens, token)
	})
	if err != nil {
		t.Fatalf("StreamCopilot failed: %v", err)
	}
	if len(streamedTokens) == 0 {
		t.Errorf("Expected streamed tokens, got 0")
	}

	// Switch back to Gemini and test
	if err := pm.SetActive("gemini"); err != nil {
		t.Fatalf("Failed to switch back to gemini: %v", err)
	}
	if pm.ActiveName() != "gemini" {
		t.Errorf("Expected active provider gemini, got %s", pm.ActiveName())
	}

	resp, err := pm.AskCopilot(ctx, "Berapa tinggi tsunami?", "Status: CRITICAL")
	if err != nil {
		t.Fatalf("AskCopilot failed: %v", err)
	}
	if resp.Answer == "" {
		t.Errorf("Expected non-empty copilot answer")
	}
}
