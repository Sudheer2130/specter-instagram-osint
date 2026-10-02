'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Shield, Brain, Film, Image as ImageIcon, 
  Download, Copy, Check, ExternalLink, Activity, 
  Flame, Heart, AlertTriangle, Compass, Target, Terminal,
  MessageSquare, Send, Sparkles, Bot, User, RefreshCw, HelpCircle
} from 'lucide-react';

export default function Home() {
  const [username, setUsername] = useState('sudh.eer5975');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('psychology'); // 'psychology', 'commercial', 'media', 'dossier', 'chat'
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // AI OSINT Copilot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  const loadingSteps = [
    'Connecting to live Instagram metadata gateway...',
    'Extracting public profile nodes, counts & bio...',
    'Verifying commercial footprints & e-commerce links...',
    'Executing Groq LLaMA/GPT-OSS behavioral synthesis...',
    'Finalizing forensic intelligence dossier...'
  ];

  const handleInvestigate = async (targetUser = username) => {
    if (!targetUser) return;
    setError(null);
    setLoading(true);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser })
      });

      const json = await res.json();
      clearInterval(interval);

      if (!res.ok) {
        throw new Error(json.error || 'Failed to complete investigation');
      }

      setData(json);
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial live investigation on page load
    handleInvestigate('sudh.eer5975');
  }, []);

  const handleCopyDossier = () => {
    if (!data?.analysis?.dossierMarkdown) return;
    navigator.clipboard.writeText(data.analysis.dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!data) return;
    const blob = new Blob([data.analysis.dossierMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPECTER_OSINT_${data.target.username}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, activeTab]);

  // Seed chat assistant when target data loads
  useEffect(() => {
    if (data?.target) {
      setChatMessages([
        {
          role: 'assistant',
          content: `👋 **SPECTER AI OSINT Copilot initialized for @${data.target.username} (${data.target.fullName || 'User'}).**\n\nI have indexed all live extracted telemetry:\n- **Bio**: "${data.target.bio}"\n- **Commercial Storefront**: ${data.target.website || 'None detected'}\n- **Network Dynamic**: ${data.target.followers} followers / ${data.target.following} following / ${data.target.totalPosts} posts\n- **Inferred Archetype**: ${data.analysis?.archetype || 'Personal profile'}\n\nAsk me anything! Try clicking a prompt chip below or type your custom inquiry.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [data?.target?.username]);

  const suggestedQueries = [
    { label: "💼 Profession & Business", query: "What is this user's profession, business model, and what do they sell?" },
    { label: "🎂 Estimated Age Bracket", query: "What is their estimated age bracket based on cultural, linguistic, and visual markers?" },
    { label: "👥 Following Specific Users?", query: "Can you check if this user is following another specific user, brand, or account?" },
    { label: "❤️ Hobbies, Likes & Dislikes", query: "What are their confirmed and inferred hobbies, likes, dislikes, and passions?" },
    { label: "🛍️ Merch & Store Products", query: "What specific products, apparel, or items does this user promote or sell?" },
    { label: "🧠 Psychological Profile", query: "Summarize their psychological Big Five spectrum and behavioral motivations." }
  ];

  const handleSendMessage = async (textToSend) => {
    const query = (typeof textToSend === 'string' ? textToSend : chatInput).trim();
    if (!query || chatLoading || !data) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          target: data.target,
          analysis: data.analysis,
          history: newHistory.slice(-8)
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to process inquiry');
      }

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: json.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **OSINT Copilot Error**: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Cyber Telemetry Bar */}
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.5)'
            }}>
              <Shield size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>SPECTER</span>
                <span style={{ 
                  color: 'var(--accent-cyan)', 
                  fontSize: '0.75rem', 
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(6, 182, 212, 0.25)'
                }}>LIVE OSINT</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-Time Instagram Intelligence & Psychographic Profiler</p>
            </div>
          </div>

          {/* Engine Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>LIVE CRAWLER ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px', flex: 1, width: '100%' }}>
        {/* Search & Investigation Header */}
        <section style={{ marginBottom: '32px' }}>
          <div className="glass-card" style={{ padding: '24px 28px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <form onSubmit={(e) => { e.preventDefault(); handleInvestigate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                  <span style={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--accent-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter any Instagram username (e.g. sudh.eer5975, natgeo)"
                    style={{
                      width: '100%',
                      background: 'rgba(7, 9, 14, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px 14px 38px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ minWidth: '180px', justifyContent: 'center' }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin-slow" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      Investigating...
                    </>
                  ) : (
                    <>
                      <Search size={18} /> Live Scan Profile
                    </>
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>
                  ⚡ Queries Instagram live for verified public metadata (bio, name, followers, store links) and analyzes psychographic patterns via Groq AI.
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>TARGET: @{username || 'unknown'}</span>
              </div>
            </form>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle color="#f43f5e" size={20} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fda4af', fontWeight: 600, fontSize: '0.9rem' }}>Target Profile Notice</p>
              <p style={{ color: '#fecdd3', fontSize: '0.85rem' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {loading && (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '3px solid rgba(99, 102, 241, 0.2)',
                borderTopColor: 'var(--accent-primary)',
                margin: '0 auto 20px',
                animation: 'spinSlow 1s linear infinite'
              }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Extracting Real Profile Telemetry</h3>
              <p style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginBottom: '24px' }}>
                {loadingSteps[loadingStep]}
              </p>
              
              <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {data && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Target Identity Hero Card */}
            <div className="glass-card glass-card-glow" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center' }}>
                {/* Profile Pic with Glow */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={data.target.profilePic}
                    alt={data.target.username}
                    style={{
                      width: '110px',
                      height: '110px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--accent-primary)',
                      boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)',
                      background: 'var(--bg-secondary)'
                    }}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.target.fullName)}&background=6366f1&color=fff&size=200`;
                    }}
                  />
                  {data.target.isVerified && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      background: '#38bdf8',
                      borderRadius: '50%',
                      padding: '4px',
                      boxShadow: '0 0 8px rgba(56, 189, 248, 0.8)'
                    }}>
                      <Check size={14} color="#000" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Identity & Bio */}
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{data.target.fullName}</h1>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>@{data.target.username}</span>
                    <span className="badge badge-purple">{data.target.businessCategory || 'Public Profile'}</span>
                    {data.target.isBusiness && <span className="badge badge-emerald">E-Commerce Detected</span>}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '14px', maxWidth: '850px', whiteSpace: 'pre-line' }}>
                    {data.target.bio}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {data.target.website && (
                      <a
                        href={data.target.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-mono)',
                          textDecoration: 'none',
                          background: 'rgba(6, 182, 212, 0.1)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(6, 182, 212, 0.25)'
                        }}
                      >
                        <ExternalLink size={13} /> {data.target.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    <a
                      href={data.target.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#ec4899',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-mono)',
                        textDecoration: 'none',
                        background: 'rgba(236, 72, 153, 0.1)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(236, 72, 153, 0.25)'
                      }}
                    >
                      <ExternalLink size={13} /> Open Instagram Profile
                    </a>

                    <button
                      onClick={() => setActiveTab('chat')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <MessageSquare size={14} /> Ask AI Copilot About @{data.target.username}
                    </button>
                  </div>
                </div>

                {/* Follower Stats Boxes */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{
                    background: 'rgba(7, 9, 14, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    textAlign: 'center',
                    minWidth: '100px'
                  }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                      {data.target.followers}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Followers</p>
                  </div>
                  <div style={{
                    background: 'rgba(7, 9, 14, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    textAlign: 'center',
                    minWidth: '100px'
                  }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                      {data.target.following}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Following</p>
                  </div>
                  <div style={{
                    background: 'rgba(7, 9, 14, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    textAlign: 'center',
                    minWidth: '100px'
                  }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                      {data.target.totalPosts}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '8px',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setActiveTab('psychology')}
                style={{
                  background: activeTab === 'psychology' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeTab === 'psychology' ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeTab === 'psychology' ? 'var(--accent-primary)' : 'transparent'}`,
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Brain size={18} color={activeTab === 'psychology' ? 'var(--accent-primary)' : 'currentColor'} />
                Psychological & Behavioral
              </button>

              <button
                onClick={() => setActiveTab('commercial')}
                style={{
                  background: activeTab === 'commercial' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeTab === 'commercial' ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeTab === 'commercial' ? 'var(--accent-primary)' : 'transparent'}`,
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Compass size={18} color={activeTab === 'commercial' ? 'var(--accent-cyan)' : 'currentColor'} />
                Commercial & Storefront Footprint
              </button>

              <button
                onClick={() => setActiveTab('media')}
                style={{
                  background: activeTab === 'media' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeTab === 'media' ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeTab === 'media' ? 'var(--accent-primary)' : 'transparent'}`,
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Film size={18} color={activeTab === 'media' ? 'var(--accent-purple)' : 'currentColor'} />
                Media & Access Status
              </button>

              <button
                onClick={() => setActiveTab('dossier')}
                style={{
                  background: activeTab === 'dossier' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeTab === 'dossier' ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeTab === 'dossier' ? 'var(--accent-primary)' : 'transparent'}`,
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Terminal size={18} color={activeTab === 'dossier' ? 'var(--accent-emerald)' : 'currentColor'} />
                Full Forensic Dossier (.MD)
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                style={{
                  background: activeTab === 'chat' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: activeTab === 'chat' ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${activeTab === 'chat' ? 'var(--accent-primary)' : 'rgba(99, 102, 241, 0.3)'}`,
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: activeTab === 'chat' ? '0 0 16px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                <MessageSquare size={18} color={activeTab === 'chat' ? '#38bdf8' : 'currentColor'} />
                AI OSINT Copilot (Chat)
                <span style={{
                  fontSize: '0.68rem',
                  background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  letterSpacing: '0.04em'
                }}>LIVE Q&A</span>
              </button>
            </div>

            {/* TAB 1: Psychological & Behavioral Profiling */}
            {activeTab === 'psychology' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                {/* Archetype & Executive Summary */}
                <div className="glass-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Brain size={22} color="var(--accent-purple)" />
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Synthesized Behavioral Archetype</h3>
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: '0.85rem' }}>{data.analysis.archetype}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
                    {data.analysis.summary}
                  </p>
                </div>

                {/* Big Five Personality Radar Meters */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={18} color="var(--accent-primary)" /> Psychometric Spectrum (Big Five)
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(data.analysis.personalityScores || {}).map(([trait, score]) => {
                      const label = trait.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={trait}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600 }}>{label}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{score}%</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${score}%`,
                              background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                              borderRadius: '4px'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hobbies & High-Confidence Interests */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={18} color="var(--accent-amber)" /> Inferred Hobbies & Passions
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(data.analysis.hobbies || []).map((hobby, i) => (
                      <div key={i} style={{
                        background: 'rgba(7, 9, 14, 0.6)',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{hobby.name}</strong>
                          <span className={hobby.confidence === 'High' ? 'badge badge-emerald' : 'badge badge-amber'}>
                            {hobby.confidence} Conf.
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hobby.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Likes vs Dislikes Affinities */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Affinity Matrix</h3>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>LIKES & AFFINITIES:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {(data.analysis.likes || []).map((like, i) => (
                        <span key={i} style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#a7f3d0',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}>+ {like}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>AVOIDED THEMES:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {(data.analysis.dislikes || []).map((dislike, i) => (
                        <span key={i} style={{
                          background: 'rgba(244, 63, 94, 0.12)',
                          color: '#fecdd3',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem'
                        }}>- {dislike}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Communication Tone & Lifestyle Style */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Tone & Lifestyle Indicators</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Primary Communication Tone:</span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{data.analysis.communicationTone?.primary || 'Promotional & Direct'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Writing Style:</span>
                      <strong>{data.analysis.communicationTone?.style || 'Short Call-to-Action'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Lifestyle Category:</span>
                      <strong>{data.analysis.lifestyle?.category || 'E-Commerce Operator'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mobility Index:</span>
                      <span className="badge badge-cyan">{data.analysis.lifestyle?.mobilityScore || 'Moderate'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Commercial Footprint */}
            {activeTab === 'commercial' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>Commercial Monetization Verdict</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Commercial State:</span>
                      <span className={data.analysis.commercialSignals?.isMonetized ? 'badge badge-emerald' : 'badge badge-amber'}>
                        {data.analysis.commercialSignals?.isMonetized ? 'Active Commercial Platform' : 'Personal / Non-Monetized'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Business Model:</span>
                      <strong>{data.analysis.commercialSignals?.monetizationModel || 'E-Commerce / Merchandising'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Detected Store Platform:</span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{data.analysis.commercialSignals?.affiliateOrShop || 'None'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Intent Verdict:</span>
                      <span className="badge badge-purple">{data.analysis.commercialSignals?.intentVerdict || 'Commercial'}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>Network Dynamics</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Follower / Following Ratio:</span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>
                        {(parseInt(data.target.followers) / Math.max(1, parseInt(data.target.following))).toFixed(2)}x
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Outreach Strategy:</span>
                      <strong>{parseInt(data.target.following) > parseInt(data.target.followers) ? 'Outbound Acquisition / Follow-Back' : 'Inbound Authority Niche'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Account Verification:</span>
                      <span className={data.target.isVerified ? 'badge badge-cyan' : 'badge badge-amber'}>
                        {data.target.isVerified ? 'Verified Public Entity' : 'Standard User Node'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Media & Access Status */}
            {activeTab === 'media' && (
              <div className="glass-card" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={20} color="var(--accent-purple)" /> Media Grid & Anti-Bot Protection Status
                </h3>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>
                  Target @{data.target.username} has published <strong style={{ color: '#fff' }}>{data.target.totalPosts} posts</strong> on Instagram.
                </p>

                <div style={{
                  background: 'rgba(7, 9, 14, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                    🔒 Instagram Media Access Privacy
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Instagram renders individual photos, reels, and story highlights inside a client-side JavaScript shell protected by Meta&apos;s anti-scraping firewalls. Our live crawler extracts the confirmed public metadata, profile avatar, and commercial backlinks. To inspect the full visual grid directly on Instagram:
                  </p>
                  
                  <div style={{ marginTop: '14px' }}>
                    <a
                      href={data.target.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex' }}
                    >
                      <ExternalLink size={16} /> Open @{data.target.username} Feed on Instagram
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Full Forensic Dossier & Export */}
            {activeTab === 'dossier' && (
              <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Forensic Intelligence Dossier</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Standardized markdown OSINT profile ready for audit or reporting.</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleCopyDossier} className="btn-secondary">
                      {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy Dossier'}
                    </button>
                    <button onClick={handleDownloadMarkdown} className="btn-primary">
                      <Download size={16} /> Download .MD
                    </button>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(7, 9, 14, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  color: '#e2e8f0',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {data.analysis.dossierMarkdown}
                </div>
              </div>
            )}

            {/* TAB 5: AI OSINT Copilot (Interactive Investigation Chatbot) */}
            {activeTab === 'chat' && (
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '720px' }}>
                {/* Header of Chat */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
                    }}>
                      <Bot size={22} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>SPECTER AI OSINT Copilot</h3>
                        <span style={{
                          fontSize: '0.72rem',
                          color: 'var(--accent-emerald)',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                          LIVE // TARGET: @{data.target.username}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Autonomous investigator answering questions on profession, age, following network, hobbies & posts.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setChatMessages([
                        {
                          role: 'assistant',
                          content: `🔄 **Session Reset for @${data.target.username}**\n\nHow can I assist your investigation? You can ask about profession, age bracket, following status, or hobbies.`,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    }}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    title="Reset conversation"
                  >
                    <RefreshCw size={14} /> Clear Chat
                  </button>
                </div>

                {/* Suggested Question Chips */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  {suggestedQueries.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      disabled={chatLoading}
                      style={{
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#c7d2fe',
                        padding: '6px 14px',
                        borderRadius: '16px',
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        cursor: chatLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={(e) => {
                        if (!chatLoading) {
                          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                          e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        }
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                      }}
                    >
                      <Sparkles size={12} color="var(--accent-cyan)" />
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Message Feed */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '18px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px'
                }}>
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '100%'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        maxWidth: msg.role === 'user' ? '82%' : '90%',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                      }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: msg.role === 'user' 
                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                            : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: msg.role === 'user'
                            ? '0 0 10px rgba(99, 102, 241, 0.3)'
                            : '0 0 10px rgba(6, 182, 212, 0.3)'
                        }}>
                          {msg.role === 'user' ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
                        </div>

                        <div style={{
                          background: msg.role === 'user'
                            ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                            : 'rgba(15, 23, 42, 0.85)',
                          border: msg.role === 'user'
                            ? 'none'
                            : '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                          padding: '14px 20px',
                          color: '#ffffff',
                          fontSize: '0.92rem',
                          lineHeight: 1.65,
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                        marginRight: msg.role === 'user' ? '46px' : 0,
                        marginLeft: msg.role === 'user' ? 0 : '46px',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}

                  {chatLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
                      }}>
                        <Bot size={16} color="#fff" />
                      </div>
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: '4px 16px 16px 16px',
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        <div className="animate-spin-slow" style={{ width: '14px', height: '14px', border: '2px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                        SPECTER Copilot analyzing target telemetry & psychometrics...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask anything about @${data.target.username} (e.g. What is their profession? What is their age? Are they following another user?)`}
                    disabled={chatLoading}
                    style={{
                      flex: 1,
                      background: 'rgba(7, 9, 14, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="btn-primary"
                    style={{
                      padding: '14px 24px',
                      opacity: chatLoading || !chatInput.trim() ? 0.6 : 1,
                      cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Send size={16} /> Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        textAlign: 'center',
        background: 'rgba(7, 9, 14, 0.95)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ color: '#ffffff' }}>SPECTER // Instagram OSINT</strong> &bull; Real-Time Intelligence & Psychometrics Platform.
          </div>
          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <span>⚡ REAL-TIME LIVE EXTRACTION</span>
            <span>🧠 GROQ AI PSYCHOMETRICS</span>
            <span>🚀 VERCEL & GITHUB READY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
