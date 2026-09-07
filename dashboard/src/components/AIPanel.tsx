'use client';

import { useState } from 'react';
import type { AIAnalysis } from '@/lib/types';

interface AIPanelProps {
  analysis: AIAnalysis;
}

function statusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'CRITICAL': return 'ai-panel__status--critical';
    case 'HIGH': return 'ai-panel__status--high';
    case 'ELEVATED': return 'ai-panel__status--elevated';
    case 'ADVISORY': return 'ai-panel__status--advisory';
    default: return 'ai-panel__status--normal';
  }
}

export default function AIPanel({ analysis }: AIPanelProps) {
  const [showExplain, setShowExplain] = useState(false);

  return (
    <div className="card ai-panel">
      <div className="card__header">
        <span className="card__title">
          <span className="card__title-icon">🤖</span>
          AI Intelligence
        </span>
        <div className="ai-panel__confidence">
          <span className="ai-panel__confidence-label">
            Confidence: {Math.round(analysis.confidence * 100)}%
          </span>
          <div className="ai-panel__confidence-bar">
            <div
              className="ai-panel__confidence-fill"
              style={{ width: `${analysis.confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="card__body">
        <div className={`ai-panel__status ${statusClass(analysis.status)}`}>
          {analysis.status === 'CRITICAL' && '🚨 '}
          {analysis.status === 'HIGH' && '⚠️ '}
          {analysis.status}
        </div>

        <div className="ai-panel__grid">
          <div>
            <div className="ai-panel__section-title">Observed Changes</div>
            <ul className="ai-panel__list">
              {analysis.observations?.map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="ai-panel__section-title">Recommended Actions</div>
            <ol className="ai-panel__list ai-panel__list--numbered">
              {analysis.recommendations?.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="ai-panel__disclaimer">
          ⚠ {analysis.disclaimer || 'This is a decision-support assessment, not an official eruption prediction.'}
        </div>

        {analysis.contributing_factors && analysis.contributing_factors.length > 0 && (
          <>
            <button
              className="explain-toggle"
              onClick={() => setShowExplain(!showExplain)}
            >
              <span>{showExplain ? '▼' : '▶'}</span>
              <span>Why did Krakatau AI raise this alert?</span>
            </button>

            {showExplain && (
              <div className="explain-content">
                {analysis.contributing_factors.map((factor, i) => (
                  <div key={i} className="explain-factor">
                    <div>
                      <div className="explain-factor__name">
                        ✓ {factor.indicator}
                      </div>
                      <div className="explain-factor__change">
                        {factor.value} — {factor.change}
                      </div>
                    </div>
                    <div className="explain-factor__bar">
                      <div
                        className="explain-factor__bar-fill"
                        style={{ width: `${factor.significance * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  These indicators changed within a 15-minute window. AI confidence: {Math.round(analysis.confidence * 100)}%
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
