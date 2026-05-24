import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../api';
import { Briefcase, MapPin, DollarSign, Clock, Search, Plus, Loader2, Upload, FileText, Zap, Target, CheckCircle, XCircle, AlertTriangle, X, TrendingUp, Send, Eye, Download, Users, BarChart3, Calendar, ClipboardList, Trash2, GripVertical } from 'lucide-react';

// ─── Create Job Modal ──────────────────────
function CreateJobModal({ editData, onClose, onCreated, addToast }) {
  const [form, setForm] = useState({ 
    title: editData?.title || '', 
    description: editData?.description || '', 
    requirements: editData?.requirements?.join(', ') || '', 
    location: editData?.location || '', 
    salary_range: editData?.salary_range || '', 
    job_type: editData?.job_type || 'full-time', 
    duration: editData?.duration || '', 
    poster: editData?.poster || null 
  });
  const [loading, setLoading] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(!!editData?.application_form);
  const [formFields, setFormFields] = useState(editData?.application_form || []);
  const u = (k, v) => setForm({ ...form, [k]: v });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => u('poster', reader.result); reader.readAsDataURL(file); }
  };

  const addField = (type) => {
    setFormFields([...formFields, { id: `f_${Date.now()}`, type, label: '', required: false, options: ['radio', 'select', 'checkbox'].includes(type) ? [{ label: '', value: '' }] : [] }]);
  };
  const updateField = (i, key, val) => { const f = [...formFields]; f[i] = { ...f[i], [key]: val }; setFormFields(f); };
  const removeField = (i) => setFormFields(formFields.filter((_, idx) => idx !== i));
  const addOption = (i) => { const f = [...formFields]; f[i].options = [...f[i].options, { label: '', value: '' }]; setFormFields(f); };
  const updateOption = (fi, oi, val) => { const f = [...formFields]; f[fi].options[oi] = { label: val, value: val }; setFormFields(f); };
  const removeOption = (fi, oi) => { const f = [...formFields]; f[fi].options = f[fi].options.filter((_, idx) => idx !== oi); setFormFields(f); };

  const handleCreate = async () => {
    if (!form.title || !form.description) return addToast('Title and description are required', 'error');
    setLoading(true);
    try {
      const body = { ...form, requirements: form.requirements.split(',').map(s => s.trim()).filter(Boolean), application_form: showFormBuilder && formFields.length > 0 ? formFields : null };
      if (editData) {
        await jobsAPI.update(editData._id, body);
        addToast('Job updated successfully!');
      } else {
        await jobsAPI.create(body);
        addToast('Job posted successfully!');
      }
      onCreated(); onClose();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ padding: '20px' }}>
      <div className="glass-card modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editData ? 'Edit Job Posting' : 'Create New Job Posting'}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{editData ? 'Update the details below.' : 'Fill in the details to publish a new opening.'}</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Poster Section */}
          <div>
            <label className="form-label">Job Poster / Banner <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
            {form.poster ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img src={form.poster} alt="Poster" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }} />
                <button onClick={() => u('poster', null)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}><X size={16} /></button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, border: '2px dashed var(--glass-border)', borderRadius: 12, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}>
                <Upload size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to upload cover image</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>16:9 ratio recommended</span>
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>
            )}
          </div>

          {/* Basic Details */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="form-label">Job Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input-field" placeholder="e.g. Senior Frontend Engineer" value={form.title} onChange={e => u('title', e.target.value)} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label className="form-label">Job Type</label>
                <select className="input-field" value={form.job_type} onChange={e => u('job_type', e.target.value)} style={{ padding: '10px 14px' }}>
                  <option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input className="input-field" style={{ paddingLeft: 36 }} placeholder="e.g. Remote, Lahore" value={form.location} onChange={e => u('location', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label className="form-label">Salary Range</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input className="input-field" style={{ paddingLeft: 36 }} placeholder="e.g. $80k - $120k" value={form.salary_range} onChange={e => u('salary_range', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">Duration</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input className="input-field" style={{ paddingLeft: 36 }} placeholder="e.g. 6 Months, Permanent" value={form.duration} onChange={e => u('duration', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Job Description <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="textarea-field" style={{ minHeight: 120, lineHeight: 1.5 }} placeholder="Describe the responsibilities, team, and impact..." value={form.description} onChange={e => u('description', e.target.value)} />
            </div>

            <div>
              <label className="form-label">Key Requirements <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Comma-separated skills)</span></label>
              <input className="input-field" placeholder="e.g. React, TypeScript, Node.js, AWS" value={form.requirements} onChange={e => u('requirements', e.target.value)} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />

          {/* Form Builder Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={18} color="var(--accent)" /> Application Process</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>How should candidates apply for this job?</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: showFormBuilder ? 'rgba(108,92,231,0.1)' : 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 20, border: `1px solid ${showFormBuilder ? 'var(--accent)' : 'var(--glass-border)'}`, transition: 'all 0.2s' }}>
                <input type="checkbox" checked={showFormBuilder} onChange={e => setShowFormBuilder(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: showFormBuilder ? 'var(--accent)' : 'var(--text-primary)' }}>Custom Form</span>
              </label>
            </div>

            {!showFormBuilder ? (
              <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <FileText size={32} color="var(--text-muted)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Standard Application</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Applicants will only be asked to upload their Resume/CV (PDF or Word format).</div>
                </div>
              </div>
            ) : (
              <div className="fade-in" style={{ padding: 20, background: 'rgba(108,92,231,0.03)', borderRadius: 12, border: '1px solid rgba(108,92,231,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--glass-border)' }}>
                  <FileText size={20} color="var(--success)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Resume / CV Upload</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Always required for all applications</div>
                  </div>
                  <span className="chip" style={{ fontSize: '0.7rem', background: 'rgba(32,201,151,0.1)', color: 'var(--success)' }}>Mandatory</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {formFields.map((field, i) => (
                    <div key={field.id} className="fade-in" style={{ position: 'relative', padding: '16px 16px 16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 4, height: '40%', background: 'var(--accent)', borderRadius: '0 4px 4px 0' }} />
                      
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input className="input-field" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', borderRadius: 0, padding: '4px 0', fontSize: '0.95rem', fontWeight: 500, boxShadow: 'none' }} placeholder="Type your question here..." value={field.label} onChange={e => updateField(i, 'label', e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span className="chip chip-purple" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{field.type}</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={field.required} onChange={e => updateField(i, 'required', e.target.checked)} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} /> Required
                          </label>
                          <button className="btn-ghost" onClick={() => removeField(i)} style={{ padding: 6, color: 'var(--danger)', background: 'rgba(255,71,87,0.1)', borderRadius: 6 }} title="Remove Question"><Trash2 size={16} /></button>
                        </div>
                      </div>

                      {['radio', 'select', 'checkbox'].includes(field.type) && (
                        <div style={{ paddingLeft: 12, borderLeft: '2px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Options</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {field.options.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ width: 12, height: 12, borderRadius: field.type === 'radio' ? '50%' : 2, border: '2px solid var(--text-muted)', opacity: 0.5 }} />
                                <input className="input-field" style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem' }} placeholder={`Option ${oi + 1}`} value={opt.label} onChange={e => updateOption(i, oi, e.target.value)} />
                                {field.options.length > 1 && <button className="btn-ghost" onClick={() => removeOption(i, oi)} style={{ padding: 4, color: 'var(--text-muted)' }}><X size={14} /></button>}
                              </div>
                            ))}
                            <button className="btn-ghost" onClick={() => addOption(i)} style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--accent)', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> Add Option</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed var(--glass-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add Field:</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={() => addField('text')} style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 20 }}>Short Text</button>
                    <button className="btn-secondary" onClick={() => addField('textarea')} style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 20 }}>Long Text</button>
                    <button className="btn-secondary" onClick={() => addField('radio')} style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 20 }}>Multiple Choice</button>
                    <button className="btn-secondary" onClick={() => addField('checkbox')} style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 20 }}>Checkboxes</button>
                    <button className="btn-secondary" onClick={() => addField('select')} style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 20 }}>Dropdown</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'rgba(255,255,255,0.02)' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '10px 24px' }}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ padding: '10px 32px' }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Publishing...</> : <><CheckCircle size={16} /> Publish Job</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompatibilityModal({ job, onClose, addToast }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const handleCheck = async () => {
    if (!file) return addToast('Upload your CV first', 'error');
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await jobsAPI.checkCompatibility(job._id, fd);
      if (res.success) { setResult(res.data); addToast(`Match Score: ${Math.round(res.data.match_score)}%`); }
      else throw new Error(res.detail || 'Analysis failed');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const r = result;
  const scoreColor = r ? (r.match_score >= 75 ? 'var(--success)' : r.match_score >= 50 ? 'var(--warning)' : 'var(--danger)') : '';
  const tp = r?.trained_model_prediction;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-card" style={{ maxWidth: 620, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3><Zap size={18} color="var(--accent)" style={{ verticalAlign: 'middle', marginRight: 4 }} /> AI Compatibility Check</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>for {job.title}</p>
          </div>
          <button className="btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {!result ? (
          <div className="modal-body">
            <div className="glass-card" style={{ padding: 14, marginBottom: 14, background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)' }}>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--accent)' }}>Auto-detected:</strong> Job description will be automatically pulled from this posting. Just upload your CV!
              </p>
            </div>

            <div className={`upload-zone ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()}
              style={{ padding: '28px 20px' }}>
              <input ref={inputRef} type="file" accept=".pdf" hidden onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
              {file ? (
                <><FileText size={32} color="var(--success)" /><p style={{ fontWeight: 600, color: 'var(--success)', marginTop: 6, fontSize: '0.9rem' }}>{file.name}</p></>
              ) : (
                <><Upload size={32} color="var(--text-muted)" /><p style={{ fontWeight: 600, marginTop: 6 }}>Upload your CV (PDF)</p><p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Click or drag to upload</p></>
              )}
            </div>

            <button className="btn-primary" onClick={handleCheck} disabled={loading || !file}
              style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : <><Zap size={16} /> Check Compatibility</>}
            </button>
          </div>
        ) : (
          <div className="modal-body">
            {/* Score */}
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: scoreColor }}>{Math.round(r.match_score)}%</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {r.match_score >= 75 ? '🎯 Strong Match!' : r.match_score >= 50 ? '⚡ Moderate Match' : '⚠️ Needs Improvement'}
              </p>
            </div>

            {/* Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[['Skills', r.skills_score, '#6c5ce7'], ['Experience', r.experience_score, '#a855f7'], ['Keywords', r.keyword_score, '#ec4899']].map(([n, v, c]) => (
                <div key={n} className="glass-card" style={{ padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: c }}>{Math.round(v)}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n}</div>
                </div>
              ))}
            </div>

            {/* Matched Skills */}
            {r.matched_skills?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 6 }}><CheckCircle size={14} color="var(--success)" style={{ verticalAlign: 'middle' }} /> Matched Skills</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {r.matched_skills.slice(0, 12).map(s => <span key={s} className="chip chip-success">{s}</span>)}
                </div>
              </div>
            )}

            {/* Missing Skills */}
            {r.missing_skills?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 6 }}><XCircle size={14} color="var(--danger)" style={{ verticalAlign: 'middle' }} /> Missing Skills</p>
                {r.missing_skills.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: '0.83rem' }}>
                    <AlertTriangle size={14} color="var(--warning)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div><strong>{s.skill}</strong> — <span style={{ color: 'var(--text-secondary)' }}>{s.suggestion}</span></div>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths */}
            {r.strengths?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 6 }}>Strengths</p>
                {r.strengths.slice(0, 4).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, padding: '4px 0', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={13} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />{s}
                  </div>
                ))}
              </div>
            )}

            {/* Buttons: Check Again + View Full Report */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => { setResult(null); setFile(null); }}
                style={{ flex: 1, justifyContent: 'center' }}>Check Again</button>
              <button className="btn-primary" onClick={() => { onClose(); navigate('/ai', { state: { results: r } }); }}
                style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #6c5ce7, #a855f7)' }}>
                <Eye size={16} /> View Full Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Main Jobs Page ─────────────────────────
export default function Jobs({ addToast }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [compatJob, setCompatJob] = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [editJob, setEditJob] = useState(null);
  const [tab, setTab] = useState('browse'); // browse | dashboard

  const loadJobs = async (q = '') => {
    setLoading(true);
    try { const r = await jobsAPI.list(0, q); setJobs(r.data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, []);
  const handleSearch = () => loadJobs(search);

  // Lazy-load RecruiterDashboard & ApplyModal
  const [RecruiterDashboard, setRD] = useState(null);
  const [ApplyModal, setAM] = useState(null);
  useEffect(() => {
    import('./RecruiterDashboard').then(m => setRD(() => m.default));
    import('./ApplyModal').then(m => setAM(() => m.default));
  }, []);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Jobs Marketplace</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role === 'company' && (
            <>
              <button className={tab === 'browse' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('browse')} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Browse Jobs</button>
              <button className={tab === 'dashboard' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('dashboard')} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Users size={14} /> Dashboard
              </button>
              <button className="btn-primary" onClick={() => { setEditJob(null); setShowCreate(true); }}><Plus size={16} /> Post Job</button>
            </>
          )}
        </div>
      </div>

      {(showCreate || editJob) && <CreateJobModal editData={editJob} onClose={() => { setShowCreate(false); setEditJob(null); }} onCreated={() => loadJobs()} addToast={addToast} />}
      {compatJob && <CompatibilityModal job={compatJob} onClose={() => setCompatJob(null)} addToast={addToast} />}
      {applyJob && ApplyModal && <ApplyModal job={applyJob} onClose={() => { setApplyJob(null); loadJobs(); }} addToast={addToast} />}

      {/* Recruiter Dashboard Tab */}
      {tab === 'dashboard' && user?.role === 'company' && RecruiterDashboard && (
        <RecruiterDashboard addToast={addToast} onEditJob={setEditJob} />
      )}

      {/* Browse Tab */}
      {tab === 'browse' && (
        <>
          <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 10 }}>
            <input className="input-field" style={{ flex: 1, padding: '10px 14px' }} placeholder="Search jobs... (e.g. React Developer, Remote)"
              value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className="btn-primary" onClick={handleSearch} style={{ padding: '10px 20px' }}><Search size={16} /> Search</button>
          </div>

          <div className="two-col">
            <div>
              {loading ? [1,2,3].map(i => (
                <div key={i} className="glass-card" style={{ padding: 20, marginBottom: 12 }}>
                  <div className="skeleton" style={{ width: '60%', height: 18, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: '40%', height: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '80%', height: 14 }} />
                </div>
              )) : jobs.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Briefcase size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><p>No jobs found</p>
                </div>
              ) : jobs.map(j => (
                <div key={j._id} className={`glass-card job-card ${selectedJob?._id === j._id ? 'active' : ''}`}
                  onClick={() => setSelectedJob(j)}
                  style={selectedJob?._id === j._id ? { borderColor: 'var(--accent)' } : {}}>
                  <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{j.title}</h4>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{j.company_name || 'Company'}</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {j.location && <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {j.location}</span>}
                    {j.salary_range && <span><DollarSign size={12} style={{ verticalAlign: 'middle' }} /> {j.salary_range}</span>}
                    <span><Clock size={12} style={{ verticalAlign: 'middle' }} /> {j.job_type}</span>
                    {j.duration && <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {j.duration}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {j.user_match_score != null && (
                      <span className={`chip ${j.user_match_score >= 75 ? 'chip-success' : j.user_match_score >= 50 ? 'chip-warning' : 'chip-danger'}`}>
                        AI Match: {Math.round(j.user_match_score)}%
                      </span>
                    )}
                    {j.user_applied && <span className="chip chip-success"><CheckCircle size={10} /> Applied</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Job Detail */}
            <div>
              {selectedJob ? (
                <div className="glass-card fade-in" style={{ padding: 24, position: 'sticky', top: 80 }}>
                  {selectedJob.poster && (
                    <div style={{ marginBottom: 16 }}>
                      <img src={selectedJob.poster} alt={`${selectedJob.title} Poster`} style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8 }} />
                    </div>
                  )}
                  <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{selectedJob.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>{selectedJob.company_name}</p>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    {selectedJob.location && <span className="chip chip-info"><MapPin size={12} /> {selectedJob.location}</span>}
                    {selectedJob.salary_range && <span className="chip chip-success"><DollarSign size={12} /> {selectedJob.salary_range}</span>}
                    <span className="chip chip-purple"><Clock size={12} /> {selectedJob.job_type}</span>
                    {selectedJob.duration && <span className="chip chip-purple"><Calendar size={12} /> {selectedJob.duration}</span>}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Description</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedJob.description}</p>
                  </div>

                  {selectedJob.requirements?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Requirements</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedJob.requirements.map((r, i) => <span key={i} className="chip chip-purple">{r}</span>)}
                      </div>
                    </div>
                  )}

                  {selectedJob.application_form && (
                    <div style={{ marginBottom: 12, padding: 8, background: 'rgba(108,92,231,0.06)', borderRadius: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <ClipboardList size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      This job requires a custom application form ({selectedJob.application_form.length} question{selectedJob.application_form.length !== 1 ? 's' : ''})
                    </div>
                  )}

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    {selectedJob.applicant_count || 0} applicants · Posted {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : ''}
                  </p>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {user?.role !== 'company' && (
                      <button className="btn-primary" onClick={() => setApplyJob(selectedJob)}
                        disabled={selectedJob.user_applied}
                        style={{ flex: 1, justifyContent: 'center' }}>
                        {selectedJob.user_applied ? <><CheckCircle size={16} /> Already Applied</> : <><Send size={16} /> Apply Now</>}
                      </button>
                    )}
                    <button className="btn-secondary" onClick={() => setCompatJob(selectedJob)}
                      style={{ flex: 1, justifyContent: 'center' }}>
                      <Zap size={16} /> AI Check
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Briefcase size={40} style={{ opacity: 0.3, marginBottom: 8 }} /><p>Select a job to see details</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
