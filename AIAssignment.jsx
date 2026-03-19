import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function AIAssignment() {
    const [members, setMembers] = useState([]);
    const [form, setForm] = useState({ requiredQualities: '', deadline: '', estimatedTime: 4 });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchMembers(); }, []);

    const fetchMembers = async () => {
        try { const { data } = await axios.get(API + '/team'); setMembers(data); } catch (e) {}
    };

    const handleAnalyze = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axios.post(API + '/tasks/ai-assign', {
                requiredQualities: form.requiredQualities.split(',').map(q => q.trim()).filter(Boolean),
                deadline: form.deadline,
                estimatedTime: Number(form.estimatedTime)
            });
            setResult(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const getScoreColor = (score) => {
        if (score >= 75) return '#22c55e';
        if (score >= 50) return '#f59e0b';
        if (score >= 25) return '#f97316';
        return '#ef4444';
    };

    const getScoreBar = (score, label, color) => (
        <div className="ai-score-bar-row">
            <span className="ai-score-label">{label}</span>
            <div className="ai-score-bar-bg">
                <div className="ai-score-bar-fill" style={{ width: `${score}%`, background: color || getScoreColor(score) }}></div>
            </div>
            <span className="ai-score-value">{score}%</span>
        </div>
    );

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>🤖 AI Task Assignment</h1>
                <p className="page-subtitle">Intelligent employee-task matching with workload balancing</p>
            </div>

            {/* Analysis Form */}
            <div className="ai-assign-form-card">
                <h2>📋 Task Requirements</h2>
                <form onSubmit={handleAnalyze} className="task-form">
                    <div className="form-group">
                        <label>Required Skills (comma-separated)</label>
                        <input type="text" value={form.requiredQualities}
                            onChange={e => setForm({ ...form, requiredQualities: e.target.value })}
                            placeholder="react, javascript, testing" required />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Deadline</label>
                            <input type="datetime-local" value={form.deadline}
                                onChange={e => setForm({ ...form, deadline: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Estimated Hours</label>
                            <input type="number" min="1" value={form.estimatedTime}
                                onChange={e => setForm({ ...form, estimatedTime: e.target.value })} />
                        </div>
                    </div>
                    <button type="submit" className="submit-btn ai-analyze-btn" disabled={loading}>
                        {loading ? '🔄 Analyzing...' : '🧠 Analyze Candidates'}
                    </button>
                </form>
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Weights Legend */}
                    <div className="ai-weights-card">
                        <h3>⚖️ Scoring Weights</h3>
                        <div className="ai-weights-list">
                            {Object.entries(result.weights).map(([key, val]) => (
                                <div key={key} className="ai-weight-item">
                                    <span className="ai-weight-name">
                                        {key === 'skillMatch' ? '🎯 Skill Match' :
                                         key === 'successRate' ? '✅ Success Rate' :
                                         key === 'completionSpeed' ? '⚡ Speed' :
                                         key === 'workloadBalance' ? '📊 Workload' :
                                         '🧠 Style Fit'}
                                    </span>
                                    <span className="ai-weight-val">{Math.round(val * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <h2 className="ai-candidates-title">👥 Candidate Rankings</h2>

                    <div className="ai-candidates-grid">
                        {result.candidates.map((c, i) => (
                            <div key={c.memberId} className={`ai-candidate-card ${i === 0 ? 'ai-top-pick' : ''} ${c.isOverloaded ? 'ai-overloaded' : ''}`}>
                                <div className="ai-candidate-header">
                                    <div className="ai-rank-badge">#{i + 1}</div>
                                    <div className="ai-candidate-info">
                                        <h3>{c.memberName}</h3>
                                        <span className="ai-candidate-email">{c.email || 'No email'}</span>
                                    </div>
                                    <div className="ai-total-score" style={{ borderColor: getScoreColor(c.totalScore) }}>
                                        <span className="ai-total-score-value">{c.totalScore}</span>
                                        <span className="ai-total-score-label">Score</span>
                                    </div>
                                </div>

                                {i === 0 && !c.isOverloaded && <div className="ai-top-pick-badge">🏆 Best Match</div>}
                                {c.isOverloaded && (
                                    <div className="ai-overload-banner">
                                        ⚠️ Overloaded: {c.overloadReason}
                                    </div>
                                )}

                                <div className="ai-score-breakdown">
                                    {getScoreBar(c.skillScore, '🎯 Skills', '#6366f1')}
                                    {getScoreBar(c.successScore, '✅ Success', '#22c55e')}
                                    {getScoreBar(c.speedScore, '⚡ Speed', '#f59e0b')}
                                    {getScoreBar(c.workloadScore, '📊 Workload', '#06b6d4')}
                                    {getScoreBar(c.styleScore, '🧠 Style', '#a855f7')}
                                </div>

                                <div className="ai-candidate-meta">
                                    <span>📋 Active: {c.activeTaskCount} tasks</span>
                                    <span>🔴 Priority: {c.highPriorityCount} high</span>
                                    <span>🧠 Style: {c.workStyle}</span>
                                </div>

                                {c.qualities?.length > 0 && (
                                    <div className="quality-tags">
                                        {c.qualities.map((q, j) => <span key={j} className="quality-tag">{q}</span>)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {result.candidates.length === 0 && (
                        <div className="empty-state">No team members found. Add members in the Team page first!</div>
                    )}
                </>
            )}

            {!result && members.length === 0 && (
                <div className="empty-state">No team members available. Add members in the Team page to use AI assignment.</div>
            )}
        </div>
    );
}

export default AIAssignment;
