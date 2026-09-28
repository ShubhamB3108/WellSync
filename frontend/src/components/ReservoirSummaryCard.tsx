import React from 'react';
import { Flame, Thermometer, Droplet, Clock } from 'lucide-react';
import { ReservoirState, CurrentCycleState } from '../types';

interface ReservoirSummaryCardProps {
  reservoir: ReservoirState;
  currentCycle: CurrentCycleState | null;
  apiGravity: number;
}

export const ReservoirSummaryCard: React.FC<ReservoirSummaryCardProps> = ({
  reservoir,
  currentCycle,
  apiGravity,
}) => {
  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div className="panel-title">
          <Flame size={18} color="#F59E0B" />
          <span>Thermal & Viscosity Twin State</span>
        </div>
        <span className="badge badge-info">
          {reservoir.forecast_confidence === 'in_range' ? 'Calibrated Model' : 'Field Default'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        {/* Estimated Temperature */}
        <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Thermometer size={14} color="#EF4444" />
            <span>Reservoir Temp</span>
          </div>
          <div className="mono-val" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {reservoir.estimated_temp_c}°C
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Baseline: 46–48°C
          </div>
        </div>

        {/* Dynamic Dead-Oil Viscosity */}
        <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Droplet size={14} color="#3B82F6" />
            <span>Dead-Oil Viscosity</span>
          </div>
          <div className="mono-val" style={{ fontSize: '20px', fontWeight: 700, color: reservoir.estimated_viscosity_cp > 2000 ? 'var(--status-critical)' : 'var(--accent-blue)' }}>
            {Math.round(reservoir.estimated_viscosity_cp)} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>cP</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Beggs-Robinson ({apiGravity}° API)
          </div>
        </div>
      </div>

      {/* Cycle Timing Info */}
      <div style={{
        padding: '12px',
        backgroundColor: 'rgba(36, 44, 54, 0.4)',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} />
            <span>Days Since Last Steam:</span>
          </span>
          <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>
            {reservoir.days_since_last_steam} Days
          </strong>
        </div>

        {currentCycle && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Active Cycle:
            </span>
            <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: 600 }}>
              Cycle #{currentCycle.cycle_number} ({currentCycle.status.toUpperCase()})
            </span>
          </div>
        )}
      </div>

      {/* Explanatory Callout */}
      <div style={{
        marginTop: 'auto',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        lineHeight: 1.4
      }}>
        As heat bleeds off into sandstone, heavy crude viscosity climbs exponentially, reducing inflow and leading to fluid pound unless SPM is matched.
      </div>
    </div>
  );
};
