'use client';

import type { LiveEvent } from '@/lib/types';

interface EventStreamProps {
  events: LiveEvent[];
}

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

function typeClass(type: string): string {
  switch (type.toUpperCase()) {
    case 'SEISMIC': return 'event-stream__type--seismic';
    case 'VOLCANIC': return 'event-stream__type--volcanic';
    case 'OCEAN': return 'event-stream__type--ocean';
    case 'WEATHER': return 'event-stream__type--weather';
    case 'SATELLITE': return 'event-stream__type--satellite';
    case 'MARITIME': return 'event-stream__type--maritime';
    default: return '';
  }
}

function severityClass(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'event-stream__severity--critical';
    case 'HIGH': return 'event-stream__severity--high';
    case 'MEDIUM': return 'event-stream__severity--medium';
    default: return 'event-stream__severity--low';
  }
}

export default function EventStream({ events }: EventStreamProps) {
  return (
    <div className="card event-stream">
      <div className="card__header">
        <span className="card__title">
          <span className="card__title-icon">📜</span>
          Live Event Stream
        </span>
        <span className="card__badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
          {events.length} events
        </span>
      </div>
      <div className="event-stream__list">
        {events.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Waiting for events...
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-stream__item">
              <div className={`event-stream__severity ${severityClass(event.severity)}`} />
              <span className="event-stream__time">{formatTime(event.timestamp)}</span>
              <span className={`event-stream__type ${typeClass(event.type)}`}>
                {event.type}
              </span>
              <span className="event-stream__desc">{event.description}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
