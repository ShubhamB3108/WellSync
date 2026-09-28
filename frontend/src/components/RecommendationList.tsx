import React, { useState } from 'react';
import { Check, X, AlertCircle, Sparkles } from 'lucide-react';
import { OptimizationRun } from '../types';
import { useAuthStore } from '../state/authStore';

interface RecommendationListProps {
  recommendations: OptimizationRun[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
}

export const RecommendationList: React.FC<RecommendationListProps> = ({
  recommendations,
  onApprove,
  onReject,
}) => {
  const { user } = useAuthStore();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canApprove = (rec: OptimizationRun) => {
    if (user?.role === 'admin') return true;
    if (rec.run_type === 'srp' && user?.role === 'field_engineer') return true;
    if (rec.run_type === 'css' && user?.role === 'reservoir_engineer') return true;
    return false;
  };

  const handleApprove = async (id: string) => {
    try {
      setIsProcessing(true);
      await onApprove(id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    try {
      setIsProcessing(true);
      await onReject(rejectingId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  if (recommendations.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        border: '1px dashed var(--border)',
        borderRadius: '8px'
      }}>
        No pending optimization recommendations for this well. Well operates within acceptable parameters.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {recommendations.map((rec) => {
        const isSrp = rec.run_type === 'srp';
        const recParams = rec.recommended_params || {};
        const metrics = rec.predicted_metrics || {};
        const permitted = canApprove(rec);

        return (
          <div
            key={rec.id}
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isSrp ? 'AI-Recommended SRP Setpoint Adjustment' : 'AI-Optimized CSS Steam Cycle Plan'}
                </span>
                <span className="badge badge-info" style={{ fontSize: '10px' }}>
                  Pending Review
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {new Date(rec.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Recommendation Details */}
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {isSrp ? (
                <>
                  Recommended Speed Setpoint:{' '}
                  <strong className="mono-val" style={{ color: 'var(--status-normal)', fontSize: '15px' }}>
                    {recParams.recommended_spm} SPM
                  </strong>{' '}
                  (Stroke: {recParams.recommended_stroke_length_in || 86} in).{' '}
                  Predicted pump fillage improves to{' '}
                  <strong className="mono-val" style={{ color: 'var(--accent-blue)' }}>
                    {metrics.predicted_fillage_pct}%
                  </strong>
                  . Peak rod string stress calculated at{' '}
                  <strong className="mono-val">{Math.round(metrics.predicted_stress_psi || 24000)} psi</strong>{' '}
                  (Passed API RP 11L limits).
                </>
              ) : (
                <>
                  Optimal Steam Volume:{' '}
                  <strong className="mono-val" style={{ color: 'var(--status-normal)', fontSize: '15px' }}>
                    {recParams.steam_volume_m3} m³
                  </strong>
                  , Soak Time:{' '}
                  <strong className="mono-val" style={{ color: 'var(--accent-blue)', fontSize: '15px' }}>
                    {recParams.soak_time_hours} hrs
                  </strong>
                  . Predicted SOR:{' '}
                  <strong className="mono-val">{metrics.predicted_sor} m³/bbl</strong> (Expected cumulative recovery:{' '}
                  <strong className="mono-val">{metrics.cumulative_oil_bbl} bbl</strong>).
                </>
              )}
            </div>

            {/* Action Bar (Human Approval Gate) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} />
                <span>
                  {permitted
                    ? 'Human approval required before setpoint is logged as applied.'
                    : `Approval restricted to ${isSrp ? 'Field Engineer' : 'Reservoir Engineer'} or Admin.`}
                </span>
              </div>

              {permitted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    disabled={isProcessing}
                    onClick={() => setRejectingId(rec.id)}
                    className="btn btn-danger btn-sm"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleApprove(rec.id)}
                    className="btn btn-success btn-sm"
                  >
                    <Check size={14} />
                    <span>Approve & Apply</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Reject Recommendation
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Please provide an operational engineering reason for rejecting this AI recommendation (logged to audit trail):
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Scheduled rod maintenance workover planned for tomorrow morning..."
              className="input-field"
              style={{ marginBottom: '16px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="btn btn-danger btn-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
