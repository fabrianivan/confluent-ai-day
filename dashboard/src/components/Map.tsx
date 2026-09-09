'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LifecyclePhase, LiveEvent, RealtimeEarthquakesData, VolcanoEruption } from '@/lib/types';
import { INDONESIAN_VOLCANOES, findVolcanoLocation } from '@/lib/volcanoData';

interface MapProps {
  activityLevel?: number;
  tsunamiActive?: boolean;
  phase?: LifecyclePhase | null;
  events?: LiveEvent[];
  realQuakes?: RealtimeEarthquakesData | null;
  focusCoords?: { lat: number; lon: number } | null;
  volcanoes?: VolcanoEruption[];
  selectedVolcano?: string | null;
  onSelectVolcano?: (name: string) => void;
  onInspectVolcanoSeismogram?: (volcano: VolcanoEruption) => void;
}

// Major Indonesian Tectonic & Fault Systems
const FAULT_SYSTEMS = [
  {
    name: 'Sunda Megathrust (Sumatra Segment)',
    color: '#ff2a5f',
    coords: [
      [5.5, 93.5],
      [3.0, 95.5],
      [1.0, 97.2],
      [-1.0, 99.0],
      [-2.5, 99.8],
      [-4.5, 102.0],
      [-6.0, 104.0],
    ] as [number, number][],
  },
  {
    name: 'Java Trench (South Java Megathrust)',
    color: '#ff5722',
    coords: [
      [-6.8, 105.2],
      [-8.0, 107.2],
      [-9.1, 109.5],
      [-9.8, 112.5],
      [-10.5, 115.5],
      [-11.0, 118.0],
    ] as [number, number][],
  },
  {
    name: 'Palu-Koro Strike-Slip Fault',
    color: '#ffd600',
    coords: [
      [0.8, 119.6],
      [-0.18, 119.85],
      [-0.9, 119.87],
      [-1.8, 120.3],
      [-2.8, 120.8],
    ] as [number, number][],
  },
  {
    name: 'Banda Subduction Arc & Flores Thrust',
    color: '#a855f7',
    coords: [
      [-8.2, 118.5],
      [-8.0, 121.5],
      [-7.5, 125.0],
      [-5.5, 128.5],
      [-4.0, 131.5],
    ] as [number, number][],
  },
  {
    name: 'Sorong Transform Fault (Papua)',
    color: '#00f2ff',
    coords: [
      [-1.2, 130.5],
      [-1.1, 133.0],
      [-1.6, 136.5],
      [-2.5, 140.7],
    ] as [number, number][],
  },
];

// BMKG Real-Time Broadband Seismic Network
const SEISMIC_STATIONS = [
  { id: 'LEM', name: 'Lembang (West Java)', pos: [-6.83, 107.62] as [number, number] },
  { id: 'JATS', name: 'Jatiluhur (West Java)', pos: [-6.52, 107.41] as [number, number] },
  { id: 'CBJI', name: 'Cibinong (West Java)', pos: [-6.49, 106.85] as [number, number] },
  { id: 'KLI', name: 'Kotabumi (Lampung)', pos: [-4.83, 104.88] as [number, number] },
  { id: 'PDSI', name: 'Padang (West Sumatra)', pos: [-0.95, 100.35] as [number, number] },
  { id: 'BKB', name: 'Bukittinggi (West Sumatra)', pos: [-0.30, 100.37] as [number, number] },
  { id: 'YOGI', name: 'Yogyakarta (DIY)', pos: [-7.78, 110.37] as [number, number] },
  { id: 'PLAI', name: 'Palu (Central Sulawesi)', pos: [-0.90, 119.87] as [number, number] },
  { id: 'MNI', name: 'Manado (North Sulawesi)', pos: [1.48, 124.84] as [number, number] },
  { id: 'AAI', name: 'Ambon (Maluku)', pos: [-3.70, 128.18] as [number, number] },
  { id: 'BND', name: 'Banda Aceh (Aceh)', pos: [5.55, 95.32] as [number, number] },
  { id: 'JAY', name: 'Jayapura (Papua)', pos: [-2.53, 140.72] as [number, number] },
];

// InaTEWS DART Tsunami Buoy Array
const TSUNAMI_BUOYS = [
  { id: 'BUOY-INA-01', name: 'Selat Sunda / Sebesi', pos: [-5.95, 105.48] as [number, number] },
  { id: 'BUOY-INA-02', name: 'Mentawai Offshore', pos: [-1.15, 100.12] as [number, number] },
  { id: 'BUOY-INA-03', name: 'Cilacap Indian Ocean', pos: [-7.95, 109.10] as [number, number] },
  { id: 'BUOY-INA-04', name: 'Palu Bay / Pantoloan', pos: [-0.72, 119.86] as [number, number] },
  { id: 'BUOY-INA-05', name: 'Aceh Indian Ocean', pos: [5.62, 95.15] as [number, number] },
  { id: 'BUOY-INA-06', name: 'Pangandaran South', pos: [-7.78, 108.65] as [number, number] },
];

export default function Map({
  activityLevel = 15,
  tsunamiActive = false,
  phase,
  events,
  realQuakes,
  focusCoords,
  volcanoes = [],
  selectedVolcano = null,
  onSelectVolcano,
  onInspectVolcanoSeismogram,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const quakeLayerRef = useRef<L.LayerGroup | null>(null);
  const volcanoLayerRef = useRef<L.LayerGroup | null>(null);
  const latestMarkerRef = useRef<L.Marker | null>(null);
  const [mouseCoords, setMouseCoords] = useState<string>('0.00°S, 118.00°E');
  const [activeLayer, setActiveLayer] = useState<{
    quakes: boolean;
    stations: boolean;
    buoys: boolean;
    faults: boolean;
    volcanoes: boolean;
  }>({
    quakes: true,
    stations: true,
    buoys: true,
    faults: true,
    volcanoes: true,
  });

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered on the Indonesian Archipelago
    const map = L.map(mapContainerRef.current, {
      center: [-2.5, 118.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // High quality ESRI World Imagery
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, BMKG, USGS',
        maxZoom: 18,
      }
    );

    // ESRI Ocean Bathymetry
    const oceanLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, NOAA, GEBCO',
        maxZoom: 16,
      }
    );

    satelliteLayer.addTo(map);

    const baseMaps = {
      '🛰️ Satelit (ESRI)': satelliteLayer,
      '🌊 Batimetri Oseanografi': oceanLayer,
    };
    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

    // Mouse coordinates tracker
    map.on('mousemove', (e) => {
      const latStr = `${Math.abs(e.latlng.lat).toFixed(2)}°${e.latlng.lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(e.latlng.lng).toFixed(2)}°${e.latlng.lng >= 0 ? 'E' : 'W'}`;
      setMouseCoords(`${latStr}, ${lonStr}`);
    });

    // Plot Indonesian Active Fault Lines & Subduction Trenches
    FAULT_SYSTEMS.forEach((fault) => {
      const polyline = L.polyline(fault.coords, {
        color: fault.color,
        weight: 3.5,
        opacity: 0.85,
        dashArray: '8, 6',
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
          <strong style="color: ${fault.color}; font-size: 13px;">⚡ ${fault.name}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">Zona Subduksi & Sesar Aktif Utama Indonesia</span>
        </div>
      `);
    });

    // Plot BMKG Seismic Stations
    SEISMIC_STATIONS.forEach((st) => {
      const stIcon = L.divIcon({
        className: 'station-marker',
        html: `
          <div style="display: flex; align-items: center; gap: 4px; background: rgba(6,10,20,0.88); border: 1px solid #00f2ff; border-radius: 4px; padding: 2px 6px; color: #00f2ff; font-family: monospace; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 0 8px rgba(0,242,255,0.35);">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00e676;"></span>
            ${st.id}
          </div>
        `,
        iconSize: [56, 20],
        iconAnchor: [28, 10],
      });

      L.marker(st.pos, { icon: stIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
            <strong style="font-size: 13px; color: #0284c7;">📡 Stasiun BMKG: ${st.id}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Lokasi: ${st.name}</span><br/>
            <span style="font-size: 11px; color: #16a34a; font-weight: 600;">Status: ONLINE • 100Hz Real-Time Waveform</span>
          </div>
        `);
    });

    // Plot InaTEWS DART Buoys
    TSUNAMI_BUOYS.forEach((buoy) => {
      const buoyIcon = L.divIcon({
        className: 'buoy-marker',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(6,182,212,0.25); border: 2px solid #06b6d4; box-shadow: 0 0 10px #06b6d4; font-size: 11px;">
            🌊
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker(buoy.pos, { icon: buoyIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
            <strong style="font-size: 13px; color: #0891b2;">🌊 ${buoy.id}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Pelampung Tsunami: ${buoy.name}</span><br/>
            <span style="font-size: 11px; color: #059669;">Sensor Tekanan Dasar Laut: Normal</span>
          </div>
        `);
    });

    // Layer group for earthquakes
    quakeLayerRef.current = L.layerGroup().addTo(map);
    // Layer group for volcanoes
    volcanoLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    const timer = setTimeout(() => map.invalidateSize(), 250);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Plot real earthquakes from BMKG & USGS
  useEffect(() => {
    const map = mapRef.current;
    const layer = quakeLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Plot BMKG recent earthquakes
    if (realQuakes?.recent_bmkg) {
      realQuakes.recent_bmkg.forEach((q) => {
        if (!q.latitude || !q.longitude) return;
        const color = q.magnitude >= 6.0 ? '#ef4444' : q.magnitude >= 5.0 ? '#f59e0b' : '#34d399';
        const radius = Math.max(7, q.magnitude * 2.8);

        const circle = L.circleMarker([q.latitude, q.longitude], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.65,
          weight: 2,
        });

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 8px; color: #0f172a; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 12px;">
                M${q.magnitude.toFixed(1)}
              </span>
              <span style="font-size: 10px; color: #64748b; font-weight: 700;">BMKG TEWS</span>
            </div>
            <strong style="font-size: 12px; color: #0f172a;">${q.fault_zone || 'Wilayah Indonesia'}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Kedalaman: ${q.depth} km</span><br/>
            <span style="font-size: 10px; color: #64748b;">Koordinat: ${q.latitude.toFixed(2)}°, ${q.longitude.toFixed(2)}°</span><br/>
            <span style="font-size: 9.5px; color: #94a3b8;">Waktu: ${new Date(q.timestamp).toLocaleString('id-ID')} WIB</span>
          </div>
        `);

        circle.addTo(layer);
      });
    }

    // Plot USGS recent earthquakes
    if (realQuakes?.recent_usgs) {
      realQuakes.recent_usgs.forEach((q) => {
        if (!q.latitude || !q.longitude) return;
        const circle = L.circleMarker([q.latitude, q.longitude], {
          radius: Math.max(5, q.magnitude * 2.2),
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 0.5,
          weight: 1.5,
        });

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">
                M${q.magnitude.toFixed(1)}
              </span>
              <span style="font-size: 10px; color: #64748b; font-weight: 600;">USGS GEOJSON</span>
            </div>
            <strong style="font-size: 12px; color: #0f172a;">${q.fault_zone}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Depth: ${q.depth.toFixed(0)} km</span>
          </div>
        `);

        circle.addTo(layer);
      });
    }

    // Plot Latest BMKG Autogempa with pulsating hero marker
    if (realQuakes?.latest_bmkg?.Coordinates) {
      const parts = realQuakes.latest_bmkg.Coordinates.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        const mag = parseFloat(realQuakes.latest_bmkg.Magnitude) || 4.5;

        if (latestMarkerRef.current) {
          latestMarkerRef.current.remove();
        }

        const heroIcon = L.divIcon({
          className: 'latest-gempa-hero-icon',
          html: `
            <div style="position: relative; width: 36px; height: 36px;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(255, 69, 0, 0.45); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; top: 9px; left: 9px; width: 18px; height: 18px; border-radius: 50%; background: #ff4500; border: 2.5px solid white; box-shadow: 0 0 16px #ff4500; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: 800;">
                ⚡
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const heroMarker = L.marker([lat, lon], { icon: heroIcon, zIndexOffset: 1000 }).addTo(layer);
        heroMarker.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 8px; color: #0f172a; min-width: 220px;">
            <div style="background: #ff4500; color: white; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 12px; margin-bottom: 6px; display: inline-block;">
              GEMPA TERKINI BMKG • M${mag.toFixed(1)}
            </div><br/>
            <strong style="font-size: 13px; color: #0f172a;">${realQuakes.latest_bmkg.Wilayah}</strong><br/>
            <span style="font-size: 11px; color: #475569;">Kedalaman: ${realQuakes.latest_bmkg.Kedalaman}</span><br/>
            <span style="font-size: 11px; color: #16a34a; font-weight: 600;">${realQuakes.latest_bmkg.Potensi}</span><br/>
            <span style="font-size: 10px; color: #64748b;">${realQuakes.latest_bmkg.Tanggal} • ${realQuakes.latest_bmkg.Jam}</span>
          </div>
        `);
        latestMarkerRef.current = heroMarker;
      }
    }
  }, [realQuakes]);

  // 3. Plot Indonesian active volcanoes & MAGMA live eruption feeds
  useEffect(() => {
    const map = mapRef.current;
    const layer = volcanoLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!activeLayer.volcanoes) return;

    INDONESIAN_VOLCANOES.forEach((v) => {
      // Find matching live eruption report from PVMBG if available
      const report = volcanoes.find((e) => {
        const cleanErup = e.volcano_name.toLowerCase().trim().replace(/^g\.\s*/, '');
        return v.name.toLowerCase().includes(cleanErup) || cleanErup.includes(v.name.toLowerCase());
      });

      const level = report?.alert_level || v.defaultLevel;
      const isAwas = level.includes('AWAS');
      const isSiaga = level.includes('SIAGA');
      const isWaspada = level.includes('WASPADA');
      const isSelected = selectedVolcano && (
        selectedVolcano.toLowerCase().includes(v.name.toLowerCase()) ||
        v.name.toLowerCase().includes(selectedVolcano.toLowerCase())
      );

      const markerColor = isAwas ? '#ff2a5f' : isSiaga ? '#ff5722' : isWaspada ? '#ff9800' : '#00f2ff';
      const badgeBg = isAwas ? 'rgba(255, 42, 95, 0.95)' : isSiaga ? 'rgba(255, 87, 34, 0.95)' : isWaspada ? 'rgba(255, 152, 0, 0.95)' : 'rgba(0, 242, 255, 0.85)';

      const volcanoIcon = L.divIcon({
        className: 'volcano-map-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '36px' : '28px'};
            height: ${isSelected ? '36px' : '28px'};
            border-radius: 50%;
            background: rgba(10, 14, 26, 0.9);
            border: 2px solid ${markerColor};
            box-shadow: 0 0 ${isSelected ? '22px' : '10px'} ${markerColor};
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <span style="font-size: ${isSelected ? '18px' : '14px'}; line-height: 1;">🌋</span>
            ${(isAwas || isSiaga || isSelected) ? `
              <span style="
                position: absolute;
                inset: -6px;
                border-radius: 50%;
                border: 2px solid ${markerColor};
                animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                pointer-events: none;
              "></span>
            ` : ''}
            <span style="
              position: absolute;
              bottom: -18px;
              white-space: nowrap;
              background: ${badgeBg};
              color: white;
              font-family: Inter, sans-serif;
              font-size: 9px;
              font-weight: 800;
              padding: 1px 6px;
              border-radius: 4px;
              letter-spacing: 0.02em;
              box-shadow: 0 2px 6px rgba(0,0,0,0.8);
            ">
              ${v.name}
            </span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(v.pos, { icon: volcanoIcon, zIndexOffset: isSelected ? 900 : isAwas ? 800 : 500 });

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'Inter, sans-serif';
      popupContent.style.padding = '8px';
      popupContent.style.color = '#0f172a';
      popupContent.style.minWidth = '240px';

      popupContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="font-size: 13px; color: #0f172a;">🌋 G. ${v.name}</strong>
          <span style="background: ${markerColor}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">
            ${level}
          </span>
        </div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
          Wilayah: <strong>${v.province}</strong> • Elevasi: <strong>${v.elevation} mdpl</strong>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          Pos PGA: ${v.pgaStation}<br/>
          Sensor: ${v.sensorType}
        </div>
        ${report ? `
          <div style="background: rgba(255, 87, 34, 0.08); border-left: 3px solid #ff5722; padding: 6px; border-radius: 3px; font-size: 11px; margin-bottom: 10px;">
            <strong>Laporan PVMBG Terakhir:</strong><br/>
            Amplitudo: <strong style="color: #ff2a5f;">${report.amplitude}</strong> • Durasi: <strong>${report.duration}</strong><br/>
            <span style="color: #64748b; font-size: 10px;">⏱ ${report.time} (${report.date})</span>
          </div>
        ` : ''}
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
          <button id="btn-volcano-seismo-${v.name.replace(/\s+/g, '-')}" style="
            background: #0284c7;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            text-align: center;
          ">
            📊 Tampilkan di Seismograf
          </button>
          ${report ? `
            <button id="btn-volcano-inspect-${v.name.replace(/\s+/g, '-')}" style="
              background: rgba(168, 85, 247, 0.15);
              color: #7c3aed;
              border: 1px solid #7c3aed;
              border-radius: 4px;
              padding: 5px 10px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              text-align: center;
            ">
              🔬 Analisis Citra Seismogram
            </button>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btnSeismo = document.getElementById(`btn-volcano-seismo-${v.name.replace(/\s+/g, '-')}`);
        if (btnSeismo) {
          btnSeismo.onclick = () => {
            onSelectVolcano?.(v.name);
            const el = document.getElementById('seismograph-container') || document.getElementById('section-operasional');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          };
        }

        const btnInspect = document.getElementById(`btn-volcano-inspect-${v.name.replace(/\s+/g, '-')}`);
        if (btnInspect && report) {
          btnInspect.onclick = () => {
            onInspectVolcanoSeismogram?.(report);
          };
        }
      });

      marker.on('click', () => {
        onSelectVolcano?.(v.name);
      });

      marker.addTo(layer);
    });
  }, [volcanoes, selectedVolcano, activeLayer.volcanoes, onSelectVolcano, onInspectVolcanoSeismogram]);

  // 4. Handle volcano selection camera flyTo
  useEffect(() => {
    if (!mapRef.current || !selectedVolcano) return;
    const geo = findVolcanoLocation(selectedVolcano);
    if (geo) {
      mapRef.current.flyTo(geo.pos, 8, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [selectedVolcano]);

  // 5. Handle external focus request (from LatestQuakeCard)
  useEffect(() => {
    if (!mapRef.current || !focusCoords) return;
    mapRef.current.flyTo([focusCoords.lat, focusCoords.lon], 9, {
      animate: true,
      duration: 1.5,
    });
  }, [focusCoords]);

  // Reset camera to Indonesia overview
  const handleResetOverview = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([-2.5, 118.0], 5, { animate: true, duration: 1.2 });
  };

  return (
    <div className="map-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Floating Tactical Map Controls */}
      <div className="map-floating-controls" style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ background: 'rgba(6, 10, 20, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          {mouseCoords}
        </div>
        <button
          className="map-floating-btn"
          onClick={handleResetOverview}
          title="Kembalikan fokus kamera ke seluruh wilayah kepulauan Indonesia"
        >
          <span className="map-floating-btn__icon">⟲</span>
          <span>Reset Posisi Peta</span>
        </button>
      </div>

      {/* Leaflet DOM container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '440px',
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Floating Tactical Legend Overlay with Toggles */}
      <div className="map-hud-legend">
        <div className="map-hud-legend__title">INATEWS · SESAR · EPISENTER</div>
        <div className="map-hud-legend__item">
          <span className="legend-dot" style={{ background: '#ff2a5f' }}></span>
          <span>Sunda Megathrust (M8.2+)</span>
        </div>
        <div className="map-hud-legend__item">
          <span className="legend-dot" style={{ background: '#ff5722' }}></span>
          <span>Java Trench (M8.8)</span>
        </div>
        <div className="map-hud-legend__item">
          <span className="legend-dot" style={{ background: '#ffd600' }}></span>
          <span>Palu-Koro Fault</span>
        </div>
        <div
          className="map-hud-legend__item"
          onClick={() => setActiveLayer((p) => ({ ...p, volcanoes: !p.volcanoes }))}
          style={{ cursor: 'pointer' }}
          title="Klik untuk menyembunyikan/menampilkan gunung api"
        >
          <span className="legend-dot" style={{ background: activeLayer.volcanoes ? '#ff5722' : 'var(--text-muted)' }}></span>
          <span style={{ color: activeLayer.volcanoes ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
            🌋 Pos Seismik Gunung Api (PVMBG) {activeLayer.volcanoes ? '✓' : ''}
          </span>
        </div>
        <div className="map-hud-legend__item">
          <span className="legend-dot" style={{ background: '#00f2ff' }}></span>
          <span>BMKG Broadband Station (LEM, JATS, etc.)</span>
        </div>
        <div className="map-hud-legend__item">
          <span className="legend-dot" style={{ background: '#06b6d4' }}></span>
          <span>InaTEWS / IOC Tide Buoys</span>
        </div>
      </div>
    </div>
  );
}
