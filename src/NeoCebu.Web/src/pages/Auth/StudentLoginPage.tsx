import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Shield, Zap, ArrowRight, ScanLine } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const StudentLoginPage: React.FC = () => {
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let scanner: Html5QrcodeScanner | null = null;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      const el = document.getElementById('reader');
      if (el) el.innerHTML = '';
      scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 240, height: 240 } }, false);
      async function onScanSuccess(decodedText: string) {
        if (scanner) await scanner.clear();
        setPayload(decodedText);
        await performLogin(decodedText);
      }
      scanner.render(onScanSuccess, () => {});
    }, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scanner) scanner.clear().catch(() => {});
    };
  }, []);

  const performLogin = async (qrPayload: string) => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/Auth/student-login', { qrPayload });
      login(response.data.token, response.data.expiration);
      setTimeout(() => navigate('/dashboard'), 100);
    } catch (err: any) {
      setError(err.response?.data || 'Invalid QR payload. Please scan your physical ID again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(payload);
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

      <div className="card" style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem',
          }}>
            STUDENT PORTAL
          </p>
          <h2 style={{ fontSize: '1.6rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Identity Verification
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Scan your physical school ID QR code to enter.
          </p>
        </div>

        {/* Scanner container */}
        <div style={{
          border: '0.5px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '1.5rem',
          minHeight: '280px',
          background: 'var(--bg-elevated)',
          position: 'relative',
        }}>
          {/* Scanning label */}
          <div style={{
            position: 'absolute', top: '0.75rem', left: '50%', transform: 'translateX(-50%)',
            zIndex: 1, pointerEvents: 'none',
          }}>
            <span className="badge badge-blue">
              <ScanLine size={11} /> SCANNING
            </span>
          </div>
          <div id="reader" style={{ minHeight: '280px' }} />
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* Manual fallback */}
        <div style={{
          borderTop: '0.5px solid var(--border-subtle)',
          paddingTop: '1.25rem',
        }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Manual Entry
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              value={payload}
              onChange={e => setPayload(e.target.value)}
              required
              placeholder="Paste your encrypted QR payload here"
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem' }}
              disabled={loading}
            >
              {loading ? 'Verifying…' : <><span>Verify & Enter</span> <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Educator?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Teacher portal</Link>
        </p>
      </div>
    </div>
  );
};

export default StudentLoginPage;
