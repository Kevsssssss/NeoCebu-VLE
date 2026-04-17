import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, MessageSquare, Zap, Lock, Video, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <Zap size={20} />,
    title: 'QR Authentication',
    desc: 'Password-less security for students using encrypted physical ID payloads.',
  },
  {
    icon: <Shield size={20} />,
    title: 'Zero Trust Access',
    desc: 'Context-aware classroom isolation ensuring strictly authorized access only.',
  },
  {
    icon: <Users size={20} />,
    title: 'Teacher Provisioned',
    desc: 'Absolute control over student accounts. No public registration for students.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Secure Chat',
    desc: 'Real-time SignalR communication with aggressive XSS sanitization.',
  },
  {
    icon: <Video size={20} />,
    title: 'Encrypted Video',
    desc: 'Jitsi-powered classroom video streams with role-based access control.',
  },
  {
    icon: <Lock size={20} />,
    title: 'Audit Logging',
    desc: 'Every action is timestamped and verifiable across the entire network.',
  },
];

const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* ── Topbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        borderBottom: '0.5px solid var(--border-subtle)',
        background: 'rgba(5,8,15,0.8)',
        backdropFilter: 'blur(12px)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '60px',
      }}>
        <div className="logo-mark">
          <div className="icon-wrap">
            <Shield size={18} color="var(--accent)" />
          </div>
          <span className="wordmark">Neo-Cebu</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/login" className="btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Teacher Portal
          </Link>
          <Link to="/student-login" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
            Student Login
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '8rem 2rem 6rem',
        textAlign: 'center',
        background: `
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,140,255,0.1) 0%, transparent 65%),
          var(--bg-base)
        `,
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <span className="badge badge-blue">
            <span className="status-dot" style={{ width: 6, height: 6 }} />
            SYSTEM ONLINE — 2026
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          maxWidth: '700px',
          margin: '0 auto 1.5rem',
        }}>
          The Secure<br />
          <span style={{ color: 'var(--accent)' }}>Virtual Classroom</span>
          <br />for Modern Schools
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          maxWidth: '560px',
          margin: '0 auto 3rem',
          lineHeight: 1.7,
        }}>
          Zero Trust protocols, QR-based student authentication, and encrypted real-time communication. Built for public education resilience.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/student-login" className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Student Login <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-outline" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Teacher Portal
          </Link>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{
        borderTop: '0.5px solid var(--border-subtle)',
        borderBottom: '0.5px solid var(--border-subtle)',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '4rem',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Active Classrooms', value: '2,400+' },
          { label: 'Students Enrolled', value: '18,000+' },
          { label: 'Uptime SLA', value: '99.9%' },
          { label: 'Data Encrypted', value: '100%' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem' }}>CAPABILITIES</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Everything you need,<br />nothing you don't</h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div style={{
                width: 40, height: 40,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-dim)',
                border: '0.5px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: '1rem',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        margin: '0 2rem 6rem',
        maxWidth: '1100px',
        marginLeft: 'auto',
        marginRight: 'auto',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: '4rem 3rem',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
          Ready to secure your classroom?
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Teachers register with an admin verification secret. Students are provisioned by their teacher.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn-primary" style={{ padding: '0.875rem 2rem' }}>
            Register as Educator
          </Link>
          <Link to="/student-login" className="btn-outline" style={{ padding: '0.875rem 2rem' }}>
            I'm a Student
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '0.5px solid var(--border-subtle)',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        letterSpacing: '0.02em',
      }}>
        © 2026 Neo-Cebu Security Framework &nbsp;·&nbsp; Designed for public education resilience
      </footer>
    </div>
  );
};

export default LandingPage;
