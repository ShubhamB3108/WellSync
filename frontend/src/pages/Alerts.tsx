import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, Filter, RefreshCw, Check } from 'lucide-react';
import { alertsApi } from '../api/client';
import { Alert } from '../types';
import { DatabaseLoader } from '../components/DatabaseLoader';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [ackFilter, setAckFilter] = useState<string>('unack');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const ackVal = ackFilter === 'unack' ? false : ackFilter === 'ack' ? true : undefined;
      const res = await alertsApi.list(1, 50, severityFilter || undefined, ackVal);
      setAlerts(res.items);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, ackFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await alertsApi.acknowledge(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged_at: new Date().toISOString() } : a))
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Operational Surveillance Alerts Feed
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Real-Time Notifications: Fluid Pound, Mechanical Stress Overload, High Failure Risk & Thermal Anomaly Detection
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading && (
            <DatabaseLoader variant="inline" message="Syncing alerts..." />
          )}
          <button onClick={fetchAlerts} className="btn btn-secondary btn-sm" title="Refresh Feed">
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel" style={{ padding: '14px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Filter size={15} />
          <span>Filter By:</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSeverityFilter('')}
            className={`btn btn-sm ${severityFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Severities
          </button>
          <button
            onClick={() => setSeverityFilter('critical')}
            className={`btn btn-sm ${severityFilter === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Critical Only
          </button>
          <button
            onClick={() => setSeverityFilter('warning')}
            className={`btn btn-sm ${severityFilter === 'warning' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Warnings
          </button>
        </div>

        <div style={{ height: '18px', width: '1px', backgroundColor: 'var(--border)' }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setAckFilter('unack')}
            className={`btn btn-sm ${ackFilter === 'unack' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Active (Unacknowledged)
          </button>
          <button
            onClick={() => setAckFilter('ack')}
            className={`btn btn-sm ${ackFilter === 'ack' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Acknowledged
          </button>
          <button
            onClick={() => setAckFilter('all')}
            className={`btn btn-sm ${ackFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Well</th>
                <th>Alert Event</th>
                <th>Diagnostic Message</th>
                <th>Triggered</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 0' }}>
                    <DatabaseLoader
                      variant="panel"
                      message="Querying surveillance alerts database..."
                      submessage="Filtering real-time operational events, rod load overstress alarms, and anomaly reports..."
                    />
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    No active alerts matching filter. All monitored wells within normal operational envelopes.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const isAck = !!alert.acknowledged_at;
                  return (
                    <tr key={alert.id}>
                      <td>
                        <span className={`badge badge-${alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info'}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{alert.well_name || 'Well'}</strong>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {alert.alert_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ maxWidth: '420px', whiteSpace: 'normal', color: 'var(--text-primary)' }}>
                        {alert.message}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isAck ? (
                          <span style={{ fontSize: '11px', color: 'var(--status-normal)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={13} />
                            <span>Acknowledged</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            <Check size={13} />
                            <span>Acknowledge</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
