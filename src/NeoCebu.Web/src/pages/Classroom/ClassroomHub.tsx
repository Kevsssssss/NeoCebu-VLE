import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSignalR } from '../../hooks/useSignalR';
import api from '../../services/api';
import {
  Video, MessageSquare, Shield, Clock, Send, ChevronLeft,
  Users, MoreVertical, QrCode, UserMinus, Paperclip,
  File as FileIcon, PlayCircle, X, BookOpen, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const ClassroomHub: React.FC = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<any>(null);
  const [videoAccess, setVideoAccess] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [idleTime, setIdleTime] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'people' | 'chat' | 'blackboard'>('video');
  const [students, setStudents] = useState<any[]>([]);
  const [blackboardItems, setBlackboardItems] = useState<any[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedStudentQr, setSelectedStudentQr] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  
  // Jitsi related state and refs
  const [showVideo, setShowVideo] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // Blackboard Handlers
  const [bbForm, setBbForm] = useState({ title: '', description: '' });
  const [bbFile, setBbFile] = useState<{ name: string, url: string } | null>(null);
  const bbFileInputRef = useRef<HTMLInputElement>(null);

  const handleUserStatusChanged = useCallback((userId: string, isOnline: boolean) => {
    setStudents(prev => prev.map(s => s.id === userId ? { ...s, isOnline } : s));
  }, []);

  const handleVideoCallStatusChanged = useCallback((isActive: boolean) => {
    console.log("SignalR: Video call status changed:", isActive);
    setIsVideoCallActive(isActive);
    if (isActive && user?.isStudent) {
      alert("A teacher has started a video call.");
    }
  }, [user?.isStudent]);

  const handleKicked = useCallback((roomId: string) => {
    if (roomId === classroomId) {
      alert("You have been kicked from this room by a moderator.");
      navigate('/dashboard');
    }
  }, [classroomId, navigate]);

  const { messages, sendMessage, startVideoSession, endVideoSession, kickUser, connectionState } = useSignalR(
    classroomId || '', 
    token, 
    handleUserStatusChanged, 
    initialMessages,
    handleVideoCallStatusChanged,
    handleKicked
  );

  // Inactivity Timer Logic
  useEffect(() => {
    const handleActivity = () => {
      setIdleTime(0);
      setIsCountingDown(false);
      setTimeLeft(600);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isCountingDown) {
        setIdleTime(prev => {
          if (prev + 1 >= 60) {
            setIsCountingDown(true);
            return 60;
          }
          return prev + 1;
        });
      } else {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            console.log("Session timeout: Logging out user.");
            logout();
            navigate('/login');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCountingDown, logout, navigate]);

  // Restore missing fetchData effect
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      console.log("ClassroomHub: Starting data fetch for", classroomId);
      try {
        const [classRes, videoRes, studRes, histRes, bbRes] = await Promise.all([
          api.get(`/Classroom/${classroomId}`),
          api.get(`/Video/${classroomId}/access`),
          api.get(`/Classroom/${classroomId}/students`),
          api.get(`/Classroom/${classroomId}/chat-history`),
          api.get(`/Classroom/${classroomId}/blackboard`)
        ]);

        if (!isMounted) return;

        console.log("ClassroomHub: Data fetched successfully", classRes.data.name);
        setClassroom(classRes.data);
        setVideoAccess(videoRes.data);
        setStudents(studRes.data);
        setInitialMessages(histRes.data);
        setBlackboardItems(bbRes.data);
      } catch (err) {
        console.error("ClassroomHub: Fetch error", err);
        if (isMounted) {
          alert('Access Denied: Zero Trust protocol blocked this request.');
          navigate('/dashboard');
        }
      }
    };
    if (classroomId && token) fetchData();
    return () => { isMounted = false; };
  }, [classroomId, navigate, token]);

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

  const handleJoinVideo = async () => {
    if (videoAccess) {
      setLoading(true);
      try {
        if (!user?.isStudent) {
          console.log("Teacher starting video session...");
          await startVideoSession();
        }
        setShowVideo(true);
      } catch (err: any) {
        console.error("Failed to start/join video session:", err);
        alert("Neural Link failed: Ensure your secure connection is active.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUnenroll = async (studentId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from this classroom?`)) return;
    try {
      await api.post('/Teacher/unenroll-student', { classroomId, studentId });
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setOpenMenuId(null);
    } catch { alert('Failed to unenroll student.'); }
  };

  const handleViewQr = async (studentId: string) => {
    try {
      const res = await api.get(`/Teacher/student-qr/${studentId}`);
      setSelectedStudentQr(res.data.qrPayload);
      setShowQrModal(true);
      setOpenMenuId(null);
    } catch { alert('Failed to fetch QR payload.'); }
  };

  const handleBbFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setLoading(true);
      const res = await api.post('/File/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBbFile({ name: res.data.fileName, url: res.data.fileUrl });
    } catch { alert('Failed to upload file.'); }
    finally { setLoading(false); }
  };

  const handlePostBbItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bbForm.title) return;
    try {
      setLoading(true);
      const res = await api.post(`/Classroom/${classroomId}/blackboard`, {
        title: bbForm.title,
        description: bbForm.description,
        fileName: bbFile?.name,
        fileUrl: bbFile?.url
      });
      setBlackboardItems([res.data, ...blackboardItems]);
      setBbForm({ title: '', description: '' });
      setBbFile(null);
    } catch { alert('Failed to post to blackboard.'); }
    finally { setLoading(false); }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const timerColor = timeLeft > 180 ? 'var(--success)' : timeLeft > 60 ? 'var(--warning)' : 'var(--error)';

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Jitsi External API
  useEffect(() => {
    if (showVideo && videoAccess && jitsiContainerRef.current && !jitsiApiRef.current) {
      const domain = 'meet.jit.si';
      const isMobile = window.innerWidth <= 768;
      
      const options = {
        roomName: videoAccess.roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: user?.userName || 'User'
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          p2p: { enabled: false },
          disableResponsiveGui: false,
          disableAudioLevels: isMobile,
          videoQuality: {
              common: {
                  maxConfig: 360
              }
          }
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'fullscreen', 'fodeviceselection', 
            'hangup', 'profile', 'chat', 'settings', 'raisehand', 
            'videoquality', 'tileview', 'mute-everyone'
          ],
        }
      };
      
      try {
        if ((window as any).JitsiMeetExternalAPI) {
          jitsiApiRef.current = new (window as any).JitsiMeetExternalAPI(domain, options);
          
          if (isMobile && jitsiContainerRef.current.requestFullscreen) {
              jitsiContainerRef.current.requestFullscreen().catch(err => {
                  console.warn("Fullscreen request failed", err);
              });
          }

          jitsiApiRef.current.addEventListeners({
            readyToClose: async () => {
              if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              if (!user?.isStudent) {
                await endVideoSession();
              }
              setShowVideo(false);
              if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
              }
            },
            videoConferenceLeft: async () => {
              if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              if (!user?.isStudent) {
                await endVideoSession();
              }
              setShowVideo(false);
              if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to initialize Jitsi API", err);
      }
    }

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [showVideo, videoAccess, user, endVideoSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  console.log("ClassroomHub: Rendering hub for", classroom.name);

  return (
    <div className="hub-layout" style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
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
            <ChevronLeft size={16} />
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
          {/* Session timer - only pops up after 30s of inactivity */}
          {(idleTime >= 30 || isCountingDown) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '0.5px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
            }}>
              <Clock size={16} color={timerColor} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: timerColor, fontWeight: 600 }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* Desktop tab switcher */}
          <div className="tab-bar desktop-only" style={{ gap: '0.2rem' }}>
            {(['video', 'blackboard', 'people', 'chat'] as const).map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'video' && <Video size={16} />}
                {tab === 'blackboard' && <BookOpen size={16} />}
                {tab === 'people' && <Users size={16} />}
                {tab === 'chat' && <MessageSquare size={16} />}
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
                aspectRatio: '16/10',
                minHeight: '450px',
                padding: '2.5rem',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div 
                  ref={jitsiContainerRef} 
                  style={{ width: '100%', height: '100%', display: showVideo ? 'block' : 'none' }} 
                />
                
                {showVideo && (
                  <button
                    onClick={async () => {
                      if (!user?.isStudent) {
                        await endVideoSession();
                      }
                      if (jitsiApiRef.current) {
                        jitsiApiRef.current.dispose();
                        jitsiApiRef.current = null;
                      }
                      setShowVideo(false);
                    }}
                    className="btn-ghost"
                    style={{
                      position: 'absolute', top: '1rem', right: '1rem', zIndex: 5,
                      background: 'rgba(5,8,15,0.7)', border: '0.5px solid var(--border-default)',
                    }}
                  >
                    <X size={16} />
                  </button>
                )}

                {!showVideo && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{
                        width: 72, height: 72,
                        borderRadius: '50%',
                        background: 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto',
                      }}>
                        <Video size={32} color="var(--accent)" />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Encrypted Video Stream</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '350px', margin: '0 auto 2rem' }}>
                      {user?.isStudent && !isVideoCallActive 
                        ? 'Waiting for the teacher to start the neural link stream...' 
                        : (classroom.description || 'Join the secure classroom video session.')}
                    </p>
                    {videoAccess && (
                      <button 
                        onClick={handleJoinVideo} 
                        className="btn-primary"
                        disabled={user?.isStudent && !isVideoCallActive}
                        style={{ 
                          opacity: (user?.isStudent && !isVideoCallActive) ? 0.5 : 1,
                          padding: '0.875rem 2rem',
                          minWidth: '220px'
                        }}
                      >
                        <PlayCircle size={18} /> 
                        {user?.isStudent ? (isVideoCallActive ? 'Join Video Session' : 'Waiting for Teacher...') : 'Start Secure Stream'}
                      </button>
                    )}
                  </div>
                )}

                {/* Stream badge */}
                <div style={{
                  position: 'absolute', bottom: '1rem', left: '1rem', zIndex: 5,
                  pointerEvents: 'none',
                }}>
                  <span className={`badge ${isVideoCallActive ? 'badge-green' : 'badge-muted'}`} style={{ fontSize: '0.65rem' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: isVideoCallActive ? 'var(--success)' : 'var(--text-muted)', display: 'inline-block' }} />
                    {isVideoCallActive ? 'STREAM ACTIVE' : 'STREAM OFFLINE'}
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

          {/* BLACKBOARD TAB */}
          {activeTab === 'blackboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {!user?.isStudent && (
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Post to Blackboard</h3>
                  <form onSubmit={handlePostBbItem} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>
                      <label style={{ marginTop: 0 }}>MATERIAL TITLE</label>
                      <input 
                        type="text"
                        value={bbForm.title} 
                        onChange={e => setBbForm({...bbForm, title: e.target.value})} 
                        placeholder="Week 1: Introduction to IAS" 
                        required 
                      />
                    </div>
                    <div>
                      <label>INSTRUCTION / DESCRIPTION</label>
                      <input 
                        type="text"
                        value={bbForm.description} 
                        onChange={e => setBbForm({...bbForm, description: e.target.value})} 
                        placeholder="Please read the attached PDF before next meeting." 
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                      <input type="file" ref={bbFileInputRef} onChange={handleBbFileUpload} style={{ display: 'none' }} />
                      <button type="button" onClick={() => bbFileInputRef.current?.click()} className="btn-outline">
                        <Paperclip size={16} /> {bbFile ? 'Change File' : 'Attach Material'}
                      </button>
                      {bbFile && <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{bbFile.name} attached</span>}
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', marginTop: '1.5rem' }}>
                      {loading ? 'Processing...' : 'Post to Blackboard'}
                    </button>
                  </form>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', letterSpacing: '-0.02em' }}>Class Materials</h3>
                {blackboardItems.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <BookOpen size={32} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>The blackboard is currently empty.</p>
                  </div>
                ) : (
                  blackboardItems.map(item => (
                    <div key={item.id} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{item.title}</h4>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{item.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            <Clock size={12} />
                            {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {item.fileUrl && (
                          <button onClick={() => window.open(item.fileUrl, '_blank')} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                            <Download size={14} /> Download File
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', letterSpacing: '-0.02em', margin: 0 }}>Enrolled Personnel</h3>
                <span className="badge badge-muted" style={{ fontSize: '0.75rem' }}>{students.length} students</span>
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
                    minWidth: 0
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, flex: 1 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 38, height: 38,
                          borderRadius: '50%',
                          background: 'transparent',
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
                      <div className="min-w-0 flex-1">
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }} className="text-truncate">{s.userName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="text-truncate">{s.email}</div>
                      </div>
                    </div>

                    {(!user?.isStudent || user?.isAdmin) && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                          className="btn-ghost"
                          style={{ padding: '0.35rem' }}
                        >
                          <MoreVertical size={16} />
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
                              <QrCode size={16} /> View Neural ID
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Kick ${s.userName} from this session?`)) {
                                  await kickUser(s.id);
                                  setOpenMenuId(null);
                                }
                              }}
                              className="btn-ghost"
                              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.5rem 0.625rem', color: 'var(--warning)' }}
                            >
                              <UserMinus size={16} /> Kick from Room
                            </button>
                            {(!user?.isStudent && !user?.isAdmin) && (
                              <button
                                onClick={() => handleUnenroll(s.id, s.userName)}
                                className="btn-ghost"
                                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '0.5rem 0.625rem', color: 'var(--error)' }}
                              >
                                <Trash2 size={16} /> Remove Student
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT TAB (mobile only / tablet main) */}
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
        {/* Disappears when activeTab is 'chat' */}
        {activeTab !== 'chat' && (
          <aside className="hub-sidebar">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} color="var(--accent)" />
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
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-only" style={{
        borderTop: '0.5px solid var(--border-subtle)',
        background: 'rgba(5,8,15,0.95)',
        padding: '0.5rem 1rem',
        display: 'flex', gap: '0.5rem',
        flexShrink: 0,
      }}>
        {(['video', 'blackboard', 'people', 'chat'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ flex: 1, flexDirection: 'column', padding: '0.5rem' }}
          >
            {tab === 'video' && <Video size={16} />}
            {tab === 'blackboard' && <BookOpen size={16} />}
            {tab === 'people' && <Users size={16} />}
            {tab === 'chat' && <MessageSquare size={16} />}
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
                color: (msg.isAdmin || msg.IsAdmin || msg.user === 'SystemAdmin') ? 'var(--error)' : msg.isTeacher ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: (msg.isTeacher || msg.isAdmin || msg.IsAdmin || msg.user === 'SystemAdmin') ? 600 : 400,
                paddingLeft: '0.2rem',
              }}>
                {msg.user}{(msg.isAdmin || msg.IsAdmin || msg.user === 'SystemAdmin' || msg.isTeacher) && ' · '}{(msg.isAdmin || msg.IsAdmin || msg.user === 'SystemAdmin') ? 'Admin' : (msg.isTeacher ? 'Teacher' : '')}
              </span>
            )}
            <div className={`msg-bubble ${isOwn ? 'mine' : isSystem ? 'system' : 'theirs'}`}
              style={(msg.isTeacher || msg.isAdmin || msg.IsAdmin || msg.user === 'SystemAdmin') && !isOwn ? { border: (msg.isAdmin || msg.IsAdmin || msg.user === 'SystemAdmin') ? '0.5px solid rgba(239,68,68,0.3)' : '0.5px solid var(--border-accent)' } : {}}>
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
                    <FileIcon size={16} />
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
