import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Flame,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { wellsApi, srpApi, optimizationApi } from '../api/client';
import { DigitalTwinState, DynoCard } from '../types';
import { ReservoirSummaryCard } from '../components/ReservoirSummaryCard';
import { DynoCardChart } from '../components/DynoCardChart';
import { RiskScoreCard } from '../components/RiskScoreCard';
import { RecommendationList } from '../components/RecommendationList';
import { DatabaseLoader } from '../components/DatabaseLoader';

export const WellDetail: React.FC = () => {
  const { wellId } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  const [twinState, setTwinState] = useState<DigitalTwinState | null>(null);
  const [latestCard, setLatestCard] = useState<DynoCard | null>(null);
  const [actualWellId, setActualWellId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOptimizingSrp, setIsOptimizingSrp] = useState<boolean>(false);

  const loadWellState = async () => {
    try {
      setIsLoading(true);
      // Resolve wellId if name was passed (e.g. BGW-003)
      let targetId = wellId || 'BGW-003';
      const wellsRes = await wellsApi.list(1, 50);
      const match = wellsRes.items.find(
        (w: any) => w.name.toLowerCase() === targetId.toLowerCase() || w.id === targetId
      );
      if (match) {
        targetId = match.id;
        setActualWellId(targetId);
      }

      const [state, cards] = await Promise.all([
        wellsApi.getState(targetId),
        srpApi.getDynoCards(targetId, 1),
      ]);
      setTwinState(state);
      if (cards && cards.length > 0) {
        setLatestCard(cards[0]);
      }
    } catch (err) {
      console.error('Error loading well digital twin state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWellState();
    const interval = setInterval(loadWellState, 15000);
    return () => clearInterval(interval);
  }, [wellId]);

  const handleApproveRec = async (runId: string) => {
    await optimizationApi.approve(runId);
    await loadWellState();
  };

  const handleRejectRec = async (runId: string, reason?: string) => {
    await optimizationApi.reject(runId, reason);
    await loadWellState();
  };

  const handleRequestSrpOptimize = async () => {
    if (!actualWellId) return;
    try {
      setIsOptimizingSrp(true);
      await srpApi.optimize(actualWellId);
      await loadWellState();
    } catch (err) {
      console.error('Error generating SRP recommendation:', err);
    } finally {
      setIsOptimizingSrp(false);
    }
  };

  if (isLoading && !twinState) {
    return (
      <DatabaseLoader
        variant="full"
        message={`Loading Digital Twin for ${wellId || 'well'} from database...`}
        submessage="Querying rod string kinematics, reservoir thermodynamic states, and latest dynamometer telemetry..."
      />
    );
  }

  if (!twinState) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Well state could not be loaded from database. Please return to Field Overview.
      </div>
    );
  }

  const isFluidPound = twinState.srp.classification === 'fluid_pound';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate('/')} className="btn btn-secondary btn-sm" title="Back to Overview">
            <ChevronLeft size={16} />
            <span>Overview</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {twinState.well_name} — Digital Twin
              </h1>
              <span className={`badge badge-${isFluidPound ? 'critical' : 'normal'}`}>
                {twinState.srp.classification?.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Baghewala Jodhpur Sandstone | API Gravity: {twinState.api_gravity}° API | Baseline Temp: {twinState.reservoir_temp_baseline_c}°C
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading && (
            <DatabaseLoader variant="inline" message="Syncing twin..." />
          )}
          <button
            onClick={() => navigate(`/wells/${twinState.well_name}/css-optimizer`)}
            className="btn btn-secondary btn-sm"
          >
            <Flame size={14} color="#F59E0B" />
            <span>Optimize CSS</span>
          </button>
          <button
            onClick={() => navigate(`/wells/${twinState.well_name}/srp-diagnostics`)}
            className="btn btn-secondary btn-sm"
          >
            <Activity size={14} color="var(--accent-blue)" />
            <span>SRP Diagnostics</span>
          </button>
          <button onClick={loadWellState} className="btn btn-secondary btn-sm" title="Refresh Telemetry">
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tri-Panel Unified Digital Twin Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Panel 1: Thermal Decline & Viscosity State */}
        <ReservoirSummaryCard
          reservoir={twinState.reservoir}
          currentCycle={twinState.current_cycle}
          apiGravity={twinState.api_gravity}
        />

        {/* Panel 2: Sucker Rod Pump Dynamometer State */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <div className="panel-title">
              <Activity size={18} color="var(--accent-blue)" />
              <span>SRP Mechanical Surface State</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Speed: <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>{twinState.srp.current_spm} SPM</strong>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '260px' }}>
            {latestCard ? (
              <DynoCardChart
                points={latestCard.points}
                classification={twinState.srp.classification}
                confidence={twinState.srp.classification_confidence}
                strokeLength={twinState.srp.stroke_length_in}
                pprl={latestCard.pprl_lbf}
                mprl={latestCard.mprl_lbf}
                height={210}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No dynamometer card telemetry available
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Pump Fillage:{' '}
              <strong className="mono-val" style={{ color: twinState.srp.estimated_fillage_pct < 70 ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                {twinState.srp.estimated_fillage_pct}%
              </strong>
            </span>
            <button
              onClick={handleRequestSrpOptimize}
              disabled={isOptimizingSrp}
              className="btn btn-primary btn-sm"
            >
              <Sparkles size={13} />
              <span>{isOptimizingSrp ? 'Optimizing...' : 'Calculate Safe SPM'}</span>
            </button>
          </div>
        </div>

        {/* Panel 3: Goodman Mechanical Rod-Failure Risk Index */}
        <RiskScoreCard risk={twinState.rod_failure_risk} />
      </div>

      {/* Pending Optimization Recommendations (Human Approval Gate) */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Sparkles size={18} color="var(--accent-blue)" />
            <span>Digital Twin Recommendations & Human-in-the-Loop Approval</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Safety Gate: Recommendations require explicit operator authorization
          </span>
        </div>

        <RecommendationList
          recommendations={twinState.pending_recommendations}
          onApprove={handleApproveRec}
          onReject={handleRejectRec}
        />
      </div>
    </div>
  );
};
