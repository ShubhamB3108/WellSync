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
  Loader2
} from 'lucide-react';
import { adminApi } from '../api/client';
import { User } from '../types';
import { DatabaseLoader } from '../components/DatabaseLoader';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sources' | 'users'>('sources');
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

  useEffect(() => {
    fetchUsers();
  }, []);

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
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
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
    </div>
  );
};
