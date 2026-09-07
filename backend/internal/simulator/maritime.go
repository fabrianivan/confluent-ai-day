package simulator

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"krakatau-sentinel/internal/config"
	"krakatau-sentinel/internal/models"
)

var shipNames = []string{
	"KM Sunda Express", "MV Krakatau Ferry", "TB Ocean Pioneer",
	"KM Merak Jaya", "MV Strait Runner", "TB Anyer Star",
	"KM Bakauheni Link", "MV Java Sea",
}

// generateMaritimeEvents produces ship tracking data
func (s *Simulator) generateMaritimeEvents(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			shipIdx := rand.Intn(len(shipNames))
			shipID := fmt.Sprintf("SHIP-%03d", shipIdx+1)

			// Ships in the Sunda Strait area
			lat := -6.0 + (rand.Float64()-0.5)*0.4
			lng := 105.3 + (rand.Float64()-0.5)*0.4

			// Check if in restricted zone (near volcano)
			distFromVolcano := ((lat - (-6.102)) * (lat - (-6.102))) + ((lng - 105.423) * (lng - 105.423))
			restricted := distFromVolcano < 0.01

			event := models.MaritimeEvent{
				Type:           "MARITIME",
				ShipID:         shipID,
				ShipName:       shipNames[shipIdx],
				Latitude:       lat,
				Longitude:      lng,
				Speed:          5 + rand.Float64()*15,
				RestrictedZone: restricted,
				Timestamp:      time.Now(),
			}

			_ = s.producer.Produce(config.TopicNames.Maritime, shipID, event)
			s.hub.BroadcastAll("event", map[string]interface{}{
				"type":        "MARITIME",
				"description": fmt.Sprintf("%s at (%.3f, %.3f) — %.0fkn", event.ShipName, event.Latitude, event.Longitude, event.Speed),
				"severity":    maritimeSeverity(restricted),
				"timestamp":   event.Timestamp,
				"data":        event,
			})

			time.Sleep(jitter(20*time.Second, 0.5))
		}
	}
}

func maritimeSeverity(restricted bool) string {
	if restricted {
		return "HIGH"
	}
	return "LOW"
}
