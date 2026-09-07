'use client';

import type { ActivityIndex } from '@/lib/types';

interface MetricCardsProps {
  oceanStatus: string;
  weatherStatus: string;
  maritimeStatus: string;
  activityIndex: ActivityIndex | null;
}

export default function MetricCards({ oceanStatus, weatherStatus, maritimeStatus, activityIndex }: MetricCardsProps) {
  const statusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('CRITICAL') || s.includes('ANOMALY')) return 'metric__value--critical';
    if (s.includes('ELEVATED') || s.includes('WARNING')) return 'metric__value--elevated';
    return 'metric__value--normal';
  };

  return (
    <>
      <div className="card">
        <div className="card__header">
          <span className="card__title">
            <span className="card__title-icon">🌊</span>
            Ocean Status
          </span>
        </div>
        <div className="card__body">
          <div className="metric">
            <span className="metric__label">
              <span className="metric__label-icon">🌊</span>
              Sea Level
            </span>
            <span className={`metric__value ${statusColor(oceanStatus)}`}>
              {oceanStatus}
            </span>
          </div>
          <div className="metric">
            <span className="metric__label">
              <span className="metric__label-icon">🔊</span>
              Tsunami Sensors
            </span>
            <span className="metric__value metric__value--normal">
              ONLINE
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <span className="card__title">
            <span className="card__title-icon">🌦</span>
            Conditions
          </span>
        </div>
        <div className="card__body">
          <div className="metric">
            <span className="metric__label">
              <span className="metric__label-icon">💨</span>
              Weather
            </span>
            <span className={`metric__value ${statusColor(weatherStatus)}`}>
              {weatherStatus}
            </span>
          </div>
          <div className="metric">
            <span className="metric__label">
              <span className="metric__label-icon">🚢</span>
              Maritime
            </span>
            <span className={`metric__value ${statusColor(maritimeStatus)}`}>
              {maritimeStatus}
            </span>
          </div>
          {activityIndex && (
            <>
              <div className="metric">
                <span className="metric__label">
                  <span className="metric__label-icon">📐</span>
                  Deformation
                </span>
                <span className={`metric__value ${activityIndex.deformation_trend?.includes('INCREASING') ? 'metric__value--elevated' : 'metric__value--normal'}`}>
                  {activityIndex.deformation_trend || 'STABLE'}
                </span>
              </div>
              <div className="metric">
                <span className="metric__label">
                  <span className="metric__label-icon">🌡</span>
                  Thermal
                </span>
                <span className={`metric__value ${activityIndex.thermal_trend?.includes('INCREASING') ? 'metric__value--elevated' : 'metric__value--normal'}`}>
                  {activityIndex.thermal_trend || 'STABLE'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
