package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gempa-sentinel/internal/config"
	"gempa-sentinel/internal/models"

	ckafka "github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

// Consumer wraps the Confluent Kafka consumer for Flink output topics
type Consumer struct {
	consumer    *ckafka.Consumer
	cfg         *config.Config
	onActivity  func(models.ActivityIndex)
	onAlert     func(models.CorrelatedAlert)
	onTsunami   func(models.TsunamiScenario)
}

// ConsumerCallbacks holds callback functions for consumed messages
type ConsumerCallbacks struct {
	OnActivity func(models.ActivityIndex)
	OnAlert    func(models.CorrelatedAlert)
	OnTsunami  func(models.TsunamiScenario)
}

// NewConsumer creates a new Kafka consumer for Flink output topics
func NewConsumer(cfg *config.Config, callbacks ConsumerCallbacks) (*Consumer, error) {
	if cfg.DemoMode {
		return nil, nil
	}

	c, err := ckafka.NewConsumer(&ckafka.ConfigMap{
		"bootstrap.servers":  cfg.BootstrapServers,
		"security.protocol":  "SASL_SSL",
		"sasl.mechanisms":    "PLAIN",
		"sasl.username":      cfg.KafkaAPIKey,
		"sasl.password":      cfg.KafkaAPISecret,
		"group.id":           "gempa-sentinel-dashboard",
		"auto.offset.reset":  "latest",
		"enable.auto.commit": true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}

	topics := config.AllOutputTopics()
	err = c.SubscribeTopics(topics, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to topics: %w", err)
	}

	log.Printf("[INFO] Kafka consumer subscribed to: %v", topics)

	return &Consumer{
		consumer:   c,
		cfg:        cfg,
		onActivity: callbacks.OnActivity,
		onAlert:    callbacks.OnAlert,
		onTsunami:  callbacks.OnTsunami,
	}, nil
}

// Start begins consuming messages in a loop
func (c *Consumer) Start(ctx context.Context) {
	log.Println("[INFO] Starting Kafka consumer loop...")

	for {
		select {
		case <-ctx.Done():
			log.Println("[INFO] Consumer context cancelled")
			return
		default:
			msg, err := c.consumer.ReadMessage(time.Second)
			if err != nil {
				// Timeout is expected, just continue
				if err.(ckafka.Error).IsTimeout() {
					continue
				}
				log.Printf("[ERROR] Consumer error: %v", err)
				continue
			}

			c.processMessage(msg)
		}
	}
}

// processMessage routes consumed messages to the appropriate callback
func (c *Consumer) processMessage(msg *ckafka.Message) {
	topic := *msg.TopicPartition.Topic

	switch topic {
	case config.TopicNames.ActivityIndex:
		var idx models.ActivityIndex
		if err := json.Unmarshal(msg.Value, &idx); err != nil {
			log.Printf("[ERROR] Failed to unmarshal activity index: %v", err)
			return
		}
		if c.onActivity != nil {
			c.onActivity(idx)
		}

	case config.TopicNames.CorrelatedAlerts:
		var alert models.CorrelatedAlert
		if err := json.Unmarshal(msg.Value, &alert); err != nil {
			log.Printf("[ERROR] Failed to unmarshal correlated alert: %v", err)
			return
		}
		if c.onAlert != nil {
			c.onAlert(alert)
		}

	case config.TopicNames.TsunamiScenarios:
		var ts models.TsunamiScenario
		if err := json.Unmarshal(msg.Value, &ts); err != nil {
			log.Printf("[ERROR] Failed to unmarshal tsunami scenario: %v", err)
			return
		}
		if c.onTsunami != nil {
			c.onTsunami(ts)
		}
	}
}

// Close shuts down the consumer
func (c *Consumer) Close() {
	c.consumer.Close()
	log.Println("[INFO] Kafka consumer closed")
}
