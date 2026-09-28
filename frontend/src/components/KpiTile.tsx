import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface KpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number; // e.g. -8.5 (%)
  trendLabel?: string;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  icon?: React.ReactNode;
}

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  value,
  unit,
  trend,
  trendLabel,
  status = 'info',
  icon,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'normal':
        return 'var(--status-normal)';
      case 'warning':
        return 'var(--status-warning)';
      case 'critical':
        return 'var(--status-critical)';
      default:
        return 'var(--accent-blue)';
    }
  };

  return (
    <div className="kpi-tile">
      <div className="kpi-label">
        <span>{label}</span>
        {icon && <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span className="kpi-value" style={{ color: getStatusColor() }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>

      {trend !== undefined && (
        <div className="kpi-sub" style={{ marginTop: '6px' }}>
          {trend < 0 ? (
            <span style={{ color: 'var(--status-normal)', display: 'inline-flex', alignItems: 'center' }}>
              <ArrowDownRight size={14} /> {Math.abs(trend)}%
            </span>
          ) : trend > 0 ? (
            <span style={{ color: 'var(--status-warning)', display: 'inline-flex', alignItems: 'center' }}>
              <ArrowUpRight size={14} /> +{trend}%
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center' }}>
              <Minus size={14} /> 0%
            </span>
          )}
          <span style={{ color: 'var(--text-secondary)' }}>
            {trendLabel || 'vs prior 30d'}
          </span>
        </div>
      )}
    </div>
  );
};
