import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function Profile({ user }) {
    const [members, setMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [profile, setProfile] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchMembers(); }, []);

    const fetchMembers = async () => {
        try {
            const { data } = await axios.get(API + '/team');
            setMembers(data);
            if (data.length > 0) {
                selectMember(data[0]._id);
            } else {
                setLoading(false);
            }
        } catch (err) { setLoading(false); }
    };

    const selectMember = async (memberId) => {
        setSelectedMember(memberId);
        setLoading(true);
        try {
            const [profileRes, timelineRes] = await Promise.all([
                axios.get(API + '/rankings/member/' + memberId),
                axios.get(API + '/timeline/member/' + memberId)
            ]);
            setProfile(profileRes.data);
            setTimeline(timelineRes.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const getBadgeDisplay = (badge) => {
        if (!badge) return { emoji: '⭐', title: 'Team Member', color: '#64748b' };
        if (badge.rank === 1) return { emoji: '🥇', title: 'Top Performer', color: '#fbbf24' };
        if (badge.rank === 2) return { emoji: '🥈', title: 'Silver Achiever', color: '#94a3b8' };
        if (badge.rank === 3) return { emoji: '🥉', title: 'Bronze Star', color: '#d97706' };
        return { emoji: '⭐', title: 'Team Member', color: '#64748b' };
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>👤 Profile</h1>
                <p className="page-subtitle">Team Member Performance & Timeline</p>
            </div>

            {/* Member Selector */}
            <div className="member-selector">
                {members.map(m => (
                    <button
                        key={m._id}
                        className={`member-chip ${selectedMember === m._id ? 'active' : ''}`}
                        onClick={() => selectMember(m._id)}
                    >
                        <span className="chip-avatar">{m.name[0]?.toUpperCase()}</span>
                        {m.name}
                    </button>
                ))}
            </div>

            {loading && <div className="loading">Loading profile...</div>}

            {!loading && profile && (
                <>
                    {/* Profile Badge Card */}
                    <div className="profile-badge-card">
                        <div className="profile-avatar-large">
                            {profile.member.name[0]?.toUpperCase()}
                        </div>
                        <div className="profile-info">
                            <h2>👨‍💻 {profile.member.name}</h2>
                            <div className="badge-display" style={{ borderColor: getBadgeDisplay(profile.badge).color }}>
                                <span className="badge-emoji">{getBadgeDisplay(profile.badge).emoji}</span>
                                <span className="badge-title">Badge: {getBadgeDisplay(profile.badge).title}</span>
                            </div>
                            <p className="profile-email">{profile.member.email || 'No email set'}</p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="profile-stats-grid">
                        <div className="profile-stat-card">
                            <span className="stat-icon">🏆</span>
                            <span className="stat-value">#{profile.rank}</span>
                            <span className="stat-label">Current Rank</span>
                        </div>
                        <div className="profile-stat-card">
                            <span className="stat-icon">⭐</span>
                            <span className="stat-value">{profile.points}</span>
                            <span className="stat-label">Total Points</span>
                        </div>
                        <div className="profile-stat-card">
                            <span className="stat-icon">✅</span>
                            <span className="stat-value">{profile.breakdown.completedTasks}</span>
                            <span className="stat-label">Tasks Completed</span>
                        </div>
                        <div className="profile-stat-card">
                            <span className="stat-icon">📋</span>
                            <span className="stat-value">{profile.totalTasks}</span>
                            <span className="stat-label">Total Tasks</span>
                        </div>
                        <div className="profile-stat-card">
                            <span className="stat-icon">⏰</span>
                            <span className="stat-value">{profile.breakdown.onTimeDeliveries}</span>
                            <span className="stat-label">On-Time</span>
                        </div>
                        <div className="profile-stat-card">
                            <span className="stat-icon">🐛</span>
                            <span className="stat-value">{profile.breakdown.bugFixes}</span>
                            <span className="stat-label">Bug Fixes</span>
                        </div>
                    </div>

                    {/* Points Breakdown */}
                    <div className="points-breakdown-section">
                        <h2>📊 Points Breakdown</h2>
                        <div className="breakdown-bars">
                            <div className="breakdown-item">
                                <span className="breakdown-label">Completed Tasks ({profile.breakdown.completedTasks} × 10)</span>
                                <div className="breakdown-bar-bg">
                                    <div className="breakdown-bar-fill green" style={{ width: `${Math.min((profile.breakdown.completedTasks * 10 / Math.max(profile.points, 1)) * 100, 100)}%` }}></div>
                                </div>
                                <span className="breakdown-pts">+{profile.breakdown.completedTasks * 10}</span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">On-Time Delivery ({profile.breakdown.onTimeDeliveries} × 5)</span>
                                <div className="breakdown-bar-bg">
                                    <div className="breakdown-bar-fill blue" style={{ width: `${Math.min((profile.breakdown.onTimeDeliveries * 5 / Math.max(profile.points, 1)) * 100, 100)}%` }}></div>
                                </div>
                                <span className="breakdown-pts">+{profile.breakdown.onTimeDeliveries * 5}</span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">High Priority ({profile.breakdown.highPriorityTasks} × 8)</span>
                                <div className="breakdown-bar-bg">
                                    <div className="breakdown-bar-fill orange" style={{ width: `${Math.min((profile.breakdown.highPriorityTasks * 8 / Math.max(profile.points, 1)) * 100, 100)}%` }}></div>
                                </div>
                                <span className="breakdown-pts">+{profile.breakdown.highPriorityTasks * 8}</span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">Bug Fixes ({profile.breakdown.bugFixes} × 6)</span>
                                <div className="breakdown-bar-bg">
                                    <div className="breakdown-bar-fill red" style={{ width: `${Math.min((profile.breakdown.bugFixes * 6 / Math.max(profile.points, 1)) * 100, 100)}%` }}></div>
                                </div>
                                <span className="breakdown-pts">+{profile.breakdown.bugFixes * 6}</span>
                            </div>
                        </div>
                    </div>

                    {/* Skills / Qualities */}
                    {profile.member.qualities?.length > 0 && (
                        <div className="profile-qualities-section">
                            <h2>🛠️ Skills</h2>
                            <div className="quality-tags large">
                                {profile.member.qualities.map((q, i) => <span key={i} className="quality-tag">{q}</span>)}
                            </div>
                        </div>
                    )}

                    {/* Work Timeline */}
                    <div className="work-timeline-section">
                        <h2>📅 Today's Work Timeline</h2>
                        {timeline.length > 0 ? (
                            <div className="work-timeline">
                                {timeline.map((event, i) => (
                                    <div key={i} className="timeline-row">
                                        <div className="timeline-time-col">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </div>
                                        <div className="timeline-connector">
                                            <div className="timeline-dot-large"></div>
                                            {i < timeline.length - 1 && <div className="timeline-line"></div>}
                                        </div>
                                        <div className="timeline-detail">
                                            <span className="timeline-task-action">{event.action}</span>
                                            <span className="timeline-task-name">{event.taskTitle}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state small">No timeline events today</div>
                        )}
                    </div>

                    {/* Benefits (if in top 3) */}
                    {profile.badge && (
                        <div className="profile-benefits-section">
                            <h2>🎁 Your Benefits</h2>
                            <div className={`profile-benefit-card ${profile.badge.rank === 1 ? 'rank-gold' : profile.badge.rank === 2 ? 'rank-silver' : 'rank-bronze'}`}>
                                <div className="benefit-emoji-large">{profile.badge.emoji}</div>
                                <h3>{profile.badge.title}</h3>
                                <ul className="benefit-list">
                                    {profile.badge.rewards.map((r, i) => (
                                        <li key={i}>🎯 {r}</li>
                                    ))}
                                </ul>
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

export default Profile;
