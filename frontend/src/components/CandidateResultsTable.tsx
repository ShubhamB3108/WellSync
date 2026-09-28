import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Check } from 'lucide-react';
import { CssCandidate } from '../types';

interface CandidateResultsTableProps {
  candidates: CssCandidate[];
  onPlan: (candidate: CssCandidate) => void;
  isPlanning?: boolean;
}

export const CandidateResultsTable: React.FC<CandidateResultsTableProps> = ({
  candidates,
  onPlan,
  isPlanning = false,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  if (!candidates || candidates.length === 0) {
    return (
      <div style={{
        padding: '30px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        border: '1px dashed var(--border)',
        borderRadius: '8px'
      }}>
        Adjust parameter sliders on the left and click "Run Optimization" to search candidate CSS plans.
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
            <th>Rank</th>
            <th>Steam Volume</th>
            <th>Soak Time</th>
            <th>Predicted Recovery</th>
            <th>Predicted SOR</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((cand, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <React.Fragment key={idx}>
                <tr style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(36, 44, 54, 0.4)' : undefined }}>
                  <td onClick={() => toggleExpand(idx)} style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </td>
                  <td onClick={() => toggleExpand(idx)}>
                    <span className="badge badge-info" style={{ padding: '2px 7px' }}>
                      #{idx + 1} {idx === 0 ? 'Optimal' : ''}
                    </span>
                  </td>
                  <td onClick={() => toggleExpand(idx)}>
                    <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>
                      {cand.steam_volume_m3} m³
                    </strong>
                  </td>
                  <td onClick={() => toggleExpand(idx)}>
                    <strong className="mono-val">{cand.soak_time_hours} hrs</strong> ({Math.round(cand.soak_time_hours / 24)} days)
                  </td>
                  <td onClick={() => toggleExpand(idx)}>
                    <strong className="mono-val" style={{ color: 'var(--status-normal)' }}>
                      {cand.predicted_cumulative_oil_bbl} bbl
                    </strong>
                  </td>
                  <td onClick={() => toggleExpand(idx)}>
                    <strong className="mono-val" style={{ color: idx === 0 ? 'var(--status-normal)' : 'var(--text-primary)', fontSize: '14px' }}>
                      {cand.predicted_sor.toFixed(2)} m³/bbl
                    </strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      disabled={isPlanning}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlan(cand);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <Check size={13} />
                      <span>Plan Cycle</span>
                    </button>
                  </td>
                </tr>

                {/* Expandable Downstream SRP Impact Row */}
                {isExpanded && (
                  <tr>
                    <td colSpan={7} style={{ backgroundColor: 'rgba(15, 20, 25, 0.7)', padding: '16px 24px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        borderLeft: '3px solid var(--accent-blue)',
                        paddingLeft: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={18} color="var(--accent-blue)" />
                          <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                            Predicted Downstream SRP Lift Impact:
                          </strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Viscosity at Cycle Start:{' '}
                          <strong className="mono-val" style={{ color: 'var(--text-primary)' }}>
                            {cand.predicted_srp_impact.est_viscosity_at_start_cp} cP
                          </strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Recommended Initial Speed:{' '}
                          <strong className="mono-val" style={{ color: 'var(--status-normal)' }}>
                            {cand.predicted_srp_impact.recommended_initial_spm} SPM
                          </strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Expected Pump Fillage:{' '}
                          <strong className="mono-val" style={{ color: 'var(--accent-blue)' }}>
                            {cand.predicted_srp_impact.expected_fillage_pct}%
                          </strong>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
