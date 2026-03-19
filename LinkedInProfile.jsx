import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function LinkedInProfile({ user }) {
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingBio, setGeneratingBio] = useState(false);
    const [bioTone, setBioTone] = useState('professional');
    const [newSkill, setNewSkill] = useState('');
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        headline: '',
        about: '',
        profilePhoto: '',
        location: '',
        skills: [],
        experience: []
    });

    useEffect(() => { if (user?.id) fetchProfile(); }, [user]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API}/profile/${user.id}`);
            if (data) {
                setProfile(data);
                setForm({
                    headline: data.headline || '',
                    about: data.about || '',
                    profilePhoto: data.profilePhoto || '',
                    location: data.location || '',
                    skills: data.skills || [],
                    experience: data.experience || []
                });
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await axios.put(`${API}/profile/${user.id}`, form);
            setProfile(data);
            setEditing(false);
        } catch (err) { console.error(err); }
        setSaving(false);
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(prev => ({ ...prev, profilePhoto: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const handleAddSkill = () => {
        if (newSkill.trim() && !form.skills.includes(newSkill.trim())) {
            setForm(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
            setNewSkill('');
        }
    };

    const handleRemoveSkill = (skill) => {
        setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
    };

    const handleAddExperience = () => {
        setForm(prev => ({
            ...prev,
            experience: [...prev.experience, { title: '', company: '', startDate: '', endDate: '', current: false, description: '' }]
        }));
    };

    const handleUpdateExperience = (index, field, value) => {
        setForm(prev => {
            const updated = [...prev.experience];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, experience: updated };
        });
    };

    const handleRemoveExperience = (index) => {
        setForm(prev => ({
            ...prev,
            experience: prev.experience.filter((_, i) => i !== index)
        }));
    };

    const handleGenerateBio = async () => {
        setGeneratingBio(true);
        try {
            const expSummary = form.experience.length > 0
                ? `working as ${form.experience.map(e => `${e.title} at ${e.company}`).join(', ')}`
                : '';
            const { data } = await axios.post(`${API}/profile/generate-bio`, {
                name: user.username,
                role: form.headline || user.role,
                skills: form.skills,
                experience: expSummary,
                tone: bioTone
            });
            setForm(prev => ({ ...prev, about: data.bio }));
        } catch (err) { console.error(err); }
        setGeneratingBio(false);
    };

    if (loading) return <div className="page-container"><div className="loading">Loading profile...</div></div>;

    return (
        <div className="page-container">
            {/* Cover Banner */}
            <div className="lp-cover-banner">
                <div className="lp-cover-gradient"></div>
                <div className="lp-profile-header-content">
                    <div className="lp-photo-container" onClick={() => editing && fileInputRef.current?.click()}>
                        {form.profilePhoto ? (
                            <img src={form.profilePhoto} alt="Profile" className="lp-photo" />
                        ) : (
                            <div className="lp-photo-placeholder">
                                {user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        {editing && (
                            <div className="lp-photo-overlay">
                                <span>📷</span>
                                <span>Change</span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className="lp-header-info">
                        <h1>{user?.username}</h1>
                        {editing ? (
                            <input
                                type="text"
                                className="lp-headline-input"
                                placeholder="Your professional headline..."
                                value={form.headline}
                                onChange={e => setForm({ ...form, headline: e.target.value })}
                            />
                        ) : (
                            <p className="lp-headline">{form.headline || 'Add a professional headline'}</p>
                        )}
                        <div className="lp-meta-row">
                            {editing ? (
                                <input
                                    type="text"
                                    className="lp-location-input"
                                    placeholder="📍 Location"
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                />
                            ) : (
                                form.location && <span className="lp-location">📍 {form.location}</span>
                            )}
                            <span className="lp-role-tag">{user?.role}</span>
                        </div>
                    </div>
                    <div className="lp-header-actions">
                        {editing ? (
                            <>
                                <button className="lp-save-btn" onClick={handleSave} disabled={saving}>
                                    {saving ? '⏳ Saving...' : '✅ Save Profile'}
                                </button>
                                <button className="lp-cancel-btn" onClick={() => { setEditing(false); fetchProfile(); }}>
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button className="lp-edit-btn" onClick={() => setEditing(true)}>
                                ✏️ Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div className="lp-section-card">
                <div className="lp-section-header">
                    <h2>💡 About</h2>
                    {editing && (
                        <div className="lp-ai-controls">
                            <select value={bioTone} onChange={e => setBioTone(e.target.value)} className="lp-tone-select">
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                            </select>
                            <button className="lp-ai-btn" onClick={handleGenerateBio} disabled={generatingBio}>
                                {generatingBio ? '⚡ Generating...' : '🤖 AI Generate Bio'}
                            </button>
                        </div>
                    )}
                </div>
                {editing ? (
                    <textarea
                        className="lp-about-textarea"
                        value={form.about}
                        onChange={e => setForm({ ...form, about: e.target.value })}
                        placeholder="Tell people about yourself..."
                        rows={5}
                    />
                ) : (
                    <p className="lp-about-text">{form.about || 'No bio yet. Click Edit to add one, or let AI generate it for you!'}</p>
                )}
            </div>

            {/* Skills Section */}
            <div className="lp-section-card">
                <h2>🛠️ Skills</h2>
                <div className="lp-skills-list">
                    {form.skills.map((skill, i) => (
                        <span key={i} className="lp-skill-tag">
                            {skill}
                            {editing && (
                                <button className="lp-skill-remove" onClick={() => handleRemoveSkill(skill)}>×</button>
                            )}
                        </span>
                    ))}
                    {form.skills.length === 0 && !editing && (
                        <span className="lp-empty-hint">No skills added yet</span>
                    )}
                </div>
                {editing && (
                    <div className="lp-add-skill-row">
                        <input
                            type="text"
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                            placeholder="Add a skill..."
                            className="lp-skill-input"
                        />
                        <button className="lp-add-skill-btn" onClick={handleAddSkill}>+ Add</button>
                    </div>
                )}
            </div>

            {/* Experience Section */}
            <div className="lp-section-card">
                <div className="lp-section-header">
                    <h2>💼 Experience</h2>
                    {editing && (
                        <button className="lp-add-exp-btn" onClick={handleAddExperience}>+ Add Experience</button>
                    )}
                </div>
                <div className="lp-experience-list">
                    {form.experience.map((exp, i) => (
                        <div key={i} className="lp-exp-item">
                            {editing ? (
                                <div className="lp-exp-edit-form">
                                    <div className="lp-exp-edit-row">
                                        <input type="text" placeholder="Job Title" value={exp.title}
                                            onChange={e => handleUpdateExperience(i, 'title', e.target.value)} />
                                        <input type="text" placeholder="Company" value={exp.company}
                                            onChange={e => handleUpdateExperience(i, 'company', e.target.value)} />
                                    </div>
                                    <div className="lp-exp-edit-row">
                                        <input type="month" placeholder="Start Date" value={exp.startDate}
                                            onChange={e => handleUpdateExperience(i, 'startDate', e.target.value)} />
                                        <input type="month" placeholder="End Date" value={exp.endDate}
                                            onChange={e => handleUpdateExperience(i, 'endDate', e.target.value)}
                                            disabled={exp.current} />
                                        <label className="lp-current-label">
                                            <input type="checkbox" checked={exp.current}
                                                onChange={e => handleUpdateExperience(i, 'current', e.target.checked)} />
                                            Current
                                        </label>
                                    </div>
                                    <textarea placeholder="Description" value={exp.description}
                                        onChange={e => handleUpdateExperience(i, 'description', e.target.value)} rows={2} />
                                    <button className="lp-remove-exp-btn" onClick={() => handleRemoveExperience(i)}>🗑️ Remove</button>
                                </div>
                            ) : (
                                <div className="lp-exp-view">
                                    <div className="lp-exp-icon">💼</div>
                                    <div className="lp-exp-details">
                                        <h3>{exp.title || 'Untitled Position'}</h3>
                                        <p className="lp-exp-company">{exp.company || 'Company'}</p>
                                        <p className="lp-exp-dates">
                                            {exp.startDate || '?'} — {exp.current ? 'Present' : (exp.endDate || '?')}
                                        </p>
                                        {exp.description && <p className="lp-exp-desc">{exp.description}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {form.experience.length === 0 && !editing && (
                        <div className="lp-empty-hint">No experience added yet. Click Edit to add your work history.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LinkedInProfile;
