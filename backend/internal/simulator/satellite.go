package simulator

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/models"
)

// generateSatelliteEvents produces satellite observation data
func (s *Simulator) generateSatelliteEvents(ctx context.Context) {
	satellites := []string{"GOES-18", "Himawari-9", "Sentinel-2B", "MODIS-Terra"}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			s.mu.RLock()
			mode := s.mode
			progress := s.escalationProgress
			s.mu.RUnlock()

			sat := satellites[rand.Intn(len(satellites))]
			var event models.SatelliteEvent

			switch mode {
			case ModeVolcanicEscalation:
				event = models.SatelliteEvent{
					Type:           "SATELLITE",
					ThermalAnomaly: progress*5.0 + rand.Float64()*2.0,
					Deformation:    progress * 3.0,
					AshPlume:       ashPlumeStatus(progress),
					SatelliteID:    sat,
					Timestamp:      time.Now(),
				}
				time.Sleep(jitter(5*time.Second, 0.3))
			default:
				event = models.SatelliteEvent{
					Type:           "SATELLITE",
					ThermalAnomaly: rand.Float64() * 0.5,
					Deformation:    rand.Float64() * 0.1,
					AshPlume:       "None detected",
					SatelliteID:    sat,
					Timestamp:      time.Now(),
				}
				time.Sleep(jitter(20*time.Second, 0.5))
			}

			_ = s.producer.Produce(config.TopicNames.Satellite, sat, event)
			s.hub.BroadcastAll("event", map[string]interface{}{
				"type":        "SATELLITE",
				"description": formatSatelliteDescription(event),
				"severity":    satelliteSeverity(event),
				"timestamp":   event.Timestamp,
				"data":        event,
			})
		}
	}
}

func (s *Simulator) produceEscalatedSatellite(activity float64) {
	progress := activity / 100.0
	event := models.SatelliteEvent{
		Type:           "SATELLITE",
		ThermalAnomaly: progress*5.0 + rand.Float64()*1.5,
		Deformation:    progress * 3.0,
		AshPlume:       ashPlumeStatus(progress),
		SatelliteID:    "Sentinel-2B",
		Timestamp:      time.Now(),
	}

	_ = s.producer.Produce(config.TopicNames.Satellite, "Sentinel-2B", event)
	s.hub.BroadcastAll("event", map[string]interface{}{
		"type":        "SATELLITE",
		"description": fmt.Sprintf("Thermal anomaly +%.1f°C detected via %s", event.ThermalAnomaly, event.SatelliteID),
		"severity":    "HIGH",
		"timestamp":   event.Timestamp,
		"data":        event,
	})
}

func ashPlumeStatus(progress float64) string {
	switch {
	case progress > 0.8:
		return "Significant ash plume observed"
	case progress > 0.6:
		return "Minor ash emission detected"
	case progress > 0.4:
		return "Possible steam/gas plume"
	default:
		return "None detected"
	}
}

func formatSatelliteDescription(e models.SatelliteEvent) string {
	if e.ThermalAnomaly > 2.0 {
		return fmt.Sprintf("Thermal anomaly +%.1f°C — %s", e.ThermalAnomaly, e.SatelliteID)
	}
	if e.Deformation > 1.0 {
		return fmt.Sprintf("Deformation %.1fcm detected — %s", e.Deformation, e.SatelliteID)
	}
	return fmt.Sprintf("Normal scan — %s: thermal %.1f°C", e.SatelliteID, e.ThermalAnomaly)
}

func satelliteSeverity(e models.SatelliteEvent) string {
	if e.ThermalAnomaly > 3.0 || e.Deformation > 2.0 {
		return "HIGH"
	}
	if e.ThermalAnomaly > 1.0 || e.Deformation > 0.5 {
		return "MEDIUM"
	}
	return "LOW"
}
