import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Flame,
  Activity,
  AlertTriangle,
  FileText,
  Shield,
  LogOut,
  Cpu
} from 'lucide-react';
import { useAuthStore } from '../state/authStore';

interface SidebarProps {
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ alertCount = 0 }) => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { to: '/', label: 'Field Overview', icon: LayoutDashboard },
    { to: '/wells/BGW-003', label: 'Well Digital Twin', icon: Layers },
    { to: '/wells/BGW-003/css-optimizer', label: 'CSS Optimizer', icon: Flame },
    { to: '/wells/BGW-003/srp-diagnostics', label: 'SRP Diagnostics', icon: Activity },
    { to: '/alerts', label: 'Alerts Feed', icon: AlertTriangle, badge: alertCount },
    { to: '/reports', label: 'Reports & KPIs', icon: FileText },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin Hub', icon: Shield });
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    reservoir_engineer: 'Reservoir Engineer',
    field_engineer: 'Field Engineer',
    ops_manager: 'Operations Manager',
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(59, 130, 246, 0.4)'
          }}>
            <Cpu size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              WellSync
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OIL Baghewala Twin
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={17} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 ? (
                <span style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--status-critical)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  border: '1px solid rgba(239, 68, 68, 0.4)'
                }}>
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Role Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'rgba(15, 20, 25, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.full_name || 'Demo Engineer'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 500 }}>
              {user ? (roleLabels[user.role] || user.role) : 'Guest'}
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Logout"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
