import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
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
      const response = await api.post('/Auth/teacher-login', { email, password });
      login(response.data.token, response.data.expiration);
      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Invalid credentials or access denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Back to landing */}
      <Link to="/" style={{
        position: 'fixed', top: '1.5rem', left: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <div className="logo-mark">
          <div className="icon-wrap" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <Shield size={14} color="var(--accent)" />
          </div>
          <span className="wordmark" style={{ fontSize: '0.95rem' }}>Neo-Cebu</span>
        </div>
      </Link>

      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem',
          }}>
            TEACHER PORTAL
          </p>
          <h2 style={{ fontSize: '1.6rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sign in to your educator account
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Email */}
          <div>
            <label style={{ marginTop: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={11} /> Email Address
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="teacher@edu.ph"
            />
          </div>

          {/* Password */}
          <div>
            <label>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Lock size={11} /> Password
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
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating…' : <><span>Sign In</span> <ArrowRight size={16} /></>}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          margin: '1.75rem 0',
          borderTop: '0.5px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <span style={{
            position: 'absolute',
            background: 'var(--bg-card)',
            padding: '0 0.75rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>OR</span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            New educator?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>Create account</Link>
          </p>
          <p style={{ color: 'var(--text-secondary)' }}>
            Student?{' '}
            <Link to="/student-login" style={{ fontWeight: 600 }}>Login via QR Code</Link>
          </p>
          <div style={{ marginTop: '1rem', borderTop: '0.5px solid var(--border-subtle)', paddingTop: '1rem' }}>
             <Link to="/admin-login" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                Administrator access &rarr;
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
