# INATEWS SENTINEL

**Sistem Peringatan Dini Gempa & Tsunami Indonesia — Real-Time Disaster Intelligence & Early Warning**

A streaming intelligence system that continuously monitors BMKG seismic networks, InaTEWS tsunami buoys & IOC sea level gauges, geodetic satellite observations, and meteorological feeds across Indonesia's major subduction zones through Confluent Cloud. Apache Flink SQL correlates events in real time to compute a National Seismic Intensity Index (MMI) and detect tsunami wave anomalies, while Google Gemini AI provides explainable risk assessments and decision-support recommendations for disaster response authorities (BMKG, BNPB, BASARNAS).

> ⚠️ **Important**: This system provides real-time seismic decision-support and rapid impact estimation. It is **NOT** an earthquake prediction system.

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

Open Confluent Cloud Flink workspace and run the SQL statements in order:
1. `flink/01_create_tables.sql` — Source table definitions (`gempa.*`)
2. `flink/02_activity_index.sql` — Seismic Intensity Index computation
3. `flink/03_correlated_alerts.sql` — Multi-stream correlation
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
