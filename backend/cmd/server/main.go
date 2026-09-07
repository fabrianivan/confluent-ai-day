package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"krakatau-sentinel/internal/ai"
	"krakatau-sentinel/internal/api"
	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/hub"
	"krakatau-sentinel/internal/kafka"
	"krakatau-sentinel/internal/models"
	"krakatau-sentinel/internal/simulator"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("🌋 KRAKATAU SENTINEL — Real-Time Volcanic Intelligence")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ Configuration error: %v", err)
	}
	log.Println("✅ Configuration loaded")

	// Initialize Kafka producer
	producer, err := kafka.NewProducer(cfg)
	if err != nil {
		log.Fatalf("❌ Failed to create Kafka producer: %v", err)
	}
	defer producer.Close()

	// Create topics
	if err := producer.CreateTopics(); err != nil {
		log.Printf("⚠️  Topic creation warning: %v", err)
	}

	// Initialize SSE Hub
	sseHub := hub.NewSSEHub()

	// Initialize Gemini AI
	analyzer, err := ai.NewGeminiAnalyzer(cfg.GeminiAPIKey)
	if err != nil {
		log.Fatalf("❌ Failed to create Gemini analyzer: %v", err)
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
		log.Printf("⚠️  Kafka consumer warning (Flink output topics may not exist yet): %v", err)
	}

	// Create a context that cancels on interrupt
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

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
		log.Println("\n🛑 Shutting down Krakatau Sentinel...")
		cancel()
		os.Exit(0)
	}()

	// Start the API server (blocking)
	log.Printf("🚀 Krakatau Sentinel ready — API on :%s", cfg.ServerPort)
	if err := server.Start(); err != nil {
		log.Fatalf("❌ Server error: %v", err)
	}
}
