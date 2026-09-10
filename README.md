# INATEWS SENTINEL

🏆 **3rd Prize: The Most Creative AI App for Confluent AI Day Indonesia 2026**

**Sistem Peringatan Dini Lava Gunung, Gempa & Tsunami Indonesia — Real-Time Disaster Intelligence & Early Warning**

A streaming intelligence system that continuously monitors BMKG seismic networks, InaTEWS tsunami buoys & IOC sea level gauges, geodetic satellite observations, and meteorological feeds across Indonesia's major subduction zones through Confluent Cloud. Apache Flink SQL correlates events in real time to compute a National Seismic Intensity Index (MMI) and detect tsunami wave anomalies, while Google Gemini AI provides explainable risk assessments and decision-support recommendations for disaster response authorities (BMKG, BNPB, BASARNAS).

> ⚠️ **Important**: This system provides real-time seismic decision-support and rapid impact estimation. It is **NOT** an earthquake prediction system.

**Live dashboard:** https://dashboard-six-psi-45.vercel.app (disabled)

<img width="1505" height="853" alt="Screenshot 2026-09-09 at 15 40 09" src="https://github.com/user-attachments/assets/f694cf7f-0baf-44bc-b64f-d30f9a5b8709" />

---

## Architecture

```
                 DATA SOURCES
                      │
      ┌───────────────┼────────────────┐
      ↓               ↓                ↓
   Seismic         Satellite         Ocean
 (BMKG/USGS)     (InSAR Slip)      (InaTEWS)
   Stations      Infrastructure     Weather
      ↓               ↓                ↓
      └────────── CONFLUENT ───────────┘
                       │
                  Kafka Topics (7 gempa.*)
                       │
                    FLINK SQL
                       │
              Real-time correlation
              Window aggregation
              P/S Wave & Tsunami detection
                       │
                  Output Topics (3)
                       │
              ┌────────┴─────────┐
              ↓                  ↓
        Go Backend            Gemini AI
              ↓                  ↓
         SSE Stream         Analysis
              ↓                  ↓
         Dashboard       Decision-Support
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.23 + Gin + confluent-kafka-go v2 |
| Stream Processing | Confluent Cloud Apache Flink SQL |
| AI | Google Gemini 2.5 Flash |
| Frontend | Next.js 16 + Leaflet.js (Tactical Cockpit UI) |
| Messaging | Confluent Cloud (Apache Kafka) |

## Autonomous Megathrust Scenarios

The simulator cycles automatically through 4 high-risk Indonesian megathrust scenarios without requiring manual intervention:

1. **Megathrust Selat Sunda (M8.2)** — Sunda Strait subduction segment, triggering 5–12m tsunami runup toward Anyer, Pandeglang, and Lampung.
2. **Megathrust Selatan Jawa (M8.8)** — Java Trench subduction offshore Cilacap to Pacitan, generating 8–20m tsunami waves along the southern Java corridor.
3. **Megathrust Mentawai-Siberut (M9.0)** — Sunda Megathrust offshore Padang and Mentawai Islands, generating 10–25m catastrophic tsunami waves.
4. **Megathrust Sulawesi-Palu (M7.5)** — Palu-Koro strike-slip rupture replay with severe liquefaction and localized submarine landslide tsunami in Palu Bay.

## Setup & Quickstart

### 1. Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials (or DEMO_MODE=true for standalone mode)
```

### 2. Create Kafka Topics

```bash
chmod +x scripts/setup-topics.sh
./scripts/setup-topics.sh
```

### 3. Start Backend

```bash
cd backend
go run cmd/server/main.go
```

### 4. Start Dashboard

```bash
cd dashboard
npm run dev
```

### 5. Deploy Flink SQL

Deploy all 8 views and 3 real-time stream processing pipelines automatically to Confluent Cloud:

```bash
chmod +x scripts/deploy-flink.sh
./scripts/deploy-flink.sh
# or: npm run deploy:flink
```

Or run the SQL statements in order in Confluent Cloud Flink SQL Query Studio:
1. `flink/01_create_tables.sql` — Source & unified telemetry views (`gempa.*` -> `telemetry_events`)
2. `flink/02_activity_index.sql` — Real-time National Seismic Intensity Index
3. `flink/03_correlated_alerts.sql` — Multi-stream hazard correlation alerts
4. `flink/04_tsunami_detection.sql` — Tsunami wave anomaly detection

---

## Key Kafka Topics

| Topic | Description | Source |
|---|---|---|
| `gempa.seismic` | Real-time earthquake events (USGS & BMKG) | Ingestion |
| `gempa.stations` | BMKG broadband seismic station telemetry (P/S waves, PGA) | Network |
| `gempa.tsunami` | InaTEWS DART buoy and tide gauge telemetry | Ocean Sensors |
| `gempa.weather` | Real-time meteorology & barometric pressure | Open-Meteo |
| `gempa.satellite` | InSAR surface displacement and coseismic slip | Geodetic Ops |
| `gempa.infrastructure` | Hospital, bridge, port, and power grid status | Infrastructure |
| `gempa.population` | Evacuation routes, shelters, and readiness | Civil Defense |
| `gempa.intensity_index` | Computed real-time seismic intensity & MMI | Flink SQL |
| `gempa.correlated_alerts` | Multi-stream correlated hazard warnings | Flink SQL |
| `gempa.tsunami_scenarios` | Detected tsunami wave propagation alerts | Flink SQL |

---

## AI Intelligence & Autonomous Streaming Data Agent

### 1. Dual AI Engine Architecture (Gemini & AWS Bedrock)
- **Google Gemini 2.5 Flash**: Default low-latency reasoning engine with dynamic parameter grounding.
- **AWS Bedrock (Anthropic Claude 3.5 Sonnet / Amazon Nova)**: Enterprise multi-model support via AWS SDK v2 Converse protocol.
- **Runtime Provider Switching**: Toggle providers dynamically from the UI or via `POST /api/ai/provider`.
- **Resilient Fallback**: If cloud AI credentials are not provided or API calls fail, the system smoothly falls back to an internal high-precision seismological heuristic engine.

### 2. Autonomous Streaming Data Agent
The streaming agent operates an event-driven OODA (Observe-Orient-Decide-Act) reasoning loop over live Kafka and Flink event streams:
- **Continuous Sliding-Window Memory**: Evaluates seismic swarms, tremor spikes, tsunami buoy anomalies, and infrastructure strain.
- **Multi-Agency Directive Dispatch**: Dispatches automated tactical directives for BMKG (tsunami sirens), BNPB (evacuation corridors), KEMENHUB (bridge & maritime transit suspension), and BASARNAS (search & rescue deployment).
- **Token-by-Token Live Streaming Chat**: `/api/agent/chat/stream` streams AI response tokens in real-time over SSE directly into the dashboard.
