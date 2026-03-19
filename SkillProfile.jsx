import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function SkillProfile() {
    const [members, setMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [profile, setProfile] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate' });
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => { fetchMembers(); }, []);

    const fetchMembers = async () => {
        try {
            const { data } = await axios.get(API + '/team');
            setMembers(data);
            if (data.length > 0) selectMember(data[0]._id);
            else setLoading(false);
        } catch (e) { setLoading(false); }
    };

    const selectMember = async (id) => {
        setSelectedMember(id);
        setLoading(true);
        setUploadResult(null);
        try {
            const [profileRes, certsRes] = await Promise.all([
                axios.get(API + '/skills/' + id + '/profile'),
                axios.get(API + '/certificates/' + id)
            ]);
            setProfile(profileRes.data);
            setCertificates(certsRes.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleUpload = async (file) => {
        if (!file || !selectedMember) return;
        setUploading(true);
        setUploadResult(null);
        const formData = new FormData();
        formData.append('certificate', file);
        try {
            const { data } = await axios.post(API + '/certificates/upload/' + selectedMember, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadResult(data.certificate);
            selectMember(selectedMember); // refresh
        } catch (err) {
            setUploadResult({ error: err.response?.data?.message || 'Upload failed' });
        }
        setUploading(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleDeleteCert = async (certId) => {
        try {
            await axios.delete(API + '/certificates/' + certId);
            selectMember(selectedMember);
        } catch (e) { console.error(e); }
    };

    const handleAddSkill = async (e) => {
        e.preventDefault();
        if (!newSkill.name.trim() || !selectedMember) return;
        try {
            await axios.post(API + '/skills/' + selectedMember, { skills: [newSkill] });
            setNewSkill({ name: '', level: 'intermediate' });
            selectMember(selectedMember);
        } catch (e) { console.error(e); }
    };

    const handleDeleteSkill = async (skillName) => {
        try {
            await axios.delete(API + '/skills/' + selectedMember + '/' + encodeURIComponent(skillName));
            selectMember(selectedMember);
        } catch (e) { console.error(e); }
    };

    const getLevelColor = (level) => {
        const map = { beginner: '#94a3b8', intermediate: '#06b6d4', advanced: '#8b5cf6', expert: '#f59e0b' };
        return map[level] || '#64748b';
    };

    const getSourceIcon = (source) => {
        const map = { manual: '✏️', certificate: '📜', inferred: '🤖' };
        return map[source] || '📌';
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>📜 Skill Profiles</h1>
                <p className="page-subtitle">Certificate uploads, OCR analysis & skill management</p>
            </div>

            {/* Member Selector */}
            <div className="member-selector">
                {members.map(m => (
                    <button key={m._id}
                        className={`member-chip ${selectedMember === m._id ? 'active' : ''}`}
                        onClick={() => selectMember(m._id)}>
                        <span className="chip-avatar">{m.name[0]?.toUpperCase()}</span>
                        {m.name}
                    </button>
                ))}
            </div>

            {loading && <div className="loading">Loading profile...</div>}

            {!loading && profile && (
                <>
                    {/* Profile Summary */}
                    <div className="skill-profile-summary">
                        <div className="skill-profile-header">
                            <div className="profile-avatar-large">{profile.member.name[0]?.toUpperCase()}</div>
                            <div>
                                <h2>{profile.member.name}</h2>
                                <p className="profile-email">{profile.member.email || 'No email'}</p>
                            </div>
                        </div>
                        <div className="skill-stats-row">
                            <div className="skill-stat-pill">
                                <span className="stat-icon">🛠️</span>
                                <span>{(profile.member.skills || []).length + (profile.member.qualities || []).length} Skills</span>
                            </div>
                            <div className="skill-stat-pill">
                                <span className="stat-icon">📜</span>
                                <span>{profile.certificateCount} Certificates</span>
                            </div>
                            <div className="skill-stat-pill">
                                <span className="stat-icon">✅</span>
                                <span>{profile.taskHistory.completed} Completed</span>
                            </div>
                            <div className="skill-stat-pill">
                                <span className="stat-icon">⏰</span>
                                <span>{profile.taskHistory.onTimeRate}% On-Time</span>
                            </div>
                        </div>
                    </div>

                    {/* Upload Certificate */}
                    <div className="cert-upload-section">
                        <h2>📤 Upload Certificate</h2>
                        <div className={`cert-drop-zone ${dragOver ? 'drag-over' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}>
                            <input type="file" ref={fileRef} hidden accept=".png,.jpg,.jpeg,.pdf"
                                onChange={e => handleUpload(e.target.files[0])} />
                            {uploading ? (
                                <div className="cert-uploading">
                                    <span className="cert-spinner">🔄</span>
                                    <p>Processing with OCR...</p>
                                </div>
                            ) : (
                                <>
                                    <span className="cert-drop-icon">📂</span>
                                    <p>Drag & drop certificate here or click to browse</p>
                                    <span className="cert-formats">PNG, JPG, PDF (max 10MB)</span>
                                </>
                            )}
                        </div>

                        {uploadResult && !uploadResult.error && (
                            <div className="cert-ocr-result">
                                <h3>🔍 OCR Extraction Results</h3>
                                <div className="cert-ocr-fields">
                                    <div className="cert-ocr-field">
                                        <label>Certificate Name</label>
                                        <span>{uploadResult.extractedData?.certName || 'Not detected'}</span>
                                    </div>
                                    <div className="cert-ocr-field">
                                        <label>Issuer</label>
                                        <span>{uploadResult.extractedData?.issuer || 'Not detected'}</span>
                                    </div>
                                    <div className="cert-ocr-field">
                                        <label>Date</label>
                                        <span>{uploadResult.extractedData?.completionDate || 'Not detected'}</span>
                                    </div>
                                    {uploadResult.extractedData?.skills?.length > 0 && (
                                        <div className="cert-ocr-field">
                                            <label>Skills Detected</label>
                                            <div className="quality-tags">
                                                {uploadResult.extractedData.skills.map((s, i) => (
                                                    <span key={i} className="quality-tag cert-skill-tag">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="cert-status-badge processed">✅ {uploadResult.status}</div>
                            </div>
                        )}
                        {uploadResult?.error && (
                            <div className="cert-ocr-result error">⚠️ {uploadResult.error}</div>
                        )}
                    </div>

                    {/* Existing Certificates */}
                    {certificates.length > 0 && (
                        <div className="cert-list-section">
                            <h2>📋 Uploaded Certificates</h2>
                            <div className="cert-list">
                                {certificates.map(cert => (
                                    <div key={cert._id} className="cert-card">
                                        <div className="cert-card-header">
                                            <span className="cert-file-icon">📄</span>
                                            <div className="cert-file-info">
                                                <span className="cert-file-name">{cert.fileName}</span>
                                                <span className="cert-file-date">{new Date(cert.uploadedAt).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`cert-status-badge ${cert.status}`}>{cert.status}</span>
                                            <button className="delete-btn small" onClick={() => handleDeleteCert(cert._id)}>🗑️</button>
                                        </div>
                                        {cert.extractedData?.certName && (
                                            <div className="cert-extracted-info">
                                                <span>📝 {cert.extractedData.certName}</span>
                                                {cert.extractedData.issuer && <span>🏢 {cert.extractedData.issuer}</span>}
                                            </div>
                                        )}
                                        {cert.extractedData?.skills?.length > 0 && (
                                            <div className="quality-tags">
                                                {cert.extractedData.skills.map((s, i) => (
                                                    <span key={i} className="quality-tag cert-skill-tag">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manual Skill Entry */}
                    <div className="manual-skill-section">
                        <h2>✏️ Add Skills Manually</h2>
                        <form onSubmit={handleAddSkill} className="skill-add-form">
                            <input type="text" placeholder="Skill name (e.g. React)"
                                value={newSkill.name} onChange={e => setNewSkill({ ...newSkill, name: e.target.value })} required />
                            <select value={newSkill.level} onChange={e => setNewSkill({ ...newSkill, level: e.target.value })}>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                                <option value="expert">Expert</option>
                            </select>
                            <button type="submit" className="submit-btn">+ Add</button>
                        </form>
                    </div>

                    {/* All Skills Display */}
                    <div className="all-skills-section">
                        <h2>🛠️ Complete Skill Profile</h2>
                        <div className="skills-grid">
                            {(profile.member.skills || []).map((s, i) => (
                                <div key={i} className="skill-card-item">
                                    <div className="skill-card-top">
                                        <span className="skill-source-icon">{getSourceIcon(s.source)}</span>
                                        <span className="skill-name">{s.name}</span>
                                        <button className="skill-delete-btn" onClick={() => handleDeleteSkill(s.name)}>✕</button>
                                    </div>
                                    <div className="skill-level-indicator">
                                        <span className="skill-level-dot" style={{ background: getLevelColor(s.level) }}></span>
                                        <span className="skill-level-text" style={{ color: getLevelColor(s.level) }}>{s.level}</span>
                                    </div>
                                </div>
                            ))}
                            {(profile.member.qualities || []).filter(q =>
                                !(profile.member.skills || []).some(s => s.name.toLowerCase() === q.toLowerCase())
                            ).map((q, i) => (
                                <div key={'q-' + i} className="skill-card-item legacy">
                                    <div className="skill-card-top">
                                        <span className="skill-source-icon">📌</span>
                                        <span className="skill-name">{q}</span>
                                        <button className="skill-delete-btn" onClick={() => handleDeleteSkill(q)}>✕</button>
                                    </div>
                                    <div className="skill-level-indicator">
                                        <span className="skill-level-dot" style={{ background: '#64748b' }}></span>
                                        <span className="skill-level-text" style={{ color: '#64748b' }}>legacy</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {(profile.member.skills?.length === 0 && profile.member.qualities?.length === 0) && (
                            <div className="empty-state small">No skills yet. Upload a certificate or add skills manually!</div>
                        )}
                    </div>

                    {/* Inferred Skills */}
                    {profile.inferredSkills?.length > 0 && (
                        <div className="inferred-skills-section">
                            <h2>🤖 AI-Inferred Skills (from task history)</h2>
                            <div className="skills-grid">
                                {profile.inferredSkills.map((s, i) => (
                                    <div key={i} className="skill-card-item inferred">
                                        <div className="skill-card-top">
                                            <span className="skill-source-icon">🤖</span>
                                            <span className="skill-name">{s.name}</span>
                                        </div>
                                        <div className="skill-level-indicator">
                                            <span className="skill-level-dot" style={{ background: getLevelColor(s.level) }}></span>
                                            <span className="skill-level-text" style={{ color: getLevelColor(s.level) }}>{s.level}</span>
                                        </div>
                                        <div className="skill-inferred-meta">
                                            <span>{s.taskCount} tasks</span>
                                            <span>{s.successRate}% success</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && members.length === 0 && (
                <div className="empty-state">No team members found. Add members in the Team page first!</div>
            )}
        </div>
    );
}

export default SkillProfile;
