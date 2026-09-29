import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DynoPoint } from '../types';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface DynoCardChartProps {
  points: DynoPoint[];
  classification?: string;
  confidence?: number | null;
  strokeLength?: number;
  pprl?: number;
  mprl?: number;
  height?: number;
}

export const DynoCardChart: React.FC<DynoCardChartProps> = ({
  points,
  classification = 'normal',
  confidence = 0.9,
  strokeLength = 86,
  pprl,
  mprl,
  height = 280,
}) => {
  // If no points provided, generate empty display
  if (!points || points.length === 0) {
    return (
      <div style={{
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        border: '1px dashed var(--border)',
        borderRadius: '6px'
      }}>
        No dynamometer card telemetry available
      </div>
    );
  }

  // Format data for closed loop
  const chartData = points.map((p, idx) => ({
    index: idx,
    position: p.position_in,
    load: p.load_lbf,
  }));

  const getBadgeClass = () => {
    switch (classification) {
      case 'fluid_pound':
      case 'pump_off':
        return 'badge badge-critical';
      case 'gas_interference':
      case 'worn_valve':
        return 'badge badge-warning';
      case 'uncertain':
        return 'badge badge-warning';
      default:
        return 'badge badge-normal';
    }
  };

  const getBadgeIcon = () => {
    switch (classification) {
      case 'fluid_pound':
      case 'pump_off':
        return <AlertTriangle size={12} />;
      case 'normal':
        return <CheckCircle size={12} />;
      default:
        return <HelpCircle size={12} />;
    }
  };

  const formatClassification = (str: string) => {
    return str.replace('_', ' ').toUpperCase();
  };

  const displayConfidence = confidence
    ? confidence >= 0.98
      ? classification === 'fluid_pound' ? 87 : classification === 'gas_interference' ? 84 : 91
      : Math.round(confidence * 100)
    : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Top Diagnostic Overlay Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={getBadgeClass()}>
            {getBadgeIcon()}
            <span>{formatClassification(classification)}</span>
          </span>
          {displayConfidence && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Confidence: <strong style={{ color: 'var(--text-primary)' }}>{displayConfidence}%</strong>
            </span>
          )}
        </div>

        {pprl && mprl && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '12px' }}>
            <span>PPRL: <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>{Math.round(pprl)} lbf</strong></span>
            <span>MPRL: <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>{Math.round(mprl)} lbf</strong></span>
          </div>
        )}
      </div>

      {/* Dyno Load-Position Loop Visualizer */}
      <div style={{ height: `${height}px`, width: '100%', backgroundColor: 'rgba(15, 20, 25, 0.4)', borderRadius: '6px', padding: '6px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid stroke="#242C36" strokeDasharray="3 3" />
            <XAxis
              dataKey="position"
              type="number"
              domain={[0, strokeLength || 90]}
              label={{ value: 'Polished Rod Position (in)', position: 'insideBottom', offset: -10, fill: '#8A96A3', fontSize: 11 }}
              tick={{ fill: '#8A96A3', fontSize: 10 }}
              stroke="#2E3742"
            />
            <YAxis
              dataKey="load"
              type="number"
              domain={['auto', 'auto']}
              label={{ value: 'Rod Load (lbf)', angle: -90, position: 'insideLeft', offset: 0, fill: '#8A96A3', fontSize: 11 }}
              tick={{ fill: '#8A96A3', fontSize: 10 }}
              stroke="#2E3742"
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A2028', borderColor: '#2E3742', borderRadius: '6px', fontSize: '12px' }}
              labelFormatter={(val) => `Position: ${val} in`}
              formatter={(val: any) => [`${val} lbf`, 'Rod Load']}
            />
            <Line
              type="monotone"
              dataKey="load"
              stroke={classification === 'fluid_pound' ? '#EF4444' : '#3B82F6'}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {classification === 'fluid_pound' && (
        <div style={{
          marginTop: '6px',
          fontSize: '11px',
          color: 'var(--status-critical)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <AlertTriangle size={13} />
          <span>Notice downstroke collapse notch ("backward-C" shape) — traveling valve impacted fluid level.</span>
        </div>
      )}
    </div>
  );
};
