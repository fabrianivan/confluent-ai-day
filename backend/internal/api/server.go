package api

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"gempa-sentinel/internal/ai"
	"gempa-sentinel/internal/hub"
	"gempa-sentinel/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Server is the main API server
type Server struct {
	router      *gin.Engine
	hub         *hub.SSEHub
	sim         Simulator
	analyzer    *ai.GeminiAnalyzer
	port        string
	corsOrigin  string

	// State tracking for AI analysis triggers
	lastAITrigger    time.Time
	aiTriggerMu      sync.Mutex
	recentEvents     []string
	recentEventsMu   sync.Mutex
}

// Simulator defines the interface for the event simulator
type Simulator interface {
	TriggerVolcanicEscalation()
	TriggerTsunami()
	TriggerReal2018Disaster()
	Reset()
	GetStatus() models.SystemStatus
}

// NewServer creates a new API server
func NewServer(h *hub.SSEHub, sim Simulator, analyzer *ai.GeminiAnalyzer, port, corsOrigin string) *Server {
	gin.SetMode(gin.ReleaseMode)

	s := &Server{
		hub:        h,
		sim:        sim,
		analyzer:   analyzer,
		port:       port,
		corsOrigin: corsOrigin,
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{corsOrigin, "http://localhost:3000", "http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Cache-Control"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// SSE streaming endpoints
	r.GET("/api/events/stream", s.handleEventStream)
	r.GET("/api/metrics/stream", s.handleMetricsStream)
	r.GET("/api/alerts/stream", s.handleAlertsStream)
	r.GET("/api/stream", s.handleAllStream)

	// REST endpoints
	r.POST("/api/ai/ask", s.handleAIAsk)
	r.POST("/api/simulate/volcanic-escalation", s.handleVolcanicEscalation)
	r.POST("/api/simulate/tsunami", s.handleTsunamiScenario)
	r.POST("/api/simulate/real-2018", s.handleReal2018Disaster)
	r.POST("/api/simulate/reset", s.handleReset)
	r.GET("/api/status", s.handleStatus)
	r.GET("/api/governance", s.handleGovernance)
	r.GET("/api/health", s.handleHealth)

	s.router = r
	return s
}

// Start begins listening for HTTP connections
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%s", s.port)
	log.Printf("[INFO] API server starting on %s", addr)
	return s.router.Run(addr)
}

// TrackEvent adds an event description to the recent events list (for AI context)
func (s *Server) TrackEvent(desc string) {
	s.recentEventsMu.Lock()
	defer s.recentEventsMu.Unlock()

	s.recentEvents = append(s.recentEvents, desc)
	if len(s.recentEvents) > 20 {
		s.recentEvents = s.recentEvents[len(s.recentEvents)-20:]
	}
}

// TriggerAIAnalysis runs AI analysis if enough time has passed since last trigger
func (s *Server) TriggerAIAnalysis(activityIndex models.ActivityIndex) {
	s.aiTriggerMu.Lock()
	if time.Since(s.lastAITrigger) < 5*time.Second {
		s.aiTriggerMu.Unlock()
		return
	}
	s.lastAITrigger = time.Now()
	s.aiTriggerMu.Unlock()

	go func() {
		s.recentEventsMu.Lock()
		events := make([]string, len(s.recentEvents))
		copy(events, s.recentEvents)
		s.recentEventsMu.Unlock()

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		analysis, err := s.analyzer.Analyze(ctx, activityIndex, events)
		if err != nil {
			log.Printf("[ERROR] AI analysis failed: %v", err)
			return
		}

		log.Printf("[INFO] AI Analysis: %s (confidence: %.2f)", analysis.Status, analysis.Confidence)
		s.hub.BroadcastAll("ai_analysis", analysis)
	}()
}

// --- SSE Handlers ---

func (s *Server) handleAllStream(c *gin.Context) {
	s.streamSSE(c, "all")
}

func (s *Server) handleEventStream(c *gin.Context) {
	s.streamSSE(c, "event")
}

func (s *Server) handleMetricsStream(c *gin.Context) {
	s.streamSSE(c, "metrics")
}

func (s *Server) handleAlertsStream(c *gin.Context) {
	s.streamSSE(c, "ai_analysis")
}

func (s *Server) streamSSE(c *gin.Context, eventType string) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	ch := s.hub.Subscribe(eventType)
	defer s.hub.Unsubscribe(eventType, ch)

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-ch:
			if !ok {
				return false
			}
			c.Writer.WriteString(msg)
			c.Writer.Flush()
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}

// --- REST Handlers ---

func (s *Server) handleVolcanicEscalation(c *gin.Context) {
	log.Println("[INFO] API: Escalation triggered")
	s.sim.TriggerVolcanicEscalation()

	// Trigger AI analysis at key escalation points
	go func() {
		thresholds := []struct {
			delay    time.Duration
			activity float64
		}{
			{8 * time.Second, 48},
			{16 * time.Second, 65},
			{24 * time.Second, 82},
		}

		for _, t := range thresholds {
			time.Sleep(t.delay)
			idx := models.ActivityIndex{
				OverallPercentage: t.activity,
				SeismicChange:     t.activity * 2.9,
				TremorChange:      t.activity * 2.2,
				DeformationTrend:  "INCREASING",
				ThermalTrend:      "INCREASING",
				TrendDirection:    "RAPIDLY INCREASING",
				EarthquakeCount:   int(t.activity / 8),
				AvgMagnitude:      1.5 + (t.activity / 100) * 2.0,
				MaxMagnitude:      2.5 + (t.activity / 100) * 1.5,
				Timestamp:         time.Now(),
			}
			s.TriggerAIAnalysis(idx)
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Escalation scenario triggered",
	})
}

func (s *Server) handleTsunamiScenario(c *gin.Context) {
	log.Println("[INFO] API: Tsunami scenario triggered")
	s.sim.TriggerTsunami()

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Tsunami scenario triggered",
	})
}

func (s *Server) handleReal2018Disaster(c *gin.Context) {
	log.Println("[INFO] API: Real disaster replay triggered")
	s.sim.TriggerReal2018Disaster()

	go func() {
		time.Sleep(10 * time.Second)
		idx := models.ActivityIndex{
			OverallPercentage: 96.0,
			SeismicChange:     350.0,
			TremorChange:      280.0,
			DeformationTrend:  "CATASTROPHIC_FLANK_COLLAPSE",
			ThermalTrend:      "EXTREME_HEATING",
			TrendDirection:    "COLLAPSE_DETECTED",
			EarthquakeCount:   38,
			AvgMagnitude:      3.3,
			MaxMagnitude:      4.2,
			Timestamp:         time.Now(),
		}
		s.TriggerAIAnalysis(idx)
	}()

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Historical Real Flank Collapse & Tsunami replay initiated",
	})
}

func (s *Server) handleReset(c *gin.Context) {
	log.Println("[INFO] API: System reset")
	s.sim.Reset()

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "System reset to normal baseline",
	})
}

func (s *Server) handleStatus(c *gin.Context) {
	status := s.sim.GetStatus()
	c.JSON(http.StatusOK, status)
}

func (s *Server) handleGovernance(c *gin.Context) {
	governance := []models.GovernanceInfo{
		{Topic: "gempa.seismic", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "BMKG Seismology", Access: "Public"},
		{Topic: "gempa.stations", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "BMKG Network Ops", Access: "Public"},
		{Topic: "gempa.tsunami", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "InaTEWS Ocean Sensors", Access: "Public"},
		{Topic: "gempa.weather", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "BMKG Meteorology", Access: "Public"},
		{Topic: "gempa.satellite", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "BRIN / InSAR Ops", Access: "Public"},
		{Topic: "gempa.infrastructure", Classification: "Operational", PII: "Potential", SchemaVersion: "v1", Owner: "PUPR & BNPB", Access: "Restricted"},
		{Topic: "gempa.population", Classification: "Sensitive", PII: "Yes", SchemaVersion: "v2", Owner: "BNPB Disaster Relief", Access: "Restricted"},
		{Topic: "gempa.intensity_index", Classification: "Derived", PII: "None", SchemaVersion: "v1", Owner: "Flink Pipeline", Access: "Internal"},
		{Topic: "gempa.correlated_alerts", Classification: "Derived", PII: "None", SchemaVersion: "v1", Owner: "Flink Pipeline", Access: "Internal"},
		{Topic: "gempa.tsunami_scenarios", Classification: "Derived", PII: "None", SchemaVersion: "v1", Owner: "Flink Pipeline", Access: "Internal"},
	}
	c.JSON(http.StatusOK, governance)
}

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":      "healthy",
		"service":     "krakatau-sentinel",
		"sse_clients": s.hub.ClientCount(),
		"timestamp":   time.Now(),
	})
}

func (s *Server) handleAIAsk(c *gin.Context) {
	var req models.AIQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "question is required"})
		return
	}

	status := s.sim.GetStatus()
	s.recentEventsMu.Lock()
	eventsContext := strings.Join(s.recentEvents, "\n")
	s.recentEventsMu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	telemetry := fmt.Sprintf("Seismic Intensity: %.1f%% | Risk Level: %s | Ocean/Tsunami Status: %s | Trend: %s\nRecent Stream Events:\n%s",
		status.SeismicIntensity, status.RiskLevel, status.OceanStatus, status.TrendDirection, eventsContext)

	resp, err := s.analyzer.AskCopilot(ctx, req.Question, telemetry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
