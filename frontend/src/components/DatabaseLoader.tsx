import React from 'react';
import { Database, Loader2 } from 'lucide-react';

interface DatabaseLoaderProps {
  message?: string;
  submessage?: string;
  variant?: 'full' | 'panel' | 'inline' | 'overlay';
  minHeight?: string | number;
}

export const DatabaseLoader: React.FC<DatabaseLoaderProps> = ({
  message = 'Loading data from database...',
  submessage = 'Querying Baghewala reservoir & well telemetry store...',
  variant = 'panel',
  minHeight,
}) => {
  if (variant === 'inline') {
    return (
      <div className="db-loader-inline">
        <div className="db-loader-inline-icons">
          <Database size={15} className="db-loader-icon" />
          <Loader2 size={13} className="spin" />
        </div>
        <span className="db-loader-inline-text">{message}</span>
      </div>
    );
  }

  const isFull = variant === 'full';
  const isOverlay = variant === 'overlay';

  return (
    <div
      className={`db-loader-container ${isFull ? 'db-loader-full' : ''} ${isOverlay ? 'db-loader-overlay' : ''}`}
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="db-loader-card">
        {/* Animated Icon Orb */}
        <div className="db-loader-orb-wrap">
          <div className="db-loader-glow-ring" />
          <div className="db-loader-orb">
            <Database size={isFull ? 30 : 24} className="db-loader-db-icon" />
            <Loader2 size={isFull ? 56 : 46} className="db-loader-spinner spin" />
          </div>
        </div>

        {/* Informative Text */}
        <div className="db-loader-content">
          <div className="db-loader-title">{message}</div>
          {submessage && <div className="db-loader-submessage">{submessage}</div>}

          {/* Database Querying Activity Signal */}
          <div className="db-loader-signal">
            <span className="db-signal-dot dot-1" />
            <span className="db-signal-dot dot-2" />
            <span className="db-signal-dot dot-3" />
            <span className="db-signal-label">POSTGRESQL TELEMETRY REPOSITORY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
