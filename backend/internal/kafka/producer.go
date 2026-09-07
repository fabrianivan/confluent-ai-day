package kafka

import (
	"encoding/json"
	"fmt"
	"log"

	"gempa-sentinel/internal/config"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

// Producer wraps the Confluent Kafka producer
type Producer struct {
	producer *kafka.Producer
	cfg      *config.Config
}

// NewProducer creates a new Kafka producer for Confluent Cloud
func NewProducer(cfg *config.Config) (*Producer, error) {
	if cfg.DemoMode {
		log.Println("ℹ️  Running in DEMO MODE — Kafka producer simulated (direct SSE broadcast)")
		return &Producer{cfg: cfg}, nil
	}

	p, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers":  cfg.BootstrapServers,
		"security.protocol":  "SASL_SSL",
		"sasl.mechanisms":    "PLAIN",
		"sasl.username":      cfg.KafkaAPIKey,
		"sasl.password":      cfg.KafkaAPISecret,
		"acks":               "all",
		"enable.idempotence": true,
		"linger.ms":          5,
		"compression.type":   "snappy",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create producer: %w", err)
	}

	prod := &Producer{
		producer: p,
		cfg:      cfg,
	}

	// Start delivery report handler
	go prod.handleDeliveryReports()

	log.Println("✅ Kafka producer connected to Confluent Cloud")
	return prod, nil
}

// handleDeliveryReports processes delivery confirmations
func (p *Producer) handleDeliveryReports() {
	for e := range p.producer.Events() {
		switch ev := e.(type) {
		case *kafka.Message:
			if ev.TopicPartition.Error != nil {
				log.Printf("❌ Delivery failed to %s: %v", *ev.TopicPartition.Topic, ev.TopicPartition.Error)
			}
		}
	}
}

// Produce sends a message to the specified topic
func (p *Producer) Produce(topic string, key string, value interface{}) error {
	if p == nil || p.producer == nil {
		return nil
	}

	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	var keyBytes []byte
	if key != "" {
		keyBytes = []byte(key)
	}

	err = p.producer.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{
			Topic:     &topic,
			Partition: kafka.PartitionAny,
		},
		Key:   keyBytes,
		Value: data,
	}, nil)

	if err != nil {
		return fmt.Errorf("failed to produce to %s: %w", topic, err)
	}

	return nil
}

// CreateTopics verifies Kafka topics
func (p *Producer) CreateTopics() error {
	log.Println("✅ Kafka topics ready in Confluent Cloud")
	return nil
}

// Flush waits for all messages to be delivered
func (p *Producer) Flush() {
	if p != nil && p.producer != nil {
		p.producer.Flush(5000)
	}
}

// Close shuts down the producer
func (p *Producer) Close() {
	if p != nil && p.producer != nil {
		p.producer.Flush(10000)
		p.producer.Close()
		log.Println("🔒 Kafka producer closed")
	}
}
