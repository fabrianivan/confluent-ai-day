#!/bin/bash
# ============================================
# KRAKATAU SENTINEL — Topic Setup Script
# ============================================
# Creates all required Kafka topics via Confluent CLI
# Prerequisites: confluent CLI installed and logged in

set -e

echo "🌋 Creating Krakatau Sentinel Kafka topics..."

# Source topics (7)
TOPICS=(
    "volcano.seismic"
    "volcano.activity"
    "volcano.ocean"
    "volcano.weather"
    "volcano.satellite"
    "volcano.maritime"
    "volcano.population"
)

# Flink output topics (3)
OUTPUT_TOPICS=(
    "volcano.activity_index"
    "volcano.correlated_alerts"
    "volcano.tsunami_scenarios"
)

echo ""
echo "📥 Creating source topics..."
for topic in "${TOPICS[@]}"; do
    echo "  Creating: $topic"
    confluent kafka topic create "$topic" --partitions 3 2>/dev/null || echo "    ⚠ Already exists or error"
done

echo ""
echo "📤 Creating Flink output topics..."
for topic in "${OUTPUT_TOPICS[@]}"; do
    echo "  Creating: $topic"
    confluent kafka topic create "$topic" --partitions 3 2>/dev/null || echo "    ⚠ Already exists or error"
done

echo ""
echo "✅ All topics created!"
echo ""
echo "📋 Topic list:"
confluent kafka topic list 2>/dev/null | grep "volcano\." || echo "  (run 'confluent kafka topic list' manually)"
