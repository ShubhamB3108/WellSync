import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Lock, Mail, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuthStore } from '../state/authStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('field@wellsync.demo');
  const [password, setPassword] = useState('wellsync123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);
      login(data);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail?.message || 'Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('wellsync123');
    setIsLoading(true);
    setErrorMsg(null);
    authApi
      .login(roleEmail, 'wellsync123')
      .then((data) => {
        login(data);
        navigate('/');
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.detail?.message || 'Quick login failed.');
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '36px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)'
          }}>
            <Cpu size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            WellSync
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            AI-Enabled Well-to-Surface Digital Twin | Baghewala Field
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--status-critical)',
            fontSize: '12px',
            marginBottom: '18px'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
              Operational Account Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@wellsync.demo"
                className="input-field"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '14px', fontWeight: 600 }}
          >
            {isLoading ? 'Authenticating...' : 'Sign In to WellSync'}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Demo Fast-Login Selector for SIH Judges */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', textAlign: 'center' }}>
            Instant Demo Account Switcher:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('field@wellsync.demo')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start' }}
            >
              <Zap size={13} color="var(--status-warning)" />
              <span>Field Engineer</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('reservoir@wellsync.demo')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start' }}
            >
              <Zap size={13} color="#F59E0B" />
              <span>Reservoir Lead</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ops@wellsync.demo')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start' }}
            >
              <ShieldCheck size={13} color="var(--status-normal)" />
              <span>Ops Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@wellsync.demo')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', justifyContent: 'flex-start' }}
            >
              <ShieldCheck size={13} color="var(--accent-blue)" />
              <span>Admin Hub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
