import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Users, Settings, Monitor, Trash2, ShieldAlert, LogOut,
  ExternalLink, Save, Key, ChevronLeft, Activity,
  ShieldCheck, Server, Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Teacher { id: string; userName: string; email: string; }
interface Classroom { id: string; name: string; teacherName: string; studentCount: number; }
interface GroupedClassrooms { [teacherName: string]: Classroom[]; }

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'teachers' | 'settings'>('teachers');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groupedClassrooms, setGroupedClassrooms] = useState<GroupedClassrooms>({});
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [adminSecret, setAdminSecret] = useState('');
  
  // Account settings state
  const [newUserName, setNewUserName] = useState(user?.userName || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'teachers') {
        const tRes = await api.get('/admin/teachers');
        setTeachers(tRes.data);
        const cRes = await api.get('/admin/classrooms');
        const grouped = cRes.data.reduce((acc: GroupedClassrooms, curr: Classroom) => {
          if (!acc[curr.teacherName]) acc[curr.teacherName] = [];
          acc[curr.teacherName].push(curr);
          return acc;
        }, {});
        setGroupedClassrooms(grouped);
      } else {
        const res = await api.get('/admin/settings');
        setAdminSecret(res.data.adminSecret);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTeacher = async (id: string) => {
    if (!window.confirm('CRITICAL: Terminate this educator account? All associated data will be purged.')) return;
    try {
      await api.delete(`/admin/teacher/${id}`);
      setTeachers(teachers.filter(t => t.id !== id));
      setMessage('Account terminated successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { console.error('Termination failed', err); }
  };

  const updateSecret = async () => {
    try {
      await api.post('/admin/settings/secret', { newSecret: adminSecret });
      setMessage('Security protocol updated.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { console.error('Update failed', err); }
  };

  const updateAccount = async () => {
    try {
      setLoading(true);
      await api.post('/admin/update-account', {
        newUserName,
        newPassword: newPassword || null
      });
      setMessage('Account updated. Log out and in to refresh session.');
      setNewPassword('');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('Update failed', err);
      alert('Failed to update account settings.');
    } finally {
      setLoading(false);
    }
  };

  const visitRoom = (id: string) => {
    navigate(`/classroom/${id}`);
  };

  const filteredTeachers = teachers.filter(t =>
    t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 260,
        flexShrink: 0,
        borderRight: '0.5px solid var(--border-subtle)',
        background: 'rgba(11,16,32,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '1.75rem 1.25rem',
        zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', paddingLeft: '0.25rem' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'rgba(239,68,68,0.1)',
            border: '0.5px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <ShieldAlert size={16} color="#f87171" />
            {/* Online pulse */}
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 9, height: 9, borderRadius: '50%',
              background: 'var(--success)',
              border: '2px solid var(--bg-surface)',
              boxShadow: '0 0 6px var(--success)',
            }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>Neo-Cebu</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--error)', marginTop: '1px' }}>Admin Control</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {([
            { id: 'teachers', label: 'Teacher Hub', icon: <Users size={16} /> },
            { id: 'settings', label: 'System Settings', icon: <Settings size={16} /> },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setViewingTeacher(null); }}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: activeTab === item.id ? '0.5px solid var(--border-accent)' : '0.5px solid transparent',
                background: activeTab === item.id ? 'var(--accent-dim)' : 'transparent',
                color: activeTab === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (activeTab !== item.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (activeTab !== item.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
            >
              <span style={{ color: activeTab === item.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* User row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: '#f87171',
              flexShrink: 0,
            }}>
              {user?.userName?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.userName}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Administrator</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={15} /> Log Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: 260, flex: 1, padding: '2.5rem 2.5rem', minHeight: '100vh' }}>

        {/* Toast notification */}
        {message && (
          <div style={{
            position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 100,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            background: 'var(--success-dim)',
            border: '0.5px solid rgba(52,211,153,0.25)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{message}</span>
          </div>
        )}

        {/* Page header */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {viewingTeacher && (
                <button
                  onClick={() => setViewingTeacher(null)}
                  className="btn-ghost"
                  style={{ padding: '0.35rem 0.5rem' }}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: 800, letterSpacing: '-0.03em',
              }}>
                {activeTab === 'teachers'
                  ? (viewingTeacher ? `Monitoring: ${viewingTeacher.userName}` : 'Teacher Hub')
                  : 'System Configuration'}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                padding: '0.2rem 0.75rem',
                background: 'rgba(239,68,68,0.1)',
                border: '0.5px solid rgba(239,68,68,0.2)',
                borderRadius: 999,
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--error)',
              }}>ADMINISTRATOR</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {viewingTeacher
                  ? `Viewing classrooms for ${viewingTeacher.email}`
                  : `Authenticated as ${user?.userName}`}
              </span>
            </div>
          </div>

          {/* Search */}
          {!viewingTeacher && activeTab === 'teachers' && (
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
              <Search size={14} style={{
                position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="Search teachers…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
              />
            </div>
          )}
        </header>

        {/* ── TEACHERS TAB — list ── */}
        {activeTab === 'teachers' && !viewingTeacher && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? (
              <div style={{ padding: '6rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Syncing database…
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="card" style={{ padding: '5rem', textAlign: 'center' }}>
                <Server size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No teacher accounts found.</p>
              </div>
            ) : filteredTeachers.map(t => (
              <div key={t.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 46, height: 46, borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-dim)',
                    border: '0.5px solid var(--border-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem',
                    color: 'var(--accent)', flexShrink: 0,
                  }}>
                    {t.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{t.userName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.email}</span>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.id.split('-')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setViewingTeacher(t)}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                  >
                    <Monitor size={13} /> View Classrooms
                  </button>
                  <button
                    onClick={() => deleteTeacher(t.id)}
                    className="btn-ghost"
                    style={{ padding: '0.5rem', color: 'var(--text-muted)' }}
                    title="Purge Account"
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'var(--error-dim)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TEACHERS TAB — classroom drill-down ── */}
        {activeTab === 'teachers' && viewingTeacher && (
          <>
            {!groupedClassrooms[viewingTeacher.userName] || groupedClassrooms[viewingTeacher.userName].length === 0 ? (
              <div className="card" style={{ padding: '5rem', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <ShieldCheck size={28} color="var(--text-muted)" />
                </div>
                <h3 style={{ fontWeight: 500, fontSize: '1rem', marginBottom: '0.4rem' }}>No active classrooms</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  This educator hasn't created any classrooms yet.
                </p>
                <button onClick={() => setViewingTeacher(null)} className="btn-outline">
                  ← Back to educators
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}>
                {groupedClassrooms[viewingTeacher.userName].map(c => (
                  <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 5px var(--success)' }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {c.id.split('-')[0]}…
                          </span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                          {c.name}
                        </h3>
                      </div>
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                        {c.studentCount} enrolled
                      </span>
                    </div>
                    <button
                      onClick={() => visitRoom(c.id)}
                      className="btn-outline"
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    >
                      <ExternalLink size={13} /> Hidden Access
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 560 }}>
            {/* Security Protocol Card */}
            <div className="card">
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Security Protocol
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Modify the global authorization secret required for educator registration. This is a critical security parameter.
                </p>
              </div>

              {/* Danger notice */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239,68,68,0.06)',
                border: '0.5px solid rgba(239,68,68,0.15)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
              }}>
                <ShieldAlert size={14} color="var(--error)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--error)', fontWeight: 500 }}>
                  Changing this key will invalidate all pending registrations.
                </span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ marginTop: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Key size={11} /> Admin Secret Key
                  </span>
                </label>
                <input
                  type="text"
                  value={adminSecret}
                  onChange={e => setAdminSecret(e.target.value)}
                  placeholder="Generate new secure token…"
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </div>

              <button
                onClick={updateSecret}
                className="btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <Save size={15} /> Save Changes
              </button>
            </div>

            {/* Admin Account Management Card */}
            <div className="card">
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Account Management
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Update your administrative credentials. Leave the password field blank to keep your current password.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ marginTop: 0 }}>ADMIN USERNAME</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="Enter new username..."
                  />
                </div>

                <div>
                  <label>NEW PASSWORD (OPTIONAL)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                onClick={updateAccount}
                className="btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
                disabled={loading}
              >
                {loading ? 'Updating...' : <><Save size={15} /> Update Credentials</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
