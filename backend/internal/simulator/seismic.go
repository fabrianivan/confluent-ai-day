package simulator

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/models"
)

type usgsResponse struct {
	Features []struct {
		Properties struct {
			Mag   float64 `json:"mag"`
			Place string  `json:"place"`
			Time  int64   `json:"time"`
		} `json:"properties"`
		Geometry struct {
			Coordinates []float64 `json:"coordinates"` // [lon, lat, depth]
		} `json:"geometry"`
	} `json:"features"`
}

var (
	lastUSGSFetch time.Time
	usgsCache     []models.SeismicEvent
	usgsMu        sync.Mutex
)

// fetchRealUSGSEvents fetches actual earthquakes around Sunda Strait from USGS
func fetchRealUSGSEvents() []models.SeismicEvent {
	usgsMu.Lock()
	defer usgsMu.Unlock()

	if time.Since(lastUSGSFetch) < 2*time.Minute && len(usgsCache) > 0 {
		return usgsCache
	}

	client := http.Client{Timeout: 5 * time.Second}
	url := "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=-6.102&longitude=105.423&maxradiuskm=500&limit=5"

	resp, err := client.Get(url)
	if err != nil || resp.StatusCode != http.StatusOK {
		return usgsCache
	}
	defer resp.Body.Close()

	var data usgsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return usgsCache
	}

	var events []models.SeismicEvent
	for _, f := range data.Features {
		if len(f.Geometry.Coordinates) >= 3 {
			events = append(events, models.SeismicEvent{
				Type:      "SEISMIC",
				Magnitude: f.Properties.Mag,
				Depth:     f.Geometry.Coordinates[2],
				Frequency: 1.5,
				Count:     1,
				Longitude: f.Geometry.Coordinates[0],
				Latitude:  f.Geometry.Coordinates[1],
				Timestamp: time.UnixMilli(f.Properties.Time),
			})
		}
	}

	if len(events) > 0 {
		usgsCache = events
		lastUSGSFetch = time.Now()
	}

	return usgsCache
}

// generateSeismicEvents produces real USGS and baseline seismic events
func (s *Simulator) generateSeismicEvents(ctx context.Context) {
	tickerIndex := 0
	for {
		select {
		case <-ctx.Done():
			return
		default:
			s.mu.RLock()
			mode := s.mode
			s.mu.RUnlock()

			var event models.SeismicEvent

			switch mode {
			case ModeNormal:
				tickerIndex++
				// Every 3rd event, inject a real USGS earthquake if available
				realEvents := fetchRealUSGSEvents()
				if tickerIndex%3 == 0 && len(realEvents) > 0 {
					pick := realEvents[rand.Intn(len(realEvents))]
					event = pick
					event.Timestamp = time.Now()
				} else {
					event = s.normalSeismicEvent()
				}
				time.Sleep(jitter(8*time.Second, 0.4))
			case ModeVolcanicEscalation:
				event = s.escalatedSeismicEvent()
				time.Sleep(jitter(2*time.Second, 0.3))
			default:
				event = s.normalSeismicEvent()
				time.Sleep(jitter(6*time.Second, 0.5))
			}

			_ = s.producer.Produce(config.TopicNames.Seismic, "anak-krakatau", event)
			s.hub.BroadcastAll("event", event)
		}
	}
}

func (s *Simulator) normalSeismicEvent() models.SeismicEvent {
	return models.SeismicEvent{
		Type:      "SEISMIC",
		Magnitude: 0.5 + rand.Float64()*1.5,
		Depth:     3.0 + rand.Float64()*15.0,
		Frequency: 0.5 + rand.Float64()*2.0,
		Count:     1 + rand.Intn(3),
		Latitude:  -6.102 + (rand.Float64()-0.5)*0.02,
		Longitude: 105.423 + (rand.Float64()-0.5)*0.02,
		Timestamp: time.Now(),
	}
}

func (s *Simulator) escalatedSeismicEvent() models.SeismicEvent {
	s.mu.RLock()
	progress := s.escalationProgress
	s.mu.RUnlock()

	baseMag := 1.5 + progress*2.5
	return models.SeismicEvent{
		Type:      "SEISMIC",
		Magnitude: baseMag + rand.Float64()*0.8,
		Depth:     2.0 + rand.Float64()*8.0,
		Frequency: 2.0 + progress*8.0 + rand.Float64()*2.0,
		Count:     3 + rand.Intn(8) + int(progress*10),
		Latitude:  -6.102 + (rand.Float64()-0.5)*0.01,
		Longitude: 105.423 + (rand.Float64()-0.5)*0.01,
		Timestamp: time.Now(),
	}
}

func (s *Simulator) produceEscalatedSeismic(activity float64) {
	magnitudes := []float64{
		1.8 + rand.Float64()*0.5,
		2.1 + rand.Float64()*0.3,
		2.4 + rand.Float64()*0.4,
	}

	if activity > 60 {
		magnitudes = append(magnitudes, 2.8+rand.Float64()*0.5)
	}
	if activity > 75 {
		magnitudes = append(magnitudes, 3.2+rand.Float64()*0.6)
	}

	for _, mag := range magnitudes {
		event := models.SeismicEvent{
			Type:      "SEISMIC",
			Magnitude: mag,
			Depth:     2.0 + rand.Float64()*6.0,
			Frequency: 5.0 + (activity/100.0)*10.0,
			Count:     int(activity / 10),
			Latitude:  -6.102 + (rand.Float64()-0.5)*0.01,
			Longitude: 105.423 + (rand.Float64()-0.5)*0.01,
			Timestamp: time.Now(),
		}

		_ = s.producer.Produce(config.TopicNames.Seismic, "anak-krakatau", event)
		s.hub.BroadcastAll("event", map[string]interface{}{
			"type":        "SEISMIC",
			"description": fmt.Sprintf("Earthquake M%.1f depth %.1fkm", event.Magnitude, event.Depth),
			"severity":    seismicSeverity(mag),
			"timestamp":   event.Timestamp,
			"data":        event,
		})

		time.Sleep(time.Duration(1500+rand.Intn(2000)) * time.Millisecond)
	}
}

func seismicSeverity(mag float64) string {
	switch {
	case mag >= 3.0:
		return "HIGH"
	case mag >= 2.0:
		return "MEDIUM"
	default:
		return "LOW"
	}
}
