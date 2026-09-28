import React, { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  Database,
  Users,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Loader2,
  Globe,
  Activity,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Radio,
  Zap,
  Server
} from 'lucide-react';
import { adminApi, uptimeApi } from '../api/client';
import { User } from '../types';
import { DatabaseLoader } from '../components/DatabaseLoader';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sources' | 'users' | 'domain_monitor'>('sources');
  const [currentSource, setCurrentSource] = useState<string>('simulator');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User management
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('field_engineer');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Domain Monitor & Uptime Telemetry
  const [uptimeStats, setUptimeStats] = useState<any>(null);
  const [isLoadingUptime, setIsLoadingUptime] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ status: string; latencyMs?: number; timestamp: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchUptimeStats = async () => {
    try {
      setIsLoadingUptime(true);
      const data = await uptimeApi.getStats();
      setUptimeStats(data);
    } catch (err) {
      console.error('Error fetching uptime stats:', err);
    } finally {
      setIsLoadingUptime(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUptimeStats();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await uptimeApi.ping();
      const elapsed = Math.round(performance.now() - start);
      setPingResult({
        status: 'success',
        latencyMs: elapsed,
        timestamp: new Date().toLocaleTimeString(),
      });
      const data = await uptimeApi.getStats();
      setUptimeStats(data);
    } catch (err) {
      setPingResult({
        status: 'error',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsPinging(false);
    }
  };


  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setIsUploading(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const res = await adminApi.switchIngestionSource('csv_import', csvFile);
      setImportResult(res);
      setCurrentSource('csv_import');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.message || 'CSV schema validation failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSwitchSimulator = async () => {
    try {
      await adminApi.switchIngestionSource('simulator');
      setCurrentSource('simulator');
      setImportResult({ message: 'Switched back to Simulated Field Data generator.' });
    } catch (err: any) {
      setErrorMsg('Failed to switch source.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      await adminApi.createUser({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
      });
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      await fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.message || 'Error creating user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Administration & Ingestion Hub
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Configure SCADA/Historian Data Adapters, Switch Between Simulator and CSV Import, Manage User Roles
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('sources')}
          className={`btn btn-sm ${activeTab === 'sources' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Database size={14} />
          <span>Data Sources & CSV Ingestion (Journey 4 Demo)</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Users size={14} />
          <span>Operational User Accounts & RBAC</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('domain_monitor');
            fetchUptimeStats();
          }}
          className={`btn btn-sm ${activeTab === 'domain_monitor' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Globe size={14} />
          <span>Domain Monitor (domain-monitor.io) & Keep-Alive</span>
        </button>
      </div>

      {/* Tab 1: Data Sources & CSV Import */}
      {activeTab === 'sources' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Database size={18} color="var(--accent-blue)" />
                <span>Active Ingestion Source</span>
              </div>
              <span className={`badge badge-${currentSource === 'simulator' ? 'normal' : 'info'}`}>
                {currentSource === 'simulator' ? 'Simulated Field Data' : 'CSV Batch Historian'}
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              WellSync uses a decoupled <code style={{ color: 'var(--accent-blue)', background: 'var(--bg-elevated)', padding: '2px 4px', borderRadius: '4px' }}>IngestionSource</code> interface.
              The exact same processing, Beggs-Robinson viscosity model, and dynamometer classifier pipeline consumes either the live synthetic generator or real field historian exports with zero code change.
            </p>

            <div style={{ padding: '14px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Current Stream Status:
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {currentSource === 'simulator'
                  ? 'Continuous background ticks every 10s generating Baghewala 17-19° API sandstone cycles and dyno cards.'
                  : 'Batch imported historian CSV data actively populating the Digital Twin state.'}
              </div>
            </div>

            <button onClick={handleSwitchSimulator} className="btn btn-secondary btn-sm">
              <span>Reset to Simulated Field Data</span>
            </button>
          </div>

          {/* CSV Import Upload Form */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Upload size={18} color="var(--status-normal)" />
                <span>Import Historian SCADA CSV</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Demo Journey 4
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Select and import a CSV file (e.g. from <code style={{ color: 'var(--accent-blue)' }}>backend/tests/fixtures/sample_historian_export.csv</code>):
            </p>

            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--status-critical)',
                fontSize: '12px',
                marginBottom: '14px'
              }}>
                {errorMsg}
              </div>
            )}

            {importResult && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: 'var(--status-normal)',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={16} />
                <span>{importResult.message}</span>
              </div>
            )}

            <form onSubmit={handleUploadCsv} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                className="input-field"
              />

              <button
                type="submit"
                disabled={!csvFile || isUploading}
                className="btn btn-primary"
                style={{ padding: '10px' }}
              >
                {isUploading ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <FileSpreadsheet size={15} />
                )}
                <span>{isUploading ? 'Validating & Ingesting...' : 'Switch Source & Ingest CSV'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: User Accounts & RBAC */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* User List */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="panel-title">
                <Users size={18} color="var(--accent-blue)" />
                <span>Authorized Operators & Role-Based Permissions</span>
              </div>
            </div>

            <div className="data-table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email Account</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '36px 0' }}>
                        <DatabaseLoader
                          variant="panel"
                          message="Querying authorized user directory..."
                          submessage="Loading role-based access control records from database..."
                        />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No users configured.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td><strong style={{ color: 'var(--text-primary)' }}>{u.full_name}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td><span style={{ color: 'var(--status-normal)' }}>Active</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Form */}
          <div className="panel">
            <div className="panel-title" style={{ marginBottom: '16px' }}>
              <Plus size={18} color="var(--status-normal)" />
              <span>Provision New User</span>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. S. Sen"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="operator@oilindia.in"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="input-field"
                >
                  <option value="field_engineer">Field Engineer</option>
                  <option value="reservoir_engineer">Reservoir Engineer</option>
                  <option value="ops_manager">Operations Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isCreatingUser && <Loader2 size={13} className="spin" />}
                <span>{isCreatingUser ? 'Creating...' : 'Add Account'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Domain Monitor & Keep-Alive */}
      {activeTab === 'domain_monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Banner */}
          <div className="panel" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.08))',
            borderColor: 'rgba(59, 130, 246, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#0F1419',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                }}>
                  <Globe size={24} color="#3B82F6" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Domain Monitor (domain-monitor.io) Integration
                    </h2>
                    <span className="badge badge-normal" style={{ fontSize: '10px' }}>
                      24/7 Anti-Sleep Active
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Render free web services spin down after 15 minutes of inactivity. Monitor via <strong>domain-monitor.io</strong> to keep the backend permanently awake.
                  </p>
                </div>
              </div>

              <a
                href="https://domain-monitor.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <span>Open domain-monitor.io</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '20px' }}>
            {/* Left: Setup Instructions & Endpoints */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Server size={18} color="var(--accent-blue)" />
                  <span>Setup Guide for domain-monitor.io</span>
                </div>
                <span className="badge badge-info">1-Minute Setup</span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Follow these simple steps on <a href="https://domain-monitor.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>domain-monitor.io</a> to ensure zero cold-start delay for evaluators:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Step 1: Create an Uptime Monitor
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    In your Domain Monitor dashboard, select <strong>"Uptime Monitoring"</strong> or <strong>"Add Monitor"</strong>.
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Step 2: Paste the Health Probe URL
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <code style={{
                      flex: 1,
                      backgroundColor: '#0F1419',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#22C55E',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {uptimeStats?.domain_monitor_setup?.recommended_url || 'https://wellsync-backend-1emc.onrender.com/health'}
                    </code>
                    <button
                      onClick={() => handleCopy(uptimeStats?.domain_monitor_setup?.recommended_url || 'https://wellsync-backend-1emc.onrender.com/health')}
                      className="btn btn-secondary btn-sm"
                      title="Copy URL"
                    >
                      {copiedUrl?.includes('/health') ? <Check size={13} color="#22C55E" /> : <Copy size={13} />}
                      <span>{copiedUrl?.includes('/health') ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Step 3: Set Check Frequency to 5 or 10 Minutes
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Because Render sleeps after <strong>15 minutes</strong>, choosing a <strong>5 or 10-minute interval</strong> guarantees that Render’s idle timer is continuously reset before sleeping.
                  </div>
                </div>
              </div>

              {/* Secondary Ping URL */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Alternative dedicated ping endpoint (Supports GET & HEAD):
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={{ fontSize: '11px', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {uptimeStats?.domain_monitor_setup?.alternative_url || 'https://wellsync-backend-1emc.onrender.com/api/v1/uptime/ping'}
                  </code>
                  <button
                    onClick={() => handleCopy(uptimeStats?.domain_monitor_setup?.alternative_url || 'https://wellsync-backend-1emc.onrender.com/api/v1/uptime/ping')}
                    className="btn btn-secondary btn-sm"
                  >
                    {copiedUrl?.includes('/uptime/ping') ? <Check size={13} color="#22C55E" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Telemetry & Test Ping */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Activity size={18} color="var(--status-normal)" />
                    <span>Live Uptime Telemetry</span>
                  </div>
                  <button
                    onClick={handleTestPing}
                    disabled={isPinging}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isPinging ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
                    <span>{isPinging ? 'Pinging...' : 'Test Ping Now'}</span>
                  </button>
                </div>

                {pingResult && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: pingResult.status === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${pingResult.status === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: pingResult.status === 'success' ? 'var(--status-normal)' : 'var(--status-critical)', fontWeight: 600 }}>
                      {pingResult.status === 'success'
                        ? `✓ Ping Successful (${pingResult.latencyMs}ms roundtrip)`
                        : '✗ Ping Failed to reach backend'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {pingResult.timestamp}
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Server Uptime</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {uptimeStats?.uptime_human || 'Active'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Pings Recorded</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '4px', fontFamily: 'monospace' }}>
                      {uptimeStats?.total_pings_received ?? 0}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Last Ping Source</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uptimeStats?.last_ping_source || 'direct'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Internal Scheduler</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--status-normal)', marginTop: '4px' }}>
                      Every {uptimeStats?.render_config?.interval_minutes || 10} min
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Layer Anti-Sleep Protection Status */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Shield size={18} color="var(--accent-blue)" />
                    <span>4-Layer Anti-Sleep Defense</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>1. domain-monitor.io Cloud Probe</span>
                    <span className="badge badge-normal" style={{ fontSize: '10px' }}>Recommended</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>2. GitHub Actions Automated Cron</span>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>Every 10 min</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>3. Internal Backend Self-Pinger</span>
                    <span className="badge badge-normal" style={{ fontSize: '10px' }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>4. Browser Dashboard Active Keeper</span>
                    <span className="badge badge-normal" style={{ fontSize: '10px' }}>Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

