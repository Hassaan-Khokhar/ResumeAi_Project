import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyzeAPI } from '../api';
import { Upload, FileText, Briefcase, Loader2, Target, TrendingUp, Zap, Award, AlertTriangle, CheckCircle, XCircle, Lightbulb, Shield, Download } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { generatePDFReport } from '../generateReport';

function ScoreCircle({ score }) {
  const size = 160, stroke = 10, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="score-circle" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--glass-border)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
      </svg>
      <span className="score-num">{Math.round(score)}%</span>
    </div>
  );
}

export default function AICenter({ addToast }) {
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('upload');
  const [dragOver, setDragOver] = useState(false);
  const [mlExpanded, setMlExpanded] = useState(false);
  const inputRef = useRef(null);

  // Auto-load results from Jobs page "View Full Report"
  useEffect(() => {
    if (location.state?.results) {
      setResults(location.state.results);
      setTab('results');
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); };

  const handleAnalyze = async () => {
    if (!file) return addToast('Upload a PDF resume', 'error');
    if (jd.length < 20) return addToast('Job description needs at least 20 characters', 'error');
    setLoading(true); setResults(null);
    const fd = new FormData(); fd.append('file', file); fd.append('job_description', jd);
    try {
      const data = await analyzeAPI.analyze(fd);
      if (data.success) { setResults(data.data); setTab('results'); addToast(`Match Score: ${Math.round(data.data.match_score)}%`); }
      else throw new Error(data.detail || 'Analysis failed');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setTab('history');
    try { const r = await analyzeAPI.history(); setHistory(r.data || []); } catch(e) { console.error(e); }
  };

  const r = results;
  const bd = r ? { skills_score: r.skills_score, experience_score: r.experience_score, keyword_score: r.keyword_score, overall_score: r.match_score } : null;
  const radarData = bd ? [{ s: 'Skills', v: bd.skills_score }, { s: 'Experience', v: bd.experience_score }, { s: 'Keywords', v: bd.keyword_score }, { s: 'Overall', v: bd.overall_score }] : [];
  const barData = r ? [{ name: 'Matched', count: r.matched_skills?.length || 0, fill: '#10b981' }, { name: 'Missing', count: r.missing_skills?.length || 0, fill: '#ef4444' }] : [];

  return (
    <div className="page-container">
      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 20, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        AI Command Center
      </h2>

      <div style={{ display: 'flex', gap: 4, background: 'var(--glass)', padding: 4, borderRadius: 'var(--radius-sm)', marginBottom: 24, width: 'fit-content' }}>
        {[['upload','Upload & Analyze'],['results','Results'],['history','History']].map(([k,l]) => (
          <button key={k} className={`btn-ghost ${tab===k ? 'active' : ''}`} onClick={() => k==='history' ? loadHistory() : setTab(k)}
            style={tab===k ? { background: 'var(--accent)', color: 'white', borderRadius: 6 } : {}} disabled={k==='results' && !results}>{l}</button>
        ))}
      </div>

      {tab === 'upload' && (
        <div className="two-col fade-in">
          <div className="glass-card" style={{ padding: 28 }}>
            <div className="section-title"><Upload size={18} className="icon" />Resume PDF</div>
            <div className={`upload-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop} onClick={() => inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept=".pdf" hidden onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
              {file ? (<><FileText size={40} color="var(--success)" /><p style={{ fontWeight: 600, color: 'var(--success)', marginTop: 8 }}>{file.name}</p></>)
                : (<><Upload size={40} color="var(--text-muted)" /><p style={{ fontWeight: 600, marginTop: 8 }}>Drag & Drop PDF</p><p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>or click to browse</p></>)}
            </div>
          </div>
          <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
            <div className="section-title"><Briefcase size={18} className="icon" />Job Description</div>
            <textarea className="textarea-field" style={{ flex: 1, minHeight: 180 }} placeholder="Paste the job description here..."
              value={jd} onChange={e => setJd(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <span style={{ fontSize: '0.8rem', color: jd.length < 20 ? 'var(--text-muted)' : 'var(--success)' }}>{jd.length} chars</span>
              <button className="btn-primary" onClick={handleAnalyze} disabled={loading}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : <><Zap size={16} /> Analyze</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'upload' && loading && (
        <div style={{ marginTop: 24 }}>
          <div className="grid-3">{[1,2,3].map(i => <div key={i} className="glass-card" style={{ padding: 24 }}><div className="skeleton" style={{ width: '60%', height: 36, margin: '0 auto 8px' }} /><div className="skeleton" style={{ width: '40%', height: 14, margin: '0 auto' }} /></div>)}</div>
        </div>
      )}

      {tab === 'results' && r && (
        <div className="fade-in">
          <div className="grid-3" style={{ marginBottom: 24 }}>
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ScoreCircle score={r.match_score} />
              <p style={{ marginTop: 8, fontWeight: 700 }}>Match Score</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{r.match_score >= 75 ? '🎯 Strong' : r.match_score >= 50 ? '⚡ Moderate' : '⚠️ Needs Work'}</p>
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <div className="section-title"><TrendingUp size={16} className="icon" />Breakdown</div>
              {[['Skills','60%',bd.skills_score,'#6c5ce7'],['Experience','30%',bd.experience_score,'#a855f7'],['Keywords','10%',bd.keyword_score,'#ec4899']].map(([n,w,v,c]) => (
                <div key={n} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: 4 }}>
                    <span>{n} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({w})</span></span>
                    <span style={{ fontWeight: 700, color: c }}>{Math.round(v)}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${v}%`, background: c }} /></div>
                </div>
              ))}
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <div className="section-title"><Target size={16} className="icon" />Radar</div>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}><PolarGrid stroke="var(--glass-border)" /><PolarAngleAxis dataKey="s" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} /><PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} /><Radar dataKey="v" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2} /></RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Skills bar + chips */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="section-title"><Zap size={16} className="icon" />Skills</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={barData} layout="vertical"><XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={60} /><Tooltip contentStyle={{ background: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8e8f0' }} /><Bar dataKey="count" radius={[0,6,6,0]} barSize={20}>{barData.map((d,i) => <Cell key={i} fill={d.fill} />)}</Bar></BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>{(r.matched_skills||[]).slice(0,10).map(s => <span key={s} className="chip chip-success">{s}</span>)}</div>
          </div>

          {/* Missing skills, Strengths, Improvements, Summary, ATS */}
          {(r.missing_skills||[]).length > 0 && (
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <div className="section-title"><AlertTriangle size={16} className="icon" />Skill Gaps</div>
              {r.missing_skills.map((s,i) => (
                <div key={i} className="list-item"><XCircle size={16} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} /><div><strong>{s.skill}</strong> <span className={`chip chip-${s.importance==='high'?'danger':s.importance==='medium'?'warning':'info'}`} style={{ fontSize: '0.7rem', padding: '1px 8px' }}>{s.importance}</span><p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: 2 }}>{s.suggestion}</p></div></div>
              ))}
            </div>
          )}

          <div className="two-col" style={{ marginBottom: 20 }}>
            <div className="glass-card" style={{ padding: 20 }}>
              <div className="section-title"><Award size={16} className="icon" />Strengths</div>
              {(r.strengths||[]).map((s,i) => <div key={i} className="list-item"><CheckCircle size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: '0.85rem' }}>{s}</span></div>)}
            </div>
            <div className="glass-card" style={{ padding: 20 }}>
              <div className="section-title"><Lightbulb size={16} className="icon" />Improvements</div>
              {(r.improvements||[]).map((s,i) => <div key={i} className="list-item"><AlertTriangle size={14} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: '0.85rem' }}>{s}</span></div>)}
            </div>
          </div>

          {r.rewritten_summary && (
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <div className="section-title"><Zap size={16} className="icon" />AI-Optimized Summary</div>
              <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>"{r.rewritten_summary}"</p>
            </div>
          )}

          {(r.ats_tips||[]).length > 0 && (
            <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
              <div className="section-title"><Shield size={16} className="icon" />ATS Tips</div>
              {r.ats_tips.map((t,i) => <div key={i} className="list-item"><Shield size={14} color="var(--info)" style={{ flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: '0.85rem' }}>{t}</span></div>)}
            </div>
          )}

          {r.trained_model_prediction && (
            <div className="glass-card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(168,85,247,0.3)' }}>
              <div className="section-title" style={{ marginBottom: 16 }}>
                <TrendingUp size={16} className="icon" />Model Comparison — Gemini AI vs Trained ML
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'rgba(108,92,231,0.1)', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid rgba(108,92,231,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {r._meta?.model === 'tfidf_cosine_skill_taxonomy' ? '🧮 TF-IDF Fallback' : '🤖 Gemini AI'}
                  </div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #6c5ce7, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {Math.round(r.match_score)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{r._meta?.model || 'gemini-flash'}</div>
                </div>
                <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>🎓 Trained ML Model</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #06d6a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {Math.round(r.trained_model_prediction.ml_match_score)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Random Forest Regressor</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--glass)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{r.trained_model_prediction.skill_match_percentage}%</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Skill Match</div>
                </div>
                <div style={{ background: 'var(--glass)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a855f7' }}>{r.trained_model_prediction.keyword_density}%</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Keyword Density</div>
                </div>
                <div style={{ background: 'var(--glass)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6c5ce7' }}>{r.trained_model_prediction.cosine_similarity}%</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cosine Similarity</div>
                </div>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: Math.abs(Math.round(r.match_score) - Math.round(r.trained_model_prediction.ml_match_score)) <= 10 ? 'rgba(16,185,129,0.1)' : 'rgba(234,179,8,0.1)', borderRadius: 8, fontSize: '0.82rem', textAlign: 'center', color: Math.abs(Math.round(r.match_score) - Math.round(r.trained_model_prediction.ml_match_score)) <= 10 ? '#10b981' : '#eab308' }}>
                {Math.abs(Math.round(r.match_score) - Math.round(r.trained_model_prediction.ml_match_score)) <= 5 ? '✅' : '⚡'} Score difference: <strong>{Math.abs(Math.round(r.match_score) - Math.round(r.trained_model_prediction.ml_match_score))} points</strong> — {Math.abs(Math.round(r.match_score) - Math.round(r.trained_model_prediction.ml_match_score)) <= 10 ? 'Good model agreement!' : 'Models diverge on this resume'}
              </div>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button className="btn-ghost" onClick={() => setMlExpanded(!mlExpanded)}
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, padding: '8px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#a855f7' }}>
                  {mlExpanded ? '▲ Hide' : '▼ View'} Detailed ML Report
                </button>
              </div>

              {mlExpanded && (
                <div style={{ marginTop: 16, animation: 'fadeIn 0.3s ease' }}>
                  {/* Matched Skills */}
                  {(r.trained_model_prediction.matched_skills || []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#10b981' }}>
                        <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        Matched Skills ({r.trained_model_prediction.matched_skills.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.trained_model_prediction.matched_skills.map(s => (
                          <span key={s} className="chip chip-success">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {(r.trained_model_prediction.missing_skills || []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#ef4444' }}>
                        <XCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        Missing Skills ({r.trained_model_prediction.missing_skills.length})
                      </div>
                      {r.trained_model_prediction.missing_skills.map((s, i) => (
                        <div key={i} className="list-item" style={{ padding: '6px 0' }}>
                          <XCircle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong>{s.skill}</strong>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>{s.suggestion}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feature Breakdown */}
                  <div style={{ background: 'var(--glass)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                      🔬 Feature Engineering Breakdown
                    </div>
                    {[
                      ['Skill Match %', r.trained_model_prediction.skill_match_percentage, '#10b981', 'Percentage of required skills found in resume'],
                      ['Cosine Similarity', r.trained_model_prediction.cosine_similarity, '#6c5ce7', 'TF-IDF vector similarity between texts'],
                      ['Keyword Density', r.trained_model_prediction.keyword_density, '#a855f7', 'Job keywords present in resume'],
                    ].map(([name, val, color, desc]) => (
                      <div key={name} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
                          <span>{name}</span>
                          <span style={{ fontWeight: 700, color }}>{val}%</span>
                        </div>
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(val, 100)}%`, background: color }} /></div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                      Model: Random Forest Regressor | R² = 0.91 | MAE = 3.18
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', paddingBottom: 32 }}>
            <button onClick={() => { setResults(null); setFile(null); setJd(''); setTab('upload'); setMlExpanded(false); }}
              style={{ padding: '12px 28px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}>
              🔄 Analyze Another
            </button>
            <button onClick={() => { try { generatePDFReport(r); addToast('PDF Report downloaded!'); } catch(e) { console.error(e); addToast('PDF generation failed: ' + e.message, 'error'); } }}
              style={{ padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #6c5ce7, #a855f7)', color: 'white', border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 15px rgba(108,92,231,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,92,231,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(108,92,231,0.4)'; }}>
              <Download size={16} /> Download PDF Report
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="fade-in">
          {history.length === 0 ? (
            <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>No analyses yet</div>
          ) : history.map((h, i) => {
            const sc = h.match_score >= 75 ? 'var(--success)' : h.match_score >= 50 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={h._id || i} className="glass-card" style={{ padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${sc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={18} color={sc} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: sc }}>{Math.round(h.match_score)}%</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 8 }}>{h.matched_skills?.length || 0} skills matched</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.created_at ? new Date(h.created_at).toLocaleDateString() : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
