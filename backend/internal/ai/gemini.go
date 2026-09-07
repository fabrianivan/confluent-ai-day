package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"krakatau-sentinel/internal/models"

	"google.golang.org/genai"
)

// GeminiAnalyzer provides AI-powered volcanic risk assessment
type GeminiAnalyzer struct {
	client *genai.Client
	model  string
}

// NewGeminiAnalyzer creates a new Gemini AI analyzer
func NewGeminiAnalyzer(apiKey string) (*GeminiAnalyzer, error) {
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}

	if apiKey == "" || apiKey == "your-gemini-api-key" || apiKey == "demo" {
		log.Println("ℹ️  Gemini API key not set — using internal heuristic analysis fallback")
		return &GeminiAnalyzer{
			client: nil,
			model:  "gemini-2.5-flash",
		}, nil
	}

	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		log.Printf("⚠️  Failed to connect to Gemini API: %v (falling back to heuristic analysis)", err)
		return &GeminiAnalyzer{
			client: nil,
			model:  "gemini-flash-latest",
		}, nil
	}

	log.Println("🤖 Gemini AI analyzer initialized")
	return &GeminiAnalyzer{
		client: client,
		model:  "gemini-flash-latest",
	}, nil
}

const systemPrompt = `You are Krakatau Sentinel's intelligence analysis engine. You analyze stream-derived volcanic monitoring indicators from Anak Krakatau volcano in the Sunda Strait, Indonesia.

Your role is to:
1. Assess what changed in the monitoring data
2. Evaluate how significant the changes are
3. Recommend response actions for emergency operators

CRITICAL RULES:
- You are NOT predicting eruptions. You are detecting anomalies and providing decision-support.
- Always frame your analysis as "decision-support assessment" not "eruption prediction"
- Be scientifically precise in your language
- Quantify changes where possible
- Rank recommendations by urgency

Output your analysis as valid JSON with this structure:
{
  "status": "NORMAL|ADVISORY|ELEVATED|HIGH|CRITICAL",
  "observations": ["observation 1", "observation 2", ...],
  "assessment": "Overall assessment text",
  "recommendations": ["action 1", "action 2", ...],
  "confidence": 0.0-1.0,
  "disclaimer": "This is a decision-support assessment, not an official eruption prediction.",
  "contributing_factors": [
    {"indicator": "name", "value": "current value", "change": "change description", "significance": 0.0-1.0}
  ]
}`

// Analyze generates an AI analysis based on current monitoring indicators
func (g *GeminiAnalyzer) Analyze(ctx context.Context, activityIndex models.ActivityIndex, recentEvents []string) (*models.AIAnalysis, error) {
	if g.client == nil {
		return g.fallbackAnalysis(activityIndex), nil
	}

	prompt := buildAnalysisPrompt(activityIndex, recentEvents)

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{
				{Text: systemPrompt},
			},
		},
		Temperature:      genai.Ptr(float32(0.3)),
		MaxOutputTokens:  2048,
		ResponseMIMEType: "application/json",
	}

	resp, err := g.client.Models.GenerateContent(
		ctx,
		g.model,
		genai.Text(prompt),
		config,
	)
	if err != nil {
		log.Printf("❌ Gemini API error: %v", err)
		return g.fallbackAnalysis(activityIndex), nil
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return g.fallbackAnalysis(activityIndex), nil
	}

	responseText := resp.Candidates[0].Content.Parts[0].Text

	var analysis models.AIAnalysis
	if err := json.Unmarshal([]byte(responseText), &analysis); err != nil {
		log.Printf("⚠️ Failed to parse Gemini response, using fallback: %v", err)
		return g.fallbackAnalysis(activityIndex), nil
	}

	analysis.Timestamp = time.Now()
	if analysis.Disclaimer == "" {
		analysis.Disclaimer = "This is a decision-support assessment, not an official eruption prediction."
	}

	return &analysis, nil
}

// buildAnalysisPrompt constructs the prompt for Gemini
func buildAnalysisPrompt(idx models.ActivityIndex, recentEvents []string) string {
	var sb strings.Builder

	sb.WriteString("Analyze the following real-time volcanic monitoring data for Anak Krakatau:\n\n")
	sb.WriteString("## Current Activity Index\n")
	sb.WriteString(fmt.Sprintf("- Overall Activity: %.1f%%\n", idx.OverallPercentage))
	sb.WriteString(fmt.Sprintf("- Trend: %s\n", idx.TrendDirection))
	sb.WriteString(fmt.Sprintf("- Seismic Change: %.0f%%\n", idx.SeismicChange))
	sb.WriteString(fmt.Sprintf("- Tremor Change: %.0f%%\n", idx.TremorChange))
	sb.WriteString(fmt.Sprintf("- Deformation Trend: %s\n", idx.DeformationTrend))
	sb.WriteString(fmt.Sprintf("- Thermal Trend: %s\n", idx.ThermalTrend))

	if idx.EarthquakeCount > 0 {
		sb.WriteString(fmt.Sprintf("- Earthquake Count (window): %d\n", idx.EarthquakeCount))
		sb.WriteString(fmt.Sprintf("- Average Magnitude: %.1f\n", idx.AvgMagnitude))
		sb.WriteString(fmt.Sprintf("- Maximum Magnitude: %.1f\n", idx.MaxMagnitude))
	}

	if len(recentEvents) > 0 {
		sb.WriteString("\n## Recent Events\n")
		for _, e := range recentEvents {
			sb.WriteString(fmt.Sprintf("- %s\n", e))
		}
	}

	sb.WriteString("\nProvide your analysis as JSON.")
	return sb.String()
}

// fallbackAnalysis generates a deterministic analysis when Gemini is unavailable
func (g *GeminiAnalyzer) fallbackAnalysis(idx models.ActivityIndex) *models.AIAnalysis {
	status := "NORMAL"
	var observations []string
	var recommendations []string
	var factors []models.ContributingFactor
	confidence := 0.85

	if idx.OverallPercentage > 75 {
		status = "CRITICAL"
		observations = []string{
			fmt.Sprintf("Volcanic activity index at %.0f%% — significantly above baseline", idx.OverallPercentage),
			fmt.Sprintf("Seismic activity increased %.0f%%", idx.SeismicChange),
			fmt.Sprintf("Tremor intensity increased %.0f%%", idx.TremorChange),
			"Multiple independent indicators are escalating simultaneously",
			"Thermal anomaly detected via satellite observation",
			"Ground deformation trend is increasing",
		}
		recommendations = []string{
			"URGENT: Increase monitoring frequency to maximum",
			"Review and potentially expand exclusion zone",
			"Notify Emergency Operations Center immediately",
			"Verify evacuation readiness for all coastal zones",
			"Alert maritime traffic in Sunda Strait",
			"Prepare emergency communication channels",
		}
		factors = []models.ContributingFactor{
			{Indicator: "Seismic Activity", Value: fmt.Sprintf("+%.0f%%", idx.SeismicChange), Change: "Rapidly increasing", Significance: 0.95},
			{Indicator: "Tremor Intensity", Value: fmt.Sprintf("+%.0f%%", idx.TremorChange), Change: "Rapidly increasing", Significance: 0.90},
			{Indicator: "Thermal Anomaly", Value: "Detected", Change: "New detection", Significance: 0.85},
			{Indicator: "Ground Deformation", Value: "Increasing", Change: "Accelerating trend", Significance: 0.80},
		}
		confidence = 0.91
	} else if idx.OverallPercentage > 50 {
		status = "ELEVATED"
		observations = []string{
			fmt.Sprintf("Volcanic activity index at %.0f%% — above normal baseline", idx.OverallPercentage),
			fmt.Sprintf("Seismic activity change: +%.0f%%", idx.SeismicChange),
			"Multiple indicators showing upward trend",
		}
		recommendations = []string{
			"Increase monitoring frequency",
			"Review exclusion zone boundaries",
			"Notify emergency operations center",
			"Check evacuation route readiness",
		}
		factors = []models.ContributingFactor{
			{Indicator: "Seismic Activity", Value: fmt.Sprintf("+%.0f%%", idx.SeismicChange), Change: "Increasing", Significance: 0.75},
			{Indicator: "Activity Index", Value: fmt.Sprintf("%.0f%%", idx.OverallPercentage), Change: "Above baseline", Significance: 0.70},
		}
		confidence = 0.82
	} else if idx.OverallPercentage > 30 {
		status = "ADVISORY"
		observations = []string{
			fmt.Sprintf("Volcanic activity index at %.0f%% — slightly elevated", idx.OverallPercentage),
			"Minor changes in seismic patterns observed",
		}
		recommendations = []string{
			"Continue standard monitoring schedule",
			"Review recent seismic data for patterns",
		}
		confidence = 0.75
	} else {
		status = "NORMAL"
		observations = []string{
			fmt.Sprintf("Volcanic activity index at %.0f%% — within normal parameters", idx.OverallPercentage),
			"All monitoring indicators within baseline ranges",
		}
		recommendations = []string{
			"Continue standard monitoring schedule",
			"No action required at this time",
		}
		confidence = 0.95
	}

	return &models.AIAnalysis{
		Status:              status,
		Observations:        observations,
		Assessment:          fmt.Sprintf("Current volcanic activity at Anak Krakatau is %s. %s", status, observations[0]),
		Recommendations:     recommendations,
		Confidence:          confidence,
		Disclaimer:          "This is a decision-support assessment, not an official eruption prediction.",
		ContributingFactors: factors,
		Timestamp:           time.Now(),
	}
}
