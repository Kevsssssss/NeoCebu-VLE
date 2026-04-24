import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ShieldAlert, Lock, Mail, ArrowRight, Terminal } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/Auth/admin-login', { email, password });
      login(response.data.token, response.data.expiration);
      setTimeout(() => navigate('/admin'), 100);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{
      background: `
        radial-gradient(ellipse 60% 50% at 80% 10%, rgba(239,68,68,0.06) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 10% 90%, rgba(239,68,68,0.04) 0%, transparent 55%),
        var(--bg-base)
      `,
    }}>
      {/* Back link */}
      <Link to="/login" style={{
        position: 'absolute', top: '1.5rem', left: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        zIndex: 10,
      }}>
        <div className="logo-mark">
          <div className="icon-wrap" style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(239,68,68,0.12)',
            border: '0.5px solid rgba(239,68,68,0.25)',
          }}>
            <ShieldAlert size={16} color="#f87171" />
          </div>
          <span className="wordmark desktop-only" style={{ fontSize: '0.95rem' }}>Neo-Cebu</span>
        </div>
      </Link>

      <div className="card" style={{
        width: '100%',
        maxWidth: '420px',
        border: '0.5px solid rgba(239,68,68,0.18)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Terminal size={11} color="var(--error)" />
            <p style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--error)', margin: 0,
            }}>
              SECURE ADMIN TERMINAL
            </p>
          </div>
          <h2 style={{ fontSize: '1.6rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            System Access
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Authorized personnel only — session is being logged.
          </p>
        </div>

        {/* Warning strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.625rem 0.875rem',
          background: 'rgba(239,68,68,0.06)',
          border: '0.5px solid rgba(239,68,68,0.15)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--error)',
            boxShadow: '0 0 6px var(--error)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 500 }}>
            All actions are audited and time-stamped
          </span>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ marginTop: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={11} /> Admin Email
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@neocebu.com"
            />
          </div>

          <div>
            <label>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Lock size={11} /> Master Password
              </span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.875rem',
              background: 'var(--error)',
              boxShadow: '0 4px 16px rgba(248,113,113,0.2)',
            }}
            disabled={loading}
          >
            {loading
              ? 'Verifying credentials…'
              : <><span>Initialize Access</span> <ArrowRight size={16} /></>
            }
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <Link to="/login" style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}>
            ← Return to Teacher Portal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
