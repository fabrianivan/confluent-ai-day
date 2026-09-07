'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LifecyclePhase } from '@/lib/types';

interface MapProps {
  activityLevel: number;
  tsunamiActive: boolean;
  phase?: LifecyclePhase | null;
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

// Scenario Epicenters
const SCENARIO_COORDS: Record<string, { pos: [number, number]; zoom: number; name: string }> = {
  'MEGATHRUST SELAT SUNDA': { pos: [-6.8, 105.2], zoom: 8, name: 'Sunda Strait Subduction (M8.2)' },
  'MEGATHRUST SELATAN JAWA': { pos: [-9.1, 109.5], zoom: 7, name: 'Java Trench Subduction (M8.8)' },
  'MEGATHRUST MENTAWAI-SIBERUT': { pos: [-2.5, 99.8], zoom: 7, name: 'Mentawai Megathrust Segment (M9.0)' },
  'MEGATHRUST SULAWESI-PALU': { pos: [-0.18, 119.85], zoom: 9, name: 'Palu-Koro Fault Zone (M7.5)' },
};

export default function Map({ activityLevel, tsunamiActive, phase }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const epicenterMarkerRef = useRef<L.Marker | null>(null);
  const pWaveCircleRef = useRef<L.Circle | null>(null);
  const sWaveCircleRef = useRef<L.Circle | null>(null);
  const tsunamiRingsRef = useRef<L.Circle[]>([]);

  // Current scenario center & coordinates
  const currentScenario = useMemo(() => {
    const name = phase?.scenario_name || 'MEGATHRUST SELAT SUNDA';
    for (const key of Object.keys(SCENARIO_COORDS)) {
      if (name.toUpperCase().includes(key)) {
        return SCENARIO_COORDS[key];
      }
    }
    return SCENARIO_COORDS['MEGATHRUST SELAT SUNDA'];
  }, [phase?.scenario_name]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center map over active scenario area or Indonesia overview
    const map = L.map(mapContainerRef.current, {
      center: [-4.0, 110.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    // 1. ESRI Satellite
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, USGS, BMKG',
        maxZoom: 18,
      }
    );

    // 2. ESRI Ocean
    const oceanLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, NOAA, GEBCO',
        maxZoom: 16,
      }
    );

    // 3. ESRI Topo
    const topoLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, USGS',
        maxZoom: 18,
      }
    );

    satelliteLayer.addTo(map);

    const baseMaps = {
      '🛰️ Satelit (ESRI)': satelliteLayer,
      '🌊 Batimetri Oseanografi': oceanLayer,
      '⛰️ Peta Topografi': topoLayer,
    };
    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

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
          <span style="font-size: 11px; color: #64748b;">Active Subduction / Megathrust Tectonic Boundary</span>
        </div>
      `);
    });

    // Plot BMKG Seismic Stations
    SEISMIC_STATIONS.forEach((st) => {
      const stIcon = L.divIcon({
        className: 'station-marker',
        html: `
          <div style="display: flex; align-items: center; gap: 4px; background: rgba(6,10,20,0.85); border: 1px solid #00f2ff; border-radius: 4px; padding: 2px 6px; color: #00f2ff; font-family: monospace; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 0 8px rgba(0,242,255,0.4);">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00e676;"></span>
            ${st.id}
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });

      L.marker(st.pos, { icon: stIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
            <strong style="font-size: 13px; color: #0284c7;">📡 BMKG Station: ${st.id}</strong><br/>
            <span style="font-size: 11px; color: #475569;">${st.name}</span><br/>
            <span style="font-size: 11px; color: #16a34a;">Status: Online • Telemetry Stream: 100Hz</span>
          </div>
        `);
    });

    // Plot InaTEWS DART Buoy Array
    TSUNAMI_BUOYS.forEach((buoy) => {
      const buoyIcon = L.divIcon({
        className: 'buoy-marker',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,242,255,0.25); border: 2px solid #00f2ff; box-shadow: 0 0 10px #00f2ff; font-size: 11px;">
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
            <span style="font-size: 11px; color: #475569;">Location: ${buoy.name}</span><br/>
            <span style="font-size: 11px; color: #059669;">DART Bottom Pressure Sensor: Nominal</span>
          </div>
        `);
    });

    // Epicenter Marker
    const epicIcon = L.divIcon({
      className: 'epicenter-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(255, 42, 95, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 8px; left: 8px; width: 16px; height: 16px; border-radius: 50%; background: #ff2a5f; border: 2px solid white; box-shadow: 0 0 14px #ff2a5f;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const epicMarker = L.marker(currentScenario.pos, { icon: epicIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 6px; color: #0f172a;">
          <strong style="font-size: 14px; color: #ff2a5f;">⚡ ACTIVE EPICENTER</strong><br/>
          <span style="font-size: 12px; font-weight: 600;">${currentScenario.name}</span><br/>
          <span style="font-size: 11px; color: #64748b;">Coords: ${currentScenario.pos[0].toFixed(2)}°S, ${currentScenario.pos[1].toFixed(2)}°E</span>
        </div>
      `);
    epicenterMarkerRef.current = epicMarker;

    // P-Wave Propagation Circle (Compressional Wave ~6.5 km/s)
    const pCircle = L.circle(currentScenario.pos, {
      radius: 45000,
      color: '#00f2ff',
      fillColor: '#00f2ff',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 6',
    }).addTo(map);
    pWaveCircleRef.current = pCircle;

    // S-Wave Propagation Circle (Shear Wave ~3.8 km/s)
    const sCircle = L.circle(currentScenario.pos, {
      radius: 26000,
      color: '#ff2a5f',
      fillColor: '#ff2a5f',
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);
    sWaveCircleRef.current = sCircle;

    mapRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Epicenter position and animate camera when scenario shifts
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (epicenterMarkerRef.current) {
      epicenterMarkerRef.current.setLatLng(currentScenario.pos);
    }
    if (pWaveCircleRef.current) {
      pWaveCircleRef.current.setLatLng(currentScenario.pos);
    }
    if (sWaveCircleRef.current) {
      sWaveCircleRef.current.setLatLng(currentScenario.pos);
    }

    // Smooth pan/zoom to the active megathrust epicenter
    map.flyTo(currentScenario.pos, currentScenario.zoom, {
      animate: true,
      duration: 1.8,
    });
  }, [currentScenario]);

  // Animate P/S wave expansion and Tsunami wave rings based on activity
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pCircle = pWaveCircleRef.current;
    const sCircle = sWaveCircleRef.current;

    if (pCircle && sCircle) {
      // Scale radius by activity level
      const basePRadius = Math.max(25000, (activityLevel / 100) * 220000);
      const baseSRadius = Math.max(15000, (activityLevel / 100) * 130000);

      pCircle.setRadius(basePRadius);
      sCircle.setRadius(baseSRadius);

      if (activityLevel > 75) {
        sCircle.setStyle({ color: '#ff2a5f', fillColor: '#ff2a5f', fillOpacity: 0.22, weight: 3 });
        pCircle.setStyle({ color: '#ffd600', fillColor: '#ffd600', fillOpacity: 0.12, weight: 2 });
      } else {
        sCircle.setStyle({ color: '#ff9100', fillColor: '#ff9100', fillOpacity: 0.1, weight: 1.8 });
        pCircle.setStyle({ color: '#00f2ff', fillColor: '#00f2ff', fillOpacity: 0.06, weight: 1.2 });
      }
    }

    // Render Tsunami Propagation Wavefronts if active
    if (tsunamiActive) {
      if (tsunamiRingsRef.current.length === 0) {
        const radii = [40000, 80000, 120000, 160000];
        tsunamiRingsRef.current = radii.map((r) =>
          L.circle(currentScenario.pos, {
            radius: r,
            color: '#00f2ff',
            fillColor: '#00f2ff',
            fillOpacity: 0.05,
            weight: 2,
            dashArray: '6, 8',
          }).addTo(map)
        );
      }
    } else {
      tsunamiRingsRef.current.forEach((ring) => ring.remove());
      tsunamiRingsRef.current = [];
    }
  }, [activityLevel, tsunamiActive, currentScenario]);

  return (
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
  );
}
