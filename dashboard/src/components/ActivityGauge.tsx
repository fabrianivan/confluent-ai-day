'use client';

import { useMemo } from 'react';

interface ActivityGaugeProps {
  percentage: number;
  trend: string;
}

export default function ActivityGauge({ percentage, trend }: ActivityGaugeProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color = useMemo(() => {
    if (percentage > 70) return '#ef4444';
    if (percentage > 50) return '#f97316';
    if (percentage > 35) return '#f59e0b';
    return '#10b981';
  }, [percentage]);

  const trendClass = useMemo(() => {
    if (trend.includes('RAPIDLY')) return 'gauge__trend--rapid';
    if (trend.includes('INCREASING') || trend === 'HIGH') return 'gauge__trend--increasing';
    return 'gauge__trend--stable';
  }, [trend]);

  const trendIcon = useMemo(() => {
    if (trend.includes('RAPIDLY') || trend === 'HIGH') return '↑↑';
    if (trend.includes('INCREASING')) return '↑';
    if (trend.includes('DECREASING')) return '↓';
    return '→';
  }, [trend]);

  return (
    <div className="gauge">
      <div className="gauge__circle">
        <svg className="gauge__svg" viewBox="0 0 160 160">
          <circle className="gauge__bg" cx="80" cy="80" r={radius} />
          <circle
            className="gauge__fill"
            cx="80"
            cy="80"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="gauge__value">
          <div className="gauge__percent" style={{ color }}>
            {Math.round(percentage)}%
          </div>
          <div className="gauge__label">Activity Index</div>
        </div>
      </div>
      <div className={`gauge__trend ${trendClass}`}>
        <span>{trendIcon}</span>
        <span>{trend}</span>
      </div>
    </div>
  );
}
