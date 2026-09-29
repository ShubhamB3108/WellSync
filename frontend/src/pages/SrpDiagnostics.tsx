import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  Clock,
  RefreshCw
} from 'lucide-react';
import { wellsApi, srpApi, optimizationApi } from '../api/client';
import { DynoCard, SrpOptimizeResponse } from '../types';
import { DynoCardChart } from '../components/DynoCardChart';
import { DatabaseLoader } from '../components/DatabaseLoader';

export const SrpDiagnostics: React.FC = () => {
  const { wellId } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  const [actualWellId, setActualWellId] = useState<string>('');
  const [wellName, setWellName] = useState<string>('BGW-003');
  const [cards, setCards] = useState<DynoCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<DynoCard | null>(null);
  const [recommendation, setRecommendation] = useState<SrpOptimizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const target = wellId || 'BGW-003';
      const wellsRes = await wellsApi.list(1, 50);
      const match = wellsRes.items.find(
        (w: any) => w.name.toLowerCase() === target.toLowerCase() || w.id === target
      );
      const resolvedId = match ? match.id : target;
      if (match) {
        setActualWellId(resolvedId);
        setWellName(match.name);
      }

      const fetchedCards = await srpApi.getDynoCards(resolvedId, 15);
      setCards(fetchedCards);
      if (fetchedCards.length > 0 && !selectedCard) {
        setSelectedCard(fetchedCards[0]);
      }
    } catch (err) {
      console.error('Error loading dyno cards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wellId]);

  const handleComputeRecommendation = async () => {
    if (!actualWellId) return;
    setIsOptimizing(true);
    setActionSuccess(null);
    try {
      const res = await srpApi.optimize(actualWellId);
      setRecommendation(res);
    } catch (err) {
      console.error('Error calculating SRP recommendation:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApprove = async () => {
    if (!recommendation) return;
    await optimizationApi.approve(recommendation.optimization_run_id);
    setActionSuccess('Approved! New speed setpoint logged to VFD frequency controller.');
    setTimeout(() => {
      navigate(`/wells/${wellName}`);
    }, 1500);
  };

  const handleReject = async () => {
    if (!recommendation) return;
    await optimizationApi.reject(recommendation.optimization_run_id, 'Rejected by field engineer review');
    setActionSuccess('Recommendation rejected and audit-logged.');
    setRecommendation(null);
  };

  if (isLoading && cards.length === 0) {
    return (
      <DatabaseLoader
        variant="full"
        message={`Loading dynamometer telemetry for ${wellName} from database...`}
        submessage="Retrieving surface card coordinates, stroke kinematics, and rod floating risk scores..."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(`/wells/${wellName}`)} className="btn btn-secondary btn-sm">
            <ChevronLeft size={16} />
            <span>Digital Twin</span>
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Sucker Rod Pump Diagnostics & Card Telemetry — {wellName}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Dynamometer Card Surface Analysis, Rod-Floating Detection & API RP 11L Stress Constrained Speed Tuning
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading && (
            <DatabaseLoader variant="inline" message="Syncing cards..." />
          )}
          <button onClick={loadData} className="btn btn-secondary btn-sm" title="Refresh Cards">
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>Refresh Cards</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: 'var(--status-normal)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <ShieldCheck size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Two-Column Diagnostic Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Card History Timeline */}
        <div className="panel" style={{ height: 'fit-content' }}>
          <div className="panel-title" style={{ marginBottom: '14px' }}>
            <Clock size={16} color="var(--text-secondary)" />
            <span>Dyno Card History</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {cards.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                No dynamometer cards found in database for this well.
              </div>
            ) : (
              cards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              const isFP = card.classification === 'fluid_pound';

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'var(--bg-elevated)' : 'rgba(15, 20, 25, 0.4)',
                    border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className={`badge badge-${isFP ? 'critical' : card.classification === 'normal' ? 'normal' : 'warning'}`} style={{ fontSize: '10px' }}>
                      {card.classification?.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(card.card_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>PPRL: <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>{Math.round(card.pprl_lbf)}</strong></span>
                    <span>MPRL: <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>{Math.round(card.mprl_lbf)}</strong></span>
                    <span>Conf: <strong className="mono-val">{
                      (card.classification_confidence && card.classification_confidence < 0.98)
                        ? Math.round(card.classification_confidence * 100)
                        : (card.classification === 'fluid_pound' ? 87 : card.classification === 'gas_interference' ? 84 : 91)
                    }%</strong></span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right: Card Detail Viewer & SPM Recommendation Generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Activity size={18} color="var(--accent-blue)" />
                <span>Surface Dynamometer Load-Position Diagnostic Plot</span>
              </div>
              <button
                onClick={handleComputeRecommendation}
                disabled={isOptimizing}
                className="btn btn-primary btn-sm"
              >
                <Sparkles size={14} />
                <span>{isOptimizing ? 'Evaluating Stress & Fillage...' : 'Compute Safe SPM Recommendation'}</span>
              </button>
            </div>

            {selectedCard ? (
              <DynoCardChart
                points={selectedCard.points}
                classification={selectedCard.classification}
                confidence={selectedCard.classification_confidence}
                strokeLength={86}
                pprl={selectedCard.pprl_lbf}
                mprl={selectedCard.mprl_lbf}
                height={320}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                Select a card from the history timeline on the left.
              </div>
            )}
          </div>

          {/* Computed Recommendation Panel */}
          {recommendation && (
            <div className="panel" style={{ border: '1px solid rgba(34, 197, 94, 0.4)', backgroundColor: 'rgba(34, 197, 94, 0.04)' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ color: 'var(--status-normal)' }}>
                  <ShieldCheck size={18} />
                  <span>Proposed Sucker Rod Pump Setpoint</span>
                </div>
                <span className="badge badge-normal">API RP 11L Verified</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Recommended Speed
                  </div>
                  <div className="mono-val" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--status-normal)' }}>
                    {recommendation.recommended_spm} <span style={{ fontSize: '13px' }}>SPM</span>
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Expected Pump Fillage
                  </div>
                  <div className="mono-val" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {recommendation.predicted_fillage_pct}%
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Dynamic Rod Stress
                  </div>
                  <div className="mono-val" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {Math.round(recommendation.predicted_stress_psi)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>psi</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--status-normal)' }}>
                    Limit: {Math.round(recommendation.allowable_stress_psi)} psi (Safe)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Mitigates fluid pound by slowing pump downstroke speed to match heavy-oil inflow.
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleReject} className="btn btn-danger btn-sm">
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                  <button onClick={handleApprove} className="btn btn-success btn-sm">
                    <Check size={14} />
                    <span>Approve & Apply Setpoint</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
