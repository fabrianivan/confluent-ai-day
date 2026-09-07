package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	// Confluent Cloud Kafka
	BootstrapServers string
	KafkaAPIKey      string
	KafkaAPISecret   string

	// Schema Registry
	SchemaRegistryURL    string
	SchemaRegistryKey    string
	SchemaRegistrySecret string

	// Gemini AI
	GeminiAPIKey string

	// Server
	ServerPort string
	CORSOrigin string

	// Standalone Demo Mode
	DemoMode bool
}

// TopicNames defines all Kafka topic names
var TopicNames = struct {
	Seismic          string
	Activity         string
	Ocean            string
	Weather          string
	Satellite        string
	Maritime         string
	Population       string
	ActivityIndex    string
	CorrelatedAlerts string
	TsunamiScenarios string
}{
	Seismic:          "volcano.seismic",
	Activity:         "volcano.activity",
	Ocean:            "volcano.ocean",
	Weather:          "volcano.weather",
	Satellite:        "volcano.satellite",
	Maritime:         "volcano.maritime",
	Population:       "volcano.population",
	ActivityIndex:    "volcano.activity_index",
	CorrelatedAlerts: "volcano.correlated_alerts",
	TsunamiScenarios: "volcano.tsunami_scenarios",
}

// AllSourceTopics returns all source topic names
func AllSourceTopics() []string {
	return []string{
		TopicNames.Seismic,
		TopicNames.Activity,
		TopicNames.Ocean,
		TopicNames.Weather,
		TopicNames.Satellite,
		TopicNames.Maritime,
		TopicNames.Population,
	}
}

// AllOutputTopics returns all Flink output topic names
func AllOutputTopics() []string {
	return []string{
		TopicNames.ActivityIndex,
		TopicNames.CorrelatedAlerts,
		TopicNames.TsunamiScenarios,
	}
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Try to load .env file (ignore error if not found)
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := &Config{
		BootstrapServers:     os.Getenv("CONFLUENT_BOOTSTRAP_SERVERS"),
		KafkaAPIKey:          os.Getenv("CONFLUENT_API_KEY"),
		KafkaAPISecret:       os.Getenv("CONFLUENT_API_SECRET"),
		SchemaRegistryURL:    os.Getenv("CONFLUENT_SCHEMA_REGISTRY_URL"),
		SchemaRegistryKey:    os.Getenv("CONFLUENT_SR_API_KEY"),
		SchemaRegistrySecret: os.Getenv("CONFLUENT_SR_API_SECRET"),
		GeminiAPIKey:         os.Getenv("GEMINI_API_KEY"),
		ServerPort:           os.Getenv("SERVER_PORT"),
		CORSOrigin:           os.Getenv("CORS_ORIGIN"),
		DemoMode:             os.Getenv("DEMO_MODE") == "true" || os.Getenv("DEMO_MODE") == "1",
	}

	if cfg.ServerPort == "" {
		cfg.ServerPort = "8080"
	}
	if cfg.CORSOrigin == "" {
		cfg.CORSOrigin = "http://localhost:3000"
	}

	// In Demo Mode, external Confluent / Gemini credentials are optional
	if cfg.DemoMode {
		return cfg, nil
	}

	// Validate required fields for production / Confluent Cloud mode
	if cfg.BootstrapServers == "" {
		return nil, fmt.Errorf("CONFLUENT_BOOTSTRAP_SERVERS is required (or set DEMO_MODE=true to run in standalone demo mode)")
	}
	if cfg.KafkaAPIKey == "" {
		return nil, fmt.Errorf("CONFLUENT_API_KEY is required")
	}
	if cfg.KafkaAPISecret == "" {
		return nil, fmt.Errorf("CONFLUENT_API_SECRET is required")
	}
	if cfg.GeminiAPIKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is required")
	}

	return cfg, nil
}
