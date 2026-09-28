import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Zap,
  Flame,
  Activity,
  FileText,
  Settings,
  ShieldCheck,
  ArrowRight,
  X,
  Compass,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useGuideStore } from '../state/guideStore';

interface NavigationGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const NavigationGuideModal: React.FC<NavigationGuideModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const navigate = useNavigate();
  const { isOpen: storeIsOpen, closeGuide: storeCloseGuide } = useGuideStore();

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const onClose = propOnClose || storeCloseGuide;

  const [activeTab, setActiveTab] = useState<'walkthrough' | 'roles' | 'physics' | 'sitemap'>('walkthrough');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: '20px' }}>
      <div
        className="guide-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="guide-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="guide-badge-icon">
              <Award size={22} color="#FBBF24" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  WellSync — Evaluator & User Navigation Guide
                </h2>
                <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                  SIH PS 26120
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Oil India Limited (OIL) | Baghewala Heavy Oil Field Digital Twin Surveillance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="guide-close-btn"
            title="Close Guide (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="guide-tabs-bar">
          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`guide-tab-btn ${activeTab === 'walkthrough' ? 'active' : ''}`}
          >
            <Compass size={15} />
            <span>7-Minute Live Demo Path</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`guide-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          >
            <ShieldCheck size={15} />
            <span>Roles & Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('physics')}
            className={`guide-tab-btn ${activeTab === 'physics' ? 'active' : ''}`}
          >
            <Cpu size={15} />
            <span>Physics & ML Engines</span>
          </button>
          <button
            onClick={() => setActiveTab('sitemap')}
            className={`guide-tab-btn ${activeTab === 'sitemap' ? 'active' : ''}`}
          >
            <Layers size={15} />
            <span>Feature Sitemap</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="guide-modal-body">
          {/* TAB 1: 7-MINUTE LIVE DEMO PATH */}
          {activeTab === 'walkthrough' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="guide-callout-box">
                <Sparkles size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Designed for SIH Evaluators & Judges:</strong> Follow this curated minute-by-minute evaluation journey demonstrating how WellSync bridges cyclic steam simulation (CSS) and sucker rod pump (SRP) operational silos under API RP 11L limits.
                </div>
              </div>

              {/* Step 1 */}
              <div className="guide-step-card">
                <div className="guide-step-header">
                  <div className="guide-step-num">Step 1</div>
                  <div className="guide-step-time">Minute 0:00 — 0:30</div>
                  <h3 className="guide-step-title">Field Overview & Operational KPIs</h3>
                </div>
                <p className="guide-step-desc">
                  Inspect the field-wide surveillance dashboard. Notice the <strong>Steam-Oil Ratio (SOR 2.82 m³/bbl)</strong>, <strong>Lifting Energy (38.0 kWh/bbl)</strong>, and the flashing critical alert on well <strong>BGW-003</strong>.
                </p>
                <div className="guide-step-footer">
                  <span className="guide-step-tip">Observation: Automated real-time fluid pound alarm generated from cloud database telemetry.</span>
                  <button onClick={() => handleNavigate('/')} className="btn btn-secondary btn-sm">
                    <span>Go to Overview</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="guide-step-card critical-border">
                <div className="guide-step-header">
                  <div className="guide-step-num critical-badge">Step 2</div>
                  <div className="guide-step-time">Minute 0:30 — 1:30</div>
                  <h3 className="guide-step-title">Digital Twin State (Demo Well BGW-003)</h3>
                </div>
                <p className="guide-step-desc">
                  Open the tri-panel unified digital twin. See the <strong>Beggs-Robinson viscosity surge (1,840 cP)</strong> as temperature decays post-CSS cycle to <strong>52.3°C</strong>, causing travelling valves to float through empty pump chambers.
                </p>
                <div className="guide-step-footer">
                  <span className="guide-step-tip">Key Metric: High rod failure risk score (0.71) due to traveling valve impact.</span>
                  <button onClick={() => handleNavigate('/wells/BGW-003')} className="btn btn-primary btn-sm">
                    <span>Inspect Well BGW-003</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="guide-step-card">
                <div className="guide-step-header">
                  <div className="guide-step-num">Step 3</div>
                  <div className="guide-step-time">Minute 1:30 — 3:00</div>
                  <h3 className="guide-step-title">SRP Dyno Card Diagnostics & ML Classifier</h3>
                </div>
                <p className="guide-step-desc">
                  Inspect the surface dynamometer card plot showing the classic <strong>"backward-C" downstroke collapse</strong>. The XGBoost classifier detects <strong>Fluid Pound (87% confidence)</strong>.
                </p>
                <div className="guide-step-footer">
                  <span className="guide-step-tip">Human-in-the-Loop Gate: Click "Compute Speed Optimization" $\to$ review API RP 11L stress constraint $\to$ click "Approve & Apply"</span>
                  <button onClick={() => handleNavigate('/wells/BGW-003/srp-diagnostics')} className="btn btn-secondary btn-sm">
                    <span>Open SRP Diagnostics</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="guide-step-card">
                <div className="guide-step-header">
                  <div className="guide-step-num">Step 4</div>
                  <div className="guide-step-time">Minute 3:00 — 4:30</div>
                  <h3 className="guide-step-title">CSS Cycle Parameter Optimizer (BGW-005)</h3>
                </div>
                <p className="guide-step-desc">
                  Navigate to well <strong>BGW-005</strong> (rich 5-cycle history). Adjust steam volume and soak time sliders. The engine runs Marx-Langenheim thermal balance equations and ranks designs by minimum SOR, with downstream SRP lift settings coupled.
                </p>
                <div className="guide-step-footer">
                  <span className="guide-step-tip">Pareto Ranking: Observe candidate cycles sorted by lowest SOR and projected recovery.</span>
                  <button onClick={() => handleNavigate('/wells/BGW-005/css-optimizer')} className="btn btn-secondary btn-sm">
                    <span>Open CSS Optimizer</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Step 5 */}
              <div className="guide-step-card">
                <div className="guide-step-header">
                  <div className="guide-step-num">Step 5</div>
                  <div className="guide-step-time">Minute 4:30 — 5:30</div>
                  <h3 className="guide-step-title">Operations Reporting & Audit Logs</h3>
                </div>
                <p className="guide-step-desc">
                  Switch time periods (30, 60, 90, 180 days). Observe the 90-day SOR decline curve and export automated executive summary reports.
                </p>
                <div className="guide-step-footer">
                  <span className="guide-step-tip">Export Capability: Direct browser PDF and CSV report generator with telemetry benchmarks.</span>
                  <button onClick={() => handleNavigate('/reports')} className="btn btn-secondary btn-sm">
                    <span>Open Reports Hub</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Step 6 */}
              <div className="guide-step-card">
                <div className="guide-step-header">
                  <div className="guide-step-num">Step 6</div>
                  <div className="guide-step-time">Minute 5:30 — 7:00</div>
                  <h3 className="guide-step-title">Source-Agnostic Ingestion & Admin Hub</h3>
                </div>
                <p className="guide-step-desc">
                  Demonstrate architectural source agnosticism. Switch from the built-in Field Data Simulator to the CSV Historian Batch Ingestion pipeline with schema validation.
                </p>
                <div className="guide-step-footer">
                  <span className="guide-step-tip">Interoperability: Ready to ingest SCADA historian exports or live field sensors.</span>
                  <button onClick={() => handleNavigate('/admin')} className="btn btn-secondary btn-sm">
                    <span>Open Admin Hub</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROLES & ACCOUNTS */}
          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                WellSync implements full Role-Based Access Control (RBAC) with JWT authentication. Use the <strong>Instant Demo Account Switcher</strong> on the login screen to jump into any role:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="guide-role-card">
                  <div className="guide-role-header">
                    <span className="badge badge-normal">Field Engineer</span>
                    <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>field@wellsync.demo</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                    Rajesh Kumar
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Surveillance of sucker rod pump dynamometer cards, fluid pound emergency mitigation, and Human-in-the-Loop SPM speed setpoint authorization.
                  </p>
                </div>

                <div className="guide-role-card">
                  <div className="guide-role-header">
                    <span className="badge badge-info">Reservoir Lead</span>
                    <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>reservoir@wellsync.demo</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                    Dr. Aarav Patel
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Cyclic Steam Stimulation (CSS) parameter tuning, Marx-Langenheim thermal balance exploration, soak time optimization, and SOR reduction.
                  </p>
                </div>

                <div className="guide-role-card">
                  <div className="guide-role-header">
                    <span className="badge badge-warning">Operations Manager</span>
                    <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ops@wellsync.demo</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                    Meera Sharma
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Field-wide lifting power consumption (kWh/bbl), economic benchmarks, compliance monitoring, and PDF/CSV report generation.
                  </p>
                </div>

                <div className="guide-role-card">
                  <div className="guide-role-header">
                    <span className="badge badge-critical">System Administrator</span>
                    <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>admin@wellsync.demo</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                    System Administrator
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Telemetry source switching (Simulator vs CSV Historian), operator provisioning, and audit log inspection.
                  </p>
                </div>
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                🔑 Default password for all accounts is: <strong style={{ color: 'var(--text-primary)' }}>wellsync123</strong>
              </div>
            </div>
          )}

          {/* TAB 3: PHYSICS & ML ENGINES */}
          {activeTab === 'physics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="guide-model-card">
                <div className="guide-model-title">
                  <Flame size={16} color="#F59E0B" />
                  <span>1. Beggs-Robinson Heavy Oil Viscosity Correlation</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Calibrated for Baghewala heavy crude (17–19° API). Relates reservoir temperature directly to dynamic dead-oil viscosity:
                </p>
                <div className="guide-code-box">
                  <code>μ_od = 10^(10^(3.0324 - 0.02023 · °API) · T_c^(-1.163)) - 1</code>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  As steam temperature decays from 315°C $\to$ 48°C baseline, viscosity surges from 35 cP to over 1,800 cP, physically explaining why fluid pound occurs.
                </div>
              </div>

              <div className="guide-model-card">
                <div className="guide-model-title">
                  <Cpu size={16} color="var(--accent-blue)" />
                  <span>2. ML Dynamometer Card Classifier (XGBoost / Gradient Boosting)</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Engineered 5-dimensional domain feature vector extracted from surface rod position and load curves:
                </p>
                <div className="guide-code-box">
                  <code>Features: [PPRL, MPRL, Normalized Card Area, Downstroke Load Derivative (dL/dx), Counterbalance Ratio]</code>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Classifies into 5 operating regimes: <strong>Normal</strong>, <strong>Fluid Pound</strong>, <strong>Gas Interference</strong>, <strong>Pump-off</strong>, and <strong>Worn Valve</strong>.
                </div>
              </div>

              <div className="guide-model-card">
                <div className="guide-model-title">
                  <Activity size={16} color="var(--status-normal)" />
                  <span>3. API RP 11L Rod Stress Envelope & Speed Optimization</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Constrains the proposed SPM setpoint cuts to keep peak polished rod stress within the Modified Goodman permissible stress range:
                </p>
                <div className="guide-code-box">
                  <code>σ_max = (S_u / 1.75 + 0.5625 · σ_min) · Service_Factor (0.85 for Corrosive H2S)</code>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Prevents premature mechanical rod string parting while eliminating downstroke fluid pound shock loads.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURE SITEMAP */}
          {activeTab === 'sitemap' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <table className="data-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Page / View</th>
                    <th>URL Route</th>
                    <th>Primary Functionality</th>
                    <th style={{ textAlign: 'right' }}>Jump</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Field Overview</strong></td>
                    <td><code>/</code></td>
                    <td>Field-wide SOR, power usage, high risk well alert, monitored fleet list</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/')} className="btn btn-secondary btn-sm">Visit</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Digital Twin</strong></td>
                    <td><code>/wells/:wellId</code></td>
                    <td>Tri-panel state, Beggs-Robinson viscosity curve, current cycle status</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/wells/BGW-003')} className="btn btn-secondary btn-sm">BGW-003</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>CSS Optimizer</strong></td>
                    <td><code>/wells/:wellId/css-optimizer</code></td>
                    <td>Marx-Langenheim heat balance, steam/soak sliders, Pareto SOR ranking</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/wells/BGW-005/css-optimizer')} className="btn btn-secondary btn-sm">BGW-005</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>SRP Diagnostics</strong></td>
                    <td><code>/wells/:wellId/srp-diagnostics</code></td>
                    <td>Dyno card closed-loop visualizer, ML classifier, HITL speed setpoint gate</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/wells/BGW-003/srp-diagnostics')} className="btn btn-secondary btn-sm">BGW-003</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Surveillance Alerts</strong></td>
                    <td><code>/alerts</code></td>
                    <td>Active alarms feed, fluid pound notifications, operator acknowledge actions</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/alerts')} className="btn btn-secondary btn-sm">Visit</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Operations Reports</strong></td>
                    <td><code>/reports</code></td>
                    <td>90-day SOR & lifting energy trends, PDF / CSV compliance export</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/reports')} className="btn btn-secondary btn-sm">Visit</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Admin & Ingestion Hub</strong></td>
                    <td><code>/admin</code></td>
                    <td>Swappable ingestion source (Simulator vs CSV), user management</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleNavigate('/admin')} className="btn btn-secondary btn-sm">Visit</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="guide-modal-footer">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Tip: Press <kbd style={{ padding: '2px 5px', borderRadius: '3px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>ESC</kbd> or click outside to dismiss this guide anytime.
          </div>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            <span>Close Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
