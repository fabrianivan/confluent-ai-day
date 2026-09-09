'use client';

import { useState } from 'react';
import type { BMKGGempaDetail } from '@/lib/types';

interface LatestQuakeCardProps {
  quake: BMKGGempaDetail | null;
  onFocusMap?: (lat: number, lon: number) => void;
}

export default function LatestQuakeCard({ quake, onFocusMap }: LatestQuakeCardProps) {
  const [showShakemap, setShowShakemap] = useState(false);

  if (!quake) {
    return (
      <div className="card latest-quake-card">
        <div className="card__header">
          <span className="card__title">
            Gempa Terkini BMKG
          </span>
          <span className="card__badge card__badge--live">LIVE TEWS</span>
        </div>
        <div className="card__body" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
          Memuat data real BMKG TEWS...
        </div>
      </div>
    );
  }

  const mag = parseFloat(quake.Magnitude) || 0;
  const isTsunami =
    (quake.Potensi || '').toLowerCase().includes('berpotensi tsunami') &&
    !(quake.Potensi || '').toLowerCase().includes('tidak');

  const hasDirasakan = Boolean(
    quake.Dirasakan &&
    quake.Dirasakan.trim() !== '' &&
    quake.Dirasakan.trim() !== '-' &&
    !quake.Dirasakan.toLowerCase().includes('belum ada')
  );

  const shakemapUrl = quake.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${quake.Shakemap}` : null;

  // Extract lat/lon from Coordinates "-5.33,104.55"
  const coords = (quake.Coordinates || '').split(',');
  const lat = coords.length === 2 ? parseFloat(coords[0]) : null;
  const lon = coords.length === 2 ? parseFloat(coords[1]) : null;

  return (
    <div className="card latest-quake-card">
      <div className="card__header">
        <span className="card__title">
          Gempa Terkini BMKG
        </span>
        <span className="card__badge card__badge--live">
          <span className="live-dot-pulse"></span>
          OFFICIAL TEWS
        </span>
      </div>

      <div className="card__body">
        {/* Main Magnitude & Epicenter Hero Banner */}
        <div className="latest-quake-hero">
          <div className="latest-quake-hero__mag-box">
            <span className={`latest-quake-hero__mag ${mag >= 5.0 ? 'latest-quake-hero__mag--danger' : ''}`}>
              M{mag > 0 ? mag.toFixed(1) : '—'}
            </span>
            <span className="latest-quake-hero__mag-label">MAGNITUDO</span>
          </div>

          <div className="latest-quake-hero__details">
            <div className="latest-quake-hero__wilayah" title={quake.Wilayah}>
              📍 {quake.Wilayah}
            </div>
            <div className="latest-quake-hero__meta">
              <span>Kedalaman {quake.Kedalaman}</span>
              <span className="meta-sep">•</span>
              <span>{quake.Jam}</span>
            </div>
            <div className="latest-quake-hero__date">
              📅 {quake.Tanggal}
            </div>
          </div>
        </div>

        {/* Peringatan Dini Tsunami — Hanya ditampilkan jika ada status peringatan tsunami */}
        {isTsunami && (
          <div className="latest-quake-status latest-quake-status--danger">
            <span className="latest-quake-status__icon">🚨</span>
            <div className="latest-quake-status__text">
              <strong>PERINGATAN DINI TSUNAMI (INATEWS)</strong>
              <div>{quake.Potensi}</div>
            </div>
          </div>
        )}

        {/* Details Grid: Koordinat & Efek Gempa Dirasakan (hanya jika ada laporan dirasakan) */}
        <div className="latest-quake-grid">
          <div className="latest-quake-grid__item">
            <span className="latest-quake-grid__label">Koordinat</span>
            <span className="latest-quake-grid__value">{quake.Lintang}, {quake.Bujur}</span>
          </div>
          {hasDirasakan && (
            <div className="latest-quake-grid__item">
              <span className="latest-quake-grid__label">Efek Gempa Dirasakan</span>
              <span className="latest-quake-grid__value" style={{ color: '#ff9100', fontWeight: 700 }}>
                {quake.Dirasakan}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons: View on Map & Shakemap */}
        <div className="latest-quake-actions">
          {lat !== null && lon !== null && onFocusMap && (
            <button
              className="quake-action-btn"
              onClick={() => onFocusMap(lat, lon)}
              title="Fokuskan posisi episenter di peta"
            >
              🎯 Fokus di Peta
            </button>
          )}

          {shakemapUrl && (
            <button
              className="quake-action-btn quake-action-btn--secondary"
              onClick={() => setShowShakemap(!showShakemap)}
              title="Lihat peta guncangan BMKG"
            >
              🗺️ {showShakemap ? 'Tutup Shakemap' : 'Lihat Shakemap BMKG'}
            </button>
          )}
        </div>

        {/* Embedded Shakemap Preview */}
        {showShakemap && shakemapUrl && (
          <div className="latest-quake-shakemap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shakemapUrl}
              alt={`Shakemap BMKG ${quake.Wilayah}`}
              className="latest-quake-shakemap__img"
              loading="lazy"
            />
            <div className="latest-quake-shakemap__caption">
              Peta Estimasi Tingkat Guncangan (BMKG ShakeMap)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
