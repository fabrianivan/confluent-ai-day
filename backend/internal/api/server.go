package api

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"krakatau-sentinel/internal/ai"
	"krakatau-sentinel/internal/hub"
	"krakatau-sentinel/internal/models"

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
	log.Printf("🌐 API server starting on %s", addr)
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
			log.Printf("❌ AI analysis failed: %v", err)
			return
		}

		log.Printf("🤖 AI Analysis: %s (confidence: %.2f)", analysis.Status, analysis.Confidence)
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
	log.Println("🔥 API: Volcanic escalation triggered")
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
		"message": "Volcanic escalation scenario triggered",
	})
}

func (s *Server) handleTsunamiScenario(c *gin.Context) {
	log.Println("🌊 API: Tsunami scenario triggered")
	s.sim.TriggerTsunami()

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Tsunami scenario triggered",
	})
}

func (s *Server) handleReal2018Disaster(c *gin.Context) {
	log.Println("🚨 API: Real 2018 Krakatau disaster replay triggered")
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
		"message": "Historical 2018 Real Flank Collapse & Tsunami replay initiated",
	})
}

func (s *Server) handleReset(c *gin.Context) {
	log.Println("↺ API: System reset")
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
		{Topic: "volcano.seismic", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "Monitoring Team", Access: "Public"},
		{Topic: "volcano.activity", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "Monitoring Team", Access: "Public"},
		{Topic: "volcano.ocean", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "Ocean Sensors", Access: "Public"},
		{Topic: "volcano.weather", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "Weather Service", Access: "Public"},
		{Topic: "volcano.satellite", Classification: "Scientific", PII: "None", SchemaVersion: "v1", Owner: "Satellite Ops", Access: "Public"},
		{Topic: "volcano.maritime", Classification: "Operational", PII: "Potential", SchemaVersion: "v1", Owner: "Maritime Authority", Access: "Restricted"},
		{Topic: "volcano.population", Classification: "Sensitive", PII: "Yes", SchemaVersion: "v2", Owner: "Emergency Management", Access: "Restricted"},
		{Topic: "volcano.activity_index", Classification: "Derived", PII: "None", SchemaVersion: "v1", Owner: "Flink Pipeline", Access: "Internal"},
		{Topic: "volcano.correlated_alerts", Classification: "Derived", PII: "None", SchemaVersion: "v1", Owner: "Flink Pipeline", Access: "Internal"},
		{Topic: "volcano.tsunami_scenarios", Classification: "Derived", PII: "None", SchemaVersion: "v1", Owner: "Flink Pipeline", Access: "Internal"},
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
