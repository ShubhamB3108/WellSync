import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Flame,
  Zap,
  ShieldCheck,
  TrendingDown,
  Layers
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { reportsApi } from '../api/client';
import { FieldSummary } from '../types';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<FieldSummary | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(90);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await reportsApi.getFieldSummary(periodDays);
      setSummary(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [periodDays]);

  const handleDownloadPdf = () => {
    reportsApi.downloadReport('pdf', periodDays);
  };

  const handleDownloadCsv = () => {
    reportsApi.downloadReport('csv', periodDays);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Export Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Field Operations & Efficiency Report
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Oil India Limited — Baghewala Heavy Oil Field Surveillance, Energy Metrics & Rod Reliability
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="input-field"
            style={{ width: '130px', padding: '6px 10px' }}
          >
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 180 Days</option>
          </select>

          <button onClick={handleDownloadCsv} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button onClick={handleDownloadPdf} className="btn btn-primary btn-sm">
            <FileText size={14} />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Two Trend Visualizer Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* SOR Trend Chart */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Flame size={18} color="#F59E0B" />
              <span>Steam-Oil Ratio (SOR) Trend — m³/bbl</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--status-normal)', fontWeight: 600 }}>
              Current: {summary?.current_sor.toFixed(2)} m³/bbl (Target: {summary?.target_sor.toFixed(2)})
            </div>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.sor_trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#242C36" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#2E3742" tick={{ fill: '#8A96A3', fontSize: 11 }} />
                <YAxis domain={[2.0, 4.0]} stroke="#2E3742" tick={{ fill: '#8A96A3', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1A2028', borderColor: '#2E3742', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="value" name="Field SOR (m³/bbl)" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#sorGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lifting Energy Trend Chart */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Zap size={18} color="var(--accent-blue)" />
              <span>Lifting Energy Cost — kWh/bbl</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--status-normal)', fontWeight: 600 }}>
              Current: {summary?.current_energy_kwh_per_bbl.toFixed(1)} kWh/bbl (Target: {summary?.target_energy_kwh_per_bbl.toFixed(1)})
            </div>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.energy_per_bbl_trend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#242C36" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#2E3742" tick={{ fill: '#8A96A3', fontSize: 11 }} />
                <YAxis domain={[25, 55]} stroke="#2E3742" tick={{ fill: '#8A96A3', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1A2028', borderColor: '#2E3742', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="value" name="Lifting Energy (kWh/bbl)" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#energyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Well Reliability & Risk Leaderboard */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="panel-title">
            <ShieldCheck size={18} color="var(--accent-blue)" />
            <span>Well Risk Profile & Efficiency Leaderboard</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Prioritized by Goodman Rod Mechanical Failure Risk
          </span>
        </div>

        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Well ID</th>
                <th>API Gravity</th>
                <th>Status</th>
                <th>Operating Condition</th>
                <th>Current SOR</th>
                <th>Failure Risk Score</th>
                <th>Risk Classification</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.wells_leaderboard || []).map((w, idx) => (
                <tr key={idx}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{w.well_name}</strong>
                  </td>
                  <td>
                    <span className="mono-val">{w.api_gravity}° API</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--status-normal)' }}>● {w.status}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${w.classification === 'fluid_pound' ? 'critical' : 'normal'}`}>
                      {w.classification.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <strong className="mono-val">{w.sor.toFixed(2)} m³/bbl</strong>
                  </td>
                  <td>
                    <strong className="mono-val" style={{ color: w.risk_band === 'high' ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {w.risk_score.toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge badge-${w.risk_band === 'high' ? 'critical' : w.risk_band === 'medium' ? 'warning' : 'normal'}`}>
                      {w.risk_band.toUpperCase()} RISK
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
