import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Shield, Lock, Mail, User, Key, ArrowRight } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', userName: '', password: '', adminSecret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/Auth/register-teacher', formData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      const backendError = err.response?.data;
      if (backendError?.message) {
        setError(backendError.message);
      } else if (Array.isArray(backendError)) {
        setError(backendError.map((e: any) => e.description).join(', '));
      } else {
        setError('Registration failed. Please check the Admin Secret.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-wrapper">
      <Link to="/" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
        <div className="logo-mark">
          <div className="icon-wrap" style={{ width: 32, height: 32, borderRadius: 8 }}>
            <Shield size={16} color="var(--accent)" />
          </div>
          <span className="wordmark desktop-only" style={{ fontSize: '0.95rem' }}>Neo-Cebu</span>
        </div>
      </Link>

      <div className="card" style={{ width: '100%', maxWidth: '480px', position: 'relative' }}>
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem',
          }}>
            EDUCATOR REGISTRATION
          </p>
          <h2 style={{ fontSize: '1.6rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Join the network
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Requires an admin verification secret provided by your institution.
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            <label style={{ marginTop: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={12} /> FULL NAME / USERNAME
              </span>
            </label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={12} /> INSTITUTIONAL EMAIL
              </span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="juan@edu.ph"
            />
          </div>

          <div>
            <label>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={12} /> PASSWORD
              </span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
          </div>

          <div>
            <label>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={12} /> ADMIN VERIFICATION SECRET
              </span>
            </label>
            <input
              type="password"
              name="adminSecret"
              value={formData.adminSecret}
              onChange={handleChange}
              required
              placeholder="Required for educator verification"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Contact your school administrator to obtain this key.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', padding: '0.875rem' }}
            disabled={loading}
          >
            {loading ? 'Verifying credentials…' : <><span>Create Educator Account</span> <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
