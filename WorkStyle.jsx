import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function WorkStyle() {
    const [members, setMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [taskMatches, setTaskMatches] = useState(null);
    const [teamStyles, setTeamStyles] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

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
            const [analysisRes, matchRes] = await Promise.all([
                axios.get(API + '/work-style/' + id),
                axios.get(API + '/work-style/' + id + '/task-matches')
            ]);
            setAnalysis(analysisRes.data);
            setTaskMatches(matchRes.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleAnalyzeAll = async () => {
        setAnalyzing(true);
        try {
            const { data } = await axios.post(API + '/work-style/analyze-all');
            setTeamStyles(data);
            if (selectedMember) selectMember(selectedMember);
        } catch (e) { console.error(e); }
        setAnalyzing(false);
    };

    const getStyleConfig = (type) => {
        const map = {
            'fast': { emoji: '⚡', label: 'Fast Worker', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
            'deep-focus': { emoji: '🧠', label: 'Deep Focus', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)' },
            'collaborator': { emoji: '🤝', label: 'Collaborator', color: '#06b6d4', gradient: 'linear-gradient(135deg, #22d3ee, #0891b2)' },
            'balanced': { emoji: '⚖️', label: 'Balanced', color: '#22c55e', gradient: 'linear-gradient(135deg, #4ade80, #16a34a)' }
        };
        return map[type] || map['balanced'];
    };

    const getConfidenceBadge = (conf) => {
        if (conf === 'high') return { label: 'High Confidence', color: '#22c55e' };
        if (conf === 'medium') return { label: 'Medium Confidence', color: '#f59e0b' };
        return { label: 'Low Confidence', color: '#94a3b8' };
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>🧠 Work Style Analyzer</h1>
                <button className="add-btn" onClick={handleAnalyzeAll} disabled={analyzing}>
                    {analyzing ? '🔄 Analyzing...' : '🔄 Analyze All Team'}
                </button>
            </div>
            <p className="page-subtitle" style={{ marginTop: '-8px', marginBottom: '20px' }}>
                AI-powered work behavior analysis for smarter task assignments
            </p>

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

            {loading && <div className="loading">Analyzing work style...</div>}

            {!loading && analysis && (
                <>
                    {/* Work Style Badge */}
                    {(() => {
                        const style = getStyleConfig(analysis.type);
                        const conf = getConfidenceBadge(analysis.confidence);
                        return (
                            <div className="ws-style-card" style={{ background: style.gradient }}>
                                <div className="ws-style-emoji">{style.emoji}</div>
                                <div className="ws-style-info">
                                    <h2>{style.label}</h2>
                                    <p>{analysis.styleDescriptions?.[analysis.type]?.desc}</p>
                                    <div className="ws-confidence" style={{ background: conf.color }}>
                                        {conf.label}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Reason */}
                    <div className="ws-reason-card">
                        <h3>💡 Analysis Reason</h3>
                        <p>{analysis.reason}</p>
                    </div>

                    {/* Metrics */}
                    <div className="ws-metrics-grid">
                        <div className="ws-metric-card">
                            <span className="ws-metric-icon">⚡</span>
                            <span className="ws-metric-value">{Math.round((analysis.metrics.avgSpeedRatio || 1) * 100)}%</span>
                            <span className="ws-metric-label">Avg Speed Ratio</span>
                            <span className="ws-metric-desc">of estimated time</span>
                        </div>
                        <div className="ws-metric-card">
                            <span className="ws-metric-icon">✅</span>
                            <span className="ws-metric-value">{analysis.metrics.completedCount}</span>
                            <span className="ws-metric-label">Tasks Completed</span>
                        </div>
                        <div className="ws-metric-card">
                            <span className="ws-metric-icon">⏱️</span>
                            <span className="ws-metric-value">{analysis.metrics.avgEstimatedTime}h</span>
                            <span className="ws-metric-label">Avg Task Time</span>
                        </div>
                        <div className="ws-metric-card">
                            <span className="ws-metric-icon">🔴</span>
                            <span className="ws-metric-value">{analysis.metrics.highPriorityRate}%</span>
                            <span className="ws-metric-label">High Priority Rate</span>
                        </div>
                        <div className="ws-metric-card">
                            <span className="ws-metric-icon">📁</span>
                            <span className="ws-metric-value">{analysis.metrics.projectCount}</span>
                            <span className="ws-metric-label">Projects</span>
                        </div>
                        <div className="ws-metric-card">
                            <span className="ws-metric-icon">🤝</span>
                            <span className="ws-metric-value">{analysis.metrics.sharedProjectRate}%</span>
                            <span className="ws-metric-label">Collaboration Rate</span>
                        </div>
                    </div>

                    {/* Style Scores */}
                    <div className="ws-scores-section">
                        <h2>📊 Style Score Breakdown</h2>
                        <div className="ws-scores-bars">
                            {Object.entries(analysis.scores || {}).map(([key, val]) => {
                                const cfg = getStyleConfig(key);
                                return (
                                    <div key={key} className="ws-score-row">
                                        <span className="ws-score-label">{cfg.emoji} {cfg.label}</span>
                                        <div className="ws-score-bar-bg">
                                            <div className="ws-score-bar-fill" style={{ width: `${Math.min(val, 100)}%`, background: cfg.color }}></div>
                                        </div>
                                        <span className="ws-score-value">{val}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* All Style Descriptions */}
                    <div className="ws-all-styles">
                        <h2>📋 Work Style Types</h2>
                        <div className="ws-styles-grid">
                            {analysis.styleDescriptions && Object.entries(analysis.styleDescriptions).map(([key, desc]) => {
                                const cfg = getStyleConfig(key);
                                return (
                                    <div key={key} className={`ws-style-desc-card ${analysis.type === key ? 'active' : ''}`}>
                                        <span className="ws-style-desc-emoji">{desc.emoji}</span>
                                        <h4>{desc.label}</h4>
                                        <p>{desc.desc}</p>
                                        {analysis.type === key && <span className="ws-current-badge">Current</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Task Matches */}
                    {taskMatches && taskMatches.matchedTasks?.length > 0 && (
                        <div className="ws-task-matches">
                            <h2>🎯 Style-Matched Tasks</h2>
                            <p className="ws-match-reason">{taskMatches.matchReason}</p>
                            <div className="ws-matched-tasks-list">
                                {taskMatches.matchedTasks.map(task => (
                                    <div key={task._id} className="ws-task-card">
                                        <span className="ws-task-title">{task.title}</span>
                                        <div className="ws-task-meta">
                                            <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                                            <span>⏰ {new Date(task.deadline).toLocaleDateString()}</span>
                                            <span>⏱️ {task.estimatedTime}h</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Team Analysis Results */}
            {teamStyles && (
                <div className="ws-team-analysis">
                    <h2>👥 Team Work Style Distribution</h2>
                    <div className="ws-team-grid">
                        {teamStyles.results.map(r => {
                            const cfg = getStyleConfig(r.type);
                            return (
                                <div key={r.memberId} className="ws-team-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                                    <span className="ws-team-emoji">{cfg.emoji}</span>
                                    <div className="ws-team-info">
                                        <h4>{r.memberName}</h4>
                                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                                    </div>
                                    <span className="ws-team-confidence">{r.confidence}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!loading && members.length === 0 && (
                <div className="empty-state">No team members found. Add members in the Team page first!</div>
            )}
        </div>
    );
}

export default WorkStyle;
