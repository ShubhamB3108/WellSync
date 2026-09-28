import React from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';
import { RodFailureRiskState } from '../types';

interface RiskScoreCardProps {
  risk: RodFailureRiskState;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ risk }) => {
  const getBandColor = () => {
    switch (risk.band) {
      case 'high':
        return 'var(--status-critical)';
      case 'medium':
        return 'var(--status-warning)';
      default:
        return 'var(--status-normal)';
    }
  };

  const getBandIcon = () => {
    switch (risk.band) {
      case 'high':
        return <ShieldAlert size={18} color="var(--status-critical)" />;
      case 'medium':
        return <AlertCircle size={18} color="var(--status-warning)" />;
      default:
        return <ShieldCheck size={18} color="var(--status-normal)" />;
    }
  };

  const percentage = Math.round(risk.score * 100);

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div className="panel-title">
          {getBandIcon()}
          <span>Rod-Failure Risk Index</span>
        </div>
        <span className={`badge badge-${risk.band === 'high' ? 'critical' : risk.band === 'medium' ? 'warning' : 'normal'}`}>
          {risk.band} Risk
        </span>
      </div>

      {/* Risk Gauge Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Normalized Goodman Fatigue Score</span>
          <span className="mono-val" style={{ fontSize: '20px', fontWeight: 700, color: getBandColor() }}>
            {risk.score.toFixed(2)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>/ 1.00</span>
          </span>
        </div>

        <div style={{
          height: '8px',
          width: '100%',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: getBandColor(),
            borderRadius: '4px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Contributing Factors */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Contributing Diagnostic Factors:
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {risk.factors.map((factor, idx) => (
            <li key={idx} style={{
              fontSize: '12px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px'
            }}>
              <span style={{ color: getBandColor(), marginTop: '2px' }}>•</span>
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '8px 12px',
        borderRadius: '6px',
        backgroundColor: 'rgba(36, 44, 54, 0.4)',
        border: '1px solid var(--border)',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        Model: API RP 11L Goodman diagram weighted with 90-day fluid pound incident rate.
      </div>
    </div>
  );
};
