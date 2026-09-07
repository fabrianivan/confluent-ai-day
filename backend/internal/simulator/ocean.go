package simulator

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/models"
)

// generateOceanEvents produces baseline ocean sensor events
func (s *Simulator) generateOceanEvents(ctx context.Context) {
	sensors := []struct {
		id  string
		lat float64
		lng float64
	}{
		{"Banten-01", -6.15, 105.35},
		{"Banten-02", -6.08, 105.50},
		{"Banten-03", -6.20, 105.38},
		{"Lampung-01", -5.95, 105.45},
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			s.mu.RLock()
			mode := s.mode
			s.mu.RUnlock()

			sensor := sensors[rand.Intn(len(sensors))]
			var event models.OceanEvent

			switch mode {
			case ModeTsunamiScenario:
				event = s.tsunamiOceanEvent(sensor.id, sensor.lat, sensor.lng)
				time.Sleep(jitter(3*time.Second, 0.3))
			default:
				event = s.normalOceanEvent(sensor.id, sensor.lat, sensor.lng)
				time.Sleep(jitter(10*time.Second, 0.5))
			}

			_ = s.producer.Produce(config.TopicNames.Ocean, sensor.id, event)
			s.hub.BroadcastAll("event", map[string]interface{}{
				"type":        "OCEAN",
				"description": formatOceanDescription(event),
				"severity":    oceanSeverity(event),
				"timestamp":   event.Timestamp,
				"data":        event,
			})
		}
	}
}

func (s *Simulator) normalOceanEvent(sensorID string, lat, lng float64) models.OceanEvent {
	return models.OceanEvent{
		Type:                 "OCEAN",
		SensorID:             sensorID,
		SeaLevel:             -0.1 + rand.Float64()*0.2,
		WaveHeight:           0.3 + rand.Float64()*0.8,
		TsunamiSensorReading: 0.0,
		BuoyData:             -0.05 + rand.Float64()*0.1,
		Latitude:             lat,
		Longitude:            lng,
		Timestamp:            time.Now(),
	}
}

func (s *Simulator) tsunamiOceanEvent(sensorID string, lat, lng float64) models.OceanEvent {
	s.mu.RLock()
	progress := s.tsunamiProgress
	s.mu.RUnlock()

	return models.OceanEvent{
		Type:                 "OCEAN",
		SensorID:             sensorID,
		SeaLevel:             progress * 2.8 + rand.Float64()*0.5,
		WaveHeight:           0.5 + progress*3.5 + rand.Float64()*0.8,
		TsunamiSensorReading: progress * 4.2,
		BuoyData:             progress * 1.8 + rand.Float64()*0.3,
		Latitude:             lat,
		Longitude:            lng,
		Timestamp:            time.Now(),
	}
}

func (s *Simulator) produceOceanAnomaly(stage int) {
	anomalies := []struct {
		sensor    string
		seaLevel  float64
		waveH     float64
		desc      string
	}{
		{"Banten-03", 0.8, 1.2, "Sea level change +0.8m detected"},
		{"Banten-03", 1.5, 2.1, "Wave height anomaly +2.1m confirmed"},
		{"Banten-01", 2.1, 2.8, "Multiple sensors confirm wave anomaly"},
		{"Lampung-01", 2.5, 3.2, "Anomaly spreading — coastal zones identified"},
		{"Banten-02", 2.8, 3.5, "Full anomaly profile — impact assessment"},
	}

	if stage >= len(anomalies) {
		stage = len(anomalies) - 1
	}

	a := anomalies[stage]
	event := models.OceanEvent{
		Type:                 "OCEAN",
		SensorID:             a.sensor,
		SeaLevel:             a.seaLevel,
		WaveHeight:           a.waveH,
		TsunamiSensorReading: a.seaLevel * 1.5,
		BuoyData:             a.seaLevel * 0.6,
		Latitude:             -6.20,
		Longitude:            105.38,
		Timestamp:            time.Now(),
	}

	_ = s.producer.Produce(config.TopicNames.Ocean, a.sensor, event)
	s.hub.BroadcastAll("event", map[string]interface{}{
		"type":        "OCEAN",
		"description": a.desc,
		"severity":    "CRITICAL",
		"timestamp":   event.Timestamp,
		"data":        event,
	})
}

func formatOceanDescription(e models.OceanEvent) string {
	if e.SeaLevel > 1.0 {
		return fmt.Sprintf("⚠ Sea level anomaly +%.1fm on %s", e.SeaLevel, e.SensorID)
	}
	if e.WaveHeight > 2.0 {
		return fmt.Sprintf("⚠ Wave height anomaly %.1fm on %s", e.WaveHeight, e.SensorID)
	}
	return fmt.Sprintf("Sea level %.2fm, wave height %.1fm — %s", e.SeaLevel, e.WaveHeight, e.SensorID)
}

func oceanSeverity(e models.OceanEvent) string {
	if e.SeaLevel > 1.5 || e.WaveHeight > 2.5 {
		return "CRITICAL"
	}
	if e.SeaLevel > 0.5 || e.WaveHeight > 1.5 {
		return "HIGH"
	}
	return "LOW"
}
