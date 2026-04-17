import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Plus, Users, Layout, LogOut, QrCode, Trash2, ChevronRight, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' });
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentData, setStudentData] = useState({ email: '', userName: '' });
  const [generatedPayload, setGeneratedPayload] = useState<string | null>(null);

  const fetchClassrooms = async () => {
    try {
      const endpoint = user?.isStudent ? '/Classroom/student-classrooms' : '/Teacher/my-classrooms';
      const response = await api.get(endpoint);
      setClassrooms(response.data);
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    }
  };

  useEffect(() => {
    if (user) fetchClassrooms();
  }, [user]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/Teacher/create-classroom', newClassroom);
      setClassrooms([...classrooms, response.data]);
      setShowCreateModal(false);
      setNewClassroom({ name: '', description: '' });
    } catch {
      alert('Failed to create classroom');
    }
  };

  const handleProvisionStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/Teacher/provision-student', {
        ...studentData,
        classroomId: selectedClassId,
      });
      setGeneratedPayload(response.data.qrPayload);
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to provision student');
    }
  };

  const handleDeleteClassroom = async (classroomId: string, name: string) => {
    if (!window.confirm(`Decommission "${name}"? All students will be unlinked.`)) return;
    try {
      await api.delete(`/Teacher/delete-classroom/${classroomId}`);
      setClassrooms(classrooms.filter(c => c.id !== classroomId));
    } catch (err: any) {
      alert(err.response?.data || 'Failed to delete classroom.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* ── Topbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(5,8,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid var(--border-subtle)',
        padding: '0 2rem',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div className="logo-mark">
          <div className="icon-wrap" style={{ width: 32, height: 32 }}>
            <Shield size={16} color="var(--accent)" />
          </div>
          <span className="wordmark" style={{ fontSize: '0.95rem' }}>Neo-Cebu</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.userName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {user?.isStudent ? 'Student' : 'Educator'}
            </div>
          </div>
          <button onClick={logout} className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        {/* ── Page header ── */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>
              {user?.isStudent ? 'STUDENT CONSOLE' : 'TEACHER COMMAND'}
            </p>
            <h1 style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}>Virtual Classrooms</h1>
          </div>
          {!user?.isStudent && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={16} /> New Classroom
            </button>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Active Rooms', value: classrooms.length },
            { label: 'Role', value: user?.isStudent ? 'Student' : 'Educator' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.5rem',
              minWidth: 120,
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Classrooms grid ── */}
        {classrooms.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <Layout size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '1rem' }}>
              No active classrooms in this sector
            </h3>
            {!user?.isStudent && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
                style={{ marginTop: '1.5rem' }}
              >
                <Plus size={16} /> Create your first classroom
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {classrooms.map(c => (
              <div
                key={c.id}
                className="classroom-card"
                onClick={() => window.location.href = `/classroom/${c.id}`}
              >
                {/* Delete button */}
                {!user?.isStudent && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteClassroom(c.id, c.name); }}
                    className="btn-ghost"
                    style={{
                      position: 'absolute', top: '1rem', right: '1rem',
                      color: 'var(--text-muted)', padding: '0.4rem',
                    }}
                    title="Decommission Classroom"
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Card content */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                  </div>
                  <h3 style={{
                    fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em',
                    paddingRight: '2rem', marginBottom: '0.5rem',
                  }}>
                    {c.name}
                  </h3>
                  <p style={{
                    fontSize: '0.85rem', color: 'var(--text-secondary)',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {c.description || 'No description provided.'}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.625rem', marginTop: 'auto' }}>
                  {!user?.isStudent && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedClassId(c.id);
                        setShowProvisionModal(true);
                      }}
                      className="btn-outline"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                    >
                      <Users size={16} /> Provision
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); window.location.href = `/classroom/${c.id}`; }}
                    className="btn-primary"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                  >
                    Enter Room <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Classroom Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Initialize New Classroom</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Set up a new virtual learning environment.
              </p>
            </div>
            <form onSubmit={handleCreateClassroom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ marginTop: 0 }}>Classroom Name</label>
                <input
                  value={newClassroom.name}
                  onChange={e => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  required
                  placeholder="CS101: Cryptography Basics"
                />
              </div>
              <div>
                <label>Description</label>
                <input
                  value={newClassroom.description}
                  onChange={e => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  placeholder="Context-aware learning module for 2026."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Classroom</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Provision Student Modal ── */}
      {showProvisionModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Provision Student ID</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Generate a secure QR identity for a new student.
              </p>
            </div>

            {!generatedPayload ? (
              <form onSubmit={handleProvisionStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ marginTop: 0 }}>Student Email</label>
                  <input
                    type="email"
                    value={studentData.email}
                    onChange={e => setStudentData({ ...studentData, email: e.target.value })}
                    required
                    placeholder="student@edu.ph"
                  />
                </div>
                <div>
                  <label>Student Name</label>
                  <input
                    value={studentData.userName}
                    onChange={e => setStudentData({ ...studentData, userName: e.target.value })}
                    required
                    placeholder="Maria Clara"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Generate Neural ID</button>
                  <button
                    type="button"
                    onClick={() => { setShowProvisionModal(false); setStudentData({ email: '', userName: '' }); }}
                    className="btn-outline"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-block',
                  background: '#fff',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '1.5rem',
                  border: '0.5px solid var(--border-default)',
                }}>
                  <QRCodeSVG value={generatedPayload} size={180} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Secure payload generated</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Print this QR code as the student's physical ID card.
                  </p>
                </div>

                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.875rem',
                  fontSize: '0.65rem',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  color: 'var(--text-muted)',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  maxHeight: '80px',
                  overflow: 'hidden',
                }}>
                  {generatedPayload}
                </div>

                <button
                  onClick={() => { setGeneratedPayload(null); setShowProvisionModal(false); setStudentData({ email: '', userName: '' }); }}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Complete Provisioning
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
