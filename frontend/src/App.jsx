import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, User, Send, StopCircle, BookOpen, Paperclip, Camera, Image as ImageIcon, X, LogOut, UserPlus, Edit2, Check, Sparkles, Coffee, Smile, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './App.css';

function App() {
  // --- Persist State Logic ---
  const safeParse = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null || saved === 'undefined') return fallback;
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Error parsing ${key}:`, e);
      return fallback;
    }
  };

  const [activeTab, setActiveTab] = useState('chat');

  // Assistant Sessions
  const [assistantSessions, setAssistantSessions] = useState(() => safeParse('chillbuddy_assistant_sessions', [
    { id: 'default', title: 'New Academic Chat', messages: [{ id: 1, sender: 'ai', text: 'Hello! I am your Professional Tutor. Let\'s solve some problems! 📚' }] }
  ]));
  const [currentAssistantId, setCurrentAssistantId] = useState(() => localStorage.getItem('chillbuddy_curr_assistant_id') || 'default');

  // Stress Sessions
  const [stressSessions, setStressSessions] = useState(() => safeParse('chillbuddy_stress_sessions', [
    { id: 'default', title: 'New Chill Vibes', messages: [{ id: 1, sender: 'ai', text: 'Yo! ChillBuddy here. Let\'s get those vibes up! 🤙🏝️' }] }
  ]));
  const [currentStressId, setCurrentStressId] = useState(() => localStorage.getItem('chillbuddy_curr_stress_id') || 'default');

  const [inputText, setInputText] = useState('');
  const [stressInputText, setStressInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentAudioRef = useRef(null);

  const [profile, setProfile] = useState(() => safeParse('chillbuddy_profile', {
    name: 'Student Name',
    grade: 'Grade 10',
    department: 'Science Major',
    email: 'student@chillbuddy.app',
    avatar: null
  }));
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const profileFileInputRef = useRef(null);

  const [tasks, setTasks] = useState(() => safeParse('chillbuddy_tasks', [
    { id: 1, text: 'Finish Math Assignment', completed: false },
    { id: 2, text: 'Read History Chapter 4', completed: true }
  ]));

  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(localStorage.getItem('chillbuddy_selected_voice') || '');
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('chillbuddy_rate') || '1.0'));
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('chillbuddy_dark');
    return saved === null ? true : saved === 'true';
  });
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem('chillbuddy_lang') || 'en-IN');
  const [assistantGender, setAssistantGender] = useState(() => localStorage.getItem('chillbuddy_gender') || 'Female');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => localStorage.getItem('chillbuddy_voice_on') !== 'false');

  // Persistence Effects
  useEffect(() => localStorage.setItem('chillbuddy_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('chillbuddy_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('chillbuddy_dark', isDarkMode), [isDarkMode]);
  useEffect(() => localStorage.setItem('chillbuddy_lang', appLanguage), [appLanguage]);
  useEffect(() => localStorage.setItem('chillbuddy_gender', assistantGender), [assistantGender]);
  useEffect(() => localStorage.setItem('chillbuddy_rate', speechRate), [speechRate]);
  useEffect(() => localStorage.setItem('chillbuddy_voice_on', isVoiceEnabled), [isVoiceEnabled]);
  useEffect(() => localStorage.setItem('chillbuddy_selected_voice', selectedVoice), [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('chillbuddy_assistant_sessions', JSON.stringify(assistantSessions));
  }, [assistantSessions]);

  useEffect(() => {
    localStorage.setItem('chillbuddy_stress_sessions', JSON.stringify(stressSessions));
  }, [stressSessions]);

  useEffect(() => localStorage.setItem('chillbuddy_curr_assistant_id', currentAssistantId), [currentAssistantId]);
  useEffect(() => localStorage.setItem('chillbuddy_curr_stress_id', currentStressId), [currentStressId]);

  // --- Voice & Speech Logic ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const getSimpleVoiceName = (voice) => {
        const lang = voice.lang.toLowerCase();
        const name = voice.name.toLowerCase();
        const isFemale = name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('aditi') || name.includes('lekha');
        const gender = isFemale ? 'Female' : 'Male';
        let simpleName = '';
        if (lang.includes('en-in')) simpleName = `Indian English (${gender})`;
        else if (lang.includes('hi')) simpleName = `Hindi (${gender})`;
        else if (lang.includes('te')) simpleName = `Telugu (${gender})`;
        else if (lang.includes('ta')) simpleName = `Tamil (${gender})`;
        else if (lang.includes('en-us') || lang.includes('en-gb')) simpleName = `English (${gender})`;
        else simpleName = voice.name;
        return `${simpleName} - ${voice.name.split(' ')[0]}`;
      };

      const mappedVoices = voices.map(v => ({
        voice: v,
        name: v.name,
        displayName: getSimpleVoiceName(v),
        lang: v.lang
      })).sort((a, b) => {
        if (a.lang.includes('IN') && !b.lang.includes('IN')) return -1;
        if (!a.lang.includes('IN') && b.lang.includes('IN')) return 1;
        return 0;
      });

      setAvailableVoices(mappedVoices);
      if (mappedVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(mappedVoices[0].name);
      }
    };
    loadVoices();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentAssistantSession = assistantSessions.find(s => s.id === currentAssistantId) || assistantSessions[0];
  const currentStressSession = stressSessions.find(s => s.id === currentStressId) || stressSessions[0];

  useEffect(() => { scrollToBottom(); }, [assistantSessions, stressSessions, activeTab, currentAssistantId, currentStressId]);

  useEffect(() => {
    // Stop any playing audio when switching tabs
    window.speechSynthesis.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
  }, [activeTab]);

  const startNewChat = (mode) => {
    const newId = Date.now().toString();
    const newSession = {
      id: newId,
      title: mode === 'chat' ? `Study: ${new Date().toLocaleTimeString()}` : `Vibe: ${new Date().toLocaleTimeString()}`,
      messages: mode === 'chat'
        ? [{ id: 1, sender: 'ai', text: 'Ready for a new lesson? What are we studying? 📚' }]
        : [{ id: 1, sender: 'ai', text: 'New vibes starting now! What\'s on your mind? 🏝️' }]
    };

    if (mode === 'chat') {
      setAssistantSessions([newSession, ...assistantSessions]);
      setCurrentAssistantId(newId);
    } else {
      setStressSessions([newSession, ...stressSessions]);
      setCurrentStressId(newId);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      utterance.lang = appLanguage;
      const appLangCode = appLanguage.toLowerCase().split('-')[0];
      const voice = availableVoices.find(v => v.name === selectedVoice && v.lang.toLowerCase().includes(appLangCode))
        || availableVoices.find(v => v.lang.toLowerCase().includes(appLangCode))
        || (availableVoices.length > 0 ? availableVoices[0] : null);
      if (voice) utterance.voice = voice.voice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (text, isStress = false) => {
    if (!text.trim() && attachments.length === 0 || isProcessing) return;
    window.speechSynthesis.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    // Unlock Audio Context for Mobile Browsers
    const mobileAudio = new Audio();
    mobileAudio.play().catch(e => {}); // Silent play to unlock


    // Process attachments to base64
    const processedAttachments = await Promise.all(attachments.map(async (att) => {
      if (att.url) return { name: att.name, type: 'image', data: att.url };
      if (att.file) {
        const data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(att.file);
        });
        return { name: att.name, type: att.file.type, data };
      }
      return null;
    }));

    const validAttachments = processedAttachments.filter(Boolean);
    const newMessage = { 
      id: Date.now(), 
      sender: 'user', 
      text: text || (validAttachments.length > 0 ? "[Sent an attachment]" : "") 
    };

    if (isStress) {
      setStressSessions(sessions => sessions.map(s => s.id === currentStressId ? { ...s, messages: [...s.messages, newMessage] } : s));
      setStressInputText('');
    } else {
      setAssistantSessions(sessions => sessions.map(s => s.id === currentAssistantId ? { ...s, messages: [...s.messages, newMessage] } : s));
      setInputText('');
    }

    setIsLoading(true);
    setIsProcessing(true);
    
    const currentSession = isStress ? stressSessions.find(s => s.id === currentStressId) : assistantSessions.find(s => s.id === currentAssistantId);
    const currentHistory = currentSession ? currentSession.messages : [];
    const historyPayload = currentHistory.map(m => ({ role: m.sender === 'ai' ? 'model' : 'user', content: m.text }));

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text || "Analyze this attachment.",
          language: appLanguage,
          gender: isStress ? (assistantGender.includes('Teenager') ? assistantGender : `Teenager${assistantGender}`) : assistantGender,
          is_stress_buster: isStress,
          attachments: validAttachments,
          history: historyPayload,
          user_name: profile.name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = { id: Date.now(), sender: 'ai', text: data.response };

        if (isStress) {
          setStressSessions(sessions => sessions.map(s => s.id === currentStressId ? { ...s, messages: [...s.messages, aiMessage] } : s));
        } else {
          setAssistantSessions(sessions => sessions.map(s => s.id === currentAssistantId ? { ...s, messages: [...s.messages, aiMessage] } : s));
        }

        if (isVoiceEnabled) {
          if (data.audio_url) {
            mobileAudio.src = data.audio_url;
            mobileAudio.playbackRate = speechRate;
            mobileAudio.play().catch(err => console.log("Audio error:", err));
            currentAudioRef.current = mobileAudio;
          } else {
            speak(data.response);
          }
        }
      } else {
        const errObj = { id: Date.now(), sender: 'ai', text: 'Error connecting to server.' };
        if (isStress) setStressSessions(sessions => sessions.map(s => s.id === currentStressId ? { ...s, messages: [...s.messages, errObj] } : s));
        else setAssistantSessions(sessions => sessions.map(s => s.id === currentAssistantId ? { ...s, messages: [...s.messages, errObj] } : s));
      }
    } catch (error) {
      const errObj = { id: Date.now(), sender: 'ai', text: 'Server unreachable.' };
      if (isStress) setStressSessions(sessions => sessions.map(s => s.id === currentStressId ? { ...s, messages: [...s.messages, errObj] } : s));
      else setAssistantSessions(sessions => sessions.map(s => s.id === currentAssistantId ? { ...s, messages: [...s.messages, errObj] } : s));
    }
    setIsLoading(false);
    setIsProcessing(false);
  };

  // --- UI Handlers ---
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showCameraMode, setShowCameraMode] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Camera error: " + err.message); setShowCameraMode(false); }
  };
  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setShowCameraMode(false);
  };
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const url = canvasRef.current.toDataURL('image/jpeg');
      setAttachments([...attachments, { name: 'Capture.jpg', url }]);
      stopCamera();
    }
  };

  useEffect(() => {
    if (showCameraMode) startCamera();
    else stopCamera();
  }, [showCameraMode]);

  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");

    if (!isRecording) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = appLanguage;
      recognitionRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (e.results[0].isFinal) handleSendMessage(transcript, activeTab === 'stress');
      };
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.start();
      setIsRecording(true);
      window.speechSynthesis.cancel();
    } else {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
  };

  const [showAssistantHistory, setShowAssistantHistory] = useState(false);
  const [showStressHistory, setShowStressHistory] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="tab-pane fade-in">
            <div className="profile-header-flex">
              <h2>Student Profile</h2>
              {!isEditingProfile ? (
                <button className="edit-btn" onClick={() => setIsEditingProfile(true)}><Edit2 size={16} /> Edit Profile</button>
              ) : (
                <button className="edit-btn save" onClick={() => { setProfile({ ...editForm }); setIsEditingProfile(false); }}><Check size={16} /> Save Changes</button>
              )}
            </div>
            <div className="profile-card">
              <div className="avatar-section">
                <div className="avatar">
                  {editForm.avatar ? <img src={editForm.avatar} alt="avatar" className="avatar-img" /> : <User size={48} />}
                </div>
              </div>
              <div className="profile-info">
                {!isEditingProfile ? (
                  <><h3>{profile.name}</h3><p>{profile.grade} • {profile.department}</p></>
                ) : (
                  <div className="edit-form">
                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
                    <input type="text" value={editForm.grade} onChange={e => setEditForm({ ...editForm, grade: e.target.value })} placeholder="Grade" />
                  </div>
                )}
                <div className="account-actions">
                  <button className="action-btn logout" onClick={() => { localStorage.clear(); window.location.reload(); }}><LogOut size={16} /> Reset All Data</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="tab-pane fade-in">
            <h2>Preferences</h2>
            <div className="settings-list">
              <div className="setting-item">
                <div>
                  <h4>Voice Output</h4>
                  <p>Enable/Disable assistant voice</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={isVoiceEnabled} onChange={(e) => setIsVoiceEnabled(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>
              <div className="setting-item">
                <div>
                  <h4>Cloud Voice Gender</h4>
                  <p>Choose the Assistant's personality</p>
                </div>
                <select value={assistantGender} onChange={(e) => setAssistantGender(e.target.value)}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="TeenagerFemale">Teenager (Female)</option>
                  <option value="TeenagerMale">Teenager (Male)</option>
                </select>
              </div>
              <div className="setting-item">
                <div>
                  <h4>Specific Voice</h4>
                  <p>Choose from your device voices</p>
                </div>
                <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                  {availableVoices.length > 0 ? (
                    availableVoices
                      .filter(v => v.lang.toLowerCase().includes(appLanguage.split('-')[0].toLowerCase()))
                      .map((v, idx) => <option key={idx} value={v.name}>{v.displayName}</option>)
                  ) : <option>Loading voices...</option>}
                </select>
              </div>
              <div className="setting-item">
                <div>
                  <h4>Speech Rate: {speechRate}x</h4>
                  <p>Adjust the speed of talking</p>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.1" value={speechRate} onChange={(e) => setSpeechRate(parseFloat(e.target.value))} />
              </div>
              <div className="setting-item">
                <div>
                  <h4>Dark Mode</h4>
                  <p>Toggle between Dark/Light themes</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="tab-pane fade-in">
            <h2>Your Missions</h2>
            <div className="tasks-container">
              <div className="task-input-group">
                <input type="text" placeholder="Add a mission..." onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    setTasks([...tasks, { id: Date.now(), text: e.target.value, completed: false }]);
                    e.target.value = '';
                  }
                }} />
              </div>
              <div className="tasks-list">
                {tasks.map(t => (
                  <div key={t.id} className={`task-item ${t.completed ? 'completed' : ''}`}>
                    <div className="task-checkbox" onClick={() => setTasks(tasks.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x))}>
                      {t.completed && <Check size={14} />}
                    </div>
                    <span>{t.text}</span>
                    <button className="delete-task" onClick={() => setTasks(tasks.filter(x => x.id !== t.id))}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'stress':
        return (
          <div className="tab-pane stress-pane fade-in">
            <div className="stress-header-container">
              <div className="stress-header">
                <div className="header-left">
                  <h2>Relaxation Zone 🏝️</h2>
                  <button className="new-chat-btn" onClick={() => startNewChat('stress')}>+ New Vibe</button>
                  <button className="history-toggle" onClick={() => setShowStressHistory(!showStressHistory)}>
                    {showStressHistory ? "Close History" : "Past Vibes"}
                  </button>
                </div>
              </div>
            </div>

            <div className="chat-layout-horizontal">
              {showStressHistory && (
                <div className="history-sidebar fade-in">
                  <h3>History</h3>
                  <div className="history-list">
                    {stressSessions.map(session => (
                      <div key={session.id} className={`history-item ${currentStressId === session.id ? 'active' : ''}`} onClick={() => setCurrentStressId(session.id)}>
                        <span className="history-sender">Session</span>
                        <p>{session.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="chat-main-column">
                <div className="messages-container stress-chat">
                  {currentStressSession.messages.map(m => (
                    <div key={m.id} className={`message-wrapper ${m.sender}`}>
                      <div className="message-bubble stress-bubble" style={{ position: 'relative', paddingRight: m.sender === 'ai' ? '35px' : undefined }}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {m.text}
                        </ReactMarkdown>
                        {m.sender === 'ai' && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(m.text.replace(/\$/g, ''))}
                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', padding: '0' }}
                            title="Copy message"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && activeTab === 'stress' && <div className="typing-indicator"><span></span><span></span><span></span></div>}
                  <div ref={messagesEndRef} />
                </div>
                <div className="input-area stress-input-area">
                  <div className="quick-replies" style={{ display: 'flex', gap: '10px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                    {["I'm tired 😴", "I feel pressure 😰", "I can't focus 😵‍💫", "I'm anxious 😟", "Tell me a joke 😂"].map(keyword => (
                      <button 
                        key={keyword} 
                        className="quick-reply-btn" 
                        style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'var(--text-color, white)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px', transition: 'all 0.2s', backdropFilter: 'blur(5px)' }}
                        onClick={() => handleSendMessage(keyword, true)}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                  <div className="input-box stress-input-box">
                    <input type="text" placeholder="Vibe..." value={stressInputText} onChange={e => setStressInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage(stressInputText, true)} />
                    <button className="send-btn stress-send" onClick={() => handleSendMessage(stressInputText, true)} disabled={!stressInputText.trim()}><Smile size={20} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'chat':
      default:
        return (
          <div className="chat-interface fade-in">
            <div className="chat-header">
              <div className="header-left">
                <h2>Assistant</h2>
                <button className="new-chat-btn" onClick={() => startNewChat('chat')}>+ New Chat</button>
                <button className="history-toggle" onClick={() => setShowAssistantHistory(!showAssistantHistory)}>
                  {showAssistantHistory ? "Hide History" : "Past Chats"}
                </button>
              </div>
              <select className="lang-select" value={appLanguage} onChange={(e) => setAppLanguage(e.target.value)}>
                <option value="en-IN">English (India)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="hi-IN">Hindi (हिंदी)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
              </select>
            </div>

            <div className="chat-layout-horizontal">
              {showAssistantHistory && (
                <div className="history-sidebar fade-in">
                  <h3>Past Chats</h3>
                  <div className="history-list">
                    {assistantSessions.map(session => (
                      <div key={session.id} className={`history-item ${currentAssistantId === session.id ? 'active' : ''}`} onClick={() => setCurrentAssistantId(session.id)}>
                        <span className="history-sender">Conversation</span>
                        <p>{session.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="chat-main-column">
                <div className="messages-container">
                  {currentAssistantSession.messages.map(m => (
                    <div key={m.id} className={`message-wrapper ${m.sender}`}>
                      <div className="message-bubble" style={{ position: 'relative', paddingRight: m.sender === 'ai' ? '35px' : undefined }}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {m.text}
                        </ReactMarkdown>
                        {m.sender === 'ai' && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(m.text.replace(/\$/g, ''))}
                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', padding: '0' }}
                            title="Copy message"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && activeTab === 'chat' && <div className="typing-indicator"><span></span><span></span><span></span></div>}
                  <div ref={messagesEndRef} />
                </div>
                <div className="input-area">
                  {attachments.length > 0 && (
                    <div className="attachment-preview-bar">
                      {attachments.map((att, i) => (
                        <div key={i} className="attachment-chip">
                          <Paperclip size={12} />
                          <span className="attachment-name">{att.name}</span>
                          <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="input-box">
                    <div className="attachment-dropdown">
                      <button className="attach-btn" onClick={() => setShowAttachMenu(!showAttachMenu)}><Paperclip size={20} /></button>
                      {showAttachMenu && (
                        <div className="attach-menu">
                          <button onClick={() => { setShowAttachMenu(false); chatFileInputRef.current?.click(); }}><ImageIcon size={16} /> Upload</button>
                          <button onClick={() => { setShowAttachMenu(false); setShowCameraMode(true); }}><Camera size={16} /> Camera</button>
                        </div>
                      )}
                      <input type="file" ref={chatFileInputRef} hidden accept="image/*" onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) setAttachments([...attachments, { name: f.name, file: f }]);
                      }} />
                    </div>
                    <input type="text" placeholder="Ask anything..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage(inputText)} disabled={isRecording} />
                    <button className="send-btn" onClick={() => { handleSendMessage(inputText); setAttachments([]); }} disabled={!inputText.trim() && attachments.length === 0}><Send size={20} /></button>
                  </div>
                  <div className="voice-controls">
                    <button className={`mic-btn ${isRecording ? 'recording pulse' : ''}`} onClick={toggleRecording}>
                      {isRecording ? <StopCircle size={32} /> : <Mic size={32} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? '' : 'light-theme'}`}>
      <nav className="sidebar">
        <div className="brand">
          <div className="brand-icon-wrapper">
            <Mic className="brand-icon" size={28} />
          </div>
          <h1>ChillBuddy</h1>
        </div>
        <ul className="nav-links">
          <li><button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}><BookOpen size={20} /><span>Assistant</span></button></li>
          <li><button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}><User size={20} /><span>Profile</span></button></li>
          <li><button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}><Check size={20} /><span>Tasks</span></button></li>
          <li><button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}><Settings size={20} /><span>Settings</span></button></li>
          <li><button className={activeTab === 'stress' ? 'active stress-nav-active' : ''} onClick={() => setActiveTab('stress')}><Smile size={20} /><span>Stress Buster</span></button></li>
        </ul>
      </nav>
      <main className="main-content">{renderContent()}</main>

      {showCameraMode && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-content">
            <h3>Capture Image</h3>
            <div className="camera-viewport">
              <video ref={videoRef} autoPlay playsInline></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>
            <div className="camera-actions">
              <button className="capture-btn" onClick={capturePhoto}><Camera size={20} /> Capture</button>
              <button className="cancel-btn" onClick={() => setShowCameraMode(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
