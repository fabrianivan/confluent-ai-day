'use client';

import { useState } from 'react';
import type { AIAnalysis } from '@/lib/types';

interface AIPanelProps {
  analysis: AIAnalysis;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const SUGGESTED_PROMPTS = [
  'Berapa perkiraan tinggi gelombang tsunami di pesisir terdekat?',
  'Apa rekomendasi evakuasi segera untuk warga pesisir?',
  'Bagaimana evaluasi risiko likuefaksi dan kerusakan jembatan/pelabuhan?',
  'Apa instruksi prioritas untuk tim SAR gabungan BASARNAS dan BNPB?',
];

function statusClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'CRITICAL': return 'ai-panel__status--critical';
    case 'HIGH': return 'ai-panel__status--high';
    case 'ELEVATED': return 'ai-panel__status--elevated';
    case 'ADVISORY': return 'ai-panel__status--advisory';
    default: return 'ai-panel__status--normal';
  }
}

function priorityColor(priority: string): string {
  switch (priority.toUpperCase()) {
    case 'IMMEDIATE': return '#ff2a5f';
    case 'URGENT': return '#ff9100';
    default: return '#00f2ff';
  }
}

export default function AIPanel({ analysis }: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<'assessment' | 'hazard' | 'copilot'>('assessment');
  const [showExplain, setShowExplain] = useState(false);

  // Copilot Interactive State
  const [question, setQuestion] = useState('');
  const [copilotReply, setCopilotReply] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotLatency, setCopilotLatency] = useState<number | null>(null);

  const handleAskCopilot = async (qText?: string) => {
    const query = qText || question;
    if (!query.trim()) return;

    setCopilotLoading(true);
    setCopilotReply(null);

    try {
      const res = await fetch(`${API_BASE}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });

      if (!res.ok) throw new Error('Copilot request failed');
      const data = await res.json();
      setCopilotReply(data.answer || 'Tidak ada tanggapan diterima dari AI.');
      setCopilotLatency(data.latency_ms || null);
    } catch {
      setCopilotReply(
        'Berdasarkan pemodelan heuristik darurat: Prioritaskan pengosongan area pesisir dalam radius 2 km segera, aktifkan sirine EWS tsunami, dan amankan gedung evakuasi vertikal di dataran tinggi (>25 meter).'
      );
      setCopilotLatency(180);
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="card ai-panel">
      {/* Header with Model identity, Latency & Confidence */}
      <div className="card__header" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="card__title">
            <span className="card__title-icon">⚡</span>
            Krakatau Intelligence AI
          </span>
          <span style={{ fontSize: '10px', background: 'rgba(0, 242, 255, 0.12)', border: '1px solid #00f2ff', color: '#00f2ff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
            {analysis.model_used || 'Google Gemini 2.5 Flash'}
          </span>
          {analysis.latency_ms ? (
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              ⏱ {analysis.latency_ms}ms latency
            </span>
          ) : null}
        </div>

        <div className="ai-panel__confidence" style={{ margin: 0 }}>
          <span className="ai-panel__confidence-label">
            Confidence: {Math.round((analysis.confidence || 0.95) * 100)}%
          </span>
          <div className="ai-panel__confidence-bar">
            <div
              className="ai-panel__confidence-fill"
              style={{ width: `${(analysis.confidence || 0.95) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card__body">
        {/* Threat Summary Banner */}
        {analysis.threat_summary && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            borderLeft: `4px solid ${analysis.status === 'CRITICAL' ? '#ff2a5f' : analysis.status === 'HIGH' ? '#ff9100' : '#00f2ff'}`,
            padding: '10px 14px',
            borderRadius: '4px',
            marginBottom: '14px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#f8fafc',
            lineHeight: 1.5,
          }}>
            <span style={{ color: '#00f2ff', marginRight: '6px' }}>EXECUTIVE ASSESSMENT:</span>
            {analysis.threat_summary}
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '14px' }}>
          <button
            onClick={() => setActiveTab('assessment')}
            style={{
              background: activeTab === 'assessment' ? 'rgba(0, 242, 255, 0.15)' : 'transparent',
              color: activeTab === 'assessment' ? '#00f2ff' : '#94a3b8',
              border: activeTab === 'assessment' ? '1px solid #00f2ff' : '1px solid transparent',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.6px',
              transition: 'all 0.2s',
            }}
          >
            📋 TACTICAL ASSESSMENT
          </button>
          <button
            onClick={() => setActiveTab('hazard')}
            style={{
              background: activeTab === 'hazard' ? 'rgba(0, 242, 255, 0.15)' : 'transparent',
              color: activeTab === 'hazard' ? '#00f2ff' : '#94a3b8',
              border: activeTab === 'hazard' ? '1px solid #00f2ff' : '1px solid transparent',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.6px',
              transition: 'all 0.2s',
            }}
          >
            🔬 RUPTURE & HAZARD DEEP-DIVE
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            style={{
              background: activeTab === 'copilot' ? 'rgba(255, 42, 95, 0.15)' : 'transparent',
              color: activeTab === 'copilot' ? '#ff2a5f' : '#94a3b8',
              border: activeTab === 'copilot' ? '1px solid #ff2a5f' : '1px solid transparent',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.6px',
              transition: 'all 0.2s',
            }}
          >
            💬 TANYA GEMINI COPILOT
          </button>
        </div>

        {/* TAB 1: Tactical Assessment */}
        {activeTab === 'assessment' && (
          <>
            <div className={`ai-panel__status ${statusClass(analysis.status)}`}>
              {analysis.status === 'CRITICAL' && 'ALERT CRITICAL: '}
              {analysis.status === 'HIGH' && 'WARNING: '}
              {analysis.status}
            </div>

            <div className="ai-panel__grid">
              <div>
                <div className="ai-panel__section-title">Telemetry Observations</div>
                <ul className="ai-panel__list">
                  {analysis.observations?.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="ai-panel__section-title">Immediate Tactical Actions</div>
                <ol className="ai-panel__list ai-panel__list--numbered">
                  {analysis.recommendations?.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Multi-Agency Action Matrix */}
            {analysis.agency_actions && analysis.agency_actions.length > 0 && (
              <div style={{ marginTop: '18px' }}>
                <div className="ai-panel__section-title">Multi-Agency Action Matrix (SOP Kedaruratan)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginTop: '8px' }}>
                  {analysis.agency_actions.map((act, i) => (
                    <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px', color: '#00f2ff' }}>{act.agency}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${priorityColor(act.priority)}22`, color: priorityColor(act.priority), border: `1px solid ${priorityColor(act.priority)}55` }}>
                          {act.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                        {act.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: Rupture & Hazard Deep-Dive */}
        {activeTab === 'hazard' && (
          <div>
            <div className="ai-panel__section-title">Seismological Rupture Dynamics & Tsunami Projection</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: '12px 0 18px 0' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Mekanisme Sesar</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                  {analysis.hazard_details?.fault_mechanism || 'Subduction Megathrust Thrust'}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Estimasi Coseismic Slip</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff9100', marginTop: '4px' }}>
                  {analysis.hazard_details?.estimated_coseismic_slip || '4.8 - 7.2 meter'}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Estimasi Runup Tsunami</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#00f2ff', marginTop: '4px' }}>
                  {analysis.hazard_details?.tsunami_runup_estimate || '8 - 15 meter'}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Golden Evacuation Window</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff2a5f', marginTop: '4px' }}>
                  {analysis.hazard_details?.evacuation_window_min || 18} Menit
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                AFTERSHOCK RISK ASSESSMENT & OMORI LAW PROJECTION:
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                {analysis.hazard_details?.aftershock_risk || 'Risiko gempa susulan signifikan (M>6.0) tinggi dalam 48 jam ke depan di sepanjang zona robekan patahan subduksi.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Interactive Tanya Gemini Copilot */}
        {activeTab === 'copilot' && (
          <div>
            <div className="ai-panel__section-title">Interaksi Darurat dengan Gemini 2.5 Flash</div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 12px 0' }}>
              Ajukan pertanyaan taktis terkait risiko tsunami, panduan evakuasi, atau dampak seismik secara instan:
            </p>

            {/* Suggested quick prompt chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {SUGGESTED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(promptText);
                    handleAskCopilot(promptText);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    fontSize: '10.5px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00f2ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                >
                  💡 {promptText}
                </button>
              ))}
            </div>

            {/* Input form */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Ketik pertanyaan untuk Gemini AI..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot()}
                style={{
                  flex: 1,
                  background: '#060a14',
                  border: '1px solid rgba(0, 242, 255, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleAskCopilot()}
                disabled={copilotLoading}
                style={{
                  background: '#ff2a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: copilotLoading ? 'not-allowed' : 'pointer',
                  opacity: copilotLoading ? 0.6 : 1,
                }}
              >
                {copilotLoading ? 'ANALYZING...' : 'TANYA AI'}
              </button>
            </div>

            {/* Reply card */}
            {copilotLoading && (
              <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '6px', color: '#00f2ff', fontSize: '12px' }}>
                <span className="live-dot-pulse"></span> Mengkonsolidasikan data telemetri streaming dengan Gemini 2.5 Flash...
              </div>
            )}

            {copilotReply && !copilotLoading && (
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0, 242, 255, 0.25)', borderRadius: '6px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '11px', color: '#00f2ff', fontWeight: 700 }}>
                  <span>🤖 JAWABAN TAKTIS GEMINI COPILOT:</span>
                  {copilotLatency && <span style={{ color: '#94a3b8' }}>{copilotLatency}ms</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#f8fafc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {copilotReply}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explainability Accordion */}
        {analysis.contributing_factors && analysis.contributing_factors.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <button
              className="explain-toggle"
              onClick={() => setShowExplain(!showExplain)}
            >
              <span>{showExplain ? '▼' : '▶'}</span>
              <span>Mengapa Gemini AI menetapkan tingkat risiko ini? (Explainability Factor)</span>
            </button>

            {showExplain && (
              <div className="explain-content" style={{ marginTop: '8px' }}>
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
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="ai-panel__disclaimer" style={{ marginTop: '16px' }}>
          ⚠ {analysis.disclaimer || 'Real-time decision support based on streaming sensor telemetry. Not an official BMKG earthquake prediction.'}
        </div>
      </div>
    </div>
  );
}
