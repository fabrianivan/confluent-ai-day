'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  activityLevel: number;
  tsunamiActive: boolean;
}

const KRAKATAU_POS: [number, number] = [-6.102, 105.423];

// Coastal Evacuation & Tsunami Warning Zones
interface CoastalZone {
  name: string;
  code: string;
  pos: [number, number];
  radius: number;
  population: number;
  shelter: number;
  route: string;
}

const COASTAL_ZONES: CoastalZone[] = [
  { name: 'Anyer Coastal Strip', code: 'Zone A', pos: [-6.052, 105.918], radius: 4000, population: 45000, shelter: 8000, route: 'Route A — Highway to Serang' },
  { name: 'Carita Beach Resort Corridor', code: 'Zone B', pos: [-6.302, 105.836], radius: 3500, population: 12000, shelter: 3000, route: 'Route B — Coastal Road North' },
  { name: 'Labuan Harbor & Settlements', code: 'Zone C', pos: [-6.391, 105.828], radius: 3800, population: 28000, shelter: 6000, route: 'Route C — Main Road to Pandeglang' },
  { name: 'Pandeglang Coastal Corridor', code: 'Zone D', pos: [-6.538, 105.811], radius: 4200, population: 18000, shelter: 4500, route: 'Route D — Inland Highway' },
  { name: 'South Lampung Coast (Kalianda)', code: 'Zone E', pos: [-5.733, 105.589], radius: 4500, population: 35000, shelter: 7000, route: 'Route E — Trans-Sumatra Highway' },
  { name: 'Sumur Gateway (Ujung Kulon)', code: 'Zone F', pos: [-6.650, 105.580], radius: 3200, population: 8000, shelter: 2000, route: 'Route F — Mountain Road' },
];

// Ship positions in the Sunda Strait
const SHIPS = [
  { name: 'KM Sunda Express', pos: [-6.05, 105.35] as [number, number] },
  { name: 'MV Krakatau Ferry', pos: [-6.18, 105.48] as [number, number] },
  { name: 'TB Ocean Pioneer', pos: [-5.98, 105.42] as [number, number] },
];

// Ocean sensor positions
const SENSORS = [
  { id: 'Banten-01', pos: [-6.15, 105.35] as [number, number] },
  { id: 'Banten-02', pos: [-6.08, 105.50] as [number, number] },
  { id: 'Banten-03 (Tsunami Anomaly)', pos: [-6.20, 105.38] as [number, number] },
  { id: 'Lampung-01', pos: [-5.95, 105.45] as [number, number] },
];

export default function Map({ activityLevel, tsunamiActive }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const volcanoMarkerRef = useRef<L.Marker | null>(null);
  const exclusionCircleRef = useRef<L.Circle | null>(null);
  const zoneLayersRef = useRef<{ circle: L.Circle; marker: L.Marker; zone: CoastalZone }[]>([]);
  const waveRingsRef = useRef<L.Circle[]>([]);

  const exclusionRadius = useMemo(() => {
    if (activityLevel > 70) return 8000;
    if (activityLevel > 50) return 5000;
    return 3000;
  }, [activityLevel]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.15, 105.65], // Center between Krakatau and Banten coast
      zoom: 10,
      zoomControl: true,
      attributionControl: true,
    });

    // 1. ESRI World Imagery (Satellite)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics, USGS',
        maxZoom: 18,
      }
    );

    // 2. ESRI Ocean Basemap
    const oceanLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, GEBCO, NOAA',
        maxZoom: 16,
      }
    );

    // 3. ESRI Topographic Map
    const topoLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; Esri, USGS, FAO',
        maxZoom: 18,
      }
    );

    satelliteLayer.addTo(map);

    const baseMaps = {
      '🛰️ Satelit (ESRI)': satelliteLayer,
      '🌊 Oseanografi (ESRI)': oceanLayer,
      '⛰️ Topografi (ESRI)': topoLayer,
    };
    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

    // Exclusion zone circle
    const exclusionCircle = L.circle(KRAKATAU_POS, {
      radius: 3000,
      color: 'rgba(255, 69, 0, 0.6)',
      fillColor: 'rgba(255, 69, 0, 0.12)',
      fillOpacity: 0.35,
      weight: 2,
      dashArray: '5, 8',
    }).addTo(map);
    exclusionCircleRef.current = exclusionCircle;

    // Volcano marker
    const volcanoIcon = L.divIcon({
      className: 'volcano-marker',
      html: `
        <div class="volcano-marker__dot"></div>
        <div class="volcano-marker__ring"></div>
        <div class="volcano-marker__label">Anak Krakatau</div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const volcanoMarker = L.marker(KRAKATAU_POS, { icon: volcanoIcon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 200px;">
          <strong style="font-size: 14px; color: #ff4500;">🌋 Anak Krakatau</strong><br/>
          <span style="font-size: 11px; color: #aaa;">
            Coordinates: 6.102°S, 105.423°E<br/>
            Sunda Strait, Indonesia<br/>
            Type: Active Stratovolcano
          </span>
        </div>
      `);
    volcanoMarkerRef.current = volcanoMarker;

    // Coastal Warning / Evacuation Zones
    zoneLayersRef.current = COASTAL_ZONES.map((zone) => {
      const circle = L.circle(zone.pos, {
        radius: zone.radius,
        color: 'rgba(6, 182, 212, 0.6)',
        fillColor: 'rgba(6, 182, 212, 0.12)',
        fillOpacity: 0.25,
        weight: 1.5,
        dashArray: '4, 6',
      }).addTo(map);

      const zoneIcon = L.divIcon({
        className: 'coastal-zone-icon',
        html: `<div class="zone-badge zone-badge--normal">${zone.code}: ${zone.name.split(' ')[0]}</div>`,
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      });

      const marker = L.marker(zone.pos, { icon: zoneIcon }).addTo(map);

      const updatePopup = (isTsunami: boolean) => {
        const popupContent = `
          <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 220px; color: #f0f0f5;">
            <div style="font-size: 12px; font-weight: 700; color: ${isTsunami ? '#ef4444' : '#06b6d4'}; margin-bottom: 4px;">
              ${isTsunami ? '🚨 CRITICAL TSUNAMI EVACUATION ZONE' : '🛡️ Evacuation Zone (Standby Readiness)'}
            </div>
            <strong style="font-size: 14px;">${zone.name}</strong><br/>
            <span style="font-size: 11px; color: #888;">Sector: ${zone.code}</span>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;" />
            <div style="font-size: 11px; line-height: 1.6;">
              👥 <strong>Population:</strong> ${zone.population.toLocaleString()}<br/>
              🏕️ <strong>Shelter Capacity:</strong> ${zone.shelter.toLocaleString()}<br/>
              🛣️ <strong>Evacuation Route:</strong> ${zone.route}<br/>
              ${isTsunami ? '<span style="color: #ef4444; font-weight: 700;">⚠️ MANDATORY EVACUATION TO SAFE GROUND (>20m)</span>' : '<span style="color: #10b981;">✓ Status: Route Open</span>'}
            </div>
          </div>
        `;
        circle.bindPopup(popupContent);
        marker.bindPopup(popupContent);
      };

      updatePopup(false);

      return { circle, marker, zone };
    });

    // Ship markers
    SHIPS.forEach((ship) => {
      const shipIcon = L.divIcon({
        className: '',
        html: `<div style="font-size: 16px; filter: drop-shadow(0 0 4px rgba(255,255,255,0.4));">🚢</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker(ship.pos, { icon: shipIcon })
        .addTo(map)
        .bindPopup(`<strong>${ship.name}</strong><br/><span style="font-size:11px;">Active Vessel in Sunda Strait</span>`);
    });

    // Ocean sensor markers
    SENSORS.forEach((sensor) => {
      const isAnomaly = sensor.id.includes('Banten-03');
      const sensorIcon = L.divIcon({
        className: '',
        html: `<div style="width: 10px; height: 10px; border-radius: 50%; background: ${isAnomaly ? '#ef4444' : '#06b6d4'}; border: 2px solid white; box-shadow: 0 0 8px ${isAnomaly ? '#ef4444' : '#06b6d4'};"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      L.marker(sensor.pos, { icon: sensorIcon })
        .addTo(map)
        .bindPopup(`<strong>🌊 ${sensor.id}</strong><br/><span style="font-size:11px;">Tide & Ocean Sensor Station</span>`);
    });

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

  // Update Exclusion Zone and Volcano Marker Color
  useEffect(() => {
    if (volcanoMarkerRef.current) {
      const dotClass = activityLevel > 70 ? 'volcano-marker__dot--critical' :
                       activityLevel > 50 ? 'volcano-marker__dot--elevated' : '';
      const icon = L.divIcon({
        className: 'volcano-marker',
        html: `
          <div class="volcano-marker__dot ${dotClass}"></div>
          <div class="volcano-marker__ring"></div>
          <div class="volcano-marker__label">Anak Krakatau (${activityLevel.toFixed(0)}%)</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      volcanoMarkerRef.current.setIcon(icon);
    }

    if (exclusionCircleRef.current) {
      exclusionCircleRef.current.setRadius(exclusionRadius);
      const borderColor = activityLevel > 70 ? 'rgba(239, 68, 68, 0.8)' :
                          activityLevel > 50 ? 'rgba(249, 115, 22, 0.7)' :
                          'rgba(255, 69, 0, 0.5)';
      exclusionCircleRef.current.setStyle({
        color: borderColor,
        fillColor: borderColor.replace(/[\d.]+\)$/, '0.15)'),
        weight: activityLevel > 70 ? 2.5 : 1.5,
      });
    }
  }, [activityLevel, exclusionRadius]);

  // Update Coastal Warning Zones and Tsunami Waves on tsunamiActive change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Update Coastal Zones
    zoneLayersRef.current.forEach(({ circle, marker, zone }) => {
      if (tsunamiActive) {
        circle.setStyle({
          color: '#ef4444',
          fillColor: '#dc2626',
          fillOpacity: 0.4,
          weight: 2.5,
          dashArray: undefined,
        });

        const activeIcon = L.divIcon({
          className: 'coastal-zone-icon',
          html: `<div class="zone-badge zone-badge--tsunami">🚨 ${zone.code}: ${zone.name.split(' ')[0]} (EVACUATE)</div>`,
          iconSize: [140, 24],
          iconAnchor: [70, 12],
        });
        marker.setIcon(activeIcon);
      } else if (activityLevel > 50) {
        circle.setStyle({
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.18,
          weight: 2,
          dashArray: '4, 8',
        });

        const alertIcon = L.divIcon({
          className: 'coastal-zone-icon',
          html: `<div class="zone-badge zone-badge--alert">⚠️ ${zone.code}: ${zone.name.split(' ')[0]}</div>`,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        });
        marker.setIcon(alertIcon);
      } else {
        circle.setStyle({
          color: 'rgba(6, 182, 212, 0.6)',
          fillColor: 'rgba(6, 182, 212, 0.12)',
          fillOpacity: 0.22,
          weight: 1.5,
          dashArray: '4, 6',
        });

        const normalIcon = L.divIcon({
          className: 'coastal-zone-icon',
          html: `<div class="zone-badge zone-badge--normal">${zone.code}: ${zone.name.split(' ')[0]}</div>`,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        });
        marker.setIcon(normalIcon);
      }

      // Refresh popup content with active status
      const popupContent = `
        <div style="font-family: Inter, sans-serif; padding: 6px; min-width: 220px; color: #f0f0f5;">
          <div style="font-size: 12px; font-weight: 700; color: ${tsunamiActive ? '#ef4444' : activityLevel > 50 ? '#f59e0b' : '#06b6d4'}; margin-bottom: 4px;">
            ${tsunamiActive ? '🚨 CRITICAL TSUNAMI EVACUATION ZONE' : activityLevel > 50 ? '⚠️ ELEVATED VOLCANIC ADVISORY' : '🛡️ Evacuation Zone (Standby Readiness)'}
          </div>
          <strong style="font-size: 14px;">${zone.name}</strong><br/>
          <span style="font-size: 11px; color: #888;">Sector: ${zone.code}</span>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;" />
          <div style="font-size: 11px; line-height: 1.6;">
            👥 <strong>Population:</strong> ${zone.population.toLocaleString()}<br/>
            🏕️ <strong>Shelter Capacity:</strong> ${zone.shelter.toLocaleString()}<br/>
            🛣️ <strong>Evacuation Route:</strong> ${zone.route}<br/>
            ${tsunamiActive ? '<span style="color: #ef4444; font-weight: 700;">⚠️ MANDATORY EVACUATION TO SAFE GROUND (>20m)</span>' : '<span style="color: #10b981;">✓ Status: Route Open & Monitored</span>'}
          </div>
        </div>
      `;
      circle.bindPopup(popupContent);
      marker.bindPopup(popupContent);
    });

    // 2. Manage Tsunami Wave Propagation Rings
    waveRingsRef.current.forEach((r) => r.remove());
    waveRingsRef.current = [];

    if (tsunamiActive) {
      const distances = [12000, 22000, 32000];
      distances.forEach((dist, idx) => {
        const ring = L.circle(KRAKATAU_POS, {
          radius: dist,
          color: idx === 0 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(6, 182, 212, 0.8)',
          fillColor: idx === 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
          weight: 2.5,
          dashArray: '8, 8',
        }).addTo(map);
        ring.bindPopup(`<strong>🌊 Tsunami Wavefront ${idx + 1}</strong><br/>Estimated arrival at coastline in ${(3 - idx) * 8} mins`);
        waveRingsRef.current.push(ring);
      });
    }
  }, [tsunamiActive, activityLevel]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', minHeight: '400px' }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%', minHeight: '400px' }} />

      {/* Map HUD Legend */}
      <div className="map-hud-legend">
        <div className="map-hud-legend__title">Map Indicators</div>
        <div className="map-hud-legend__item">
          <span className="dot dot--volcano"></span>
          <span>Anak Krakatau</span>
        </div>
        <div className="map-hud-legend__item">
          <span className="dot dot--exclusion"></span>
          <span>Exclusion Zone ({exclusionRadius / 1000} km)</span>
        </div>
        <div className="map-hud-legend__item">
          <span className={`dot ${tsunamiActive ? 'dot--tsunami' : 'dot--zone'}`}></span>
          <span>{tsunamiActive ? '🚨 Tsunami Evac Zone' : '🛡️ Evacuation Zone'}</span>
        </div>
        {tsunamiActive && (
          <div className="map-hud-legend__item">
            <span className="dot dot--wave"></span>
            <span>🌊 Tsunami Wavefront</span>
          </div>
        )}
        <div className="map-hud-legend__item">
          <span className="dot dot--sensor"></span>
          <span>Ocean Sensors</span>
        </div>
        <div className="map-hud-legend__item">
          <span className="dot dot--ship"></span>
          <span>Vessels (Sunda Strait)</span>
        </div>
      </div>
    </div>
  );
}
