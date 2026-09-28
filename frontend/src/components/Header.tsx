import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Zap, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../state/authStore';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <header className="top-navbar">
      {/* Field & System Telemetry Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-normal)',
            boxShadow: '0 0 8px var(--status-normal)'
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Telemetry Live
          </span>
        </div>

        <div style={{ height: '14px', width: '1px', backgroundColor: 'var(--border)' }} />

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Field: <strong style={{ color: 'var(--text-primary)' }}>Baghewala (Rajasthan)</strong> | Jodhpur Sandstone
        </div>
      </div>

      {/* Demo Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Shortcut button for Hackathon 7-minute demo flow */}
        <button
          onClick={() => navigate('/wells/BGW-003')}
          className="btn btn-secondary btn-sm"
          style={{
            borderColor: 'rgba(59, 130, 246, 0.4)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--accent-blue)',
            fontWeight: 600
          }}
          title="Jump directly to pre-seeded fluid pound demo well"
        >
          <Zap size={14} />
          <span>Demo Well: BGW-003</span>
        </button>

        <div style={{
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)'
        }}>
          Role: <strong style={{ color: 'var(--text-primary)' }}>{user?.role || 'Guest'}</strong>
        </div>
      </div>
    </header>
  );
};
