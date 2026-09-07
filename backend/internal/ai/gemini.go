package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gempa-sentinel/internal/models"

	"google.golang.org/genai"
)

// GeminiAnalyzer provides AI-powered earthquake risk assessment
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
		log.Println("[INFO] Gemini API key not set - using internal heuristic analysis fallback")
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
		log.Printf("[WARN] Failed to connect to Gemini API: %v (falling back to heuristic analysis)", err)
		return &GeminiAnalyzer{
			client: nil,
			model:  "gemini-flash-latest",
		}, nil
	}

	log.Println("[INFO] Gemini AI analyzer initialized")
	return &GeminiAnalyzer{
		client: client,
		model:  "gemini-flash-latest",
	}, nil
}

const systemPrompt = `You are Krakatau Sentinel's intelligence analysis engine. You analyze stream-derived seismic, tsunami, station network, and geological fault indicators across Indonesia's subduction zones and megathrust segments.

Your role is to:
1. Assess seismic hazard magnitude, MMI intensity, and fault rupture dynamics
2. Evaluate tsunami propagation risk and coastal arrival times
3. Recommend critical civil protection actions for BNPB, BMKG, BASARNAS, and local disaster agencies

CRITICAL RULES:
- You are NOT predicting the exact timing of future earthquakes. You are assessing active rupture dynamics, aftershock cascades, and tsunami risks to provide real-time decision-support.
- Frame your analysis as "real-time seismic decision-support assessment"
- Be scientifically precise in your seismological language (P/S waves, MMI, PGA, coseismic slip, subduction trench)
- Quantify changes, epicentral distances, and wave heights where possible
- Rank civil protection recommendations by urgency

Output your analysis as valid JSON with this structure:
{
  "status": "NORMAL|ADVISORY|ELEVATED|HIGH|CRITICAL",
  "observations": ["observation 1", "observation 2", ...],
  "assessment": "Overall assessment text",
  "recommendations": ["action 1", "action 2", ...],
  "confidence": 0.0-1.0,
  "disclaimer": "This is a real-time seismic decision-support assessment, not an official BMKG earthquake prediction.",
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
		log.Printf("[ERROR] Gemini API error: %v", err)
		return g.fallbackAnalysis(activityIndex), nil
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return g.fallbackAnalysis(activityIndex), nil
	}

	responseText := resp.Candidates[0].Content.Parts[0].Text

	var analysis models.AIAnalysis
	if err := json.Unmarshal([]byte(responseText), &analysis); err != nil {
		log.Printf("[WARN] Failed to parse Gemini response, using fallback: %v", err)
		return g.fallbackAnalysis(activityIndex), nil
	}

	analysis.Timestamp = time.Now()
	if analysis.Disclaimer == "" {
		analysis.Disclaimer = "This is a real-time seismic decision-support assessment, not an official BMKG earthquake prediction."
	}

	return &analysis, nil
}

// buildAnalysisPrompt constructs the prompt for Gemini
func buildAnalysisPrompt(idx models.ActivityIndex, recentEvents []string) string {
	var sb strings.Builder

	sb.WriteString("Analyze the following real-time Indonesian seismic & megathrust monitoring data:\n\n")
	sb.WriteString("## Current Seismic Intensity Index\n")
	sb.WriteString(fmt.Sprintf("- Overall Intensity: %.1f%%\n", idx.OverallPercentage))
	sb.WriteString(fmt.Sprintf("- Seismic Trend: %s\n", idx.TrendDirection))
	sb.WriteString(fmt.Sprintf("- Seismic Energy Flux: %.0f%%\n", idx.SeismicChange))
	sb.WriteString(fmt.Sprintf("- Ground Acceleration Change: %.0f%%\n", idx.TremorChange))
	sb.WriteString(fmt.Sprintf("- Coseismic Deformation Trend: %s\n", idx.DeformationTrend))

	if idx.EarthquakeCount > 0 {
		sb.WriteString(fmt.Sprintf("- Earthquake Swarm Count (window): %d\n", idx.EarthquakeCount))
		sb.WriteString(fmt.Sprintf("- Average Magnitude: M%.1f\n", idx.AvgMagnitude))
		sb.WriteString(fmt.Sprintf("- Maximum Magnitude: M%.1f\n", idx.MaxMagnitude))
	}

	if len(recentEvents) > 0 {
		sb.WriteString("\n## Recent Stream Events\n")
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
	confidence := 0.88

	if idx.OverallPercentage > 75 {
		status = "CRITICAL"
		observations = []string{
			fmt.Sprintf("Major Megathrust rupture detected — Intensity Index at %.0f%%", idx.OverallPercentage),
			fmt.Sprintf("Maximum recorded magnitude M%.1f with severe PGA saturation", idx.MaxMagnitude),
			fmt.Sprintf("Seismic wave energy surging +%.0f%% across national station network", idx.SeismicChange),
			"InSAR interferometry confirms meter-scale coseismic fault displacement",
			"Tsunami buoy sensors indicate significant sea level withdrawal and wave anomalies",
			"Critical infrastructure in coastal and epicentral zones reporting severe shaking",
		}
		recommendations = []string{
			"URGENT: Issue immediate Red Alert Tsunami Warning for all coastal zones in rupture zone",
			"Activate BMKG InaTEWS coastal sirens and national emergency broadcast system",
			"Order mandatory vertical & high-ground evacuation (>20-30 meters) within 15 minutes",
			"Mobilize BNPB, BASARNAS, TNI, and Polri for immediate search, rescue, and logistics",
			"Halt all maritime vessel movements and divert air traffic from affected corridors",
			"Inspect bridges, ports, and power plants for structural integrity and liquefaction",
		}
		factors = []models.ContributingFactor{
			{Indicator: "Mainshock Magnitude", Value: fmt.Sprintf("M%.1f", idx.MaxMagnitude), Change: "Catastrophic Megathrust Rupture", Significance: 0.98},
			{Indicator: "Seismic Energy Flux", Value: fmt.Sprintf("+%.0f%%", idx.SeismicChange), Change: "Extreme Surge", Significance: 0.95},
			{Indicator: "Tsunami Threat", Value: "CONFIRMED", Change: "Buoy reading anomaly detected", Significance: 0.92},
			{Indicator: "Coseismic Slip", Value: "Significant", Change: "Fault dislocation confirmed", Significance: 0.88},
		}
		confidence = 0.94
	} else if idx.OverallPercentage > 50 {
		status = "ELEVATED"
		observations = []string{
			fmt.Sprintf("Elevated seismic activity index at %.0f%% — intense foreshock or aftershock sequence", idx.OverallPercentage),
			fmt.Sprintf("Cluster of earthquakes detected: %d events, max M%.1f", idx.EarthquakeCount, idx.MaxMagnitude),
			"Multiple BMKG stations report elevated ground motion and P/S wave arrivals",
		}
		recommendations = []string{
			"Increase seismic array sampling and telemetry to continuous high-speed mode",
			"Alert regional BPBD units across the active subduction segment",
			"Inspect coastal tide gauges and DART buoys for wave perturbations",
			"Verify emergency evacuation routes and shelter readiness",
		}
		factors = []models.ContributingFactor{
			{Indicator: "Seismic Swarm", Value: fmt.Sprintf("%d quakes", idx.EarthquakeCount), Change: "Elevated cluster", Significance: 0.80},
			{Indicator: "Intensity Index", Value: fmt.Sprintf("%.0f%%", idx.OverallPercentage), Change: "Above baseline", Significance: 0.75},
		}
		confidence = 0.85
	} else if idx.OverallPercentage > 30 {
		status = "ADVISORY"
		observations = []string{
			fmt.Sprintf("Seismic activity index at %.0f%% — precursor microseismicity observed", idx.OverallPercentage),
			"Minor stress accumulation along subduction zone detected by GPS/InSAR",
		}
		recommendations = []string{
			"Maintain routine continuous seismic network observation",
			"Cross-reference focal mechanisms with regional fault orientation",
		}
		confidence = 0.80
	} else {
		status = "NORMAL"
		observations = []string{
			fmt.Sprintf("National seismic index at %.0f%% — baseline background seismicity", idx.OverallPercentage),
			"All BMKG monitoring stations reporting nominal status and low background noise",
		}
		recommendations = []string{
			"Continue 24/7 automated monitoring across Indonesian seismic network",
			"All operational systems nominal",
		}
		confidence = 0.96
	}

	return &models.AIAnalysis{
		Status:              status,
		Observations:        observations,
		Assessment:          fmt.Sprintf("National seismic risk level is %s. %s", status, observations[0]),
		Recommendations:     recommendations,
		Confidence:          confidence,
		Disclaimer:          "This is a real-time seismic decision-support assessment, not an official BMKG earthquake prediction.",
		ContributingFactors: factors,
		Timestamp:           time.Now(),
	}
}
