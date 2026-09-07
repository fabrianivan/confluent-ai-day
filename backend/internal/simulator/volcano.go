package simulator

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/models"
)

// generateVolcanicEvents produces baseline volcanic monitoring events
func (s *Simulator) generateVolcanicEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			s.mu.RLock()
			mode := s.mode
			s.mu.RUnlock()

			var event models.VolcanicEvent

			switch mode {
			case ModeNormal:
				event = s.normalVolcanicEvent()
				time.Sleep(jitter(12*time.Second, 0.5))
			case ModeVolcanicEscalation:
				event = s.escalatedVolcanicEvent()
				time.Sleep(jitter(3*time.Second, 0.3))
			default:
				event = s.normalVolcanicEvent()
				time.Sleep(jitter(10*time.Second, 0.5))
			}

			_ = s.producer.Produce(config.TopicNames.Activity, "anak-krakatau", event)
			s.hub.BroadcastAll("event", map[string]interface{}{
				"type":        "VOLCANIC",
				"description": formatVolcanicDescription(event),
				"severity":    volcanicSeverity(event),
				"timestamp":   event.Timestamp,
				"data":        event,
			})
		}
	}
}

func (s *Simulator) normalVolcanicEvent() models.VolcanicEvent {
	return models.VolcanicEvent{
		Type:                "VOLCANIC",
		ActivityLevel:       10 + rand.Float64()*15,
		Deformation:         0.0 + rand.Float64()*0.1,
		GasMeasurement:      50 + rand.Float64()*100,
		ThermalActivity:     25 + rand.Float64()*10,
		EruptionObservation: "None",
		TremorIntensity:     0.5 + rand.Float64()*1.5,
		Timestamp:           time.Now(),
	}
}

func (s *Simulator) escalatedVolcanicEvent() models.VolcanicEvent {
	s.mu.RLock()
	progress := s.escalationProgress
	s.mu.RUnlock()

	observations := []string{"None", "Minor steam", "Increased fumarole activity", "Visible glow", "Ash emission"}
	obsIdx := int(progress * float64(len(observations)-1))
	if obsIdx >= len(observations) {
		obsIdx = len(observations) - 1
	}

	return models.VolcanicEvent{
		Type:                "VOLCANIC",
		ActivityLevel:       20 + progress*70 + rand.Float64()*10,
		Deformation:         progress * 2.5 + rand.Float64()*0.5,
		GasMeasurement:      100 + progress*800 + rand.Float64()*100,
		ThermalActivity:     30 + progress*70 + rand.Float64()*15,
		EruptionObservation: observations[obsIdx],
		TremorIntensity:     1.0 + progress*8.0 + rand.Float64()*2.0,
		Timestamp:           time.Now(),
	}
}

func (s *Simulator) produceEscalatedVolcanic(activity float64) {
	progress := activity / 100.0

	events := []struct {
		desc string
		event models.VolcanicEvent
	}{
		{
			desc: fmt.Sprintf("Tremor intensity ↑%.0f%%", progress*180),
			event: models.VolcanicEvent{
				Type:            "VOLCANIC",
				ActivityLevel:   activity,
				TremorIntensity: 1.0 + progress*8.0,
				GasMeasurement:  100 + progress*600,
				Timestamp:       time.Now(),
			},
		},
	}

	if activity > 50 {
		events = append(events, struct {
			desc string
			event models.VolcanicEvent
		}{
			desc: fmt.Sprintf("Ground deformation +%.1fcm detected", progress*2.5),
			event: models.VolcanicEvent{
				Type:          "VOLCANIC",
				ActivityLevel: activity,
				Deformation:   progress * 2.5,
				Timestamp:     time.Now(),
			},
		})
	}

	if activity > 65 {
		events = append(events, struct {
			desc string
			event models.VolcanicEvent
		}{
			desc: fmt.Sprintf("Gas emissions elevated: %.0f t/d SO₂", 100+progress*800),
			event: models.VolcanicEvent{
				Type:           "VOLCANIC",
				ActivityLevel:  activity,
				GasMeasurement: 100 + progress*800,
				Timestamp:      time.Now(),
			},
		})
	}

	for _, e := range events {
		_ = s.producer.Produce(config.TopicNames.Activity, "anak-krakatau", e.event)
		s.hub.BroadcastAll("event", map[string]interface{}{
			"type":        "VOLCANIC",
			"description": e.desc,
			"severity":    "HIGH",
			"timestamp":   e.event.Timestamp,
			"data":        e.event,
		})
		time.Sleep(time.Duration(500+rand.Intn(1000)) * time.Millisecond)
	}
}

func formatVolcanicDescription(e models.VolcanicEvent) string {
	if e.Deformation > 0.5 {
		return fmt.Sprintf("Deformation +%.1fcm detected", e.Deformation)
	}
	if e.TremorIntensity > 3.0 {
		return fmt.Sprintf("Tremor intensity elevated: %.1f", e.TremorIntensity)
	}
	if e.GasMeasurement > 300 {
		return fmt.Sprintf("Gas emissions: %.0f t/d SO₂", e.GasMeasurement)
	}
	return fmt.Sprintf("Activity level: %.0f%% — Normal monitoring", e.ActivityLevel)
}

func volcanicSeverity(e models.VolcanicEvent) string {
	if e.ActivityLevel > 60 || e.Deformation > 1.0 || e.TremorIntensity > 5.0 {
		return "HIGH"
	}
	if e.ActivityLevel > 35 || e.Deformation > 0.3 || e.TremorIntensity > 2.5 {
		return "MEDIUM"
	}
	return "LOW"
}
