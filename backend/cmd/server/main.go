package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"gempa-sentinel/internal/ai"
	"gempa-sentinel/internal/api"
	"gempa-sentinel/internal/config"
	"gempa-sentinel/internal/hub"
	"gempa-sentinel/internal/kafka"
	"gempa-sentinel/internal/models"
	"gempa-sentinel/internal/simulator"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("[INFO] KRAKATAU SENTINEL - Real-Time Disaster Intelligence & Early Warning")
	log.Println("------------------------------------------------------------")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[FATAL] Configuration error: %v", err)
	}
	log.Println("[INFO] Configuration loaded")

	// Initialize Kafka producer
	producer, err := kafka.NewProducer(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Failed to create Kafka producer: %v", err)
	}
	defer producer.Close()

	// Create topics
	if err := producer.CreateTopics(); err != nil {
		log.Printf("[WARN] Topic creation warning: %v", err)
	}

	// Initialize SSE Hub
	sseHub := hub.NewSSEHub()

	// Initialize Gemini AI
	analyzer, err := ai.NewGeminiAnalyzer(cfg.GeminiAPIKey)
	if err != nil {
		log.Fatalf("[FATAL] Failed to create Gemini analyzer: %v", err)
	}

	// Initialize Simulator
	sim := simulator.NewSimulator(producer, sseHub)

	// Initialize API Server
	server := api.NewServer(sseHub, sim, analyzer, cfg.ServerPort, cfg.CORSOrigin)

	// Initialize Kafka consumer for Flink output topics
	consumer, err := kafka.NewConsumer(cfg, kafka.ConsumerCallbacks{
		OnActivity: func(idx models.ActivityIndex) {
			sseHub.BroadcastAll("activity_index", idx)
			// Trigger AI analysis on significant changes
			if idx.OverallPercentage > 40 {
				server.TriggerAIAnalysis(idx)
			}
		},
		OnAlert: func(alert models.CorrelatedAlert) {
			sseHub.BroadcastAll("correlated_alert", alert)
		},
		OnTsunami: func(ts models.TsunamiScenario) {
			sseHub.BroadcastAll("tsunami", ts)
		},
	})
	if err != nil {
		log.Printf("[WARN] Kafka consumer warning (Flink output topics may not exist yet): %v", err)
	}

	// Create a context that cancels on interrupt
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Wire AI analysis trigger from autonomous simulator to server analyzer
	sim.SetAnalysisTrigger(server.TriggerAIAnalysis)

	// Start the simulator
	sim.Start(ctx)

	// Start the Kafka consumer (if available)
	if consumer != nil {
		go consumer.Start(ctx)
		defer consumer.Close()
	}

	// Handle graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("\n[INFO] Shutting down Krakatau Sentinel...")
		cancel()
		os.Exit(0)
	}()

	// Start the API server (blocking)
	log.Printf("[INFO] Krakatau Sentinel ready - API on :%s", cfg.ServerPort)
	if err := server.Start(); err != nil {
		log.Fatalf("[FATAL] Server error: %v", err)
	}
}
