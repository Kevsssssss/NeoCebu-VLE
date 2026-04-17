import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSignalR } from '../../hooks/useSignalR';
import api from '../../services/api';
import {
  Video, MessageSquare, Shield, Clock, Send, ChevronLeft,
  Users, MoreVertical, QrCode, UserMinus, Paperclip,
  File as FileIcon, PlayCircle, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const ClassroomHub: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<any>(null);
  const [videoAccess, setVideoAccess] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [activeTab, setActiveTab] = useState<'video' | 'people' | 'chat'>('video');
  const [students, setStudents] = useState<any[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedStudentQr, setSelectedStudentQr] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [jitsiUrl, setJitsiUrl] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUserStatusChanged = useCallback((userId: string, isOnline: boolean) => {
    setStudents(prev => prev.map(s => s.id === userId ? { ...s, isOnline } : s));
  }, []);

  const { messages, sendMessage } = useSignalR(classroomId || '', token, handleUserStatusChanged, initialMessages);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classRes = await api.get(`/Classroom/${classroomId}`);
        setClassroom(classRes.data);
        const videoRes = await api.get(`/Video/${classroomId}/access`);
        setVideoAccess(videoRes.data);
        const studRes = await api.get(`/Classroom/${classroomId}/students`);
        setStudents(studRes.data);
        const histRes = await api.get(`/Classroom/${classroomId}/chat-history`);
        setInitialMessages(histRes.data);
      } catch {
        alert('Access Denied: Zero Trust protocol blocked this request.');
        navigate('/dashboard');
      }
    };
    fetchData();
  }, [classroomId, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) { sendMessage(message); setMessage(''); setTimeLeft(600); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/File/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await sendMessage('', true, res.data.fileName, res.data.fileUrl);
      setTimeLeft(600);
    } catch { alert('Failed to upload file.'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleJoinVideo = () => {
    if (videoAccess) {
      const url = `${videoAccess.providerUrl}/${videoAccess.roomName}#userInfo.displayName="${user?.userName}"&config.prejoinPageEnabled=false`;
      setJitsiUrl(url);
      setShowVideo(true);
    }
  };

  const handleViewQr = async (studentId: string) => {
    try {
      const res = await api.get(`/Teacher/student-qr/${studentId}`);
      setSelectedStudentQr(res.data.qrPayload);
      setShowQrModal(true);
      setOpenMenuId(null);
    } catch { alert('Failed to fetch QR payload.'); }
  };

  const handleUnenroll = async (studentId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from this classroom?`)) return;
    try {
      await api.post('/Teacher/unenroll-student', { classroomId, studentId });
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setOpenMenuId(null);
    } catch { alert('Failed to unenroll student.'); }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerPct = (timeLeft / 600) * 100;
  const timerColor = timeLeft > 180 ? 'var(--success)' : timeLeft > 60 ? 'var(--warning)' : 'var(--error)';

  if (!classroom) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={32} color="var(--accent)" style={{ marginBottom: '1rem', opacity: 0.6 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Initializing secure link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-layout">
      {/* ── Top Header ── */}
      <header style={{
        height: '56px',
        padding: '0 1.5rem',
        background: 'rgba(5,8,15,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost"
            style={{ padding: '0.35rem 0.5rem' }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
              {classroom.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="status-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {students.filter(s => s.isOnline).length} online · {students.length} enrolled
              </span>
            </div>
          </div>
        </div>

        {/* Right — timer + tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Session timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '0.5px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}>
            <Clock size={13} color={timerColor} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: timerColor, fontWeight: 600 }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Desktop tab switcher */}
          <div className="tab-bar desktop-only" style={{ gap: '0.2rem' }}>
            {(['video', 'people', 'chat'] as const).map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'video' && <Video size={13} />}
                {tab === 'people' && <Users size={13} />}
                {tab === 'chat' && <MessageSquare size={13} />}
                <span style={{ textTransform: 'capitalize' }}>{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="hub-body">
        {/* ── Main panel ── */}
        <main className="hub-main">
          {/* VIDEO TAB */}
          {activeTab === 'video' && (
            <>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                aspectRatio: '16/9',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {showVideo ? (
                  <>
                    <iframe
                      src={jitsiUrl}
                      allow="camera; microphone; fullscreen; display-capture"
                      style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0 }}
                      title="Classroom Video"
                    />
                    <button
                      onClick={() => setShowVideo(false)}
                      className="btn-ghost"
                      style={{
                        position: 'absolute', top: '1rem', right: '1rem', zIndex: 5,
                        background: 'rgba(5,8,15,0.7)', border: '0.5px solid var(--border-default)',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        width: 72, height: 72,
                        borderRadius: '50%',
                        background: 'var(--accent-dim)',
                        border: '0.5px solid var(--border-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto',
                      }}>
                        <Video size={28} color="var(--accent)" />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Encrypted Video Stream</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      {classroom.description || 'Join the secure classroom video session.'}
                    </p>
                    {videoAccess && (
                      <button onClick={handleJoinVideo} className="btn-primary">
                        <PlayCircle size={16} /> Join Video Session
                      </button>
                    )}
                  </div>
                )}

                {/* Stream badge */}
                <div style={{
                  position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 5,
                  pointerEvents: 'none',
                }}>
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    SECURE STREAM
                  </span>
                </div>
              </div>

              {/* Classroom info card */}
              <div className="card card-sm">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  Classroom Brief
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {classroom.description || 'No description provided.'}
                </p>
              </div>
            </>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', letterSpacing: '-0.02em' }}>Enrolled Personnel</h3>
                <span className="badge badge-muted">{students.length} students</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {students.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: 38, height: 38,
                          borderRadius: '50%',
                          background: 'var(--accent-dim)',
                          border: '0.5px solid var(--border-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: 'var(--accent)',
                        }}>
                          {s.userName?.charAt(0)?.toUpperCase() || <Users size={16} />}
                        </div>
                        {s.isOnline && (
                          <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 10, height: 10, borderRadius: '50%',
                            background: 'var(--success)',
                            border: '2px solid var(--bg-elevated)',
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                      </div>
                    </div>

                    {!user?.isStudent && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                          className="btn-ghost"
                          style={{ padding: '0.35rem' }}
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === s.id && (
                          <div style={{
                            position: 'absolute', top: '100%', right: 0,
                            background: 'var(--bg-elevated)',
                            border: '0.5px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.35rem',
                            zIndex: 20,
                            minWidth: 170,
                            boxShadow: 'var(--shadow-lg)',
                          }}>
                            <button
                              onClick={() => handleViewQr(s.id)}
                              className="btn-ghost"
                              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.5rem 0.625rem' }}
                            >
                              <QrCode size={13} /> View Neural ID
                            </button>
                            <button
                              onClick={() => handleUnenroll(s.id, s.userName)}
                              className="btn-ghost"
                              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.5rem 0.625rem', color: 'var(--error)' }}
                            >
                              <UserMinus size={13} /> Remove Student
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT TAB (mobile only) */}
          {activeTab === 'chat' && (
            <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: '60vh' }}>
              <ChatPanel
                messages={messages}
                user={user}
                message={message}
                setMessage={setMessage}
                handleSend={handleSend}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                chatEndRef={chatEndRef}
              />
            </div>
          )}
        </main>

        {/* ── Chat Sidebar (desktop) ── */}
        <aside className="hub-sidebar">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '-0.01em' }}>Secure Chat</span>
            <span className="badge badge-muted" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
              E2E
            </span>
          </div>
          <ChatPanel
            messages={messages}
            user={user}
            message={message}
            setMessage={setMessage}
            handleSend={handleSend}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            chatEndRef={chatEndRef}
          />
        </aside>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-only" style={{
        borderTop: '0.5px solid var(--border-subtle)',
        background: 'rgba(5,8,15,0.95)',
        padding: '0.5rem 1rem',
        display: 'flex', gap: '0.5rem',
        flexShrink: 0,
      }}>
        {(['video', 'people', 'chat'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ flex: 1, flexDirection: 'column', padding: '0.5rem' }}
          >
            {tab === 'video' && <Video size={18} />}
            {tab === 'people' && <Users size={18} />}
            {tab === 'chat' && <MessageSquare size={18} />}
            <span style={{ fontSize: '0.65rem', textTransform: 'capitalize', marginTop: '0.2rem' }}>{tab}</span>
          </button>
        ))}
      </nav>

      {/* ── QR Modal ── */}
      {showQrModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Student Neural ID</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
              Provide this QR code to restore the student's access.
            </p>
            <div style={{
              display: 'inline-block',
              background: '#fff',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.75rem',
            }}>
              {selectedStudentQr && <QRCodeSVG value={selectedStudentQr} size={180} />}
            </div>
            <button onClick={() => setShowQrModal(false)} className="btn-primary" style={{ width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Shared Chat Panel component ── */
const ChatPanel: React.FC<{
  messages: any[];
  user: any;
  message: string;
  setMessage: (v: string) => void;
  handleSend: (e: React.FormEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
}> = ({ messages, user, message, setMessage, handleSend, fileInputRef, handleFileUpload, chatEndRef }) => (
  <>
    <div className="chat-messages">
      {messages.map((msg, i) => {
        const isOwn = msg.userId === user?.id;
        const isSystem = msg.user === 'System';
        return (
          <div key={i} style={{ alignSelf: isOwn ? 'flex-end' : isSystem ? 'center' : 'flex-start', maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {!isOwn && !isSystem && (
              <span style={{
                fontSize: '0.7rem',
                color: msg.isTeacher ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: msg.isTeacher ? 600 : 400,
                paddingLeft: '0.2rem',
              }}>
                {msg.user}{msg.isTeacher && ' · Teacher'}
              </span>
            )}
            <div className={`msg-bubble ${isOwn ? 'mine' : isSystem ? 'system' : 'theirs'}`}
              style={msg.isTeacher && !isOwn ? { border: '0.5px solid var(--border-accent)' } : {}}>
              {msg.isFile ? (
                msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName}
                    style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'block' }}
                    onClick={() => window.open(msg.fileUrl, '_blank')}
                  />
                ) : (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    onClick={() => window.open(msg.fileUrl, '_blank')}
                  >
                    <FileIcon size={14} />
                    <span style={{ textDecoration: 'underline', fontSize: '0.8rem' }}>{msg.fileName}</span>
                  </div>
                )
              ) : msg.text}
            </div>
          </div>
        );
      })}
      <div ref={chatEndRef} />
    </div>

    <form
      onSubmit={handleSend}
      style={{
        padding: '0.875rem',
        borderTop: '0.5px solid var(--border-subtle)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}
    >
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="btn-ghost"
        style={{ padding: '0.375rem', flexShrink: 0, color: 'var(--text-muted)' }}
      >
        <Paperclip size={16} />
      </button>
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Secure message…"
        style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.875rem', marginBottom: 0 }}
      />
      <button
        type="submit"
        className="btn-ghost"
        style={{ padding: '0.375rem', flexShrink: 0, color: 'var(--accent)' }}
      >
        <Send size={16} />
      </button>
    </form>
  </>
);

export default ClassroomHub;
