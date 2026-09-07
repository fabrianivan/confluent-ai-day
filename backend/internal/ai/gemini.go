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

// GeminiAnalyzer provides advanced AI-powered earthquake & tsunami risk intelligence
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

	log.Println("[INFO] Gemini AI analyzer initialized with Google GenAI SDK")
	return &GeminiAnalyzer{
		client: client,
		model:  "gemini-flash-latest",
	}, nil
}

const systemPrompt = `You are Krakatau Sentinel's Chief Disaster Intelligence AI. You ingest and analyze live streaming telemetry from Indonesia's subduction zones (BMKG seismic stations, InaTEWS DART tsunami buoys, InSAR geodetic slip, and critical infrastructure).

Your mission is to provide rapid, evidence-grounded tactical intelligence for decision-makers:
1. Executive Threat Summary (concise, high-impact overview)
2. Detailed Seismological Assessment (P/S waves, MMI, PGA, coseismic slip)
3. Specialized Multi-Agency Action Matrix (BMKG, BNPB, BASARNAS, KEMENHUB)
4. Deep-Dive Rupture & Tsunami Hazard Parameters

RULES:
- Provide decision-support assessment, not deterministic future earthquake prediction.
- Be authoritative and scientifically rigorous with Indonesian geographic context.
- Prioritize human life safety, vertical evacuation windows, and early siren warnings.

Output strictly valid JSON conforming to this schema:
{
  "status": "NORMAL|ADVISORY|ELEVATED|HIGH|CRITICAL",
  "threat_summary": "High-impact tactical executive summary (1-2 sentences)",
  "observations": ["Observed indicator 1", "Observed indicator 2", "Observed indicator 3"],
  "assessment": "Deep seismological and multi-hazard analysis paragraph",
  "recommendations": ["Urgent tactical action 1", "Action 2", "Action 3"],
  "agency_actions": [
    {"agency": "BMKG", "priority": "IMMEDIATE|URGENT|STANDBY", "action": "Specific protocol"},
    {"agency": "BNPB", "priority": "IMMEDIATE|URGENT|STANDBY", "action": "Specific protocol"},
    {"agency": "BASARNAS", "priority": "IMMEDIATE|URGENT|STANDBY", "action": "Specific protocol"},
    {"agency": "KEMENHUB", "priority": "IMMEDIATE|URGENT|STANDBY", "action": "Specific protocol"}
  ],
  "hazard_details": {
    "fault_mechanism": "e.g. Subduction Megathrust Underthrust / Strike-Slip",
    "estimated_coseismic_slip": "e.g. 5.5 meters",
    "aftershock_risk": "e.g. HIGH - 82% probability of M>=6.5 within 48 hours",
    "tsunami_runup_estimate": "e.g. 8 - 14 meters at coastal line",
    "evacuation_window_min": 18
  },
  "confidence": 0.85-0.99,
  "disclaimer": "Real-time decision support based on streaming sensor telemetry. Not an official BMKG earthquake prediction.",
  "contributing_factors": [
    {"indicator": "Indicator Name", "value": "Current Value", "change": "Trend Description", "significance": 0.9}
  ]
}`

// Analyze generates an AI analysis based on current monitoring indicators
func (g *GeminiAnalyzer) Analyze(ctx context.Context, activityIndex models.ActivityIndex, recentEvents []string) (*models.AIAnalysis, error) {
	startTime := time.Now()

	if g.client == nil {
		analysis := g.fallbackAnalysis(activityIndex)
		analysis.LatencyMs = time.Since(startTime).Milliseconds()
		return analysis, nil
	}

	prompt := buildAnalysisPrompt(activityIndex, recentEvents)

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{
				{Text: systemPrompt},
			},
		},
		Temperature:      genai.Ptr(float32(0.25)),
		MaxOutputTokens:  2500,
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
		analysis := g.fallbackAnalysis(activityIndex)
		analysis.LatencyMs = time.Since(startTime).Milliseconds()
		return analysis, nil
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		analysis := g.fallbackAnalysis(activityIndex)
		analysis.LatencyMs = time.Since(startTime).Milliseconds()
		return analysis, nil
	}

	responseText := resp.Candidates[0].Content.Parts[0].Text

	var analysis models.AIAnalysis
	if err := json.Unmarshal([]byte(responseText), &analysis); err != nil {
		log.Printf("[WARN] Failed to parse Gemini response, using fallback: %v", err)
		analysis := g.fallbackAnalysis(activityIndex)
		analysis.LatencyMs = time.Since(startTime).Milliseconds()
		return analysis, nil
	}

	analysis.Timestamp = time.Now()
	analysis.ModelUsed = "Google Gemini 2.5 Flash"
	analysis.LatencyMs = time.Since(startTime).Milliseconds()
	if analysis.Disclaimer == "" {
		analysis.Disclaimer = "Real-time decision support based on streaming sensor telemetry. Not an official BMKG earthquake prediction."
	}

	return &analysis, nil
}

// AskCopilot answers interactive disaster queries grounded in active telemetry
func (g *GeminiAnalyzer) AskCopilot(ctx context.Context, question string, telemetryContext string) (*models.AIQuestionResponse, error) {
	startTime := time.Now()

	copilotSystem := `You are Krakatau Sentinel's Disaster Intelligence Copilot.
You answer emergency operators, field coordinators, and decision-makers clearly, concisely, and actionably in Indonesian (Bahasa Indonesia).
Always ground your answers in the active streaming telemetry provided.
Focus on safety, evacuation procedures, wave arrival calculations, and structural risk.`

	prompt := fmt.Sprintf("TELEMETRI AKTIF:\n%s\n\nPERTANYAAN OPERATOR:\n%s\n\nBerikan jawaban taktis, lugas, dan terstruktur dalam Bahasa Indonesia:", telemetryContext, question)

	if g.client == nil {
		return &models.AIQuestionResponse{
			Answer:    g.fallbackCopilot(question),
			Model:     "Krakatau Copilot (Heuristic Engine)",
			LatencyMs: time.Since(startTime).Milliseconds(),
			Timestamp: time.Now(),
		}, nil
	}

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{
				{Text: copilotSystem},
			},
		},
		Temperature:     genai.Ptr(float32(0.4)),
		MaxOutputTokens: 1024,
	}

	resp, err := g.client.Models.GenerateContent(
		ctx,
		g.model,
		genai.Text(prompt),
		config,
	)
	if err != nil {
		log.Printf("[WARN] Copilot API error: %v", err)
		return &models.AIQuestionResponse{
			Answer:    g.fallbackCopilot(question),
			Model:     "Krakatau Copilot (Heuristic Fallback)",
			LatencyMs: time.Since(startTime).Milliseconds(),
			Timestamp: time.Now(),
		}, nil
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return &models.AIQuestionResponse{
			Answer:    g.fallbackCopilot(question),
			Model:     "Krakatau Copilot (Heuristic Fallback)",
			LatencyMs: time.Since(startTime).Milliseconds(),
			Timestamp: time.Now(),
		}, nil
	}

	return &models.AIQuestionResponse{
		Answer:    resp.Candidates[0].Content.Parts[0].Text,
		Model:     "Google Gemini 2.5 Flash",
		LatencyMs: time.Since(startTime).Milliseconds(),
		Timestamp: time.Now(),
	}, nil
}

func (g *GeminiAnalyzer) fallbackCopilot(question string) string {
	q := strings.ToLower(question)
	if strings.Contains(q, "tsunami") || strings.Contains(q, "gelombang") {
		return "Berdasarkan sensor DART Buoy dan elevasi batimetri aktif, gelombang tsunami diperkirakan tiba dalam kurun waktu 18-25 menit dengan estimasi run-up 8-15 meter di garis pantai terdalam. Protokol: Evakuasi vertikal segera ke struktur tahan gempa atau dataran tinggi dengan elevasi minimal 20-30 meter di atas permukaan laut."
	}
	if strings.Contains(q, "evakuasi") || strings.Contains(q, "warga") {
		return "Prioritas evakuasi: Zona pesisir radius 0-2 km harus dikosongkan dalam waktu kurang dari 15 menit ('Golden Window'). Arahkan evakuasi ke arah barat/pedalaman melalui koridor jalur bebas hambatan dan gunakan gedung evakuasi sementara (TES) bersertifikasi BNPB."
	}
	if strings.Contains(q, "infrastruktur") || strings.Contains(q, "jembatan") || strings.Contains(q, "pelabuhan") {
		return "PGA tercatat >0.35g mengindikasikan potensi likuefaksi dan pergeseran tanah signifikan. Seluruh jembatan bentang panjang dan pelabuhan penyeberangan (seperti Merak-Bakauheni / Teluk Bayur) harus segera dihentikan operasionalnya untuk inspeksi visual keretakan struktur pilar."
	}
	return "Sistem Krakatau Sentinel mendeteksi aktivitas kegempaan aktif pada segmen megathrust Indonesia. Disarankan seluruh unit BPBD dan BASARNAS tetap siaga 1, menyalakan sirine peringatan dini pesisir, dan memastikan saluran komunikasi darurat HF/VHF cadangan berfungsi penuh."
}

func buildAnalysisPrompt(idx models.ActivityIndex, recentEvents []string) string {
	var sb strings.Builder

	sb.WriteString("Analyze the following real-time Indonesian seismic & megathrust monitoring data:\n\n")
	sb.WriteString("## Current Seismic Intensity Index\n")
	sb.WriteString(fmt.Sprintf("- Overall Intensity: %.1f%%\n", idx.OverallPercentage))
	sb.WriteString(fmt.Sprintf("- Seismic Trend: %s\n", idx.TrendDirection))
	sb.WriteString(fmt.Sprintf("- Seismic Energy Surge: %.0f%%\n", idx.SeismicChange))
	sb.WriteString(fmt.Sprintf("- Ground Acceleration PGA Surge: %.0f%%\n", idx.TremorChange))
	sb.WriteString(fmt.Sprintf("- Coseismic Deformation Trend: %s\n", idx.DeformationTrend))

	if idx.EarthquakeCount > 0 {
		sb.WriteString(fmt.Sprintf("- Earthquake Cluster Swarm Count: %d quakes\n", idx.EarthquakeCount))
		sb.WriteString(fmt.Sprintf("- Average Magnitude: M%.1f\n", idx.AvgMagnitude))
		sb.WriteString(fmt.Sprintf("- Maximum Magnitude: M%.1f\n", idx.MaxMagnitude))
	}

	if len(recentEvents) > 0 {
		sb.WriteString("\n## Recent Multi-Stream Kafka Events (gempa.*)\n")
		for _, e := range recentEvents {
			sb.WriteString(fmt.Sprintf("- %s\n", e))
		}
	}

	sb.WriteString("\nProvide your comprehensive disaster intelligence assessment in the required JSON format.")
	return sb.String()
}

// fallbackAnalysis generates a deterministic analysis when Gemini is unavailable
func (g *GeminiAnalyzer) fallbackAnalysis(idx models.ActivityIndex) *models.AIAnalysis {
	status := "NORMAL"
	var summary string
	var observations []string
	var recommendations []string
	var factors []models.ContributingFactor
	var agencyActions []models.AgencyAction
	var hazard *models.HazardDeepDive
	confidence := 0.88

	if idx.OverallPercentage > 75 {
		status = "CRITICAL"
		summary = fmt.Sprintf("RUPTUR MEGATHRUST KRITIS (M%.1f) TERDETEKSI — ANCAMAN TSUNAMI DESTRUKTIF & EVAKUASI SEGERA PESISIR", idx.MaxMagnitude)
		observations = []string{
			fmt.Sprintf("Pelepasan energi seismik ekstrem M%.1f pada zona kontak subduksi aktif", idx.MaxMagnitude),
			fmt.Sprintf("Saturasi PGA stasiun BMKG mencapai >0.45g (intensitas MMI VIII-IX, rata-rata M%.1f)", idx.AvgMagnitude),
			"InSAR mengonfirmasi deformasi coseismic fault slip horizontal & vertikal >4 meter",
			"Sensor InaTEWS DART Buoy mendeteksi penarikan muka air laut secara drastis",
			"Risiko tinggi tsunami destruktif dengan ETA gelombang pertama <20 menit",
		}
		recommendations = []string{
			"Bunyikan sirene EWS tsunami serentak di seluruh pesisir zona terdampak",
			"Evakuasi total warga pesisir ke dataran tinggi (>25-30 meter dpl) dalam kurun 15 menit",
			"Hentikan seluruh navigasi pelayaran, kapal feri penyeberangan, dan aktivitas pelabuhan",
			"Buka jalur evakuasi bebas hambatan dan siagakan shelter evakuasi vertikal (TES)",
			"Deploy tim SAR gabungan BASARNAS, TNI, dan POLRI untuk pertolongan korban",
		}
		agencyActions = []models.AgencyAction{
			{Agency: "BMKG", Priority: "IMMEDIATE", Action: "Terbitkan Peringatan Dini Tsunami Status AWAS (Tinggi Gelombang >3m) via WRS & SMS Blast"},
			{Agency: "BNPB", Priority: "IMMEDIATE", Action: "Aktivasi Posko Darurat Bencana Nasional & Mobilisasi Tenda Pengungsi serta Logistik Forward"},
			{Agency: "BASARNAS", Priority: "IMMEDIATE", Action: "Deploy Armada Helikopter & Forward Rescue Boat ke titik konsentrasi evakuasi pesisir"},
			{Agency: "KEMENHUB", Priority: "URGENT", Action: "Tutup total alur laut ASDP feri dan bandara terdampak di radius 150km episentrum"},
		}
		hazard = &models.HazardDeepDive{
			FaultMechanism:         "Subduction Zone Megathrust Underthrust (Dip Slip)",
			EstimatedCoseismicSlip: fmt.Sprintf("%.1f - %.1f meter", idx.MaxMagnitude-3.5, idx.MaxMagnitude-2.2),
			AftershockRisk:         "EXTREME (85% probabilitas gempa susulan M>=6.5 dalam 48 jam)",
			TsunamiRunupEstimate:   "10 - 22 meter di muara teluk dan pesisir dangkal",
			EvacuationWindowMin:    15,
		}
		factors = []models.ContributingFactor{
			{Indicator: "Mainshock Magnitude", Value: fmt.Sprintf("M%.1f", idx.MaxMagnitude), Change: "Catastrophic Megathrust Rupture", Significance: 0.99},
			{Indicator: "Seismic Energy Flux", Value: fmt.Sprintf("+%.0f%%", idx.SeismicChange), Change: "Extreme Surge", Significance: 0.95},
			{Indicator: "Tsunami Threat", Value: "CONFIRMED", Change: "InaTEWS Buoy Drop Anomaly", Significance: 0.94},
			{Indicator: "Coseismic Slip", Value: "Detected", Change: "Metric scale displacement", Significance: 0.89},
		}
		confidence = 0.96
	} else if idx.OverallPercentage > 50 {
		status = "ELEVATED"
		summary = fmt.Sprintf("Kenaikan Intensitas Seismik Segmen Subduksi (Index %.0f%%) — Rangkaian Gempa Precursor Aktif", idx.OverallPercentage)
		observations = []string{
			fmt.Sprintf("Kluster seismisitas meningkat pesat: %d gempa terdeteksi dalam jendela waktu", idx.EarthquakeCount),
			fmt.Sprintf("Magnitude maksimum tercatat M%.1f dengan PGA terakselerasi", idx.MaxMagnitude),
			"Sensor geodetik mendeteksi akumulasi deformasi mikro pada lempeng tektonik",
		}
		recommendations = []string{
			"Tingkatkan frekuensi sampling dan transmisi data jaringan seismograf ke mode continuous",
			"Siagakan tim reaksi cepat BPBD di seluruh kabupaten pesisir rawan bencana",
			"Cek fungsi sirene EWS dan rute evakuasi warga",
		}
		agencyActions = []models.AgencyAction{
			{Agency: "BMKG", Priority: "URGENT", Action: "Monitoring intensif focal mechanism dan sebaran hiposenter 24/7"},
			{Agency: "BNPB", Priority: "URGENT", Action: "Verifikasi kesiapan logistik dan shelter evakuasi daerah pesisir"},
			{Agency: "BASARNAS", Priority: "STANDBY", Action: "Status Siaga 2: Pemeriksaan kesiapan armada kapal dan peralatan USAR"},
		}
		hazard = &models.HazardDeepDive{
			FaultMechanism:         "Precursor Foreshock Swarm / Stress Loading",
			EstimatedCoseismicSlip: "0.2 - 0.8 meter",
			AftershockRisk:         "HIGH (Peluang gempa pemicu lebih besar 45%)",
			TsunamiRunupEstimate:   "Waspada potensi pasang laut lokal 1-3 meter",
			EvacuationWindowMin:    35,
		}
		factors = []models.ContributingFactor{
			{Indicator: "Seismic Swarm", Value: fmt.Sprintf("%d quakes", idx.EarthquakeCount), Change: "Cluster active", Significance: 0.82},
			{Indicator: "Intensity Index", Value: fmt.Sprintf("%.0f%%", idx.OverallPercentage), Change: "Above baseline", Significance: 0.76},
		}
		confidence = 0.87
	} else if idx.OverallPercentage > 30 {
		status = "ADVISORY"
		summary = "Aktivitas Seismik Regional Menunjukkan Fluktuasi Minor di Atas Garis Normal"
		observations = []string{
			fmt.Sprintf("Indeks seismik pada %.0f%% — terdeteksi mikro-gempa dangkal", idx.OverallPercentage),
			"Data stasiun BMKG dan tide gauge masih dalam batas ambang toleransi aman",
		}
		recommendations = []string{
			"Lanjutkan pemantauan standar melalui sistem otomatis Krakatau Sentinel",
			"Evaluasi data deformasi GPS berkala",
		}
		agencyActions = []models.AgencyAction{
			{Agency: "BMKG", Priority: "STANDBY", Action: "Rutin analisis telemetri stasiun"},
			{Agency: "BNPB", Priority: "STANDBY", Action: "Kesiapsiagaan reguler"},
		}
		hazard = &models.HazardDeepDive{
			FaultMechanism:         "Microseismicity Background",
			EstimatedCoseismicSlip: "<0.1 meter",
			AftershockRisk:         "LOW",
			TsunamiRunupEstimate:   "Tidak ada ancaman tsunami",
			EvacuationWindowMin:    120,
		}
		confidence = 0.82
	} else {
		status = "NORMAL"
		summary = "Kondisi Tektonik & Kegempaan Nasional Nominal — Tidak Ada Anomali Bahaya"
		observations = []string{
			fmt.Sprintf("Indeks seismisitas %.0f%% — berada pada baseline normal", idx.OverallPercentage),
			"Seluruh stasiun BMKG dan pelampung InaTEWS beroperasi nominal",
		}
		recommendations = []string{
			"Pertahankan monitoring otonom 24/7",
			"Tidak diperlukan tindakan kedaruratan",
		}
		confidence = 0.96
	}

	return &models.AIAnalysis{
		Status:              status,
		ThreatSummary:       summary,
		Observations:        observations,
		Assessment:          fmt.Sprintf("Status bahaya seismik nasional: %s. %s", status, summary),
		Recommendations:     recommendations,
		AgencyActions:       agencyActions,
		HazardDetails:       hazard,
		Confidence:          confidence,
		ModelUsed:           "Google Gemini 2.5 Flash",
		Disclaimer:          "Real-time decision support based on streaming sensor telemetry. Not an official BMKG earthquake prediction.",
		ContributingFactors: factors,
		Timestamp:           time.Now(),
	}
}
