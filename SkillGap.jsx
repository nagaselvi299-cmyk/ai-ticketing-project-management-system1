import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function SkillGap() {
    const [members, setMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [gapData, setGapData] = useState(null);
    const [loading, setLoading] = useState(true);

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
        try {
            const { data } = await axios.get(API + '/skill-gap/' + id);
            setGapData(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const getSeverityStyle = (sev) => {
        if (sev === 'high') return { bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', icon: '🔴' };
        if (sev === 'medium') return { bg: '#fffbeb', border: '#fcd34d', color: '#d97706', icon: '🟡' };
        return { bg: '#f0fdf4', border: '#86efac', color: '#16a34a', icon: '🟢' };
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>📈 Skill Gap Detection</h1>
                <p className="page-subtitle">AI-powered analysis of skill gaps with learning recommendations</p>
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

            {loading && <div className="loading">Analyzing skills...</div>}

            {!loading && gapData && (
                <>
                    {/* Summary Cards */}
                    <div className="gap-summary-grid">
                        <div className="gap-summary-card">
                            <span className="gap-summary-icon">📊</span>
                            <span className="gap-summary-value">{gapData.analyzedTasks}</span>
                            <span className="gap-summary-label">Tasks Analyzed</span>
                        </div>
                        <div className="gap-summary-card">
                            <span className="gap-summary-icon">🛠️</span>
                            <span className="gap-summary-value">{gapData.currentSkills.length}</span>
                            <span className="gap-summary-label">Current Skills</span>
                        </div>
                        <div className="gap-summary-card warning">
                            <span className="gap-summary-icon">⚠️</span>
                            <span className="gap-summary-value">{gapData.totalGaps}</span>
                            <span className="gap-summary-label">Gaps Found</span>
                        </div>
                        <div className="gap-summary-card danger">
                            <span className="gap-summary-icon">🔴</span>
                            <span className="gap-summary-value">{gapData.highSeverityCount}</span>
                            <span className="gap-summary-label">High Severity</span>
                        </div>
                    </div>

                    {/* Current Skills */}
                    {gapData.currentSkills.length > 0 && (
                        <div className="gap-current-skills">
                            <h2>🛠️ Current Skills</h2>
                            <div className="quality-tags large">
                                {gapData.currentSkills.map((s, i) => (
                                    <span key={i} className="quality-tag">{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Gaps */}
                    {gapData.gaps.length > 0 ? (
                        <div className="gap-list-section">
                            <h2>🔍 Identified Skill Gaps</h2>
                            <div className="gap-cards">
                                {gapData.gaps.map((gap, i) => {
                                    const style = getSeverityStyle(gap.severity);
                                    return (
                                        <div key={i} className="gap-card" style={{ background: style.bg, borderColor: style.border }}>
                                            <div className="gap-card-header">
                                                <div className="gap-skill-name">
                                                    <span>{style.icon}</span>
                                                    <h3>{gap.skill}</h3>
                                                    <span className="gap-severity-badge" style={{ background: style.color }}>{gap.severity}</span>
                                                </div>
                                                {!gap.hasSkill && <span className="gap-missing-badge">Missing Skill</span>}
                                            </div>

                                            <p className="gap-reason">{gap.reason}</p>

                                            <div className="gap-stats">
                                                <span>📋 {gap.totalTasks} total tasks</span>
                                                <span>✅ {gap.completedTasks} completed</span>
                                                <span>⏰ {gap.overdueTasks} overdue</span>
                                                {gap.avgDuration > 0 && <span>⏱️ {gap.avgDuration}h avg</span>}
                                            </div>

                                            {/* Recommendations */}
                                            <div className="gap-recommendations">
                                                <h4>📚 Recommended Resources</h4>
                                                <div className="gap-resources">
                                                    {gap.recommendations.map((r, j) => (
                                                        <a key={j} href={r.url} target="_blank" rel="noopener noreferrer"
                                                            className="gap-resource-card">
                                                            <span className="gap-resource-type">
                                                                {r.type === 'course' ? '🎓' : r.type === 'certification' ? '📜' : '📖'}
                                                            </span>
                                                            <div className="gap-resource-info">
                                                                <span className="gap-resource-title">{r.title}</span>
                                                                <span className="gap-resource-provider">{r.provider}</span>
                                                            </div>
                                                            <span className="gap-resource-arrow">→</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="gap-no-gaps">
                            <span className="gap-no-gaps-icon">🎉</span>
                            <h3>No Skill Gaps Detected!</h3>
                            <p>This team member's skills match their task requirements well. Keep up the great work!</p>
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

export default SkillGap;
