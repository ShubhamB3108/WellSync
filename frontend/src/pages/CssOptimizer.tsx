import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Flame,
  ChevronLeft,
  Sparkles,
  TrendingDown,
  BarChart2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { wellsApi, cssApi } from '../api/client';
import { CandidateResultsTable } from '../components/CandidateResultsTable';
import { CssCandidate } from '../types';

export const CssOptimizer: React.FC = () => {
  const { wellId } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  const [actualWellId, setActualWellId] = useState<string>('');
  const [wellName, setWellName] = useState<string>('BGW-005');
  
  // Slider states
  const [minSteam, setMinSteam] = useState<number>(240);
  const [maxSteam, setMaxSteam] = useState<number>(400);
  const [minSoak, setMinSoak] = useState<number>(48);
  const [maxSoak, setMaxSoak] = useState<number>(96);
  const [minRecovery, setMinRecovery] = useState<number>(450);

  const [candidates, setCandidates] = useState<CssCandidate[]>([]);
  const [confidence, setConfidence] = useState<string>('in_range');
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [planSuccess, setPlanSuccess] = useState<boolean>(false);

  useEffect(() => {
    const resolveWell = async () => {
      const target = wellId || 'BGW-005';
      const wellsRes = await wellsApi.list(1, 50);
      const match = wellsRes.items.find(
        (w: any) => w.name.toLowerCase() === target.toLowerCase() || w.id === target
      );
      if (match) {
        setActualWellId(match.id);
        setWellName(match.name);
      }
    };
    resolveWell();
  }, [wellId]);

  const handleRunOptimization = async () => {
    if (!actualWellId) return;
    setIsLoading(true);
    setWarningMsg(null);
    setPlanSuccess(false);
    try {
      const res = await cssApi.optimize(
        actualWellId,
        [minSteam, maxSteam],
        [minSoak, maxSoak],
        minRecovery
      );
      setCandidates(res.candidates);
      setConfidence(res.forecast_confidence);
      if (res.warning) setWarningMsg(res.warning);
    } catch (err: any) {
      setWarningMsg(err.response?.data?.detail?.message || 'Optimization failed to converge.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanCycle = async (cand: CssCandidate) => {
    if (!actualWellId) return;
    setIsPlanning(true);
    try {
      await cssApi.plan(actualWellId, {
        steam_volume_m3: cand.steam_volume_m3,
        soak_time_hours: cand.soak_time_hours,
      });
      setPlanSuccess(true);
      setTimeout(() => {
        navigate(`/wells/${wellName}`);
      }, 1500);
    } catch (err) {
      console.error('Error planning CSS cycle:', err);
    } finally {
      setIsPlanning(false);
    }
  };

  // Mock production decline forecast data based on top candidate
  const topCandidate = candidates.length > 0 ? candidates[0] : null;
  const forecastData = Array.from({ length: 12 }, (_, i) => {
    const day = (i + 1) * 10;
    const vol = topCandidate ? topCandidate.steam_volume_m3 : 320;
    // Viscosity climbs over 120 days
    const temp = 47.0 + (300.0 - 47.0) * Math.exp(-day / 45.0);
    const oilRate = (vol / 50.0) * Math.exp(-day / 50.0) + 4.0;
    return {
      day: `Day ${day}`,
      oilRate: roundVal(oilRate, 1),
      reservoirTemp: roundVal(temp, 1),
    };
  });

  function roundVal(v: number, dec: number) {
    const factor = 10 ** dec;
    return Math.round(v * factor) / factor;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => navigate(`/wells/${wellName}`)} className="btn btn-secondary btn-sm">
            <ChevronLeft size={16} />
            <span>Digital Twin</span>
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              CSS Steam Cycle Optimizer — {wellName}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Coupled Response-Surface Optimization: Minimize Steam-Oil Ratio (SOR) s.t. Recovery & Inflow Constraints
            </p>
          </div>
        </div>

        <span className="badge badge-info">
          Calibration: {confidence === 'in_range' ? 'Per-Well History' : 'Field Average'}
        </span>
      </div>

      {planSuccess && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: 'var(--status-normal)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={18} />
          <span>New CSS Steam Cycle planned successfully! Redirecting to Digital Twin...</span>
        </div>
      )}

      {warningMsg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: 'var(--status-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Left Column: Parameter Range Search Sliders */}
        <div className="panel" style={{ height: 'fit-content' }}>
          <div className="panel-title" style={{ marginBottom: '18px' }}>
            <Flame size={18} color="#F59E0B" />
            <span>Candidate Search Bounds</span>
          </div>

          {/* Steam Volume Range */}
          <div className="range-slider-group">
            <div className="range-header">
              <span style={{ color: 'var(--text-secondary)' }}>Steam Volume Range:</span>
              <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>
                {minSteam} – {maxSteam} m³
              </strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="range"
                min="180"
                max="350"
                step="10"
                value={minSteam}
                onChange={(e) => setMinSteam(Number(e.target.value))}
                className="range-input"
              />
              <input
                type="range"
                min="350"
                max="500"
                step="10"
                value={maxSteam}
                onChange={(e) => setMaxSteam(Number(e.target.value))}
                className="range-input"
              />
            </div>
          </div>

          {/* Soak Time Range */}
          <div className="range-slider-group">
            <div className="range-header">
              <span style={{ color: 'var(--text-secondary)' }}>Soak Time Range:</span>
              <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>
                {minSoak} – {maxSoak} hrs ({Math.round(minSoak / 24)}–{Math.round(maxSoak / 24)} days)
              </strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="range"
                min="24"
                max="72"
                step="6"
                value={minSoak}
                onChange={(e) => setMinSoak(Number(e.target.value))}
                className="range-input"
              />
              <input
                type="range"
                min="72"
                max="144"
                step="6"
                value={maxSoak}
                onChange={(e) => setMaxSoak(Number(e.target.value))}
                className="range-input"
              />
            </div>
          </div>

          {/* Minimum Cumulative Recovery */}
          <div className="range-slider-group">
            <div className="range-header">
              <span style={{ color: 'var(--text-secondary)' }}>Minimum Cumulative Recovery:</span>
              <strong className="mono-val" style={{ color: 'var(--status-normal)' }}>
                {minRecovery} bbl
              </strong>
            </div>
            <input
              type="range"
              min="200"
              max="700"
              step="25"
              value={minRecovery}
              onChange={(e) => setMinRecovery(Number(e.target.value))}
              className="range-input"
            />
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '12px' }}
          >
            <Sparkles size={16} />
            <span>{isLoading ? 'Searching Response Surface...' : 'Run Cycle Optimization'}</span>
          </button>
        </div>

        {/* Right Column: Production Decline Chart & Candidate Results Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Rate & Temperature Decline Forecast Chart */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <BarChart2 size={18} color="var(--accent-blue)" />
                <span>Simulated Cycle Decline Forecast (120 Days)</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Coupled Inflow: <strong className="mono-val">q(t) = PI · ΔP / μ(t)</strong>
              </div>
            </div>

            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#242C36" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#2E3742" tick={{ fill: '#8A96A3', fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    stroke="#2E3742"
                    tick={{ fill: '#8A96A3', fontSize: 11 }}
                    label={{ value: 'Oil Rate (bopd)', angle: -90, position: 'insideLeft', fill: '#22C55E', fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#2E3742"
                    tick={{ fill: '#8A96A3', fontSize: 11 }}
                    label={{ value: 'Reservoir Temp (°C)', angle: 90, position: 'insideRight', fill: '#EF4444', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A2028', borderColor: '#2E3742', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="oilRate"
                    name="Oil Production Rate (bopd)"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="reservoirTemp"
                    name="Reservoir Temp (°C)"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranked Candidates Table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <TrendingDown size={18} color="var(--status-normal)" />
                <span>Ranked Candidate Cycle Designs (Sorted by SOR)</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Click row to inspect coupled SRP initial lift settings
              </span>
            </div>

            <CandidateResultsTable
              candidates={candidates}
              onPlan={handlePlanCycle}
              isPlanning={isPlanning}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
