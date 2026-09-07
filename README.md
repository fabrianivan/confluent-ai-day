# 🌋 KRAKATAU SENTINEL

**Real-Time AI for Volcanic Intelligence & Emergency Response**

A streaming intelligence system that continuously monitors volcanic, seismic, ocean, weather, and satellite data through Confluent Cloud. Apache Flink SQL correlates events in real time to compute a Volcanic Activity Index, and Google Gemini AI provides explainable risk assessments and recommended response actions.

> ⚠️ **Important**: This system detects evolving volcanic risk and helps authorities make faster, evidence-based decisions. It is **NOT** an eruption prediction system.

---

## Architecture

```
                 DATA SOURCES
                      │
      ┌───────────────┼────────────────┐
      ↓               ↓                ↓
   Seismic         Satellite         Ocean
   Volcano         Maritime          Weather
      ↓               ↓                ↓
      └────────── CONFLUENT ───────────┘
                       │
                  Kafka Topics (7 source)
                       │
                    FLINK SQL
                       │
              Real-time correlation
              Window aggregation
              Trend detection
                       │
                 Output Topics (3)
                       │
              ┌────────┴─────────┐
              ↓                  ↓
       Go Backend            Gemini AI
              ↓                  ↓
         SSE Stream         Analysis
              ↓                  ↓
         Dashboard       Recommendations
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + Gin + confluent-kafka-go v2 |
| Stream Processing | Confluent Flink SQL |
| AI | Google Gemini 2.5 Flash |
| Frontend | Next.js 14 + Leaflet.js |
| Messaging | Confluent Cloud (Apache Kafka) |

## Setup

### 1. Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Create Kafka Topics

```bash
# Option A: Via Confluent CLI
chmod +x scripts/setup-topics.sh
./scripts/setup-topics.sh

# Option B: The Go backend auto-creates topics on startup
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

Open Confluent Cloud Flink workspace and run the SQL files in order:
1. `flink/01_create_tables.sql` — Source table definitions
2. `flink/02_activity_index.sql` — Volcanic Activity Index computation
3. `flink/03_correlated_alerts.sql` — Multi-stream correlation
4. `flink/04_tsunami_detection.sql` — Tsunami anomaly detection

## Demo Flow (3 minutes)

1. **0:00–0:30** — Show normal state, explain data sources flowing through Confluent
2. **0:30–1:30** — Click **🔥 Simulate Volcanic Escalation**, watch Activity Index climb 23% → 82%
3. **1:30–2:15** — Show AI analysis, expand **"Explain the Alert"**
4. **2:15–2:45** — Click **🌊 Simulate Tsunami Scenario**, show impact assessment
5. **2:45–3:00** — Show governance panel, wrap up with: *"The intelligence doesn't exist in any individual event. It emerges from the correlation of events over time."*

## Kafka Topics

| Topic | Type | Classification |
|-------|------|---------------|
| `volcano.seismic` | Source | Scientific |
| `volcano.activity` | Source | Scientific |
| `volcano.ocean` | Source | Scientific |
| `volcano.weather` | Source | Scientific |
| `volcano.satellite` | Source | Scientific |
| `volcano.maritime` | Source | Operational |
| `volcano.population` | Source | Sensitive (PII) |
| `volcano.activity_index` | Flink Output | Derived |
| `volcano.correlated_alerts` | Flink Output | Derived |
| `volcano.tsunami_scenarios` | Flink Output | Derived |

## Key Differentiators

- **Flink-driven**: The intelligence emerges from correlating events over time, not from any single event
- **AI as the second layer**: Flink computes the Activity Index first, then AI provides interpretation
- **Explainable**: Every alert shows exactly which indicators triggered it and their significance
- **Scientifically defensible**: Never claims to predict eruptions — provides decision-support assessment
- **Real-time governance**: Demonstrates data classification, PII handling, and schema management

---

*Built for Confluent AI Day Hackathon*
